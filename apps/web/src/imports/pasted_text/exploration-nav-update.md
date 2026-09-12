Corrija exclusivamente a barra horizontal de navegação chamada “EXPLORAÇÃO”, localizada no topo das páginas do fluxo.

Atualmente, a barra possui várias etapas em uma única linha, mas as etapas que ultrapassam a largura da tela ficam cortadas e não podem ser visualizadas nem acessadas. Também existem páginas já criadas no protótipo que não aparecem nessa barra.

A correção deve resolver tanto a navegação horizontal quanto a ausência das páginas existentes.

1. Incluir todas as páginas já existentes

Analise todas as páginas, telas, frames, rotas e etapas que já existem atualmente no protótipo e inclua todas elas na barra “EXPLORAÇÃO”.

Não crie páginas novas e não invente nomes.

Utilize somente as páginas e etapas já existentes no fluxo atual do protótipo.

A barra deve representar a sequência completa do fluxo, do início ao fim.

Garanta que:

nenhuma página existente fique ausente;
nenhuma etapa apareça duplicada;
a numeração seja contínua;
a ordem corresponda ao fluxo real;
os nomes correspondam às páginas existentes;
cada etapa esteja vinculada à página correta;
clicar em uma etapa leve para a página correspondente;
a página atualmente aberta fique destacada como etapa atual.
2. Criar rolagem horizontal

Transforme a lista de etapas em um componente horizontal rolável e reutilizável.

Requisitos obrigatórios:

mantenha todas as etapas em uma única linha;
não permita quebra de linha;
não empilhe as etapas verticalmente;
não reduza excessivamente o tamanho dos textos;
não corte nenhuma etapa;
não esconda etapas existentes;
permita rolagem horizontal com mouse, trackpad e gesto de toque;
mantenha a barra de rolagem visualmente discreta ou oculta, sem remover a funcionalidade;
somente a área dos chips de etapas deve rolar;
o restante da página não deve possuir rolagem horizontal;
o título “EXPLORAÇÃO” deve permanecer fixo à esquerda;
os chips devem ocupar a largura necessária sem encolher.
3. Adicionar setas de navegação

Inclua controles laterais discretos:

seta para a esquerda;
seta para a direita.

Comportamento:

a seta esquerda deve aparecer somente quando houver conteúdo oculto à esquerda;
a seta direita deve aparecer somente quando houver conteúdo oculto à direita;
clicar nas setas deve mover a lista horizontal suavemente;
as setas não podem cobrir textos ou chips;
aplique um leve gradiente nas extremidades quando houver conteúdo escondido naquela direção.
4. Manter a etapa atual visível

Sempre que o usuário entrar em uma página:

destaque a etapa correspondente em azul;
role automaticamente a barra até que essa etapa fique visível;
centralize a etapa atual quando houver espaço suficiente;
não mova nem role o restante da página;
aplique rolagem suave.
5. Preservar os estados visuais

Mantenha o padrão já existente:

verde para etapas concluídas;
azul para a etapa atual;
azul-acinzentado para etapas futuras;
ícone de confirmação nas etapas concluídas;
número nas etapas atuais e futuras;
mesmos tamanhos, bordas, tipografia e espaçamentos já utilizados.

Não marque automaticamente todas as etapas anteriores como concluídas apenas por estarem antes da etapa atual. Utilize o estado real de navegação ou conclusão quando esse dado existir.

6. Tornar o componente reutilizável

A barra “EXPLORAÇÃO” não deve ser criada manualmente e separadamente em cada página.

Crie um único componente compartilhado, alimentado por uma lista central de páginas ou etapas.

Essa lista compartilhada deve conter:

identificador;
número;
nome;
rota ou destino;
estado;
ordem.

Todas as páginas do fluxo devem utilizar essa mesma fonte de dados.

Sempre que uma nova página for adicionada ao fluxo futuramente, ela deve poder ser incluída nessa lista compartilhada e aparecer automaticamente em todas as telas, sem reconstruir manualmente a barra.

7. Responsividade

Em desktop e notebook:

mantenha a barra em uma linha;
permita rolagem por mouse e trackpad;
mostre setas laterais quando necessário;
preserve a altura atual do componente.

Em tablet e celular:

mantenha a lista em uma linha;
permita rolagem horizontal por toque e arraste;
não quebre os chips em várias linhas;
não reduza os textos até ficarem ilegíveis;
mantenha áreas de toque confortáveis.
8. Estrutura recomendada

Use uma estrutura equivalente a:

container externo com largura de 100%;
título “EXPLORAÇÃO” fixo;
área interna rolável;
lista com display: flex;
flex-wrap: nowrap;
overflow-x: auto;
scroll-behavior: smooth;
cada chip com flex-shrink: 0;
largura dinâmica baseada na quantidade de etapas;
max-width: 100%;
sem overflow horizontal no body ou na página inteira.
9. Não alterar outras áreas

Não altere:

sidebar;
logo;
cabeçalho;
conteúdo da página;
cards;
botões;
cores gerais;
espaçamentos do conteúdo principal;
funcionalidade da página “Selecionar Vaga”;
qualquer outra parte fora da barra “EXPLORAÇÃO”.
10. Validação obrigatória

Antes de finalizar, percorra o fluxo completo e confirme:

todas as páginas já existentes aparecem na barra;
nenhuma página está duplicada;
a ordem e a numeração estão corretas;
todas as etapas podem ser visualizadas;
é possível rolar para a esquerda e para a direita;
as setas aparecem apenas quando necessárias;
a etapa atual fica automaticamente visível;
clicar em uma etapa abre a página correta;
nenhuma etapa fica cortada;
somente a barra “EXPLORAÇÃO” possui rolagem horizontal;
a página inteira não ganha rolagem horizontal;
adicionar uma nova etapa futuramente não quebra o layout;
todas as telas utilizam o mesmo componente compartilhado.

Corrija apenas esse componente e preserve todo o restante do protótipo.