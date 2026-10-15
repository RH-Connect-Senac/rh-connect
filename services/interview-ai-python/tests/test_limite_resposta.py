"""Limite de tamanho do corpo e política de tempo do extrator da Empregare.

Sem rede: respostas são geradores/objetos falsos ou ``requests.Response`` reais
montadas sobre ``BytesIO`` (para exercitar a descompressão gzip de verdade).
"""
import gzip
import io
import unittest
from unittest import mock

import requests
from urllib3.response import HTTPResponse

import extrair_empregare_original as extrator
import http_segura
from http_segura import (
    MAXIMO_BYTES_RESPOSTA,
    ORCAMENTO_TOTAL_SEGUNDOS,
    TIMEOUT_REQUISICAO,
    RespostaMuitoGrandeError,
    baixar_html_seguro,
)

URL_OK = "https://www.empregare.com/pt-br/vaga-analista-comercial-sdr_179971"
BLOCO = 16 * 1024


class SessaoFalsa:
    def __init__(self, *respostas):
        self.respostas = list(respostas)
        self.kwargs = []

    def get(self, url, **kwargs):
        self.kwargs.append(kwargs)
        return self.respostas.pop(0)


class RespostaInfinita:
    """Entrega blocos para sempre; conta quantos foram consumidos."""

    status_code = 200

    def __init__(self, headers=None, bloco=b"x" * BLOCO):
        self.headers = headers or {}
        self.bloco = bloco
        self.blocos_lidos = 0
        self.fechada = False

    def iter_content(self, chunk_size=1):
        while True:
            self.blocos_lidos += 1
            yield self.bloco

    def close(self):
        self.fechada = True


def resposta_real(corpo: bytes, headers=None, status=200) -> requests.Response:
    """requests.Response real; ``corpo`` pode estar comprimido (Content-Encoding)."""
    cabecalhos = {"Content-Type": "text/html; charset=utf-8", **(headers or {})}
    resposta = requests.Response()
    resposta.status_code = status
    resposta.headers.update(cabecalhos)
    resposta.raw = HTTPResponse(
        body=io.BytesIO(corpo), headers=cabecalhos, preload_content=False, status=status
    )
    resposta.url = URL_OK
    return resposta


class LimiteDeTamanhoTests(unittest.TestCase):
    def test_pagina_legitima_continua_sendo_lida_por_inteiro(self):
        html = ("<html><body>" + "vaga " * 20000 + "</body></html>").encode()
        resposta = baixar_html_seguro(URL_OK, SessaoFalsa(resposta_real(html)))
        self.assertEqual(resposta.content, html)
        self.assertEqual(resposta.text, html.decode())

    def test_pede_a_resposta_em_streaming(self):
        sessao = SessaoFalsa(resposta_real(b"<html></html>"))
        baixar_html_seguro(URL_OK, sessao)
        self.assertIs(sessao.kwargs[0]["stream"], True)
        self.assertIs(sessao.kwargs[0]["allow_redirects"], False)

    def test_corpo_exatamente_no_limite_e_aceito(self):
        resposta = baixar_html_seguro(
            URL_OK, SessaoFalsa(resposta_real(b"a" * 1000)), maximo_bytes=1000
        )
        self.assertEqual(len(resposta.content), 1000)

    def test_um_byte_acima_do_limite_e_recusado(self):
        with self.assertRaises(RespostaMuitoGrandeError):
            baixar_html_seguro(URL_OK, SessaoFalsa(resposta_real(b"a" * 1001)), maximo_bytes=1000)

    def test_content_length_acima_do_limite_recusa_sem_ler_o_corpo(self):
        falsa = RespostaInfinita({"Content-Length": str(MAXIMO_BYTES_RESPOSTA + 1)})
        with self.assertRaises(RespostaMuitoGrandeError):
            baixar_html_seguro(URL_OK, SessaoFalsa(falsa))
        self.assertEqual(falsa.blocos_lidos, 0)
        self.assertTrue(falsa.fechada)

    def test_corpo_infinito_sem_content_length_para_no_limite(self):
        """A leitura é interrompida DURANTE o download, não depois dele."""
        falsa = RespostaInfinita()
        limite = 10 * BLOCO
        with self.assertRaises(RespostaMuitoGrandeError):
            baixar_html_seguro(URL_OK, SessaoFalsa(falsa), maximo_bytes=limite)
        self.assertLessEqual(falsa.blocos_lidos, 11)
        self.assertTrue(falsa.fechada)

    def test_content_length_mentiroso_nao_burla_o_limite(self):
        falsa = RespostaInfinita({"Content-Length": "10"})
        with self.assertRaises(RespostaMuitoGrandeError):
            baixar_html_seguro(URL_OK, SessaoFalsa(falsa), maximo_bytes=5 * BLOCO)
        self.assertLessEqual(falsa.blocos_lidos, 6)

    def test_gzip_bomb_e_limitada_pelo_tamanho_descomprimido(self):
        descomprimido = 50 * 1024 * 1024
        comprimido = gzip.compress(b"\0" * descomprimido)
        self.assertLess(len(comprimido), 200 * 1024)  # pequeno na rede, enorme na memória
        resposta = resposta_real(comprimido, {"Content-Encoding": "gzip"})
        with self.assertRaises(RespostaMuitoGrandeError):
            baixar_html_seguro(URL_OK, SessaoFalsa(resposta), maximo_bytes=1024 * 1024)

    def test_gzip_legitimo_e_descomprimido_normalmente(self):
        html = ("<html>" + "vaga " * 5000 + "</html>").encode()
        resposta = resposta_real(gzip.compress(html), {"Content-Encoding": "gzip"})
        lida = baixar_html_seguro(URL_OK, SessaoFalsa(resposta))
        self.assertEqual(lida.content, html)

    def test_redirecionamento_nao_baixa_o_corpo(self):
        redirecionamento = RespostaInfinita({"Location": "https://empresa.empregare.com/v/1"})
        redirecionamento.status_code = 302
        final = resposta_real(b"<html>final</html>")
        baixar_html_seguro(URL_OK, SessaoFalsa(redirecionamento, final))
        self.assertEqual(redirecionamento.blocos_lidos, 0)
        self.assertTrue(redirecionamento.fechada)

    def test_resposta_de_erro_nao_baixa_o_corpo(self):
        erro = RespostaInfinita()
        erro.status_code = 500
        resposta = baixar_html_seguro(URL_OK, SessaoFalsa(erro))
        self.assertEqual(erro.blocos_lidos, 0)
        self.assertEqual(resposta.status_code, 500)

    def test_corpo_gotejando_estoura_o_orcamento_de_tempo(self):
        falsa = RespostaInfinita(bloco=b"x")
        relogio = iter([0.0, 0.0] + [1000.0] * 50)
        with mock.patch.object(http_segura.time, "monotonic", side_effect=lambda: next(relogio)):
            with self.assertRaises(requests.exceptions.Timeout):
                baixar_html_seguro(URL_OK, SessaoFalsa(falsa), orcamento_segundos=15)
        self.assertLessEqual(falsa.blocos_lidos, 3)
        self.assertTrue(falsa.fechada)


