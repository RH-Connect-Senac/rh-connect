Quero que você atualize o protótipo atual do RH Connect para refletir corretamente as regras de autenticação, criação de contas, primeiro acesso e onboarding que foram definidas para a V1.

IMPORTANTE:
- Não redesenhe o sistema inteiro.
- Não altere a identidade visual atual.
- Não mude a estrutura geral dos dashboards, menus, sidebar, páginas ou componentes que já estão funcionando.
- Preserve o padrão visual e a organização atual do protótipo.
- Faça somente os ajustes necessários nos fluxos relacionados a autenticação, criação de contas, ativação, recuperação de senha e primeiro acesso.
- Não tente implementar backend real, banco de dados, autenticação real, envio real de e-mail, tokens reais ou autorização real. Neste momento, o objetivo é apenas representar corretamente a experiência e os fluxos no protótipo.

A V1 do RH Connect possui somente três perfis:

1. Candidato
2. Avaliador
3. Administrador

Não criar SUPER_ADMIN.

==================================================
1. LOGIN ÚNICO
==================================================

Todos os três perfis devem utilizar a mesma tela de login.

Manter uma única experiência de login contendo:

- e-mail;
- senha;
- botão Entrar;
- opção "Esqueci minha senha";
- acesso ao cadastro público somente para quem deseja criar uma conta de Candidato.

Não criar:
- Login do Candidato separado;
- Login do Avaliador separado;
- Login do Administrador separado.

Não permitir que o usuário escolha sua função no login.

Não criar opções como:

"Entrar como Candidato"
"Entrar como Avaliador"
"Entrar como Administrador"

O sistema deve apenas simular que, após o login, identifica o perfil da conta e direciona para o ambiente correto:

CANDIDATE
→ Dashboard do Candidato

EVALUATOR
→ Dashboard do Avaliador

ADMIN
→ Dashboard Administrativo

No protótipo, essa identificação pode ser simulada apenas para demonstrar os fluxos.

==================================================
2. CADASTRO PÚBLICO — SOMENTE CANDIDATO
==================================================

O cadastro público deve criar exclusivamente uma conta de Candidato.

Não deve existir opção de escolha entre:

- Candidato;
- Avaliador;
- Administrador.

Não deve existir cadastro público para Avaliador ou Administrador.

A tela de cadastro do Candidato deve permanecer simples.

Campos iniciais:

- Nome completo
- E-mail
- Senha
- Confirmar senha
- Aceite dos Termos de Uso
- Aceite da Política de Privacidade

Não adicionar neste cadastro inicial:

- formação;
- experiência profissional;
- competências;
- cargo;
- área profissional detalhada;
- dados extensos de perfil.

Essas informações pertencem ao perfil/onboarding posterior.

Também remover do cadastro inicial qualquer consentimento genérico ou opcional de uso de IA.

Consentimentos relacionados a IA devem aparecer futuramente no contexto em que a funcionalidade realmente utilizar IA.

==================================================
3. CORRIGIR FLUXO DO CADASTRO DO CANDIDATO
==================================================

Atualmente, o fluxo não deve levar o usuário diretamente do cadastro para o Dashboard.

Corrigir para:

Cadastro
↓
Conta criada
↓
Tela "Verifique seu e-mail"
↓
Usuário confirma/verifica o e-mail
↓
Conta ativada
↓
Primeiro acesso
↓
Onboarding do Candidato
↓
Dashboard

Criar ou ajustar a tela de verificação de e-mail para deixar claro:

- que foi enviado um e-mail;
- que o usuário precisa verificar o endereço;
- opção para reenviar o e-mail;
- opção para voltar ao login;
- feedback visual de sucesso após a verificação.

Como este é um protótipo, a confirmação pode ser simulada.

O importante é o fluxo não pular esta etapa.

==================================================
4. FLUXO DO AVALIADOR
==================================================

O Avaliador NÃO possui cadastro público.

O fluxo correto é:

Administrador
↓
Gestão de Avaliadores
↓
Cadastrar / Convidar Avaliador
↓
Sistema simula envio de convite
↓
Avaliador recebe convite
↓
Acessa link
↓
Define a própria senha
↓
Conta é ativada
↓
Login único
↓
Primeiro acesso
↓
Onboarding operacional curto
↓
Dashboard do Avaliador

Na área administrativa, ajustar ou criar a ação necessária para representar o convite do Avaliador.

Dados mínimos para o convite:

- Nome
- E-mail
- Área de atuação / especialidade, quando aplicável

O Administrador NÃO deve criar ou visualizar uma senha permanente para o Avaliador.

Criar a experiência de ativação do Avaliador contendo, por exemplo:

Título:
"Ative sua conta de Avaliador"

Conteúdo:
- identificação do convite;
- criar senha;
- confirmar senha;
- ativar conta.

Após ativação, direcionar para o login ou simular primeiro acesso.

==================================================
5. ONBOARDING DO AVALIADOR
==================================================

O Avaliador deve possuir onboarding diferente do Candidato.

Não utilizar onboarding longo ou gamificado.

Criar um onboarding curto, profissional e operacional, com poucos passos.

Apresentar:

- o ambiente do Avaliador;
- fila de avaliações;
- entrevistas atribuídas;
- critérios de avaliação;
- possibilidade de salvar rascunho;
- conclusão da avaliação;
- diferença entre feedback destinado ao Candidato e observações internas, quando aplicável.

Depois:

Onboarding
↓
Dashboard do Avaliador

Manter a experiência objetiva.

==================================================
6. FLUXO DO ADMINISTRADOR
==================================================

O Administrador NÃO possui cadastro público.

Não criar:

- "Criar conta de Administrador";
- opção Admin no cadastro;
- opção de se tornar Admin;
- tela pública de registro administrativo.

Na V1, a conta de Administrador é considerada previamente provisionada de forma técnica/controlada.

No protótipo, basta representar:

Conta administrativa já provisionada
↓
Login único
↓
Primeiro acesso
↓
Introdução operacional curta
↓
Dashboard Administrativo

Não criar tela comum para um Administrador criar outro Administrador.

Não criar SUPER_ADMIN.

==================================================
7. PRIMEIRO ACESSO DO ADMIN
==================================================

Não criar onboarding longo ou gamificado para Admin.

Se necessário, criar apenas uma introdução curta com 2 a 4 passos mostrando:

- gestão de usuários;
- gestão de Avaliadores;
- entrevistas e atribuições;
- perguntas e critérios.

Deve ser algo simples, direto e profissional.

Depois:

Introdução
↓
Dashboard Administrativo

==================================================
8. ESQUECI MINHA SENHA
==================================================

Os três perfis devem utilizar o mesmo fluxo de recuperação de senha.

Não criar:

- recuperação exclusiva de Admin;
- recuperação exclusiva de Avaliador;
- páginas diferentes por role.

Fluxo:

Login
↓
Esqueci minha senha
↓
Informar e-mail
↓
Tela de confirmação
↓
Simular recebimento de link
↓
Criar nova senha
↓
Confirmar nova senha
↓
Senha redefinida
↓
Login

A mensagem após informar o e-mail deve ser neutra.

Exemplo:

"Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinição da senha."

Não revelar:

- se o usuário existe;
- qual é o perfil da conta;
- se é Candidato, Avaliador ou Admin.

==================================================
9. ONBOARDING DO CANDIDATO
==================================================

Manter o Candidato como o perfil que possui onboarding mais completo.

O fluxo deve ser:

Verificação de e-mail
↓
Primeiro acesso
↓
Onboarding do Candidato
↓
Dashboard

O Nilo pode continuar sendo utilizado como mentor e guia da experiência do Candidato.

Não transformar o onboarding do Avaliador ou do Administrador em cópia do onboarding do Candidato.

==================================================
10. ROLES E ACESSOS — REPRESENTAÇÃO VISUAL
==================================================

Mesmo que o Figma Make não implemente autorização real, o fluxo deve representar corretamente:

Candidato
→ ambiente do Candidato

Avaliador
→ ambiente do Avaliador

Admin
→ ambiente Administrativo

Não adicionar links normais que permitam ao Candidato acessar o ambiente do Avaliador ou do Admin.

Não permitir que o usuário altere seu próprio perfil.

Não criar opção:

"Trocar perfil"
"Virar Avaliador"
"Virar Administrador"

==================================================
11. NÃO ALTERAR OUTRAS ÁREAS
==================================================

Não realizar redesign global.

Não alterar sem necessidade:

- Dashboard do Candidato;
- Dashboard do Avaliador;
- Dashboard do Admin;
- estrutura da sidebar;
- identidade visual;
- paleta global;
- tipografia global;
- página Minha Jornada;
- entrevistas;
- relatórios;
- gamificação;
- Árvore de Talentos;
- páginas que não façam parte destes fluxos.

Se algum componente precisar de pequena alteração para que o fluxo funcione, manter o mesmo padrão visual atual.

==================================================
12. CONSISTÊNCIA VISUAL
==================================================

Todas as novas telas devem utilizar os mesmos padrões existentes no RH Connect:

- sidebar quando aplicável;
- header;
- cards;
- botões;
- inputs;
- espaçamentos;
- bordas;
- radius;
- ícones;
- tipografia;
- cores.

Não criar um novo estilo visual específico para autenticação.

==================================================
13. NAVEGAÇÃO
==================================================

Todas as telas novas ou ajustadas devem ter navegação funcional dentro do protótipo.

Validar especialmente:

Cadastro Candidato
→ Verificar e-mail
→ Onboarding
→ Dashboard

Login
→ Candidato
→ Dashboard Candidato

Login
→ Avaliador
→ Onboarding Avaliador
→ Dashboard Avaliador

Login
→ Admin
→ Introdução Admin
→ Dashboard Admin

Admin
→ Gestão de Avaliadores
→ Convidar Avaliador
→ Convite enviado

Convite do Avaliador
→ Definir senha
→ Conta ativada

Esqueci minha senha
→ Nova senha
→ Login

Evitar botões sem ação ou links que não tenham destino.

==================================================
14. RESULTADO ESPERADO
==================================================

Ao finalizar, o protótipo deve representar claramente esta estrutura:

CANDIDATO
Cadastro público
↓
Verificação de e-mail
↓
Login / primeiro acesso
↓
Onboarding completo
↓
Dashboard

AVALIADOR
Convite administrativo
↓
Definição de senha
↓
Login
↓
Onboarding operacional curto
↓
Dashboard

ADMINISTRADOR
Provisionamento técnico/controlado
↓
Login
↓
Introdução operacional curta
↓
Dashboard

TODOS
→ utilizam o mesmo Login
→ possuem o mesmo fluxo de Esqueci minha senha
→ não escolhem sua própria role
→ não podem trocar de role

==================================================
15. RESTRIÇÃO FINAL
==================================================

Faça somente estas alterações.

Não aproveite esta solicitação para refatorar, redesenhar ou modificar outras áreas do sistema.

Preserve integralmente tudo que não seja necessário alterar para atender aos fluxos descritos acima.

Ao terminar, revise todos os caminhos alterados para garantir que não existam telas sem saída, botões sem ação ou redirecionamentos incorretos.