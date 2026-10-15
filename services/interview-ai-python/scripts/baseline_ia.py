#!/usr/bin/env python3
"""Gera o baseline da IA de entrevistas chamando o servico Flask direto.

Uso (somente biblioteca padrao; dados 100% ficticios):
  # calibracao da avaliacao: 3 repeticoes por perfil, sem gerar perguntas
  python baseline_ia.py --label calib --only avaliacao --repeat 3 --base-url http://localhost:5002
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
OTIMA = [  # completa, correta, com exemplo e resultado
    "Separo a aplicação em três camadas: rotas (um Blueprint de clientes), serviço com as regras de negócio e repositório para o acesso ao banco, com consultas parametrizadas. Valido a entrada antes de gravar, devolvo 201 no cadastro, 404 quando o cliente não existe e erros em JSON padronizado. Cada endpoint tem testes automatizados. No meu projeto de estudo, essa divisão permitiu trocar o banco de SQLite para PostgreSQL mudando só o repositório.",
    "Primeiro reproduzo o problema e meço o tempo da consulta em homologação. Depois uso EXPLAIN para ver o plano de execução, verifico os índices nas colunas do WHERE e do JOIN e se a consulta traz colunas ou linhas desnecessárias. Aplico uma mudança por vez e comparo o tempo antes e depois. Em um trabalho da faculdade, um índice composto reduziu uma listagem de 4 segundos para 300 milissegundos.",
    "No trabalho de conclusão do curso, um colega queria usar uma arquitetura mais complexa. Eu ouvi os argumentos dele, expliquei os meus com base no prazo e montei um protótipo pequeno das duas opções. Comparamos manutenção e tempo de entrega e escolhemos a mais simples, com revisão marcada para depois da primeira entrega. Entregamos no prazo e ele reconheceu que a decisão foi acertada.",
    "Pergunto ao responsável qual demanda tem maior impacto no usuário e qual prazo é inegociável, estimo o esforço de cada uma e comunico à equipe a ordem escolhida e o que ficará para depois. Se uma delas puder ser entregue de forma parcial, entrego a parte crítica primeiro. Quando não consigo decidir sozinho, peço ajuda cedo e registro o combinado para evitar mal-entendidos.",
    "Espero aprender o fluxo de deploy e de revisão de código da equipe, aprofundar SQL em casos reais e receber feedback frequente. Minha meta é, em seis meses, entregar sozinho pequenas funcionalidades com testes e documentação e, em um ano, participar do desenho de novas APIs. Vou pedir revisões semanais e anotar o que aprender para consultar depois.",
]
CURTA_CORRETA = [  # curtas, mas corretas e no assunto
    "Rotas por recurso, validação de entrada e acesso ao banco em camada separada.",
    "Mediria a consulta, olharia o plano com EXPLAIN e criaria índices nas colunas filtradas.",
    "Ouvi o colega, mostrei minha proposta e fizemos um protótipo para decidir juntos.",
    "Vejo o impacto de cada uma, aviso a equipe da ordem e começo pela mais crítica.",
    "Quero aprender o fluxo de deploy da equipe e melhorar meu SQL com casos reais.",
]
VARIADA = [GOOD[0], MEDIOCRE[1], WEAK[2], GOOD[3], MEDIOCRE[4]]  # qualidade desigual
PROFILES = {
    "otima": OTIMA,
    "curta_correta": CURTA_CORRETA,
    "variada": VARIADA,
    "mista_otima_1_nao_sei": OTIMA[:4] + ["não sei"],
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
    ap.add_argument("--n-questions", type=int, default=5, help="quantas geracoes de perguntas")
    ap.add_argument("--repeat", type=int, default=1, help="quantas vezes repetir cada perfil de avaliacao")
    ap.add_argument("--only", choices=["tudo", "perguntas", "avaliacao"], default="tudo")
    ap.add_argument("--perfil", action="append", help="rodar so este perfil (pode repetir)")
    a = ap.parse_args()
    out = pathlib.Path(f"baseline_{a.label}"); out.mkdir(exist_ok=True)

    if a.only in ("tudo", "perguntas"):
        for i in range(1, a.n_questions + 1):
            r = post(a.base_url, "/questions", {"context": CONTEXT})
            (out / f"questions_{i}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"[perguntas {i}] {'FALHOU' if '_erro_http' in r or '_erro' in r else 'ok'}")

    if a.only in ("tudo", "avaliacao"):
        notas = {}
        for name, answers in PROFILES.items():
            if a.perfil and name not in a.perfil:
                continue
            for n in range(1, a.repeat + 1):
                payload = {"context": CONTEXT, "answers": [{**q, "answer": ans} for q, ans in zip(QUESTIONS, answers)]}
                r = post(a.base_url, "/evaluate", payload)
                suffix = f"_r{n}" if a.repeat > 1 else ""
                (out / f"evaluate_{name}{suffix}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
                if "_erro_http" in r or "_erro" in r:
                    print(f"[avaliacao {name} #{n}] FALHOU")
                else:
                    notas.setdefault(name, []).append(r.get("overallScore"))
                    por_pergunta = [q.get("score") for q in r.get("questionsEvaluation", [])]
                    print(f"[avaliacao {name} #{n}] overallScore={r.get('overallScore')} porPergunta={por_pergunta}")
        print("\nResumo (overallScore): perfil -> notas | min-max")
        for name, vals in notas.items():
            print(f"  {name:18s} {vals} | {min(vals)}-{max(vals)} (amplitude {round(max(vals) - min(vals), 1)})")


if __name__ == "__main__":
    main()
