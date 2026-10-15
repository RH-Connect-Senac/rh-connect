#!/usr/bin/env python3
"""Mostra POR QUE a Groq rejeita uma avaliacao (erro 400 json_validate_failed).

Usa o proprio GroqService (mesmo prompt, modelo e parametros do servico) com
dados 100% ficticios e imprime o texto que a Groq rejeitou (`failed_generation`),
o motivo de parada e o uso de tokens. Nao imprime chaves.

Uso (na pasta do servico, com o .env ao lado):
  python3 scripts/diagnostico_avaliacao.py --perfil excelente --n 4
"""
import argparse, pathlib, sys, types

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(HERE.parent / ".env")

import groq_service  # noqa: E402
from baseline_ia import CONTEXT, PROFILES, QUESTIONS  # noqa: E402

_RealGroq = groq_service.Groq


class _Spy:
    """Embrulha o cliente real para observar a resposta, sem alterar a chamada."""

    def __init__(self, *args, **kwargs):
        self._client = _RealGroq(*args, **kwargs)
        self.chat = types.SimpleNamespace(completions=types.SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        try:
            resp = self._client.chat.completions.create(**kwargs)
        except Exception as exc:
            body = getattr(exc, "body", None)
            err = body.get("error", body) if isinstance(body, dict) else {}
            failed = (err or {}).get("failed_generation") or ""
            print(f"  ERRO {getattr(exc, 'status_code', '?')}: {(err or {}).get('code')} - {(err or {}).get('message')}")
            print(f"  failed_generation: {len(failed)} caracteres")
            if failed:
                print("  --- inicio ---\n  " + failed[:900].replace("\n", "\n  "))
                print("  --- fim ---\n  " + failed[-500:].replace("\n", "\n  "))
            raise
        choice = resp.choices[0]
        usage = getattr(resp, "usage", None)
        print(
            f"  OK finish_reason={choice.finish_reason} "
            f"prompt_tokens={getattr(usage, 'prompt_tokens', '?')} "
            f"completion_tokens={getattr(usage, 'completion_tokens', '?')}"
        )
        return resp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--perfil", default="excelente", choices=list(PROFILES))
    ap.add_argument("--n", type=int, default=3)
    a = ap.parse_args()

    groq_service.Groq = _Spy
    answers = [{**q, "answer": ans} for q, ans in zip(QUESTIONS, PROFILES[a.perfil])]
    for i in range(1, a.n + 1):
        print(f"[tentativa {i}] perfil={a.perfil}")
        try:
            result = groq_service.GroqService().evaluate_interview(CONTEXT, answers)
            print(f"  resultado: overallScore={result['overallScore']}")
        except groq_service.GroqServiceError as exc:
            print(f"  servico devolveu erro: {exc}")


if __name__ == "__main__":
    main()
