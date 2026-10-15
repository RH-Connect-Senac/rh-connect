"""Testes da proteção contra SSRF no download das vagas da Empregare.

Nenhum teste abre conexão de rede: ``socket.getaddrinfo`` e
``socket.create_connection`` são substituídos por mocks, e as respostas HTTP
vêm de sessões falsas. Escritos com ``unittest`` (o pytest também os executa).
"""
import socket
import unittest
from unittest import mock

import requests

import extrair_empregare_original as extrator
import http_segura
from http_segura import (
    AdaptadorSeguro,
    DestinoBloqueadoError,
    UrlNaoPermitidaError,
    baixar_html_seguro,
    conectar_validado,
    ip_publico,
    validar_url_vaga,
)

URL_OK = "https://www.empregare.com/pt-br/vaga-analista-rh_181565"
IP_PUBLICO = "203.0.113.10"  # documentação (TEST-NET-3); aqui só é "público" por mock
IP_PUBLICO_REAL = "8.8.8.8"


def addrinfo(*ips):
    """Formato devolvido por socket.getaddrinfo."""
    saida = []
    for ip in ips:
        familia = socket.AF_INET6 if ":" in ip else socket.AF_INET
        sockaddr = (ip, 443, 0, 0) if ":" in ip else (ip, 443)
        saida.append((familia, socket.SOCK_STREAM, 6, "", sockaddr))
    return saida


class ValidarUrlTests(unittest.TestCase):
    def test_aceita_urls_legitimas(self):
        for url in (
            URL_OK,
            "https://empregare.com/pt-br/vaga-x_1",
            "https://empresa.empregare.com/vaga/1",
            "http://www.empregare.com/pt-br/vaga-x_1",
            "HTTPS://WWW.EMPREGARE.COM/pt-br/vaga-x_1",
            "  " + URL_OK + "  ",
        ):
            with self.subTest(url=url):
                self.assertEqual(validar_url_vaga(url), url.strip())

    def test_rejeita_urls_fora_da_politica(self):
        casos = {
            "outro dominio": "https://example.com/vaga",
            "sufixo falso": "https://empregare.com.evil.com/vaga",
            "prefixo falso": "https://evilempregare.com/vaga",
            "localhost": "http://localhost:3000/admin",
            "loopback": "http://127.0.0.1/vaga",
            "ip privado": "http://10.0.0.5/vaga",
            "metadados": "http://169.254.169.254/latest/meta-data/",
            "ipv6 loopback": "http://[::1]/vaga",
            "credenciais": "https://user:pass@www.empregare.com/vaga",
            "credencial disfarcando host": "https://www.empregare.com@evil.com/vaga",
            "porta": "https://www.empregare.com:8443/vaga",
            "porta http em https": "https://www.empregare.com:80/vaga",
            "barra invertida": "https://evil.com\\@www.empregare.com/vaga",
            "espaco interno": "https://www.empregare.com/va ga",
            "quebra de linha": "https://www.empregare.com/vaga\nhttps://evil.com",
            "ftp": "ftp://www.empregare.com/vaga",
            "file": "file:///etc/passwd",
            "javascript": "javascript:alert(1)",
            "sem esquema": "www.empregare.com/vaga",
            "vazia": "",
            "so espacos": "   ",
            "porta invalida": "https://www.empregare.com:abc/vaga",
            "host nao ascii": "https://www.empregare.com。evil.com/vaga",
            "acima do tamanho": "https://www.empregare.com/" + "a" * 3000,
        }
        for nome, url in casos.items():
            with self.subTest(nome):
                with self.assertRaises(UrlNaoPermitidaError):
                    validar_url_vaga(url)

    def test_rejeita_tipos_que_nao_sao_texto(self):
        for valor in (None, 123, b"https://www.empregare.com/x", ["x"]):
            with self.subTest(valor=valor):
                with self.assertRaises(UrlNaoPermitidaError):
                    validar_url_vaga(valor)

    def test_mensagem_de_erro_nao_vaza_o_destino(self):
        with self.assertRaises(UrlNaoPermitidaError) as ctx:
            validar_url_vaga("http://169.254.169.254/latest/meta-data/")
        self.assertNotIn("169.254", str(ctx.exception))

    def test_erro_e_request_exception(self):
        # extrair_vaga já captura RequestException e devolve {}.
        self.assertTrue(issubclass(UrlNaoPermitidaError, requests.exceptions.RequestException))


