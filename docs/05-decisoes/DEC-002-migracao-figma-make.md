# DEC-002 — Estratégia de Migração do Figma Make para o Repositório Oficial

**Status:** Aprovado  
**Data:** 11/08/2026  
**Versão:** 1.0  
**Escopo:** Evolução do Front-end da V1 do RH Connect

---

## 1. Contexto

O RH Connect possui um repositório oficial já estruturado e em evolução.

Esse repositório nasceu a partir de uma versão anterior do protótipo, predominantemente focada na experiência do **Candidato**.

Posteriormente, o protótipo do Figma Make evoluiu e passou a contemplar também:

- Avaliador;
- Administrador;
- novos fluxos;
- correções;
- refinamentos visuais e funcionais.

Essa evolução criou a necessidade de decidir como incorporar as melhorias do Figma Make ao repositório oficial sem:

- perder o trabalho já realizado;
- introduzir novamente arquitetura puramente prototípica;
- duplicar aplicações;
- criar uma nova base concorrente;
- gerar regressões desnecessárias.

---

## 2. Decisão

Fica definido que:

> **O repositório atual continuará sendo a base oficial do RH Connect.**

A versão atualizada do Figma Make será utilizada como:

- referência visual;
- referência funcional;
- referência de telas;
- referência de fluxo;
- fonte de comparação.

Ela **não substituirá integralmente o repositório oficial**.

---

## 3. Estratégia adotada

A incorporação das evoluções seguirá o processo:

```text
Repositório oficial
+
Figma Make atualizado
+
Documentação vigente
↓
Auditoria comparativa
↓
Plano de migração
↓
Migração incremental
↓
Validação
↓
Integração ao código oficial
```

---

## 4. O que não será feito

Não utilizar:

```text
nova exportação do Figma Make
↓
copiar todo o código
↓
substituir o /src atual
↓
continuar desenvolvimento
```

Também não será criada uma nova aplicação independente para:

- Avaliador;
- Administrador;
- nova versão do Candidato.

Os três perfis deverão coexistir dentro da mesma aplicação oficial.

---

## 5. Justificativa

A decisão foi adotada pelos seguintes motivos.

### 5.1. Preservar trabalho existente

O repositório atual já possui organização, documentação e preparação arquitetural que não devem ser descartadas sem justificativa técnica.

---

### 5.2. Evitar regressão arquitetural

Código exportado de ferramentas de prototipação pode conter:

- navegação simulada;
- dados mockados;
- hardcodes;
- componentes grandes;
- duplicações;
- estruturas temporárias;
- lógica criada apenas para demonstração.

Copiar tudo diretamente poderia introduzir novamente problemas que já estão sendo corrigidos no repositório.

---

### 5.3. Manter uma única fonte oficial de código

A existência de múltiplas bases paralelas aumentaria risco de:

- divergência;
- retrabalho;
- conflito;
- dificuldade de manutenção;
- dúvidas sobre qual versão é oficial.

---

### 5.4. Permitir evolução controlada

A migração incremental permite:

```text
analisar
↓
implementar pequena etapa
↓
testar
↓
validar
↓
continuar
```

Isso reduz impacto de mudanças grandes.

---

### 5.5. Preservar a direção aprovada

Embora o código do Figma Make não seja tratado como arquitetura definitiva, sua direção:

- visual;
- estrutural;
- funcional;
- de experiência;

deve ser preservada quando representar o protótipo aprovado.

---

## 6. Papel do Figma Make

O Figma Make continuará tendo papel importante no projeto.

Será utilizado para:

- experimentar telas;
- validar fluxos;
- representar estados;
- explorar interações;
- ajustar UX;
- consolidar referências;
- demonstrar funcionalidades.

---

## 6.1. Código do Figma Make

Código exportado poderá ser consultado e reaproveitado de forma seletiva.

Antes de incorporar qualquer trecho, avaliar:

```text
É reutilizável?
É coerente com a arquitetura?
Está duplicando algo?
É apenas mock?
Depende de navegação simulada?
Está alinhado à documentação?
```

