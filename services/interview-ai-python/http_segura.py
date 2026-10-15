"""Download HTTP restrito aos domínios da Empregare (proteção contra SSRF).

O extrator de vagas recebe uma URL vinda do usuário e a baixa no servidor.
Sem proteção, essa URL (ou um redirecionamento dela) poderia apontar para
localhost, redes privadas ou metadados de nuvem. Este módulo aplica TRÊS
camadas, todas necessárias:

1. Validação textual da URL inicial e de CADA redirecionamento
   (``validar_url_vaga``): só http/https, só ``empregare.com`` e subdomínios,
   sem credenciais, sem porta fora do padrão, sem caracteres perigosos.
2. Redirecionamentos seguidos manualmente (``baixar_html_seguro``), com limite.
3. Validação do ENDEREÇO IP no momento da conexão (``conectar_validado``).
   Esta é a defesa contra DNS rebinding: o DNS é resolvido UMA vez, todos os
   endereços devolvidos são verificados e a conexão é aberta diretamente
   para um desses IPs já validados. Não existe uma segunda resolução entre a
   validação e a conexão. O TLS continua verificando o certificado contra o
   nome original do host.

Proxies de ambiente são ignorados (``trust_env=False``): com proxy, quem
resolve o DNS e conecta é o proxy, e a validação do IP seria impossível.
"""

from __future__ import annotations

import ipaddress
import re
import socket
import time
from typing import Iterable
from urllib.parse import urljoin, urlsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool
from urllib3.poolmanager import PoolManager
from urllib3.util import parse_url

DOMINIOS_PERMITIDOS = ("empregare.com",)
TAMANHO_MAXIMO_URL = 2048
MAXIMO_REDIRECIONAMENTOS = 5
# Política de tempo da extração (coerente com o NestJS, ver
# INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS = 20 s): o orçamento TOTAL do Python
# (todas as requisições, redirecionamentos e leitura do corpo) é menor que o
# timeout do Nest, para que o Python termine e responda 504 antes de o Nest
# desistir. TIMEOUT_REQUISICAO vale para cada operação de socket (conexão/leitura).
TIMEOUT_REQUISICAO = 10
ORCAMENTO_TOTAL_SEGUNDOS = 15
# Limite do corpo DECODIFICADO (já descomprimido: protege de gzip bomb).
MAXIMO_BYTES_RESPOSTA = 5 * 1024 * 1024
TAMANHO_BLOCO_LEITURA = 16 * 1024

_PORTAS_PADRAO = {"http": 80, "https": 443}
_CODIGOS_REDIRECIONAMENTO = (301, 302, 303, 307, 308)
# Espaços, barra invertida e caracteres de controle: parsers diferentes
# (urlsplit x urllib3) leem esses casos de formas distintas.
_CARACTERES_PERIGOSOS = re.compile(r"[\s\\\x00-\x1f\x7f]")

# Mensagens genéricas de propósito: não revelam IPs, hosts internos nem o
# motivo exato da recusa a quem consome a resposta.
MENSAGEM_URL_NAO_PERMITIDA = "URL da vaga nao permitida."
MENSAGEM_DESTINO_BLOQUEADO = "Destino da conexao nao permitido."
MENSAGEM_RESPOSTA_MUITO_GRANDE = "Resposta da vaga maior que o limite permitido."


class UrlNaoPermitidaError(requests.exceptions.RequestException):
    """URL (inicial ou de redirecionamento) fora da política."""


class RedirecionamentoNaoPermitidoError(UrlNaoPermitidaError):
    """Um redirecionamento apontou para uma URL fora da política."""


class RespostaMuitoGrandeError(requests.exceptions.RequestException):
    """O corpo da resposta excedeu MAXIMO_BYTES_RESPOSTA."""


class DestinoBloqueadoError(OSError):
    """O DNS resolveu para um endereço que não é público/global."""


class FalhaDnsError(OSError):
    """O host não pôde ser resolvido (falha de DNS, não de política)."""


