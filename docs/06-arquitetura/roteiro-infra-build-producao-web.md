# Roteiro de infraestrutura — publicar o build de produção do front-end

**Para:** responsável pelo servidor (VPS) de `labdowill.tech`
**Origem:** auditoria de desempenho PageSpeed/Lighthouse de 08/10/2026
**Escopo deste documento:** todas as alterações de servidor (Nginx/VPS) identificadas na auditoria, divididas em duas fases independentes, cada uma com validação e rollback próprios, mantendo tudo na VPS atrás do proxy reverso:

- **Fase 1 — Build de produção e arquivos estáticos** (passos 0 a 9): troca do `vite dev` por `vite build` servido pelo Nginx, fallback de rotas, cache, compressão e remoção do proxy de WebSocket. **Resolve a causa raiz.**
- **Fase 2 — Protocolo e segurança** (passos 10 a 13): HTTP/2 (e HTTP/3 opcional) e cabeçalhos de segurança (HSTS, COOP, anti-clickjacking, CSP em modo de observação).

**Fora do escopo (são mudanças no código do front, não no servidor):** divisão do código por rota, preload do hero, fontes, acessibilidade, ajuste das chamadas `/auth/me` e `/auth/refresh`.

> Este documento descreve o que vai mudar, por que, o que será afetado e como desfazer. A decisão de executar ou não é sua, e cada fase pode ser aceita ou recusada separadamente. Qualquer ponto marcado como **Confirmar** depende de informação que só existe no servidor e que o repositório não tem.

---

## 1. Contexto: o que está acontecendo hoje

O endereço `https://labdowill.tech/rhconnect/` está servindo o **servidor de desenvolvimento do Vite** (`vite dev`), não uma versão compilada para produção. Os relatórios de desempenho mostram isso claramente:

- o navegador baixa o código-fonte direto (`src/app/App.tsx` com 1,3 MB, `admin-screens.tsx`, etc.), sem minificação;
- carrega ferramentas de desenvolvimento (`/@vite/client`, `/@react-refresh`) e a versão de desenvolvimento do React;
- faz 149 requisições (140 de scripts) e baixa cerca de **10 MB** para abrir a página inicial;
- tenta abrir um WebSocket de hot reload (`wss://labdowill.tech/rhconnect/?token=…`) que falha e gera erro no console.

Consequência medida: nota de desempenho entre 31 e 55, e a página só termina de carregar em 61 a 65 s no celular simulado (4G lento) e 9 a 14 s no desktop. A causa vem desse ponto único, e a maior parte dos outros problemas do relatório deriva dele.

## 2. O que vamos fazer

**Fase 1 — build e estáticos**

1. Gerar o build de produção do front-end (`vite build`), que produz a pasta `dist/`.
2. Servir essa pasta como **arquivos estáticos** pelo Nginx da VPS, no mesmo endereço público (`/rhconnect/`), com fallback de rotas, cache e compressão.
3. Remover do Nginx o proxy de WebSocket usado só pelo hot reload e desligar o processo/container que hoje roda `vite dev` na porta 5173.

**Fase 2 — protocolo e segurança**

4. Habilitar **HTTP/2** no Nginx (hoje 147 de 149 requisições usam HTTP/1.1) e, opcionalmente, HTTP/3.
5. Adicionar **cabeçalhos de segurança** nas respostas de `/rhconnect/`: HSTS, COOP, proteção contra clickjacking e uma CSP inicialmente só em modo de observação.

O proxy reverso, o domínio, o certificado e a API **continuam existindo**. Na Fase 1 muda apenas o que responde em `/rhconnect/`; na Fase 2 mudam o protocolo e os cabeçalhos das respostas.

**Ordem recomendada:** Fase 1 primeiro e observar 24 a 48 h; depois a Fase 2, em janela própria. A Fase 2 não depende da Fase 1 tecnicamente, mas o ganho de HTTP/2 fica mais fácil de medir sobre o build já publicado, e uma CSP só faz sentido de escrever sobre a aplicação já compilada.

## 3. Resultado esperado

Validado no ambiente de desenvolvimento do repositório (Node 22, pnpm), não no servidor:

| | Hoje (vite dev) | Com build de produção |
|---|---|---|
| JavaScript | ~110 arquivos, ~9,8 MB sem minificar | **1 arquivo**, 1,37 MB minificado (**375 KB** com gzip) |
| CSS | 239 KB sem minificar | 168 KB (**26 KB** com gzip) |
| Requisições para abrir a página | 149 | poucas dezenas (HTML, 1 JS, 1 CSS, imagens e fonte) |
| Ferramentas de dev / WebSocket / erros de HMR | presentes | **removidos** |
| Tamanho total do `dist/` em disco | n/a | 3,3 MB |

