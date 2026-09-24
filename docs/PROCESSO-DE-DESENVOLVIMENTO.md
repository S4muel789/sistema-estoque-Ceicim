# Processo de desenvolvimento

Este documento registra a evolução do Sistema de Gestão do CEICIM, as decisões técnicas tomadas e as validações realizadas. Ele foi preparado para demonstrar o processo do projeto no portfólio, sem publicar credenciais ou dados privados.

## 1. Problema identificado

O ambiente precisava controlar equipamentos e materiais, como computadores, cabos e acessórios, além de organizar as visitas recebidas pelo CEICIM. O processo precisava ser simples, funcionar no celular e manter um histórico confiável das operações.

Os objetivos definidos foram:

1. Centralizar o estoque.
2. Evitar saídas acima do saldo.
3. Identificar o destino de cada material.
4. Alertar sobre estoque baixo.
5. Organizar visitas em calendário.
6. Registrar quem realizou cada operação.
7. Manter a solução compatível com serviços gratuitos.

## 2. Levantamento e refinamento dos requisitos

Durante o desenvolvimento, os requisitos foram refinados conforme o uso e a avaliação da interface:

- A tela inicial passou a apresentar indicadores, próximas visitas e alertas.
- O estoque recebeu busca imediata por nome e categoria.
- Entradas e saídas foram separadas em abas.
- O histórico recebeu paginação.
- Itens repetidos passaram a somar quantidades em vez de criar outra linha.
- A saída passou a exigir setor de destino e pessoa que recebeu.
- Itens retirados do uso passaram para uma área de arquivados.
- A exclusão definitiva foi limitada ao administrador e liberada após 21 dias, somente com saldo zerado e preservação do histórico.

## 3. Primeira arquitetura

A primeira versão foi criada como um ChatGPT Site com Next.js/Vinext e banco D1. Ela permitiu validar o visual, o fluxo de estoque e o calendário rapidamente.

Quando ficou definido que diferentes pessoas precisariam entrar com usuário e senha próprios, a arquitetura precisou mudar. O ambiente anterior oferecia autenticação vinculada à plataforma, mas não o modelo de credenciais independentes solicitado.

## 4. Migração da aplicação

A aplicação foi migrada para:

- Next.js padrão para implantação na Vercel.
- PostgreSQL hospedado no Neon.
- Drizzle ORM para definir e versionar as tabelas.
- Autenticação própria com usuários, sessões e perfis.

O site anterior foi mantido durante o processo para evitar interrupção e perda do trabalho já realizado. A consulta ao banco da versão anterior confirmou que não existiam itens, movimentações ou visitas para transferir.

## 5. Autenticação e segurança

Foram implementados os seguintes controles:

- Nome de usuário individual e senha mínima de dez caracteres para novas contas e redefinições.
- Hash de senha com `scrypt` e salt aleatório.
- Token de sessão aleatório de 256 bits.
- Apenas o hash do token fica armazenado no banco.
- Cookie de sessão `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Sessão com validade de sete dias.
- Bloqueio temporário depois de cinco tentativas inválidas.
- Primeiro administrador criado por fluxo de ativação com código secreto.
- Usuário desativado perde as sessões abertas.
- Rotas do servidor conferem a permissão, independentemente do que aparece na interface.
- Requisições de alteração vindas de outro site são bloqueadas.
- Cabeçalhos de segurança impedem incorporação em `iframe`, forçam HTTPS e reduzem a exposição de dados do navegador.

## 6. Modelo de permissões

O operador executa o trabalho diário: consulta, cadastro, entrada, saída, agenda e PDF. O administrador possui essas funções e também gerencia contas e ações que alteram ou removem registros.

As operações exclusivas do administrador são protegidas na API:

- editar item;
- arquivar e restaurar;
- excluir definitivamente;
- criar ou desativar usuários;
- alterar perfil;
- redefinir senha.

## 7. Banco de dados

Foram criadas cinco tabelas:

| Tabela | Finalidade |
| --- | --- |
| `users` | Contas, perfis e controle de bloqueio |
| `sessions` | Sessões autenticadas |
| `inventory_items` | Materiais ativos e arquivados |
| `inventory_movements` | Histórico das operações |
| `visits` | Agenda e situação das visitas |

Índices foram adicionados nos campos mais usados para autenticação, histórico, identidade de itens, datas e situações.

A identidade normalizada de um item ativo possui índice exclusivo. Assim, mesmo com dois usuários trabalhando ao mesmo tempo, o banco impede duplicatas de nome e categoria. Entradas e saídas atualizam o saldo de forma atômica dentro de transações; uma saída concorrente também não consegue reduzir o estoque abaixo de zero.

## 8. Regras de arquivamento e exclusão

O fluxo de retirada foi desenhado para evitar apagamentos acidentais:

1. Apenas administradores podem arquivar, restaurar ou excluir.
2. O item só pode ser arquivado quando o saldo está zerado.
3. A exclusão definitiva só é liberada depois de 21 dias arquivado.
4. Antes da remoção, o sistema registra a ação, o usuário e o horário.
5. As movimentações anteriores permanecem no histórico mesmo após a exclusão do cadastro.

## 9. Relatório em PDF

O estoque ativo pode ser baixado em PDF. O documento possui:

- formato A4 em orientação paisagem;
- cabeçalho institucional;
- data e hora de emissão;
- categoria, item, saldo, mínimo e situação;
- linhas alternadas para facilitar a leitura;
- paginação automática;
- resumo de itens, unidades e estoques baixos;
- crédito de autoria no rodapé.

O relatório foi testado com 38 itens distribuídos em três páginas e renderizado em imagem para inspeção visual.

## 10. Validação técnica

Foram executadas as seguintes verificações:

| Verificação | Resultado |
| --- | --- |
| ESLint | Sem erros; apenas recomendações de navegação do Next.js |
| Build de produção | Concluído com sucesso |
| Tipagem TypeScript | Concluída durante o build |
| Estrutura PostgreSQL | Cinco tabelas confirmadas |
| Proteção de `/api/data` | `401` sem login |
| Proteção de `/api/inventory/pdf` | `401` sem login |
| Renderização do PDF | Três páginas A4 conferidas |

O ambiente local de execução não conseguiu resolver diretamente o endereço externo do Neon por restrição de rede. A criação e a inspeção do banco foram realizadas pelo canal autorizado do provedor.

## 11. Implantação

O projeto foi publicado na Vercel e conectado ao banco PostgreSQL do Neon por variáveis secretas. O repositório não guarda a URL do banco nem o código de ativação.

## 12. Cuidados para publicação

Antes de colocar o sistema em produção:

1. Configurar `DATABASE_URL` como variável secreta.
2. Gerar um `SETUP_KEY` longo e aleatório.
3. Publicar o projeto.
4. Criar a primeira conta administrativa.
5. Remover ou trocar o `SETUP_KEY` após a ativação.
6. Cadastrar cada operador com conta própria.
7. Testar entrada, saída, agenda e PDF no domínio de produção.

## 13. Resultado

O projeto evoluiu de uma validação rápida de estoque e agenda para uma aplicação completa com autenticação individual, autorização por perfil, rastreabilidade, banco relacional e geração de documentos. A arquitetura final permite o uso por várias pessoas sem compartilhar uma única senha, preserva a integridade do saldo sob acessos simultâneos e reutiliza conexões com o banco para responder com menor latência.
