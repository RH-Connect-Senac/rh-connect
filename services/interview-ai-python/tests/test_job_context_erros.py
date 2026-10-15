"""Contrato de erros de POST /job-context (Flask) e do adapter.

Garante que falhas reais da extração NUNCA virem HTTP 200 com contexto vazio,
que cada causa receba status/código próprios e que nenhuma resposta vaze IPs,
hosts internos ou mensagens de exceção. Nenhum teste usa a rede: DNS e sockets
são mocks e as respostas HTTP vêm de sessões falsas.
"""
import json
import socket
import unittest
from unittest import mock

import requests

import extrair_empregare_original as extrator
import job_context_adapter as adapter
from app import create_app
from job_context_adapter import JobContextAdapterError, extract_job_context

URL_OK = "https://www.empregare.com/pt-br/vaga-analista-comercial-sdr_179971"

HTML_VAGA = """<html><head><script type="application/ld+json">%s</script></head>
<body><input id="VagaID" value="179971"><h1>Analista Comercial SDR</h1></body></html>""" % json.dumps({
    "@type": "JobPosting",
    "title": "Analista Comercial SDR",
    "hiringOrganization": {"name": "Empresa Exemplo"},
    "employmentType": "CLT",
    "jobLocation": [{"address": {"addressLocality": "Sao Paulo", "addressRegion": "SP",
                                 "addressCountry": "BR"}}],
    "description": "<p>Descrição:</p><ul><li>Prospectar clientes</li></ul>"
                   "<p>Requisitos:</p><ul><li>Ensino médio completo</li></ul>",
})
HTML_SEM_DADOS = "<html><body>" + ("<p>Conteudo qualquer sem vaga.</p>" * 60) + "</body></html>"
HTML_BLOQUEIO = "<html><body>Request blocked. CloudFront</body></html>"


class RespostaFalsa:
    def __init__(self, status=200, location=None, texto=HTML_VAGA):
        self.status_code = status
        self.headers = {"Location": location} if location else {}
        self.text = texto

    def close(self):
        pass

    def iter_content(self, chunk_size=1):
        # Interface de streaming usada por baixar_html_seguro (corpo lido em blocos).
        yield self.text.encode("utf-8")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"{self.status_code} http://10.0.0.5/x")


class SessaoFalsa:
    def __init__(self, itens):
        self.itens = list(itens)

    def get(self, url, **kwargs):
        item = self.itens.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item


def addrinfo(*ips):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443)) for ip in ips]


class _Base(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()
        silenciar = mock.patch("builtins.print")
        silenciar.start()
        self.addCleanup(silenciar.stop)

    def sessao(self, *itens):
        patch = mock.patch.object(extrator, "criar_sessao_segura", return_value=SessaoFalsa(itens))
        patch.start()
        self.addCleanup(patch.stop)

    def post(self, url=URL_OK):
        return self.client.post("/job-context", json={"url": url})

    def assertErro(self, resp, status, codigo):
        self.assertEqual(resp.status_code, status, resp.get_data(as_text=True))
        corpo = resp.get_json()
        self.assertEqual(corpo.get("code"), codigo)
        self.assertTrue(corpo.get("error"))
        self.assertNotIn("title", corpo)
        texto = resp.get_data(as_text=True)
        for proibido in ("10.0.0.5", "169.254", "127.0.0.1", "Traceback", "Errno", "http://"):
            self.assertNotIn(proibido, texto)


class SucessoTests(_Base):
    def test_vaga_valida_devolve_200_com_o_contrato_de_sempre(self):
        self.sessao(RespostaFalsa())
        resp = self.post()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json(), {
            "title": "Analista Comercial SDR",
            "company": "Empresa Exemplo",
            "summary": "",
            "activities": ["Prospectar clientes"],
            "requirements": ["Ensino médio completo"],
            "location": "Sao Paulo, SP, BR",
            "contractType": "CLT",
            "workMode": None,
            "sourceUrl": URL_OK,
        })

    def test_redirecionamento_permitido_continua_funcionando(self):
        self.sessao(RespostaFalsa(301, "https://empresa.empregare.com/v/1"), RespostaFalsa())
        self.assertEqual(self.post().status_code, 200)


class ErrosDeUrlTests(_Base):
    def test_url_ausente_e_400(self):
        resp = self.client.post("/job-context", json={})
        self.assertErro(resp, 400, "URL_AUSENTE")

    def test_url_nao_autorizada_e_422_explicito_sem_conexao(self):
        for url in ("https://example.com/vaga", "http://localhost:3000/", "ftp://empregare.com/x",
                    "http://169.254.169.254/latest/meta-data/"):
            with self.subTest(url=url), \
                    mock.patch("socket.getaddrinfo") as dns, \
                    mock.patch("socket.create_connection") as cc:
                self.assertErro(self.post(url), 422, "URL_NAO_PERMITIDA")
                dns.assert_not_called()
                cc.assert_not_called()

    def test_redirecionamento_proibido_e_422(self):
        self.sessao(RespostaFalsa(302, "http://169.254.169.254/latest/meta-data/"))
        self.assertErro(self.post(), 422, "REDIRECIONAMENTO_NAO_PERMITIDO")


