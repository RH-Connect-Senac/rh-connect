#!/usr/bin/env python3
"""Gera o baseline da IA de entrevistas chamando o servico Flask direto.

Uso (somente biblioteca padrao; dados 100% ficticios):
  python baseline_ia.py --label antes  --base-url http://localhost:5001   (rode FORA do repositorio)
  python baseline_ia.py --label depois --base-url http://localhost:5002

Saida: ./baseline_<label>/questions_1..5.json e evaluate_<perfil>.json
"""
import argparse, json, pathlib, time, urllib.error, urllib.request

CONTEXT = {
    "title": "Desenvolvedor Back-end Júnior",
    "summary": "Vaga fictícia para teste",
    "activities": ["Criar APIs REST", "Corrigir bugs"],
    "requirements": ["Python", "SQL", "Git"],
}

QUESTIONS = [
    {"questionId": 1, "questionType": "Tecnica", "questionText": "Como você organizaria uma API REST em Python para cadastrar e consultar clientes?"},
    {"questionId": 2, "questionType": "Tecnica", "questionText": "Uma consulta SQL ficou lenta em produção. Como você investigaria o motivo?"},
    {"questionId": 3, "questionType": "Comportamental", "questionText": "Conte sobre uma vez em que você discordou de um colega sobre uma solução técnica."},
    {"questionId": 4, "questionType": "Comportamental", "questionText": "Como você prioriza quando recebe duas demandas urgentes ao mesmo tempo?"},
    {"questionId": 5, "questionType": "Carreira", "questionText": "O que você espera aprender nos seus primeiros meses nesta vaga?"},
]

GOOD = [
    "Eu separaria a API em rotas, serviços e acesso a dados. Usaria Flask com validação de entrada, retornaria códigos HTTP corretos e escreveria testes para cada endpoint. No meu projeto de estudo de cadastro de clientes, isso facilitou a manutenção e reduziu bugs.",
    "Primeiro mediria o tempo com EXPLAIN para ver o plano de execução, verificaria se há índices nas colunas filtradas e se a consulta traz mais dados do que o necessário. Depois testaria a mudança em ambiente de homologação e compararia os tempos antes e depois.",
    "Em um trabalho de faculdade, um colega queria usar uma abordagem mais complexa. Ouvi os argumentos dele, apresentei os meus com um protótipo pequeno e combinamos escolher a mais simples, revisando depois. O resultado foi entregue no prazo e ambos concordaram.",
    "Eu confirmo com o responsável qual tem maior impacto no usuário e no prazo, comunico à equipe a ordem escolhida e registro o que ficou para depois. Se não for possível decidir sozinho, peço ajuda cedo, em vez de esperar o prazo apertar.",
    "Espero aprender o fluxo de deploy e de revisão de código da equipe, melhorar meu SQL em casos reais e receber feedback frequente. Quero dentro de seis meses entregar sozinho pequenas funcionalidades com qualidade.",
]
MEDIOCRE = [
    "Eu faria as rotas com Flask e ligaria no banco de dados. Teria uma rota para cadastrar e outra para consultar.",
    "Olharia a consulta e tentaria deixar ela mais rápida, talvez com índice.",
    "Já tive uma discordância em um trabalho e conversamos até resolver.",
    "Faria a mais urgente primeiro e depois a outra.",
    "Quero aprender mais sobre o trabalho e crescer na empresa.",
]
WEAK = [
    "Não tenho muita experiência com isso, acho que usaria alguma biblioteca.",
    "Não sei bem, talvez reiniciar o banco.",
    "Normalmente evito discussões.",
    "Depende, vejo na hora.",
    "Aprender coisas novas.",
]
FLUFF = [  # longa, bem escrita e sem conteudo concreto
    "Acredito que a tecnologia é um campo fascinante e em constante evolução, no qual profissionais dedicados precisam sempre buscar excelência, comprometimento e uma visão ampla do negócio, aliando teoria e prática de forma equilibrada para gerar valor.",
    "Considero fundamental adotar uma postura proativa e analítica diante de qualquer desafio, sempre alinhada às melhores práticas do mercado e à cultura da organização, de modo a garantir resultados consistentes e sustentáveis ao longo do tempo.",
    "Valorizo muito o trabalho em equipe, a comunicação transparente e o respeito às diferentes opiniões, pois acredito que o diálogo aberto é a base de qualquer relacionamento profissional saudável e produtivo no ambiente corporativo.",
    "Procuro sempre manter o equilíbrio e a organização, priorizando de maneira inteligente as atividades e entregando o melhor de mim em cada etapa do processo, com foco em qualidade, agilidade e melhoria contínua.",
    "Espero crescer profissionalmente, desenvolver novas competências e contribuir de forma significativa para os objetivos da empresa, acompanhando as tendências do setor e buscando constantemente o aperfeiçoamento pessoal e coletivo.",
]
PROFILES = {
    "excelente": GOOD,
    "mediana": MEDIOCRE,
    "fraca": WEAK,
    "longa_vazia": FLUFF,
    "nao_sei": ["não sei"] * 5,
    "curta": ["sim", "ok", "depende", "não", "talvez"],
    "mista_1_nao_sei": GOOD[:4] + ["não sei"],
}


def post(base, path, payload, retries=2):
    """Chama o servico; em erro HTTP mostra a mensagem do servidor e tenta de novo."""
    data = json.dumps(payload).encode()
    last = None
    for attempt in range(1, retries + 2):
        req = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            last = {"_erro_http": exc.code, "_mensagem": body}
            print(f"   ! {path} tentativa {attempt}: HTTP {exc.code} - {body.strip()[:300]}")
        except Exception as exc:  # timeout, conexao...
            last = {"_erro": str(exc)}
            print(f"   ! {path} tentativa {attempt}: {exc}")
        time.sleep(3)
    return last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--base-url", default="http://localhost:5001")
    ap.add_argument("--n-questions", type=int, default=5)
    a = ap.parse_args()
    out = pathlib.Path(f"baseline_{a.label}"); out.mkdir(exist_ok=True)

    for i in range(1, a.n_questions + 1):
        r = post(a.base_url, "/questions", {"context": CONTEXT})
        (out / f"questions_{i}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[perguntas {i}] {'FALHOU' if '_erro_http' in r or '_erro' in r else 'ok'}")

    for name, answers in PROFILES.items():
        payload = {"context": CONTEXT, "answers": [{**q, "answer": ans} for q, ans in zip(QUESTIONS, answers)]}
        r = post(a.base_url, "/evaluate", payload)
        (out / f"evaluate_{name}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
        if "_erro_http" in r or "_erro" in r:
            print(f"[avaliacao {name}] FALHOU")
        else:
            print(f"[avaliacao {name}] overallScore={r.get('overallScore')} scores={r.get('scores')}")


if __name__ == "__main__":
    main()