Estimativa (não medida): a página inicial deve transferir na ordem de 0,5 MB em vez de 10 MB. A divisão do código por rota é um passo posterior e ainda reduzirá o JavaScript. O ganho real só será conhecido ao retestar no servidor.

Da **Fase 2** espera-se: HTTP/2 elimina a fila de conexões paralelas (a auditoria "Modern HTTP" estimava 11,2 s de economia no celular e 4,6 s no desktop, mas esses números foram medidos sobre 149 requisições, então o ganho após a Fase 1 será menor); os cabeçalhos de segurança resolvem 3 das 5 auditorias de segurança reprovadas no relatório (HSTS, COOP e clickjacking). A auditoria de CSP só passa quando a política é **imposta**, e em modo de observação (`Report-Only`) ela continua reprovando; a de Tipos Confiáveis fica de fora (veja 4.4). Essas auditorias estão **fora da nota** do Lighthouse, e o benefício é de segurança, não de pontuação.

O build roda em cerca de 8 segundos e não exige banco, API nem variáveis secretas.

## 4. O que será afetado (leia antes de decidir)

### 4.1 Impactos para o time de desenvolvimento

- **Fim do hot reload na VPS.** Hoje qualquer alteração de código aparece no site sem passos extras. Com arquivos estáticos, cada mudança passa a exigir **build + publicação**. Se o time usa a URL pública como ambiente de desenvolvimento ao vivo, esse fluxo muda. Recomendação: desenvolver localmente com `pnpm dev` e usar a VPS só como ambiente publicado. **Confirmar com o time se alguém depende do comportamento atual.**
- **`VITE_API_URL` passa a ser fixada no momento do build.** O código lê essa variável (`import.meta.env.VITE_API_URL`) e, se ela não existir, usa `http://localhost:3000`. No `vite dev` ela é lida na inicialização; no build ela é **gravada dentro do JavaScript**. Se o build for feito sem a variável correta, o site publicado tentará chamar `localhost:3000` e o login quebrará. Para mudar a URL da API depois, é preciso refazer o build.
  - O valor correto deve ser o que o container de desenvolvimento usa hoje. Os relatórios mostram chamadas a `https://labdowill.tech/rhconnect/api/auth/me` e `/auth/refresh`, então provavelmente é `/rhconnect/api` ou `https://labdowill.tech/rhconnect/api`. **Confirmar o valor exato** (veja o passo 1).
  - Nunca colocar segredos em variáveis `VITE_*`: tudo que entra no build é público.
- **Comportamento do React muda levemente.** Em desenvolvimento o React executa alguns efeitos duas vezes e emite avisos (por exemplo o aviso de `fetchPriority`). Em produção isso não acontece. Chamadas como `/auth/me` podem passar a ocorrer uma vez em vez de duas. Isso é esperado e não é defeito.

### 4.2 Impactos para os usuários

- **Janela de troca curta.** Se a publicação for feita com troca atômica (passo 6), a indisponibilidade deve ser de segundos ou inexistente.
- **Sessões não são afetadas.** A autenticação usa cookies emitidos pela API, e a API não será alterada.
- **Abas já abertas** continuam funcionando com o JavaScript que já carregaram. Como hoje o build gera um único arquivo JS, não há risco de uma aba antiga pedir um pedaço que deixou de existir. (Esse ponto muda quando o código for dividido por rota; será tratado nesse roteiro futuro.)
- **Dados no navegador** (`localStorage` com chaves `rhconnect:*`) não são tocados.

### 4.3 Impactos na infraestrutura

- **Nginx:** precisa de um `location` que sirva a pasta estática, com **fallback para `index.html`**. O front usa rotas do React Router (`/rhconnect/login` e outras). Sem o fallback, recarregar a página em qualquer rota diferente da inicial retorna 404. Hoje o Vite dev faz esse fallback sozinho.
- **Ordem dos `location`:** o proxy da API (`/rhconnect/api/`) precisa continuar mais específico que o `location /rhconnect/` estático, senão as chamadas de API passam a receber o `index.html`.
- **Porta 5173:** deixa de ser necessária. Os arquivos de configuração do front (`vite.config.ts`) citam `allowedHosts`, HMR por `wss` e porta 5173. Esses trechos só valem para o modo de desenvolvimento e ficam sem efeito em produção. Nenhuma alteração de código é necessária.
- **Cache:** os arquivos em `assets/` têm hash no nome (`index-BMqJZo5v.js`) e podem ser cacheados por 1 ano. O `index.html` **não** deve ser cacheado, ou usuários continuarão recebendo uma versão antiga após cada publicação.
- **Disco/CPU:** desprezível. O build precisa de Node 22 e pnpm e usa algumas centenas de MB de memória por cerca de 10 s.
- **Código-fonte deixa de ficar exposto cru.** Hoje qualquer pessoa consegue baixar os `.tsx`. Depois do build o código é minificado (isso não é segredo nem proteção, mas é melhor do que o estado atual). Source maps estão desligados no build (`sourcemap: false`), e é recomendável manter assim.
- **Não afeta:** API (NestJS), banco de dados, cookies, CORS (`FRONTEND_URL` continua sendo a origem do site), certificado HTTPS, DNS.