class IpPublicoTests(unittest.TestCase):
    def test_publicos(self):
        for ip in (IP_PUBLICO_REAL, "1.1.1.1", "2606:4700:4700::1111"):
            with self.subTest(ip=ip):
                self.assertTrue(ip_publico(ip))

    def test_nao_publicos(self):
        for ip in (
            "127.0.0.1", "127.1.2.3", "::1", "0.0.0.0", "::",
            "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1",
            "169.254.169.254", "169.254.0.1", "fe80::1", "fd00::1",
            "100.64.0.1",  # CGNAT
            "224.0.0.1", "240.0.0.1", "255.255.255.255",
            "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:169.254.169.254",
            "2002:7f00:0001::1",  # 6to4 embutindo 127.0.0.1
            "2002:0a00:0001::1",  # 6to4 embutindo 10.0.0.1
            "64:ff9b::7f00:1",  # NAT64 embutindo 127.0.0.1
            "64:ff9b::a9fe:a9fe",  # NAT64 embutindo 169.254.169.254
            "nao-e-ip", "", "999.1.1.1",
        ):
            with self.subTest(ip=ip):
                self.assertFalse(ip_publico(ip))


class ConectarValidadoTests(unittest.TestCase):
    def test_conecta_ao_ip_validado_e_resolve_uma_unica_vez(self):
        sock = mock.Mock()
        with mock.patch("socket.getaddrinfo", return_value=addrinfo(IP_PUBLICO_REAL)) as gai, \
                mock.patch("socket.create_connection", return_value=sock) as cc:
            resultado = conectar_validado("www.empregare.com", 443, timeout=5)
        self.assertIs(resultado, sock)
        self.assertEqual(gai.call_count, 1)
        # Conecta ao IP validado, nunca ao nome (sem segunda resolução).
        self.assertEqual(cc.call_args.args[0], (IP_PUBLICO_REAL, 443))

    def test_dns_rebinding_segunda_resolucao_privada_nunca_e_usada(self):
        # Primeira resposta pública; qualquer nova resolução devolveria privado.
        respostas = [addrinfo(IP_PUBLICO_REAL), addrinfo("127.0.0.1")]
        with mock.patch("socket.getaddrinfo", side_effect=respostas) as gai, \
                mock.patch("socket.create_connection", return_value=mock.Mock()) as cc:
            conectar_validado("www.empregare.com", 443)
        self.assertEqual(gai.call_count, 1)
        self.assertEqual(cc.call_args.args[0][0], IP_PUBLICO_REAL)

    def test_bloqueia_ip_privado_sem_conectar(self):
        for ip in ("127.0.0.1", "10.0.0.5", "192.168.0.10", "169.254.169.254", "::1", "::ffff:10.0.0.1"):
            with self.subTest(ip=ip):
                with mock.patch("socket.getaddrinfo", return_value=addrinfo(ip)), \
                        mock.patch("socket.create_connection") as cc:
                    with self.assertRaises(DestinoBloqueadoError):
                        conectar_validado("www.empregare.com", 443)
                cc.assert_not_called()

    def test_resposta_mista_publica_e_privada_e_bloqueada(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo(IP_PUBLICO_REAL, "10.0.0.5")), \
                mock.patch("socket.create_connection") as cc:
            with self.assertRaises(DestinoBloqueadoError):
                conectar_validado("www.empregare.com", 443)
        cc.assert_not_called()

    def test_falha_de_dns(self):
        with mock.patch("socket.getaddrinfo", side_effect=socket.gaierror("falhou")), \
                mock.patch("socket.create_connection") as cc:
            with self.assertRaises(OSError) as ctx:
                conectar_validado("www.empregare.com", 443)
        self.assertNotIsInstance(ctx.exception, DestinoBloqueadoError)
        cc.assert_not_called()

    def test_dns_sem_enderecos(self):
        with mock.patch("socket.getaddrinfo", return_value=[]), \
                mock.patch("socket.create_connection") as cc:
            with self.assertRaises(OSError):
                conectar_validado("www.empregare.com", 443)
        cc.assert_not_called()

    def test_tenta_o_proximo_ip_publico_se_o_primeiro_falha(self):
        sock = mock.Mock()
        with mock.patch("socket.getaddrinfo", return_value=addrinfo(IP_PUBLICO_REAL, "1.1.1.1")), \
                mock.patch("socket.create_connection", side_effect=[OSError("recusado"), sock]) as cc:
            self.assertIs(conectar_validado("www.empregare.com", 443), sock)
        self.assertEqual([c.args[0][0] for c in cc.call_args_list], [IP_PUBLICO_REAL, "1.1.1.1"])

    def test_mensagem_de_bloqueio_nao_vaza_ip(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo("10.1.2.3")):
            with self.assertRaises(DestinoBloqueadoError) as ctx:
                conectar_validado("www.empregare.com", 443)
        self.assertNotIn("10.1.2.3", str(ctx.exception))