---

## 7. Papel do repositório oficial

O repositório será a fonte de verdade para:

- código;
- arquitetura implementada;
- histórico de alterações;
- integração;
- testes;
- deploy.

Toda funcionalidade considerada efetivamente implementada deverá existir no repositório oficial.

---

## 8. Papel da documentação

A documentação determinará as regras que devem prevalecer quando houver conflito entre:

```text
comportamento antigo do protótipo
```

e:

```text
decisão funcional vigente
```

Exemplo:

Se o protótipo permitir cadastro público de um perfil interno, mas a documentação vigente determinar que esse perfil entra apenas por convite, a implementação deve seguir a documentação aprovada.

---

# 9. Processo de migração

## Etapa 1 — Atualizar a referência

Antes da auditoria técnica, o Figma Make deve refletir corretamente as regras aprovadas que afetam a experiência.

Exemplos:

- cadastro do Candidato;
- verificação de e-mail;
- entrada do Avaliador;
- acesso do Admin;
- recuperação de senha;
- primeiro acesso;
- onboarding.

Não é necessário implementar lógica técnica real no Figma Make.

---

## Etapa 2 — Definir baseline

Uma versão do protótipo deverá ser identificada como:

> **Referência oficial para implementação**

Registrar:

- nome;
- data;
- versão;
- mudanças relevantes;
- pendências conhecidas.

---

## Etapa 3 — Exportar a referência

Exportar a versão utilizada para comparação técnica.

A exportação não deve ser considerada automaticamente código de produção.

---

## Etapa 4 — Auditoria comparativa

O Codex deverá receber:

```text
A. repositório oficial
B. exportação do baseline
C. documentação vigente
```

E analisar, antes de implementar:

- novas telas;
- telas alteradas;
- componentes reutilizáveis;
- duplicações;
- código prototípico;
- mocks;
- hardcodes;
- diferenças arquiteturais;
- arquivos afetados;
- riscos;
- ordem recomendada de migração.

---

## Etapa 5 — Aprovar o plano técnico

A implementação só deve avançar após revisão do plano de migração.

Mudanças estruturais grandes não devem ser executadas automaticamente sem análise.

---

## Etapa 6 — Preparar três perfis

A aplicação oficial deve passar a reconhecer estruturalmente:

```text
Candidate
Evaluator
Admin
```

Antes de migrar todas as telas.

---

## Etapa 7 — Migrar o mínimo necessário

Primeiro incorporar:

### Candidato

- preservar dashboard e estrutura relevante já existente.

### Avaliador

- layout;
- navegação;
- dashboard.

### Administrador

- layout;
- navegação;
- dashboard.

---

## Etapa 8 — Migrar por fluxos

As demais telas devem entrar conforme cada jornada funcional for implementada.

Exemplo:

```text
Fluxo de avaliação
↓
telas necessárias do Avaliador
+
telas relacionadas do Candidato
+
telas administrativas relacionadas
```

---

# 10. Relação com autenticação

A migração deverá respeitar o modelo definido em:

```text
DEC-001 — Autenticação e Perfis
```

e:

```text
regras-de-autenticacao-e-acesso.md
```

Portanto:

```text
Cadastro público
→ CANDIDATE

Convite administrativo
→ EVALUATOR

Provisionamento controlado
→ ADMIN
```

Os três perfis utilizarão login único.

---

# 11. Relação com o Design System

A migração não exige copiar exatamente todos os detalhes visuais atuais.

Durante a implementação será permitido refinar:

- paleta;
- contraste;
- hover;
- focus;
- radius;
- sombras;
- spacing;
- tipografia;
- componentes;
- responsividade.

Desde que seja preservada a identidade e a direção geral aprovadas.

---

# 12. Alternativas consideradas

## 12.1. Substituir integralmente o repositório pela nova exportação

**Não adotado.**

Motivos:

- risco de perder organização existente;
- reintrodução de código prototípico;
- risco de regressão;
- retrabalho.

---

## 12.2. Criar novo repositório