### 4.4 Impactos específicos da Fase 2 (protocolo e segurança)

**HTTP/2 e HTTP/3**

- Em versões antigas do Nginx, `http2` é uma propriedade do **socket** (`listen 443 ssl http2`) e vale para todos os `server` que compartilham esse IP:porta. Se a VPS hospeda outros sites no mesmo endereço, eles também passam a falar HTTP/2. É compatível com navegadores atuais, mas deve ser sabido. **Confirmar a versão do Nginx** (`nginx -v`); a partir da 1.25.1 usa-se a diretiva `http2 on;` por `server`.
- O tráfego do Nginx para a API continua em HTTP/1.1 (`proxy_pass`); isso é normal e não precisa mudar.
- **HTTP/3** exige Nginx 1.25+ compilado com `http_v3_module`, a porta **UDP 443 liberada** no firewall da VPS e na rede do provedor, e o cabeçalho `Alt-Svc`. É opcional: o ganho adicional é menor que o do HTTP/2 e, se a UDP estiver bloqueada, os navegadores simplesmente caem para HTTP/2. Se houver CDN/Cloudflare na frente, o protocolo que o visitante vê é o da CDN, e esta etapa deve ser feita lá.

**HSTS (`Strict-Transport-Security`)**

- É o item **mais difícil de desfazer**: o navegador memoriza a regra pelo tempo de `max-age` e passa a recusar HTTP puro para o host, mesmo que o servidor mude de ideia.
- Ele vale para o **host inteiro** (`labdowill.tech`), **não só para `/rhconnect/`**: nenhum `location` isola isso. Se o mesmo domínio atende outros sites ou caminhos que dependam de HTTP sem TLS, eles deixam de abrir. **Confirmar** que o host inteiro é servido por HTTPS.
- Por isso o roteiro começa com `max-age` curto (5 minutos) e sobe em etapas. **Não** usar `includeSubDomains` nem `preload` sem confirmar todos os subdomínios.

**COOP (`Cross-Origin-Opener-Policy: same-origin`)**

- Corta a ligação entre a janela do site e janelas abertas por ele ou que o abriram. Quebra fluxos com pop-up que dependam de `window.opener` (por exemplo login social em pop-up). O código atual só usa `window.open(url, "_blank", "noopener,noreferrer")` para links externos, o que não é afetado. Se no futuro houver login por pop-up, usar `same-origin-allow-popups`.

**Proteção contra clickjacking (`frame-ancestors` / `X-Frame-Options`)**

- Impede que outros sites embutam o RH Connect em `<iframe>`. O front não usa iframes. **Confirmar** que nenhum site parceiro embute o RH Connect de propósito. Recomendado `'self'` em vez de `'none'`.

**CSP (`Content-Security-Policy`)**

- É a mudança de **maior risco da Fase 2**: uma política errada em modo de imposição pode deixar a página sem estilos, sem fontes ou sem gráficos. Por isso o roteiro usa `Content-Security-Policy-Report-Only` primeiro, que **não bloqueia nada** e só registra violações no console do navegador.
- Levantamento do código atual (somente hosts externos usados em tempo de execução): `fonts.googleapis.com` (CSS da fonte) e `fonts.gstatic.com` (arquivos da fonte). Os links para `empregare.com` são só navegação e não entram na CSP. O front não usa iframes.
- Será necessário `style-src 'unsafe-inline'`, porque as bibliotecas de UI do projeto (MUI/Emotion, Radix e o componente de gráficos) injetam estilos em linha. Isso enfraquece a política contra injeção de estilo, mas ainda protege contra injeção de **scripts**, que é o risco principal.
- A API é chamada na mesma origem (`/rhconnect/api`, conforme os relatórios), então `connect-src 'self'` basta, **desde que** a `VITE_API_URL` confirmada no passo 1 seja da mesma origem. Se for outro host, ele precisa entrar na lista.
- Futuro: quando a gravação real de câmera/microfone entrar (hoje é simulada), será preciso `media-src 'self' blob:` e, se usada, uma `Permissions-Policy` que libere `camera` e `microphone`. **Não** adicionar `Permissions-Policy` restritiva agora sem incluir esses dois.