class AdaptadorIntegradoTests(unittest.TestCase):
    """Garante que o requests REAL passa por conectar_validado (wiring)."""

    def _sessao(self):
        return http_segura.criar_sessao_segura({"User-Agent": "teste"})

    def test_requests_nao_conecta_quando_dns_aponta_para_ip_privado(self):
        for esquema in ("http", "https"):
            with self.subTest(esquema=esquema):
                with mock.patch("socket.getaddrinfo", return_value=addrinfo("10.0.0.5")), \
                        mock.patch("socket.create_connection") as cc:
                    with self.assertRaises(requests.exceptions.ConnectionError):
                        self._sessao().get(f"{esquema}://www.empregare.com/", timeout=1)
                cc.assert_not_called()

    def test_requests_nao_conecta_com_metadados_de_nuvem(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo("169.254.169.254")), \
                mock.patch("socket.create_connection") as cc:
            with self.assertRaises(requests.exceptions.ConnectionError):
                self._sessao().get("http://www.empregare.com/", timeout=1)
        cc.assert_not_called()

    def test_requests_tenta_conectar_ao_ip_publico_validado(self):
        # create_connection falha de propósito: só verificamos o alvo da conexão.
        with mock.patch("socket.getaddrinfo", return_value=addrinfo(IP_PUBLICO_REAL)) as gai, \
                mock.patch("socket.create_connection", side_effect=OSError("sem rede (mock)")) as cc:
            with self.assertRaises(requests.exceptions.ConnectionError):
                self._sessao().get("http://www.empregare.com/", timeout=1)
        self.assertEqual(cc.call_args.args[0], (IP_PUBLICO_REAL, 80))
        self.assertEqual(gai.call_count, 1)

    def test_sessao_ignora_proxy_de_ambiente(self):
        sessao = self._sessao()
        self.assertFalse(sessao.trust_env)
        self.assertEqual(sessao.proxies, {})
        self.assertIsInstance(sessao.get_adapter("https://www.empregare.com/"), AdaptadorSeguro)
        self.assertIsInstance(sessao.get_adapter("http://www.empregare.com/"), AdaptadorSeguro)
        self.assertEqual(sessao.headers["User-Agent"], "teste")


class RespostaFalsa:
    def __init__(self, status=200, location=None, texto="<html>ok</html>"):
        self.status_code = status
        self.headers = {"Location": location} if location else {}
        self.text = texto
        self.fechada = False

    def close(self):
        self.fechada = True

    def iter_content(self, chunk_size=1):
        # Interface de streaming usada por baixar_html_seguro (corpo lido em blocos).
        yield self.text.encode("utf-8")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"{self.status_code}")