class ExtratorComLimiteTests(unittest.TestCase):
    def _post(self, resposta):
        from app import create_app

        with mock.patch.object(extrator, "criar_sessao_segura", return_value=SessaoFalsa(resposta)), \
                mock.patch("builtins.print"):
            return create_app().test_client().post("/job-context", json={"url": URL_OK})

    def test_resposta_excessiva_vira_erro_explicito_sem_vazar(self):
        resp = self._post(RespostaInfinita())
        self.assertEqual(resp.status_code, 502)
        corpo = resp.get_json()
        self.assertEqual(corpo["code"], "RESPOSTA_MUITO_GRANDE")
        self.assertNotIn("title", corpo)
        self.assertNotIn("5242880", resp.get_data(as_text=True))

    def test_extrair_vaga_legado_devolve_vazio_para_resposta_excessiva(self):
        with mock.patch.object(extrator, "criar_sessao_segura", return_value=SessaoFalsa(RespostaInfinita())), \
                mock.patch("builtins.print"):
            self.assertEqual(extrator.extrair_vaga(URL_OK), {})


class PoliticaDeTempoTests(unittest.TestCase):
    def test_orcamento_do_python_e_menor_que_o_timeout_do_nest(self):
        # NestJS: INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS padrão = 20000 ms. O Python
        # precisa terminar (e responder 504 TEMPO_ESGOTADO) antes disso.
        nest_job_context_timeout = 20
        self.assertLess(ORCAMENTO_TOTAL_SEGUNDOS, nest_job_context_timeout)
        self.assertLessEqual(TIMEOUT_REQUISICAO, ORCAMENTO_TOTAL_SEGUNDOS)

    def test_extrator_usa_os_padroes_de_http_segura(self):
        sessao = SessaoFalsa(resposta_real(b"<html></html>"))
        with mock.patch.object(extrator, "criar_sessao_segura", return_value=sessao):
            extrator.baixar_html(URL_OK)
        self.assertEqual(sessao.kwargs[0]["timeout"], TIMEOUT_REQUISICAO)

    def test_orcamento_total_limita_a_soma_dos_redirecionamentos(self):
        def redireciona():
            r = RespostaInfinita({"Location": "/pt-br/proxima"})
            r.status_code = 302
            return r

        relogio = iter([0.0, 1.0, 20.0, 20.0, 20.0])
        sessao = SessaoFalsa(*[redireciona() for _ in range(5)])
        with mock.patch.object(http_segura.time, "monotonic", side_effect=lambda: next(relogio)):
            with self.assertRaises(requests.exceptions.Timeout):
                baixar_html_seguro(URL_OK, sessao, orcamento_segundos=15)
        # nenhum timeout individual passa do que resta do orçamento
        self.assertTrue(all(k["timeout"] <= TIMEOUT_REQUISICAO for k in sessao.kwargs))


if __name__ == "__main__":
    unittest.main()