**Tipos Confiáveis (`require-trusted-types-for 'script'`)**

- **Não recomendado agora.** O componente de gráficos (`ui/chart.tsx`) usa `dangerouslySetInnerHTML`, e bibliotecas de terceiros também escrevem no DOM de forma que viola Tipos Confiáveis. Impor a política quebraria telas. Pode ser observado em `Report-Only` junto com a CSP, mas a decisão de impor deve ser do time de front.

### 4.5 Riscos e mitigação

| Risco | Fase | Probabilidade | Mitigação |
|---|---|---|---|
| Build com `VITE_API_URL` errada, login quebra | 1 | Média | Passo 1 confirma o valor; passo 4 testa antes de trocar |
| 404 ao recarregar rotas | 1 | Alta se esquecer o `try_files` | Config do passo 5; teste do passo 4 |
| `/rhconnect/api/` passa a retornar HTML | 1 | Média | Conferir ordem dos `location` e testar com `curl` |
| `index.html` cacheado, usuários veem versão antiga | 1 | Média | `Cache-Control: no-cache` no HTML |
| Alguém dependia do hot reload na VPS | 1 | Média | Combinar com o time antes |
| JS servido sem compressão por tipo MIME não listado | 1 | Média | Listar `application/javascript` **e** `text/javascript` em `gzip_types` |
| Remover o bloco de WebSocket que outro serviço também usa | 1 | Baixa | Passo 9: só remover se nada mais depender dele |
| HTTP/2 afeta outros sites no mesmo IP:porta | 2 | Baixa | Confirmar versão e outros `server`; testar após o reload |
| HTTP/3 sem UDP 443 aberta | 2 | Média | Opcional; sem UDP o navegador cai para HTTP/2 |
| HSTS trava acesso por HTTP em algum host do domínio | 2 | Baixa, **impacto alto** | `max-age` curto e crescente; sem `includeSubDomains`/`preload` |
| COOP quebra pop-up com `window.opener` | 2 | Baixa | Hoje não há esse uso; ajustar para `same-origin-allow-popups` se surgir |
| CSP imposta bloqueia fonte, estilo ou gráfico | 2 | Alta se imposta direto | Começar em `Report-Only`; impor só depois de 1 a 2 semanas sem violações |
| `add_header` de um `location` apaga os cabeçalhos herdados | 1 e 2 | Média | Usar um arquivo `include` repetido em cada `location` |
| Algo inesperado em produção | 1 e 2 | Baixa | Rollback do passo 8 (Fase 1) ou do passo 13 (Fase 2) |

---

## 5. Roteiro de execução — Fase 1 (build e arquivos estáticos)

> Os comandos abaixo são **exemplos a adaptar** ao ambiente real. O repositório não contém a configuração do Nginx nem do container, então caminhos, nomes e portas precisam ser conferidos.

### Passo 0 — Combinar a janela

- Avisar o time que, a partir da troca, as alterações no site exigem build e publicação.
- Escolher um horário de baixo uso. Tempo estimado total: 30 a 60 minutos, dos quais a troca em si leva segundos.

### Passo 1 — Levantar o estado atual (somente leitura)

Anotar e guardar (será usado no rollback):

```bash
# como o front roda hoje (container? pm2? systemd?)
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Command}}'   # se for Docker
docker inspect <container-do-front> --format '{{json .Config.Env}}'           # procurar VITE_API_URL
docker inspect <container-do-front> --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}'

# configuração efetiva do Nginx
sudo nginx -T > /root/nginx-backup-$(date +%F).conf
```

Registrar:

1. **Valor de `VITE_API_URL`** usado hoje (ou, se não existir variável, de onde vem). **Confirmar.**
2. Qual `location` encaminha `/rhconnect/` para a porta 5173 e qual encaminha `/rhconnect/api/` para a API (inclusive se há reescrita de caminho).
3. Se há `gzip on` e para quais tipos; se o módulo brotli está instalado (`nginx -V 2>&1 | grep -io brotli`).
4. Onde o repositório está clonado no servidor e em qual branch.
5. A versão do Nginx (`nginx -v`) e se há outros `server` ou sites no mesmo IP:porta (relevante para a Fase 2).
6. Onde estão as diretivas de WebSocket usadas pelo HMR (`proxy_set_header Upgrade $http_upgrade;`, `Connection "upgrade"` ou um `map $http_upgrade $connection_upgrade`) e **se algum outro serviço usa o mesmo `map`/bloco**.
7. Cabeçalhos de resposta já enviados hoje: `curl -sI https://labdowill.tech/rhconnect/`.

### Passo 2 — Gerar o build