class ErrosDeRedeTests(_Base):
    def test_destino_bloqueado_com_sessao_real_nao_conecta(self):
        for ip in ("10.0.0.5", "127.0.0.1", "169.254.169.254"):
            with self.subTest(ip=ip), \
                    mock.patch("socket.getaddrinfo", return_value=addrinfo(ip)), \
                    mock.patch("socket.create_connection") as cc:
                self.assertErro(self.post(), 502, "DESTINO_BLOQUEADO")
                cc.assert_not_called()

    def test_dns_mistos_com_um_ip_privado_sao_bloqueados(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo("8.8.8.8", "10.0.0.5")), \
                mock.patch("socket.create_connection") as cc:
            self.assertErro(self.post(), 502, "DESTINO_BLOQUEADO")
            cc.assert_not_called()

    def test_falha_de_dns(self):
        with mock.patch("socket.getaddrinfo", side_effect=socket.gaierror(-2, "Name or service not known")), \
                mock.patch("socket.create_connection") as cc:
            self.assertErro(self.post(), 502, "DNS_FALHOU")
            cc.assert_not_called()

    def test_conexao_recusada(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo("8.8.8.8")), \
                mock.patch("socket.create_connection", side_effect=ConnectionRefusedError(111, "refused")):
            self.assertErro(self.post(), 502, "ACESSO_VAGA_FALHOU")

    def test_timeout_de_conexao_com_sessao_real(self):
        with mock.patch("socket.getaddrinfo", return_value=addrinfo("8.8.8.8")), \
                mock.patch("socket.create_connection", side_effect=socket.timeout("timed out")):
            self.assertErro(self.post(), 504, "TEMPO_ESGOTADO")

    def test_timeouts_de_requests(self):
        for exc in (requests.exceptions.ReadTimeout("x"), requests.exceptions.ConnectTimeout("x"),
                    requests.exceptions.Timeout("Tempo total excedido.")):
            with self.subTest(exc=type(exc).__name__):
                self.sessao(exc)
                self.assertErro(self.post(), 504, "TEMPO_ESGOTADO")

    def test_redirecionamentos_demais(self):
        self.sessao(*[RespostaFalsa(302, "/pt-br/outra") for _ in range(10)])
        self.assertErro(self.post(), 502, "REDIRECIONAMENTOS_EXCESSIVOS")


class ErrosHttpDaEmpregareTests(_Base):
    def test_404_e_404(self):
        self.sessao(RespostaFalsa(404))
        self.assertErro(self.post(), 404, "VAGA_NAO_ENCONTRADA")

    def test_403_e_502_acesso_bloqueado(self):
        self.sessao(RespostaFalsa(403))
        self.assertErro(self.post(), 502, "VAGA_ACESSO_BLOQUEADO")

    def test_pagina_de_bloqueio_antibot(self):
        self.sessao(RespostaFalsa(200, texto=HTML_BLOQUEIO))
        self.assertErro(self.post(), 502, "VAGA_ACESSO_BLOQUEADO")

    def test_500_da_empregare_e_502(self):
        self.sessao(RespostaFalsa(500))
        self.assertErro(self.post(), 502, "ACESSO_VAGA_FALHOU")


class ErrosDeConteudoTests(_Base):
    def test_html_sem_dados_da_vaga_e_422_e_nao_200_vazio(self):
        self.sessao(RespostaFalsa(200, texto=HTML_SEM_DADOS))
        self.assertErro(self.post(), 422, "VAGA_SEM_DADOS")

    def test_titulo_sem_atividades_nem_requisitos_e_insuficiente(self):
        html = HTML_VAGA.replace("Prospectar clientes", "").replace("Ensino m\\u00e9dio completo", "")
        self.assertNotIn("completo", html)
        self.sessao(RespostaFalsa(200, texto=html))
        self.assertErro(self.post(), 422, "VAGA_SEM_DADOS")

    def test_falha_de_parsing_e_500_sem_vazar_detalhe(self):
        self.sessao(RespostaFalsa())
        with mock.patch.object(extrator, "_dividir_atividades_requisitos",
                               side_effect=RuntimeError("segredo interno 10.0.0.5")):
            self.assertErro(self.post(), 500, "EXTRACAO_FALHOU")

    def test_erro_inesperado_no_adapter_e_500_com_codigo(self):
        with mock.patch("app.extract_job_context", side_effect=RuntimeError("boom 10.0.0.5")):
            self.assertErro(self.post(), 500, "EXTRACAO_FALHOU")


class AdapterETests(unittest.TestCase):
    def test_extract_job_context_levanta_erro_tipado_com_codigo(self):
        with mock.patch.object(extrator, "criar_sessao_segura",
                               return_value=SessaoFalsa([RespostaFalsa(404)])):
            with self.assertRaises(JobContextAdapterError) as ctx:
                extract_job_context(URL_OK)
        self.assertEqual((ctx.exception.status_code, ctx.exception.code), (404, "VAGA_NAO_ENCONTRADA"))

    def test_estrito_propaga_e_legado_continua_devolvendo_vazio(self):
        with mock.patch.object(extrator, "criar_sessao_segura",
                               return_value=SessaoFalsa([RespostaFalsa(404)])):
            with self.assertRaises(extrator.VagaNaoEncontradaError):
                extrator.extrair_vaga_estrito(URL_OK)
        with mock.patch.object(extrator, "criar_sessao_segura",
                               return_value=SessaoFalsa([RespostaFalsa(404)])), \
                mock.patch("builtins.print"):
            self.assertEqual(extrator.extrair_vaga(URL_OK), {})

    def test_todo_codigo_tem_status_e_mensagem_sem_dado_interno(self):
        for codigo, (status, mensagem) in adapter._ERROS.items():
            with self.subTest(codigo=codigo):
                self.assertIn(status, (400, 404, 422, 500, 502, 504))
                self.assertNotRegex(mensagem, r"\d+\.\d+|http|Traceback")

    def test_nem_toda_falha_e_422(self):
        statuses = {status for status, _ in adapter._ERROS.values()}
        self.assertTrue({404, 422, 502, 504} <= statuses)


if __name__ == "__main__":
    unittest.main()