# --------------------------------------------------------------------------
# Camada 1: URL
# --------------------------------------------------------------------------
def validar_url_vaga(url: object) -> str:
    """Devolve a URL (sem espaços nas pontas) ou levanta UrlNaoPermitidaError."""
    if not isinstance(url, str):
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)

    bruta = url.strip()
    if not bruta or len(bruta) > TAMANHO_MAXIMO_URL:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)
    if _CARACTERES_PERIGOSOS.search(bruta):
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)

    try:
        partes = urlsplit(bruta)
        porta = partes.port  # ValueError se a porta for inválida
        host_urllib3 = parse_url(bruta).host
    except ValueError as exc:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA) from exc
    except Exception as exc:  # LocationParseError e afins
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA) from exc

    esquema = partes.scheme.lower()
    if esquema not in _PORTAS_PADRAO:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)
    if partes.username is not None or partes.password is not None:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)
    if porta is not None and porta != _PORTAS_PADRAO[esquema]:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)

    host = (partes.hostname or "").lower().rstrip(".")
    if not host or not host.isascii():
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)
    # Os dois parsers precisam concordar sobre o host (defesa contra
    # diferenciais de parsing entre urlsplit e o que o requests realmente usa).
    if (host_urllib3 or "").lower().rstrip(".") != host:
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)
    if not any(host == d or host.endswith("." + d) for d in DOMINIOS_PERMITIDOS):
        raise UrlNaoPermitidaError(MENSAGEM_URL_NAO_PERMITIDA)

    return bruta


# --------------------------------------------------------------------------
# Camada 3: IP no momento da conexão
# --------------------------------------------------------------------------
def _ipv4_embutido(endereco: ipaddress.IPv6Address) -> Iterable[ipaddress.IPv4Address]:
    if endereco.ipv4_mapped is not None:
        yield endereco.ipv4_mapped
    if endereco.sixtofour is not None:
        yield endereco.sixtofour
    if endereco.teredo is not None:
        yield endereco.teredo[1]
    if endereco in ipaddress.ip_network("64:ff9b::/96"):  # NAT64
        yield ipaddress.IPv4Address(int(endereco) & 0xFFFFFFFF)


def ip_publico(texto: str) -> bool:
    """True somente para endereços globalmente roteáveis.

    Recusa loopback, privados, link-local (inclui 169.254.169.254), CGNAT,
    reservados, multicast e não especificados, inclusive quando embutidos em
    IPv6 (IPv4-mapped, 6to4, Teredo, NAT64).
    """
    try:
        endereco = ipaddress.ip_address(texto.split("%", 1)[0])
    except ValueError:
        return False

    if not endereco.is_global or endereco.is_multicast:
        return False
    if isinstance(endereco, ipaddress.IPv6Address):
        return all(ip_publico(str(v4)) for v4 in _ipv4_embutido(endereco))
    return True


def conectar_validado(
    host: str,
    porta: int,
    timeout: float | None = None,
    source_address=None,
    socket_options=None,
) -> socket.socket:
    """Resolve ``host`` UMA vez, valida TODOS os endereços e conecta a um deles."""
    try:
        resolvidos = socket.getaddrinfo(
            host, porta, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM
        )
    except socket.gaierror as exc:
        raise FalhaDnsError("Falha ao resolver o host.") from exc

    enderecos = []
    for _familia, _tipo, _proto, _nome, sockaddr in resolvidos:
        ip = sockaddr[0]
        if not ip_publico(ip):
            # Falha fechada: basta UM endereço não público na resposta (inclui
            # respostas "mistas" usadas em ataques de rebinding).
            raise DestinoBloqueadoError(MENSAGEM_DESTINO_BLOQUEADO)
        if ip not in enderecos:
            enderecos.append(ip)

    if not enderecos:
        raise FalhaDnsError("Falha ao resolver o host.")

    ultimo_erro: OSError | None = None
    for ip in enderecos:
        try:
            sock = socket.create_connection(
                (ip, porta), timeout=timeout, source_address=source_address
            )
        except OSError as exc:
            ultimo_erro = exc
            continue
        for opcao in socket_options or ():
            sock.setsockopt(*opcao)
        return sock

    raise ultimo_erro or OSError("Falha ao conectar.")


class _ConexaoHTTPSegura(HTTPConnection):
    def _new_conn(self):
        return conectar_validado(
            getattr(self, "_dns_host", self.host),
            self.port,
            timeout=self.timeout,
            source_address=self.source_address,
            socket_options=self.socket_options,
        )


class _ConexaoHTTPSSegura(HTTPSConnection):
    def _new_conn(self):
        return conectar_validado(
            getattr(self, "_dns_host", self.host),
            self.port,
            timeout=self.timeout,
            source_address=self.source_address,
            socket_options=self.socket_options,
        )


class _PoolHTTPSeguro(HTTPConnectionPool):
    ConnectionCls = _ConexaoHTTPSegura