Requisitos: Node 22 e pnpm (a CI do projeto usa pnpm 11.16.0). Pode ser feito na própria VPS, em uma máquina de desenvolvimento ou em CI; o resultado é só a pasta `dist/`.

```bash
git clone <repositório> && cd rh-connect          # ou atualizar o clone existente
git checkout <branch-a-publicar>                   # normalmente main, após merge
pnpm install --frozen-lockfile --filter @figma/my-make-file
VITE_API_URL=<valor-confirmado-no-passo-1> pnpm --filter @figma/my-make-file build
```

(`@figma/my-make-file` é o nome atual do pacote `apps/web`, herdado da exportação do Figma Make.)

Resultado esperado: `✓ built in ~8s`, pasta `apps/web/dist/` com `index.html` e `assets/`. Há um aviso de que um chunk passa de 500 KB; é conhecido e será tratado na divisão por rota.

Conferir que o valor foi embutido, se desejado:

```bash
grep -o 'localhost:3000' apps/web/dist/assets/*.js | head   # não deve aparecer, ou só como fallback inerte
```

### Passo 3 — Colocar os arquivos no servidor (sem ativar)

Estrutura sugerida, que permite troca atômica e rollback:

```bash
sudo mkdir -p /var/www/rhconnect-releases /var/www/rhconnect-site
REL=/var/www/rhconnect-releases/$(date +%Y%m%d-%H%M%S)
sudo mkdir -p "$REL" && sudo cp -r apps/web/dist/. "$REL"/
sudo chown -R www-data:www-data "$REL"      # ajustar para o usuário do Nginx
```

O Nginx servirá `/var/www/rhconnect-site` com `root`, e `rhconnect` dentro dele será um link simbólico para a release ativa (passo 6). Assim o caminho público `/rhconnect/` mapeia direto para os arquivos, sem `alias`.

### Passo 4 — Testar em paralelo, sem tocar na produção

Criar um `server` temporário em porta local e testar com o mesmo caminho `/rhconnect/`:

```nginx
# /etc/nginx/conf.d/rhconnect-teste.conf  (remover após o teste)
server {
    listen 127.0.0.1:8081;
    root /var/www/rhconnect-teste;      # contém: rhconnect -> a release recém-copiada
    location /rhconnect/ {
        try_files $uri $uri/ /rhconnect/index.html;
    }
}
```

```bash
sudo mkdir -p /var/www/rhconnect-teste && sudo ln -sfn "$REL" /var/www/rhconnect-teste/rhconnect
sudo nginx -t && sudo systemctl reload nginx
curl -sI http://127.0.0.1:8081/rhconnect/            | head -1    # 200
curl -sI http://127.0.0.1:8081/rhconnect/login       | head -1    # 200 (fallback)
curl -sI http://127.0.0.1:8081/rhconnect/assets/     | head -1    # 404/403 é normal
```

Para ver no navegador, usar túnel SSH (`ssh -L 8081:127.0.0.1:8081 usuario@vps`) e abrir `http://localhost:8081/rhconnect/`. Observação: o login só funcionará completo no domínio real por causa dos cookies e da origem. Neste passo o objetivo é confirmar que a página carrega, que o roteamento funciona e que não há chamadas a `localhost:3000`.

### Passo 5 — Preparar a configuração definitiva (ainda sem recarregar)

Trecho de referência para o `server` HTTPS existente. **Manter o que já existe** para TLS, API e demais caminhos, e adaptar apenas o bloco do front:

```nginx
# Já existente: proxy da API. Deve continuar aqui e ser mais específico que /rhconnect/.
# location /rhconnect/api/ { proxy_pass ...; }

root /var/www/rhconnect-site;

# Arquivos com hash no nome: cache longo
location /rhconnect/assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}

# Aplicação (SPA): fallback para index.html, HTML sem cache
location /rhconnect/ {
    add_header Cache-Control "no-cache";
    try_files $uri $uri/ /rhconnect/index.html;
}

# Compressão para os estáticos (conferir se já está habilitada globalmente)
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 256;
# O tipo MIME do JavaScript depende da versão do mime.types do Nginx
# (application/javascript em versões antigas, text/javascript nas novas): listar os dois.
gzip_types text/css text/javascript application/javascript application/json image/svg+xml;
```

Pontos de atenção:

