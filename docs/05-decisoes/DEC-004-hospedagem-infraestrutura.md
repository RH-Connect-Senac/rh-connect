# DEC-004 — Hospedagem e Infraestrutura

**Status:** Aprovado
**Data:** 11/10/2026
**Versão:** 1.0
**Escopo:** V1 do RH Connect

---

## 1. Contexto

O `AGENTS.md` (seção 16.6) listava a Vercel como destino "adotado provisoriamente" para o Front-end, e tratava a hospedagem da API como "a definir". A seção 27 também listava "hospedagem da API" entre as decisões que não deveriam ser inventadas pelo agente.

Essa documentação não refletia o ambiente real: Front-end (`apps/web`) e API (`apps/api`) já estão hospedados em uma VPS própria, não na Vercel. Esse fato não estava registrado em nenhum lugar do repositório antes deste documento — apenas uma menção avulsa a "VPS" como exemplo de ambiente de execução em `services/interview-ai-python/README.md`, sem caráter de decisão.

---

## 2. Decisão

Fica confirmado:

- Front-end (`apps/web`) e API (`apps/api`) são hospedados em **VPS própria** (não Vercel, não outro provedor gerenciado);
- a Vercel não é usada neste momento como destino de deploy;
- segredos e chaves reais (incluindo as do serviço de IA em `services/interview-ai-python`) devem ser configurados como variáveis de ambiente diretamente no ambiente de execução da VPS, nunca versionados no repositório.

---

## 3. O que permanece pendente

Este documento resolve apenas a hospedagem de Front-end e API. Continuam sem decisão registrada:

- armazenamento de vídeos (dependente do módulo de gravação, planejado para V2);
- política de retenção de dados;
- estratégia final de autenticação/sessão, incluindo o endpoint de recuperação/redefinição de senha (planejado para V2 — ver `DEC-001` seção 2.7, que já previa recuperação de senha para os três perfis, mas ainda sem implementação).

---

## 4. Alternativas consideradas

### 4.1. Vercel para o Front-end

Era a opção listada como provisória no `AGENTS.md` §16.6.

**Não adotado como hospedagem efetiva.** O ambiente real já roda em VPS; manter a Vercel como referência oficial estava desatualizado em relação à operação atual do projeto.

---

## 5. Justificativa

1. **Aderência ao ambiente real** — registra o que já está em operação, em vez de uma hospedagem prevista e não usada.
2. **Controle único de infraestrutura** — Front-end, API e (quando aplicável) o serviço de IA em Python podem compartilhar o mesmo ambiente de VPS, simplificando operação e configuração de variáveis/segredos.

---

## 6. Consequências

- `AGENTS.md` §16.6 passa a declarar VPS como hospedagem adotada para Front-end e API.
- `AGENTS.md` §27 deixa de listar "hospedagem da API" como pendência.
- Qualquer migração futura para outro provedor (Vercel, outro cloud gerenciado, etc.) exige uma nova decisão registrada.

---

## 7. Critério para revisão futura

Esta decisão poderá ser revista caso surjam requisitos de escala, disponibilidade ou operação que a VPS atual não atenda, ou caso a equipe decida migrar para um provedor gerenciado.

---

**Fim do documento.**