class SessaoFalsa:
    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.urls = []
        self.kwargs = []

    def get(self, url, **kwargs):
        self.urls.append(url)
        self.kwargs.append(kwargs)
        return self.respostas.pop(0)


class RedirecionamentosTests(unittest.TestCase):
    def test_url_legitima_sem_redirecionamento(self):
        sessao = SessaoFalsa([RespostaFalsa()])
        resposta = baixar_html_seguro(URL_OK, sessao)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(sessao.urls, [URL_OK])
        self.assertIs(sessao.kwargs[0]["allow_redirects"], False)

    def test_redirecionamento_permitido_e_seguido(self):
        sessao = SessaoFalsa([
            RespostaFalsa(301, "https://empresa.empregare.com/vaga/1"),
            RespostaFalsa(200),
        ])
        resposta = baixar_html_seguro(URL_OK, sessao)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(sessao.urls[1], "https://empresa.empregare.com/vaga/1")

    def test_redirecionamento_relativo_e_resolvido(self):
        sessao = SessaoFalsa([RespostaFalsa(302, "/pt-br/outra-vaga_2"), RespostaFalsa(200)])
        baixar_html_seguro(URL_OK, sessao)
        self.assertEqual(sessao.urls[1], "https://www.empregare.com/pt-br/outra-vaga_2")

    def test_redirecionamentos_para_destinos_proibidos(self):
        destinos = {
            "outro dominio": "https://example.com/vaga",
            "localhost": "http://localhost/admin",
            "loopback": "http://127.0.0.1:8080/",
            "ip privado": "http://192.168.0.1/",
            "link-local": "http://169.254.1.1/",
            "metadados aws/gcp/azure": "http://169.254.169.254/latest/meta-data/",
            "metadados gcp": "http://metadata.google.internal/computeMetadata/v1/",
            "ipv6 loopback": "http://[::1]/",
            "esquema file": "file:///etc/passwd",
            "credenciais": "https://u:p@www.empregare.com/x",
            "porta": "https://www.empregare.com:6379/",
        }
        for nome, destino in destinos.items():
            with self.subTest(nome):
                resposta_redirect = RespostaFalsa(302, destino)
                sessao = SessaoFalsa([resposta_redirect, RespostaFalsa(200)])
                with self.assertRaises(UrlNaoPermitidaError):
                    baixar_html_seguro(URL_OK, sessao)
                # Nunca chegou a requisitar o destino proibido.
                self.assertEqual(sessao.urls, [URL_OK])

    def test_url_inicial_proibida_nem_faz_requisicao(self):
        sessao = SessaoFalsa([RespostaFalsa()])
        with self.assertRaises(UrlNaoPermitidaError):
            baixar_html_seguro("http://127.0.0.1/", sessao)
        self.assertEqual(sessao.urls, [])

    def test_redirecionamentos_excessivos(self):
        n = http_segura.MAXIMO_REDIRECIONAMENTOS
        sessao = SessaoFalsa([RespostaFalsa(302, URL_OK) for _ in range(n + 5)])
        with self.assertRaises(requests.exceptions.TooManyRedirects):
            baixar_html_seguro(URL_OK, sessao)
        self.assertEqual(len(sessao.urls), n + 1)

    def test_exatamente_no_limite_de_redirecionamentos_funciona(self):
        n = http_segura.MAXIMO_REDIRECIONAMENTOS
        sessao = SessaoFalsa([RespostaFalsa(302, URL_OK) for _ in range(n)] + [RespostaFalsa(200)])
        self.assertEqual(baixar_html_seguro(URL_OK, sessao).status_code, 200)

    def test_orcamento_total_de_tempo(self):
        sessao = SessaoFalsa([RespostaFalsa()])
        with self.assertRaises(requests.exceptions.Timeout):
            baixar_html_seguro(URL_OK, sessao, orcamento_segundos=0)
        self.assertEqual(sessao.urls, [])

    def test_redirect_sem_location_e_devolvido_como_resposta(self):
        sessao = SessaoFalsa([RespostaFalsa(302)])
        self.assertEqual(baixar_html_seguro(URL_OK, sessao).status_code, 302)

    def test_timeout_e_repassado(self):
        sessao = SessaoFalsa([RespostaFalsa()])
        baixar_html_seguro(URL_OK, sessao, timeout=7)
        self.assertLessEqual(sessao.kwargs[0]["timeout"], 7)


