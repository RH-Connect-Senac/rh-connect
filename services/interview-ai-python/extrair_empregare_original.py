import requests
from bs4 import BeautifulSoup
import json
import re
import sys

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;'
              'q=0.9,image/avif,image/webp,image/apng,*/*;'
              'q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Referer': 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
}

MARCADORES_BLOQUEIO = [
    "request could not be satisfied", "request blocked",
    "cloudfront", "access denied", "attention required",
    "checking your browser", "cf-browser-verification",
]


def limpar_espacos(texto: str) -> str:
    if not texto:
        return ""
    texto = re.sub(r'\s{2,}', ' ', texto)
    return texto.strip(' \n\t-•*')


def baixar_html(url: str) -> str:
    session = requests.Session()
    session.headers.update(HEADERS)
    response = session.get(url, timeout=15, allow_redirects=True)
    if response.status_code == 404:
        raise requests.exceptions.RequestException("404 - vaga não encontrada (removida/expirada)")
    if response.status_code == 403:
        raise requests.exceptions.RequestException("403 - requisição bloqueada (anti-bot)")
    response.raise_for_status()
    return response.text


def _pagina_bloqueada(texto_completo: str) -> bool:
    texto_norm = texto_completo.lower()
    return len(texto_completo) < 1000 and any(m in texto_norm for m in MARCADORES_BLOQUEIO)


def _formatar_reais(valor) -> str:
    if valor is None:
        return ""
    try:
        inteiro, decimal = f"{float(valor):.2f}".split('.')
        inteiro_fmt = f"{int(inteiro):,}".replace(',', '.')
        return f"R$ {inteiro_fmt},{decimal}"
    except (ValueError, TypeError):
        return str(valor)


def _extrair_json_ld(soup) -> dict:
    for script in soup.find_all('script', type='application/ld+json'):
        if not script.string:
            continue
        try:
            dados = json.loads(script.string)
        except json.JSONDecodeError:
            continue
        if dados.get('@type') == 'JobPosting':
            return dados
    return {}


def _extrair_campo_label(soup, label: str) -> str:
    for small in soup.find_all('small'):
        b = small.find('b')
        if b and label.lower() in b.get_text(strip=True).lower():
            texto_completo = small.get_text(separator=' ', strip=True)
            rotulo = b.get_text(strip=True)
            return limpar_espacos(texto_completo.replace(rotulo, '', 1))
    return ""