**Não adotado.**

Motivos:

- fragmentaria o projeto;
- geraria duas fontes de verdade;
- dificultaria colaboração e histórico.

---

## 12.3. Criar aplicações separadas para cada perfil

**Não adotado na V1.**

Motivos:

- duplicação;
- manutenção maior;
- compartilhamento mais difícil;
- aumento de complexidade.

---

## 12.4. Copiar apenas `eval-screens` e `admin-screens` diretamente

**Não adotado como estratégia principal.**

Esses arquivos podem ser usados como referência e fonte de reaproveitamento seletivo, mas não devem ser adicionados sem considerar:

- rotas;
- layouts;
- reutilização;
- arquitetura;
- autenticação;
- autorização.

---

# 13. Consequências positivas

A decisão permite:

- preservar o trabalho existente;
- manter histórico;
- migrar Avaliador e Admin com controle;
- reduzir regressões;
- melhorar arquitetura gradualmente;
- manter uma aplicação única;
- profissionalizar o código;
- continuar usando o Figma Make sem transformá-lo em fonte única de arquitetura.

---

# 14. Consequências operacionais

A equipe precisará:

- manter o Figma Make identificável por versão;
- documentar mudanças importantes;
- comparar antes de migrar;
- evitar copiar grandes blocos sem revisão;
- realizar mudanças por etapas;
- validar o projeto depois de cada migração relevante.

---

# 15. Riscos e mitigação

## Risco — divergência entre Figma e código

**Mitigação:** definir baseline e registrar mudanças posteriores.

---

## Risco — Codex alterar demais o projeto

**Mitigação:** sempre pedir análise antes de grandes implementações.

---

## Risco — duplicação de componentes

**Mitigação:** auditoria prévia e reutilização planejada.

---

## Risco — preservar arquitetura prototípica por tempo demais

**Mitigação:** migrar gradualmente para rotas, layouts e estrutura modular.

---

## Risco — refatoração excessiva

**Mitigação:** alterações pequenas, testáveis e justificadas.

---

# 16. Critérios de sucesso

A estratégia será considerada bem executada quando:

- [ ] o repositório atual permanecer como base oficial;
- [ ] nenhuma nova base paralela tiver sido criada sem necessidade;
- [ ] o Figma Make estiver sendo usado como referência, não substituição;
- [ ] o baseline estiver identificado;
- [ ] a auditoria comparativa tiver sido realizada;
- [ ] a arquitetura suportar os três perfis;
- [ ] Avaliador e Admin estiverem incorporados ao projeto oficial;
- [ ] componentes compartilhados forem reutilizados quando apropriado;
- [ ] rotas reais começarem a substituir navegação simulada;
- [ ] autenticação respeitar as regras aprovadas;
- [ ] o projeto continuar funcional após as migrações;
- [ ] as mudanças relevantes estiverem documentadas.

---

# 17. Próximos passos

Após aprovação deste DEC:

```text
1. Atualizar Figma Make
↓
2. Corrigir fluxos prioritários
↓
3. Definir baseline
↓
4. Exportar baseline
↓
5. Dar baseline + repositório + docs ao Codex
↓
6. Solicitar auditoria comparativa
↓
7. Revisar plano técnico
↓
8. Iniciar migração incremental
```

---

# 18. Relação com outros documentos

Este registro deve ser lido em conjunto com:

- Plano Mestre de Implementação;
- `regras-de-autenticacao-e-acesso.md`;
- `DEC-001-autenticacao-e-perfis.md`;
- `estrategia-de-evolucao-do-frontend.md`;
- PRD vigente;
- Inventário e Especificação de Telas;
- Matriz de Permissões;
- Design System vigente.

---

## 19. Resultado da decisão

A regra oficial da V1 é:

```text
Figma Make
= referência funcional e visual

GitHub
= código oficial

Documentação
= regras e decisões

Migração
= incremental e controlada
```

O RH Connect continuará evoluindo sobre a base existente, sem reconstrução integral desnecessária.

---

**Fim do documento.**