- Se hoje existe `location /rhconnect/ { proxy_pass http://…:5173; … }`, ele será **substituído** pelo bloco acima. Comentar o antigo em vez de apagar, para o rollback.
- **Compressão:** o relatório indicava que a compressão já passava no `vite dev`, mas isso pode ter sido feito pelo próprio Vite ou pelo Nginx. Depois da troca, confirmar no passo 7 que o JS e o CSS saem com `content-encoding: gzip` (ou `br`). Imagens `.webp`, `.png` e fontes já são comprimidas e **não** devem entrar em `gzip_types`. Brotli é opcional e só vale se o módulo já estiver instalado; não é preciso compilar nada por isso.
- Se o bloco do site tiver `add_header` de segurança em nível de `server`, lembrar que `add_header` dentro de um `location` **substitui** os do nível superior. Repetir os cabeçalhos que existirem. (Os cabeçalhos de segurança novos são assunto de outro roteiro.)
- Validar com `sudo nginx -t` antes de qualquer recarga.

### Passo 6 — Fazer a troca

```bash
sudo ln -sfn "$REL" /var/www/rhconnect-site/rhconnect     # ativa a release (troca atômica)
sudo nginx -t && sudo systemctl reload nginx              # reload não derruba conexões
```

Não é preciso parar o container do `vite dev` antes. Depois que a configuração nova estiver recebendo o tráfego, ele não recebe mais requisições do site.

### Passo 7 — Validar em produção

Com uma aba anônima, sem extensões:

1. `https://labdowill.tech/rhconnect/` abre normalmente.
2. DevTools → Network (com “Disable cache” desligado), recarregar e conferir:
   - **não** aparecem `@vite/client`, `@react-refresh`, `.tsx`, `?import`, `node_modules/.vite`;
   - **não** há tentativa de WebSocket;
   - o `index-*.js` e o `index-*.css` vêm com `content-encoding: gzip` (ou br);
   - os arquivos de `assets/` vêm com `cache-control: public, immutable`; o HTML com `no-cache`.
3. Abrir diretamente `https://labdowill.tech/rhconnect/login` e recarregar (F5): deve abrir, sem 404.
4. Fluxos que usam a API: criar conta / entrar / sair, e abrir o painel correspondente. No console, `GET /rhconnect/api/auth/me` e `/auth/refresh` com **401 para visitante sem login continuam esperados** (é tratado em outro item).
5. `curl -s https://labdowill.tech/rhconnect/api/<rota-de-health-ou-docs-da-api> | head` deve retornar resposta da API, **não** HTML.
6. Em um celular real: abrir o site, navegar e, se possível, abrir a tela de teste de câmera/microfone (o HTTPS já existente é suficiente).
7. Retestar no PageSpeed (3 execuções, desktop e celular) e guardar os números para comparar com os de 08/10.

### Passo 8 — Rollback (se algo der errado)

Em ordem de rapidez:

1. **Voltar a release anterior (segundos):** `sudo ln -sfn /var/www/rhconnect-releases/<release-anterior> /var/www/rhconnect-site/rhconnect`.
2. **Voltar ao modo anterior (1 a 2 minutos):** restaurar o bloco `location /rhconnect/ { proxy_pass …:5173; }` que foi comentado no passo 5, `sudo nginx -t && sudo systemctl reload nginx`. Para isso o container do `vite dev` precisa ainda estar rodando.

Por isso: **não apagar nem desativar o container antigo nas primeiras 24 a 48 horas.**

### Passo 9 — Limpeza (depois do período de observação)

- Parar o container/processo do `vite dev` e liberar a porta 5173.
- Remover `/etc/nginx/conf.d/rhconnect-teste.conf` e `/var/www/rhconnect-teste`.
- Manter as últimas 3 a 5 releases em `/var/www/rhconnect-releases` e apagar as demais.
- **Remover o proxy de WebSocket do HMR** do Nginx: as diretivas `Upgrade`/`Connection "upgrade"` do bloco antigo de `/rhconnect/` e, se existir só para ele, o `map $http_upgrade $connection_upgrade`. Fazer isso **somente** se a conferência do passo 1 (item 6) mostrou que nenhum outro serviço usa essas diretivas. Se algo mais usar, deixar como está. Depois: `sudo nginx -t && sudo systemctl reload nginx` e repetir a validação do passo 7.
- No repositório, nenhuma alteração é necessária: o bloco `server.hmr` do `vite.config.ts` só vale para o modo de desenvolvimento local.

---

## 6. Roteiro de execução — Fase 2 (protocolo e segurança)

**Pré-requisito:** Fase 1 concluída e estável por 24 a 48 h. Executar em janela própria, **uma mudança por vez**, com `nginx -t` e validação entre elas.

### Passo 10 — Backup e preparação

```bash
sudo cp -a /etc/nginx /root/nginx-etc-backup-$(date +%F-%H%M)
nginx -v                       # versão
nginx -V 2>&1 | grep -o 'http_v3_module\|http_v2_module'
```

### Passo 11 — HTTP/2 (e HTTP/3 opcional)

No bloco `server` que escuta em 443 (**sem** mudar certificados nem o restante):