def _extrair_linhas_texto(soup_bloco) -> list:
    lis = soup_bloco.find_all('li')
    if lis:
        return [limpar_espacos(li.get_text(strip=True)) for li in lis if limpar_espacos(li.get_text(strip=True))]

    for elemento in soup_bloco.find_all(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        elemento.replace_with('\n')

    linhas = soup_bloco.get_text(separator='\n').splitlines()
    itens = []
    for linha in linhas:
        texto = limpar_espacos(linha)
        if texto and len(texto) > 2 and not re.match(r'^(requisito|atividad|perfil|qualifica|descri)', texto, re.IGNORECASE):
            itens.append(texto)
            
    return itens


def _dividir_atividades_requisitos(descricao_html: str) -> tuple:
    if not descricao_html:
        return [], []

    padrao_divisor = re.compile(
        r'(?:<strong>|<b>|<p>|<div>|\n)?\s*(?:Principais\s+)?(?:Requisitos|Qualifica[çc][õo]es|Perfil\s+Desejado|O\s+que\s+esperamos(?:\s+de\s+voc[êe])?)\s*:?\s*(?:</strong>|</b>|</p>|</div>)?',
        re.IGNORECASE
    )

    divisao = padrao_divisor.split(descricao_html, maxsplit=1)

    if len(divisao) == 2:
        parte_atividades, parte_requisitos = divisao[0], divisao[1]
    else:
        parte_atividades, parte_requisitos = descricao_html, ''

    soup_atividades = BeautifulSoup(parte_atividades, 'html.parser')
    soup_requisitos = BeautifulSoup(parte_requisitos, 'html.parser')

    atividades = _extrair_linhas_texto(soup_atividades)
    requisitos = _extrair_linhas_texto(soup_requisitos)

    return atividades, requisitos


def _extrair_bloco_texto(soup, termos_busca: list) -> list:
    itens = []
    for tag in soup.find_all(['h2', 'h3', 'h4', 'h5', 'b', 'strong', 'p']):
        texto = tag.get_text(strip=True).lower()
        if any(termo in texto for termo in termos_busca):
            proximo = tag.find_next_sibling(['ul', 'ol', 'p', 'div'])
            if proximo:
                lis = proximo.find_all('li')
                if lis:
                    itens.extend([limpar_espacos(li.get_text()) for li in lis if limpar_espacos(li.get_text())])
                else:
                    linhas = proximo.get_text(separator='\n').splitlines()
                    itens.extend([limpar_espacos(l) for l in linhas if limpar_espacos(l)])

            if not itens and tag.parent:
                lis = tag.parent.find_all('li')
                if lis:
                    itens.extend([limpar_espacos(li.get_text()) for li in lis if limpar_espacos(li.get_text())])

            if itens:
                break

    return [i for i in itens if i.lower() not in ['requisitos:', 'requisitos', 'atividades:', 'descrição:', 'descricao:']]


def extrair_vaga(url: str, debug: bool = False) -> dict:
    try:
        html = baixar_html(url)
    except requests.exceptions.RequestException as e:
        print(f"Erro ao acessar a URL: {e}")
        return {}

    soup = BeautifulSoup(html, 'html.parser')
    texto_completo = soup.get_text(separator=' ', strip=True)

    if debug:
        print(f"[debug] Tamanho do HTML bruto: {len(html)} caracteres")
        print(f"[debug] Tamanho do texto visível: {len(texto_completo)} caracteres")

    if _pagina_bloqueada(texto_completo):
        if debug:
            print("[debug] BLOQUEIO DETECTADO: página de desafio/bloqueio anti-bot.")
        return {}

    job_ld = _extrair_json_ld(soup)

    if debug:
        print(f"[debug] JSON-LD encontrado: {'sim' if job_ld else 'não'}")

    empresa = (job_ld.get('hiringOrganization') or {}).get('name', '')
    salario_valor = ((job_ld.get('baseSalary') or {}).get('value') or {}).get('value')

    localizacoes = []
    for local in job_ld.get('jobLocation') or []:
        addr = local.get('address') or {}
        partes = [addr.get('addressLocality', ''), addr.get('addressRegion', ''),
                  addr.get('addressCountry', '')]
        localizacoes.append(', '.join(p for p in partes if p))

    descricao_html = job_ld.get('description', '')
    atividades, requisitos = _dividir_atividades_requisitos(descricao_html)

    atividades = [a for a in atividades if a.lower() not in ['descrição:', 'descricao:', '']]
    requisitos = [r for r in requisitos if r.lower() not in ['requisitos:', 'requisitos', '']]

    # Fallback no HTML caso o JSON-LD venha incompleto
    if not requisitos:
        div_req = soup.find('div', id='requisitos-vaga') or soup.find('div', class_='requisitos-vaga')
        if div_req:
            requisitos = [limpar_espacos(li.get_text()) for li in div_req.find_all('li')]

    if not requisitos:
        requisitos = _extrair_bloco_texto(soup, ['requisito', 'qualifica', 'perfil', 'o que esperamos'])

    if not atividades:
        atividades = _extrair_bloco_texto(soup, ['ativida', 'responsab', 'descri'])

    beneficios = [b.strip() for b in (job_ld.get('jobBenefits') or '').split(',') if b.strip()]
    codigo_tag = soup.find('input', id='VagaID')

    vaga = {
        "titulo": job_ld.get('title', ''),
        "url": job_ld.get('url', url),
        "codigo_vaga": codigo_tag.get('value', '') if codigo_tag else '',
        "empresa": empresa,
        "salario": _formatar_reais(salario_valor),
        "tipo_contrato": job_ld.get('employmentType', ''),
        "data_publicacao": job_ld.get('datePosted', ''),
        "valido_ate": job_ld.get('validThrough', ''),
        "localizacao": '; '.join(localizacoes),
        "escolaridade": _extrair_campo_label(soup, 'Escolaridade'),
        "habilitacao": _extrair_campo_label(soup, 'Habilita'),
        "regime_contratacao": _extrair_campo_label(soup, 'Regime de contrata'),
        "horario": _extrair_campo_label(soup, 'Horário') or _extrair_campo_label(soup, 'Hor'),
        "beneficios": beneficios,
        "atividades": atividades,
        "requisitos": requisitos,
    }

    if debug:
        print(f"[debug] Vaga extraída:\n{json.dumps(vaga, ensure_ascii=False, indent=2)}")

    return vaga


if __name__ == "__main__":
    if len(sys.argv) > 1:
        url_vaga = sys.argv[1]
    else:
        print("Erro: Nenhuma URL fornecida.")
        print('Uso correto: python extrair_empregare.py "https://www.empregare.com/pt-br/vaga-..."')
        sys.exit(1)

    print(f"Extraindo vaga de: {url_vaga} ...\n")
    vaga = extrair_vaga(url_vaga, debug=True)

    print("\nRequisitos da vaga:")
    for req in vaga.get("requisitos", []):
        print(f"- {req}")