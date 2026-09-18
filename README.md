# Sistema de Gestão do CEICIM

Aplicação web responsiva para controle de estoque e organização de visitas do **Centro Educacional Inovação de Ciências — CEICIM**.

O projeto nasceu de uma necessidade real do estágio: substituir controles informais por um sistema centralizado, rastreável e simples de usar no computador ou celular.

> Projeto desenvolvido por **Samuel Ladeia** como solução institucional e item de portfólio.

## Situação do projeto

- Aplicação concluída e compilada com sucesso.
- Banco PostgreSQL criado e estrutura validada.
- Relatório PDF gerado e conferido visualmente.
- Publicação na Vercel pendente da autorização de implantação da conta proprietária.
- Nenhuma senha, chave ou URL privada de banco é armazenada neste repositório.

## Principais funcionalidades

- Login individual com usuário e senha.
- Perfis de acesso `administrador` e `operador`.
- Cadastro e pesquisa de materiais por nome e categoria.
- Soma automática quando um item da mesma categoria já existe.
- Registro de entradas e saídas.
- Bloqueio de saída acima do saldo disponível.
- Setor de destino e nome de quem recebeu o material.
- Estoque mínimo e alerta visual de baixo estoque.
- Histórico com data, hora, ação e usuário responsável.
- Arquivamento, restauração e exclusão definitiva após 21 dias.
- Calendário para agendamento de visitas.
- Situações de visita: agendada, realizada e cancelada.
- Download do estoque ativo em PDF A4.
- Interface adaptada para computadores e celulares.

## Perfis e permissões

| Ação | Administrador | Operador |
| --- | :---: | :---: |
| Consultar estoque, agenda e histórico | ✅ | ✅ |
| Cadastrar item | ✅ | ✅ |
| Registrar entrada e saída | ✅ | ✅ |
| Criar e atualizar visitas | ✅ | ✅ |
| Baixar estoque em PDF | ✅ | ✅ |
| Editar item | ✅ | ❌ |
| Arquivar, restaurar ou excluir item | ✅ | ❌ |
| Criar usuários e alterar permissões | ✅ | ❌ |
| Redefinir senha de outro usuário | ✅ | ❌ |

## Tecnologias utilizadas

- **Next.js 16** e **React 19**
- **TypeScript**
- **Tailwind CSS** e componentes shadcn/ui
- **PostgreSQL / Neon**
- **Drizzle ORM**
- **PDF-Lib**
- **Vercel** para hospedagem

## Arquitetura

```mermaid
flowchart TD
  UI[Interface Next.js] --> API[Rotas protegidas]
  API --> AUTH[Autenticação e permissões]
  API --> DB[(PostgreSQL)]
  API --> PDF[Relatório PDF]
```

As senhas são protegidas com `scrypt`. A sessão utiliza token aleatório armazenado no banco somente como hash e enviado ao navegador em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.

## Estrutura principal

```text
app/
├── api/
│   ├── auth/          # login, logout, primeiro acesso e troca de senha
│   ├── data/          # estoque, movimentações e visitas
│   ├── inventory/pdf/ # geração do relatório
│   └── users/         # administração de usuários
├── dashboard/         # sistema autenticado
└── usuarios/          # painel exclusivo do administrador
components/ceicim/     # telas específicas do sistema
db/                    # conexão e tabelas PostgreSQL
drizzle/               # migração SQL versionada
lib/                   # autenticação e geração do PDF
docs/                  # processo e decisões do projeto
```

## Como executar

### 1. Requisitos

- Node.js 22 ou superior
- pnpm
- Banco PostgreSQL

### 2. Instalação

```bash
git clone https://github.com/S4muel789/sistema-estoque-Ceicim.git
cd sistema-estoque-Ceicim
pnpm install
```

### 3. Variáveis de ambiente

Crie `.env.local` com base em `.env.example`:

```env
DATABASE_URL=postgresql://usuario:senha@servidor/banco
SETUP_KEY=crie-um-codigo-secreto
```

### 4. Banco e execução

```bash
pnpm db:migrate
pnpm dev
```

Acesse `http://localhost:3000`. Quando o banco ainda não possuir usuários, o sistema apresentará a configuração do primeiro administrador e solicitará o `SETUP_KEY`.

## Validações realizadas

- `pnpm lint`: nenhum erro.
- `pnpm build`: compilação de produção concluída.
- Rotas de dados e PDF sem autenticação: resposta `401` confirmada.
- PDF: arquivo A4 paisagem, paginação e tabela conferidos por renderização.
- Banco: cinco tabelas e respectivos índices confirmados no PostgreSQL.

## Documentação do desenvolvimento

O histórico das decisões, etapas e dificuldades encontradas está em [docs/PROCESSO-DE-DESENVOLVIMENTO.md](docs/PROCESSO-DE-DESENVOLVIMENTO.md).

## Autoria

**Samuel Ladeia**  
Projeto desenvolvido para apoiar a gestão interna do CEICIM.