```nginx
# Nginx 1.25.1 ou mais novo
listen 443 ssl;
listen [::]:443 ssl;
http2 on;

# Nginx mais antigo (substitui as linhas acima)
# listen 443 ssl http2;
# listen [::]:443 ssl http2;
```

Lembrete: a configuração de TLS existente deve permitir TLS 1.2 e 1.3, que o HTTP/2 exige. Se houver outros `server` no mesmo IP:porta, em versões antigas eles herdam o HTTP/2.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -sI --http2 https://labdowill.tech/rhconnect/ | head -1     # espera: HTTP/2 200
```

No navegador, DevTools → Network → coluna "Protocol" deve mostrar `h2` para os arquivos do próprio site.

**HTTP/3 (opcional, só se a versão e os módulos permitirem e o time quiser):**

```nginx
listen 443 quic reuseport;          # "reuseport" só em UM server por IP:porta
listen [::]:443 quic reuseport;
add_header Alt-Svc 'h3=":443"; ma=86400' always;
```

```bash
sudo ufw allow 443/udp              # ou o equivalente do firewall/provedor
sudo nginx -t && sudo systemctl reload nginx
```

Exige TLS 1.3 habilitado. Se a porta UDP não estiver acessível de fora, nada quebra: o navegador volta a usar HTTP/2. Se houver CDN na frente, fazer esta etapa na CDN.

### Passo 12 — Cabeçalhos de segurança (em etapas)

Criar **um arquivo único** com os cabeçalhos e incluí-lo em cada `location` que servir o front (`/rhconnect/` e `/rhconnect/assets/`). Isso é necessário porque um `add_header` dentro de um `location` substitui todos os herdados do nível acima, e o `location /rhconnect/assets/` já define `Cache-Control`.

```nginx
# /etc/nginx/snippets/rhconnect-security-headers.conf
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=300" always;

# CSP em modo de observação: NÃO bloqueia nada, só registra violações no console
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" always;
```

```nginx
location /rhconnect/assets/ {
    include snippets/rhconnect-security-headers.conf;
    expires 1y;
    add_header Cache-Control "public, immutable";   # repetido aqui, pois add_header no location substitui o herdado
    try_files $uri =404;
}
location /rhconnect/ {
    include snippets/rhconnect-security-headers.conf;
    add_header Cache-Control "no-cache";
    try_files $uri $uri/ /rhconnect/index.html;
}
```

Observações sobre cada cabeçalho:

| Cabeçalho | Efeito | Observação |
|---|---|---|
| `Cross-Origin-Opener-Policy: same-origin` | Isola a janela do site | Passa a auditoria de COOP. Ver risco de pop-ups em 4.4. |
| `X-Frame-Options: SAMEORIGIN` | Impede embutir o site em `<iframe>` de outro domínio | Passa a auditoria de clickjacking. A diretiva `frame-ancestors` da CSP não vale em `Report-Only`; ela entra junto com a CSP final (12c). |
| `X-Content-Type-Options: nosniff` e `Referrer-Policy` | Endurecimentos de baixo risco | Não fazem parte do relatório; são opcionais. |
| `Strict-Transport-Security: max-age=300` | Força HTTPS por 5 minutos no navegador | Ver 12b. **Sem** `includeSubDomains` e **sem** `preload`. |
| `Content-Security-Policy-Report-Only` | Somente observa | A lista de origens reflete o que encontrei no código (fontes do Google, nada de iframes). O período de observação existe justamente para descobrir o que faltou. |

**12a — Validar com tudo em observação.** Abrir o site com o Console aberto e percorrer as telas principais: página inicial, login, cadastro, dashboard de cada perfil, telas com gráficos, tela de teste de câmera/microfone e a de materiais. Qualquer linha começando com `[Report Only] Refused to ...` é uma violação que a CSP imposta bloquearia; anotar a diretiva e a origem. Confirmar também que nada visível mudou e que os cabeçalhos chegam: `curl -sI https://labdowill.tech/rhconnect/`.

**12b — Subir o HSTS aos poucos**, sempre depois de um período sem problemas:

| Etapa | `max-age` | Quando avançar |
|---|---|---|
| 1 | 300 (5 min) | de imediato, para validar |
| 2 | 86400 (1 dia) | depois de 24 h sem incidentes |
| 3 | 604800 (1 semana) | depois de 1 semana |
| 4 | 15552000 (180 dias) | só com **toda** a `labdowill.tech` confirmada como HTTPS |

Para desfazer, enviar `max-age=0` **por HTTPS** (o navegador esquece a regra na visita seguinte). Navegadores que já visitaram o site continuam aplicando o valor anterior até esse momento.

