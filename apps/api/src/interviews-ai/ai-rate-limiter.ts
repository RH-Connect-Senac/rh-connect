import { Injectable } from '@nestjs/common';

// Limitador de requisições dos recursos que consomem o provedor de IA (Groq).
//
// Janela deslizante em memória, por chave (usuário autenticado). Sem dependência
// externa. LIMITAÇÃO CONHECIDA: o estado vive no processo da API; com mais de
// uma instância/worker cada processo conta separadamente (o limite efetivo
// vira "limite x processos"). Para a VPS atual (um processo) é suficiente.
//
// Requisições RECUSADAS não são contadas: quem insiste não estende o bloqueio.

export interface AiRateLimitRule {
  windowMs: number;
  max: number;
}

// 10 chamadas por minuto e 60 por hora, por usuário, somando TODOS os recursos
// protegidos (job-context, geração de perguntas e as rotas administrativas).
export const AI_RATE_LIMIT_RULES: readonly AiRateLimitRule[] = [
  { windowMs: 60_000, max: 10 },
  { windowMs: 60 * 60_000, max: 60 },
];

// Teto de chaves rastreadas (proteção de memória).
export const AI_RATE_LIMIT_MAX_TRACKED_KEYS = 10_000;

export interface AiRateLimitAllowed {
  allowed: true;
}

export interface AiRateLimitDenied {
  allowed: false;
  retryAfterSeconds: number;
}

export type AiRateLimitDecision = AiRateLimitAllowed | AiRateLimitDenied;

@Injectable()
export class AiRateLimiter {
  private readonly hits = new Map<string, number[]>();

  consume(
    key: string,
    rules: readonly AiRateLimitRule[] = AI_RATE_LIMIT_RULES,
  ): AiRateLimitDecision {
    const now = Date.now();
    const longestWindow = Math.max(...rules.map((rule) => rule.windowMs));
    const stamps = (this.hits.get(key) ?? []).filter(
      (stamp) => now - stamp < longestWindow,
    );

    let retryAfterMs = 0;
    for (const rule of rules) {
      const inWindow = stamps.filter((stamp) => now - stamp < rule.windowMs);
      if (inWindow.length >= rule.max) {
        // `stamps` está em ordem crescente: o mais antigo da janela libera a vaga.
        const oldest = inWindow[0];
        retryAfterMs = Math.max(retryAfterMs, oldest + rule.windowMs - now);
      }
    }

    if (retryAfterMs > 0) {
      this.hits.set(key, stamps);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    stamps.push(now);
    this.hits.set(key, stamps);
    this.evictIfNeeded(now, longestWindow);
    return { allowed: true };
  }

  trackedKeys(): number {
    return this.hits.size;
  }

  private evictIfNeeded(now: number, longestWindow: number) {
    if (this.hits.size <= AI_RATE_LIMIT_MAX_TRACKED_KEYS) {
      return;
    }

    for (const [key, stamps] of this.hits) {
      const last = stamps[stamps.length - 1];
      if (last === undefined || now - last >= longestWindow) {
        this.hits.delete(key);
      }
    }

    // Ainda acima do teto: descarta as chaves mais antigas (ordem de inserção)
    // até 90% do teto, para não repetir esta varredura a cada chave nova.
    const target = Math.floor(AI_RATE_LIMIT_MAX_TRACKED_KEYS * 0.9);
    if (this.hits.size <= AI_RATE_LIMIT_MAX_TRACKED_KEYS) {
      return;
    }
    for (const key of this.hits.keys()) {
      if (this.hits.size <= target) {
        break;
      }
      this.hits.delete(key);
    }
  }
}