class BaixarHtmlTests(unittest.TestCase):
    """Regressão: o contrato de baixar_html/extrair_vaga continua o mesmo."""

    def _com_sessao(self, respostas):
        sessao = SessaoFalsa(respostas)
        patch = mock.patch.object(extrator, "criar_sessao_segura", return_value=sessao)
        patch.start()
        self.addCleanup(patch.stop)
        return sessao

    def test_devolve_o_html_em_200(self):
        self._com_sessao([RespostaFalsa(200, texto="<html>vaga</html>")])
        self.assertEqual(extrator.baixar_html(URL_OK), "<html>vaga</html>")

    def test_segue_redirecionamento_permitido(self):
        self._com_sessao([RespostaFalsa(301, "https://empresa.empregare.com/v/1"),
                          RespostaFalsa(200, texto="<html>final</html>")])
        self.assertEqual(extrator.baixar_html(URL_OK), "<html>final</html>")

    def test_404_e_403_mantem_mensagens_originais(self):
        self._com_sessao([RespostaFalsa(404)])
        with self.assertRaisesRegex(requests.exceptions.RequestException, "404"):
            extrator.baixar_html(URL_OK)
        self._com_sessao([RespostaFalsa(403)])
        with self.assertRaisesRegex(requests.exceptions.RequestException, "403"):
            extrator.baixar_html(URL_OK)

    def test_500_levanta_http_error(self):
        self._com_sessao([RespostaFalsa(500)])
        with self.assertRaises(requests.exceptions.HTTPError):
            extrator.baixar_html(URL_OK)

    def test_envia_os_headers_originais(self):
        with mock.patch.object(extrator, "criar_sessao_segura", return_value=SessaoFalsa([RespostaFalsa()])) as criar:
            extrator.baixar_html(URL_OK)
        criar.assert_called_once_with(extrator.HEADERS)

    def test_extrair_vaga_devolve_vazio_para_url_proibida(self):
        for url in ("http://169.254.169.254/latest/meta-data/", "http://localhost/", "https://example.com/vaga"):
            with self.subTest(url=url):
                with mock.patch("builtins.print"), \
                        mock.patch("socket.create_connection") as cc:
                    self.assertEqual(extrator.extrair_vaga(url), {})
                cc.assert_not_called()

    def test_extrair_vaga_devolve_vazio_quando_redirect_vai_para_interno(self):
        self._com_sessao([RespostaFalsa(302, "http://169.254.169.254/latest/meta-data/")])
        with mock.patch("builtins.print") as imprimir:
            self.assertEqual(extrator.extrair_vaga(URL_OK), {})
        saida = " ".join(str(c.args[0]) for c in imprimir.call_args_list)
        self.assertNotIn("169.254", saida)

    def test_extrair_vaga_devolve_vazio_quando_dns_aponta_para_ip_privado(self):
        with mock.patch("builtins.print") as imprimir, \
                mock.patch("socket.getaddrinfo", return_value=addrinfo("10.0.0.5")), \
                mock.patch("socket.create_connection") as cc:
            self.assertEqual(extrator.extrair_vaga(URL_OK), {})
        cc.assert_not_called()
        self.assertNotIn("10.0.0.5", " ".join(str(c.args[0]) for c in imprimir.call_args_list))


if __name__ == "__main__":
    unittest.main()