**12c — Impor a CSP (decisão separada, depois de 1 a 2 semanas de observação sem violações).** Trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`, acrescentando `frame-ancestors 'self'` e ajustando a lista conforme o que a observação mostrou. Antes de impor, a equipe de front deve validar. Se algo quebrar, voltar para `Report-Only` é um `reload` do Nginx.

### Passo 13 — Rollback da Fase 2

- **Cabeçalhos:** remover as linhas `include snippets/rhconnect-security-headers.conf;` (ou restaurar o backup do passo 10) e fazer `reload`. Exceção: o HSTS já memorizado pelos navegadores só se desfaz como descrito em 12b.
- **HTTP/2:** voltar a linha `listen` original e fazer `reload`.
- **Validação final:** repetir o passo 7 e retestar no PageSpeed (3 execuções, desktop e celular), comparando com os números anteriores à Fase 1 e depois da Fase 1.

---

## 7. Alternativa de menor mudança no Nginx para a Fase 1 (se preferirem)

Em vez de servir `dist/` pelo Nginx, é possível manter o proxy exatamente como está (apontando para a porta 5173) e trocar apenas o comando do container de `vite` para:

```bash
pnpm --filter @figma/my-make-file build && pnpm --filter @figma/my-make-file exec vite preview
```

O `vite.config.ts` já tem o bloco `preview` com `host 0.0.0.0`, porta 5173 e `allowedHosts` para `labdowill.tech`, e a base `/rhconnect/` vale também. Eu confirmei neste ambiente que `/rhconnect/`, `/rhconnect/login` e o favicon respondem 200 com esse modo.

| | Nginx servindo `dist/` (recomendado) | `vite preview` atrás do proxy |
|---|---|---|
| Mudança no Nginx | Sim | Nenhuma |
| Remove o dev server, minifica, tira ferramentas de dev | Sim | Sim |
| Cache longo para `assets/` | Sim | Não (a documentação do Vite diz que o `preview` não foi pensado para produção) |
| Robustez e desempenho | Melhor | Menor |
| Útil como | Estado final | Primeiro passo rápido, com risco menor |

É válido começar pela alternativa e migrar depois para o Nginx estático.

## 8. Informações que preciso do responsável pelo servidor

**Para a Fase 1**

1. Valor atual de `VITE_API_URL` no container do front.
2. Trecho do `nginx.conf` do site (os `location` de `/rhconnect/` e `/rhconnect/api/`, incluindo diretivas de WebSocket e `gzip`).
3. Como o front é iniciado hoje (Dockerfile/compose/pm2/systemd).
4. Se há algo na frente do Nginx (CDN, Cloudflare ou outro proxy).
5. Se o time usa o site publicado como ambiente de desenvolvimento ao vivo.

**Para a Fase 2**

6. Versão do Nginx e módulos (`nginx -V`), e se há outros sites no mesmo IP:porta.
7. Se `labdowill.tech` hospeda outros sites ou subdomínios e se **todos** são servidos por HTTPS (condição para o HSTS).
8. Se algum site parceiro embute o RH Connect em `<iframe>` (condição para o `X-Frame-Options`).
9. Se a UDP 443 pode ser aberta (só para HTTP/3, opcional).
10. Saída de `curl -sI https://labdowill.tech/rhconnect/`, para ver quais cabeçalhos de segurança já existem.

Com isso é possível ajustar este roteiro para a configuração real, inclusive gerar o `server`/`location` final e um script de deploy.

## 9. O que foi verificado e o que não foi

**Verificado** (ambiente do repositório, Node 22.22 e pnpm 10.28 com `--frozen-lockfile`):

- o build conclui sem erros em ~8 s; `dist/index.html` referencia os arquivos como `/rhconnect/assets/...`;
- o `vite preview` responde 200 para `/rhconnect/`, `/rhconnect/login` e `/rhconnect/favicon4.svg`;
- no código do front, os únicos hosts externos usados em tempo de execução são `fonts.googleapis.com` e `fonts.gstatic.com`; não há `<iframe>`; os links para `empregare.com` são só navegação; `window.open` usa `noopener,noreferrer`; o componente `ui/chart.tsx` usa `dangerouslySetInnerHTML`; `index.html` tem apenas um `<style>` em linha e o `<script type="module">` do build. A CSP de exemplo foi escrita a partir disso.

**Não verificado** (depende do servidor): configuração real do Nginx e do container; valor de `VITE_API_URL`; comportamento do login e dos cookies no domínio real; câmera e microfone no celular; se a CSP de exemplo produz violações em alguma tela; ganho de desempenho real depois de cada fase; todos os trechos de Nginx deste documento, que são exemplos e **não foram executados** contra um Nginx.