class _PoolHTTPSSeguro(HTTPSConnectionPool):
    ConnectionCls = _ConexaoHTTPSSegura


class _PoolManagerSeguro(PoolManager):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pool_classes_by_scheme = {
            "http": _PoolHTTPSeguro,
            "https": _PoolHTTPSSeguro,
        }


class AdaptadorSeguro(HTTPAdapter):
    """HTTPAdapter cujas conexões passam por ``conectar_validado``."""

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        self._pool_connections = connections
        self._pool_maxsize = maxsize
        self._pool_block = block
        self.poolmanager = _PoolManagerSeguro(
            num_pools=connections, maxsize=maxsize, block=block, **pool_kwargs
        )


def criar_sessao_segura(headers: dict | None = None) -> requests.Session:
    sessao = requests.Session()
    sessao.trust_env = False  # sem proxies/.netrc de ambiente (ver docstring)
    sessao.proxies = {}
    adaptador = AdaptadorSeguro()
    sessao.mount("http://", adaptador)
    sessao.mount("https://", adaptador)
    if headers:
        sessao.headers.update(headers)
    return sessao


# --------------------------------------------------------------------------
# Camada 2: redirecionamentos manuais
# --------------------------------------------------------------------------
def _ler_corpo_limitado(
    resposta: requests.Response, maximo_bytes: int, limite_monotonic: float
) -> None:
    """Lê o corpo em blocos, abortando ao passar do limite de bytes (já
    descomprimidos) ou do orçamento de tempo. O corpo lido fica em ``resposta``
    (``.content``/``.text`` funcionam normalmente); nada além do limite é lido."""
    declarado = resposta.headers.get("Content-Length")
    if declarado and str(declarado).strip().isdigit() and int(declarado) > maximo_bytes:
        resposta.close()
        raise RespostaMuitoGrandeError(MENSAGEM_RESPOSTA_MUITO_GRANDE)

    blocos: list[bytes] = []
    total = 0
    try:
        for bloco in resposta.iter_content(chunk_size=TAMANHO_BLOCO_LEITURA):
            if not bloco:
                continue
            if time.monotonic() > limite_monotonic:
                raise requests.exceptions.Timeout("Tempo total excedido.")
            total += len(bloco)
            if total > maximo_bytes:
                raise RespostaMuitoGrandeError(MENSAGEM_RESPOSTA_MUITO_GRANDE)
            blocos.append(bloco)
    except BaseException:
        resposta.close()
        raise

    resposta._content = b"".join(blocos)
    resposta._content_consumed = True
    resposta.close()


def baixar_html_seguro(
    url: str,
    sessao: requests.Session,
    timeout: float = TIMEOUT_REQUISICAO,
    maximo_redirecionamentos: int = MAXIMO_REDIRECIONAMENTOS,
    orcamento_segundos: float = ORCAMENTO_TOTAL_SEGUNDOS,
    maximo_bytes: int = MAXIMO_BYTES_RESPOSTA,
) -> requests.Response:
    """GET com validação de cada salto. Devolve a resposta final (sem seguir
    redirecionamentos automaticamente), com o corpo já lido e limitado a
    ``maximo_bytes``."""
    atual = validar_url_vaga(url)
    limite = time.monotonic() + orcamento_segundos

    for _ in range(maximo_redirecionamentos + 1):
        restante = limite - time.monotonic()
        if restante <= 0:
            raise requests.exceptions.Timeout("Tempo total excedido.")

        resposta = sessao.get(
            atual,
            timeout=min(timeout, restante),
            allow_redirects=False,
            stream=True,  # o corpo só é baixado por _ler_corpo_limitado
        )

        destino = resposta.headers.get("Location")
        if resposta.status_code in _CODIGOS_REDIRECIONAMENTO and destino:
            # Cada salto passa pela mesma política da URL inicial.
            try:
                atual = validar_url_vaga(urljoin(atual, destino))
            except UrlNaoPermitidaError as exc:
                resposta.close()
                raise RedirecionamentoNaoPermitidoError(
                    MENSAGEM_URL_NAO_PERMITIDA
                ) from exc
            resposta.close()
            continue

        if resposta.status_code < 400:
            _ler_corpo_limitado(resposta, maximo_bytes, limite)
        else:
            # Respostas de erro não precisam do corpo: não baixar.
            resposta.close()
            resposta._content = b""
            resposta._content_consumed = True
        return resposta

    raise requests.exceptions.TooManyRedirects("Redirecionamentos demais.")
