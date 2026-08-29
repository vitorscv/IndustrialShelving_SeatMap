# Pallet Check-in — Pantex Embalagens Industriais

Sistema de controle de ocupação de estantes industriais (racks de paletes), com check-in/check-out de mercadorias, dashboard visual, relatórios exportáveis e controle de acesso por perfil.

Monorepo com backend em **NestJS + Prisma + PostgreSQL** e frontend em **React + Vite**.

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack técnica](#stack-técnica)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Perfis de acesso (RBAC)](#perfis-de-acesso-rbac)
- [Visão geral da API](#visão-geral-da-api)
- [Segurança](#segurança)
- [Deploy em produção](#deploy-em-produção)

## Sobre o projeto

O armazém organiza produtos em **estantes** (`Shelf`), cada uma dividida em **níveis** e **posições** individuais. Cada posição tem um status (`FREE`, `OCCUPIED`, `BLOCKED`) e guarda os dados do palete atualmente armazenado ali (produto, quantidade, pedido/cliente, vendedor/cidade). O sistema registra toda entrada e saída como uma `Movement`, permitindo reconstruir o histórico de qualquer posição.

## Funcionalidades

- **Mapa visual das estantes** — grid de posições por nível, com status colorido (livre/ocupada/bloqueada).
- **Check-in / check-out** de paletes por posição, com validação de campos obrigatórios diferente para cada operação.
- **Cadastro de produtos**, incluindo importação em massa via planilha.
- **Histórico de movimentações** com filtros por posição, tipo e período.
- **Relatórios exportáveis em Excel (.xlsx)**: entradas/saídas por período, produtos mais movimentados, movimentações por vendedor/cidade, picos de atividade, posições paradas há muito tempo, e snapshot de ocupação atual.
- **Autenticação via JWT** com dois perfis de acesso (veja [RBAC](#perfis-de-acesso-rbac)).
- **Rate limiting no login** contra tentativas de força bruta.
- **Endpoint de health check** (`/health`) para monitoramento por orquestradores.

## Stack técnica

**Backend**
- [NestJS](https://nestjs.com/) 10
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL 16
- Passport + JWT (`@nestjs/jwt`, `passport-jwt`)
- `class-validator` / `class-transformer` para validação de DTOs
- `bcryptjs` para hash de senha (custo 12)
- `exceljs` para geração dos relatórios `.xlsx`
- `helmet` + `@nestjs/throttler` para hardening básico

**Frontend**
- [React](https://react.dev/) 19 + [Vite](https://vitejs.dev/)
- TypeScript
- React Router 7 (SPA com rotas protegidas por autenticação e por perfil)
- `lucide-react` para ícones

## Estrutura do repositório

```
pallet-checkin/
├── backend/                # API NestJS
│   ├── src/
│   │   ├── auth/            # login, JWT, guards de role
│   │   ├── health/          # health check
│   │   ├── shelves/         # CRUD de estantes
│   │   ├── positions/       # consulta de posições
│   │   ├── movements/       # check-in / check-out / histórico
│   │   ├── products/        # cadastro e importação de produtos
│   │   └── reports/         # geração dos relatórios .xlsx
│   ├── prisma/              # schema, migrations, scripts administrativos
│   └── docker-compose.yml   # PostgreSQL local
└── frontend/                # SPA React
    └── src/
        ├── pages/dashboard/  # Visão geral, Estantes, Movimentações, Produtos, Relatórios
        ├── components/       # PositionSidePanel, MovementModal, Sidebar, etc.
        ├── services/         # cliente da API, autenticação
        └── routes/           # ProtectedRoute, AdminRoute
```

## Pré-requisitos

- Node.js 20+
- Docker (para subir o PostgreSQL local via `docker-compose`) — ou uma instância PostgreSQL própria
- npm

## Como rodar localmente

### 1. Banco de dados

```bash
cd pallet-checkin/backend
docker compose up -d
```

Sobe um PostgreSQL 16 em `localhost:5434`.

### 2. Backend

```bash
cd pallet-checkin/backend
cp .env.example .env      # preencha os valores — veja a seção de variáveis abaixo
npm install
npm run prisma:migrate    # aplica as migrations no banco local
npm run prisma:seed-admin # cria o usuário admin e o usuário operador iniciais
npm run start:dev
```

A API sobe em `http://localhost:3001` (porta configurável via `PORT`).

### 3. Frontend

```bash
cd pallet-checkin/frontend
cp .env.example .env
npm install
npm run dev
```

O app sobe em `http://localhost:5174`.

## Variáveis de ambiente

### `backend/.env`

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL. |
| `JWT_SECRET` | Chave de assinatura dos tokens JWT. O app recusa iniciar se estiver vazia, curta (<32 caracteres) ou igual ao placeholder de exemplo. Gere uma com `openssl rand -base64 32`. |
| `PORT` | Porta em que a API sobe localmente (em produção no Railway isso é injetado automaticamente). |
| `FRONTEND_ORIGIN` | Origem(ns) permitida(s) pelo CORS, separadas por vírgula. Nunca usar wildcard. |
| `NODE_ENV` | `development` localmente, `production` em produção. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Credenciais do usuário administrador inicial, lidas apenas pelo script `prisma:seed-admin`. |
| `OPERATOR_USERNAME` / `OPERATOR_PASSWORD` | Credenciais do usuário operador inicial, lidas apenas pelo script `prisma:seed-admin`. |

Valores de produção devem ser sempre gerados do zero — nunca reaproveitar os de desenvolvimento.

### `frontend/.env`

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API. É uma variável de **build-time** do Vite — em produção precisa estar definida antes do build (ex: nas Environment Variables do Vercel). |

## Scripts disponíveis

### Backend (`pallet-checkin/backend`)

| Script | O que faz |
|---|---|
| `npm run start:dev` | Sobe a API em modo desenvolvimento, com watch. |
| `npm run build` | Compila o projeto para `dist/`. |
| `npm run start:prod` | Aplica migrations pendentes (`prisma migrate deploy`) e sobe a API a partir de `dist/`. |
| `npm run prisma:migrate` | Cria/aplica uma migration em desenvolvimento (`migrate dev`). |
| `npm run prisma:migrate:deploy` | Aplica migrations já existentes sem gerar novas — usado em produção. |
| `npm run prisma:seed-admin` | Cria o usuário admin e o usuário operador iniciais, a partir do `.env` (idempotente — não sobrescreve usuário já existente). |
| `npm run password:change -- <usuario> <novaSenha>` | Troca a senha de um usuário existente diretamente pelo terminal (uso administrativo). |
| `npm run lint` | Roda o ESLint. |
| `npm test` | Roda os testes com Jest. |

### Frontend (`pallet-checkin/frontend`)

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite. |
| `npm run build` | Type-check + build de produção em `dist/`. |
| `npm run preview` | Serve o build de produção localmente. |
| `npm run lint` | Roda o Oxlint. |

## Perfis de acesso (RBAC)

O sistema tem dois perfis, aplicados tanto no backend (`RolesGuard`, fonte real de verdade) quanto no frontend (esconder navegação e redirecionar rotas — apenas UX, não segurança):

| Perfil | Acesso |
|---|---|
| **ADMIN** | Acesso completo: cadastro/edição de estantes, produtos, relatórios, histórico de movimentações e criação de novos usuários, além de check-in/check-out. |
| **OPERATOR** | Apenas a Visão Geral do dashboard e o fluxo de check-in/check-out de posições. Sem acesso a Estantes, Movimentações, Produtos ou Relatórios. |

## Visão geral da API

Todas as rotas (exceto `/health` e `/auth/login`) exigem um JWT válido (`Authorization: Bearer <token>`).

| Recurso | Rotas | Acesso |
|---|---|---|
| Autenticação | `POST /auth/login` | público |
| | `POST /auth/users` | ADMIN |
| Saúde | `GET /health` | público |
| Estantes | `GET /shelves`, `GET /shelves/occupancy-summary` | ADMIN + OPERATOR |
| | `POST /shelves`, `PATCH /shelves/:id` | ADMIN |
| Posições | `GET /positions/:id` | ADMIN + OPERATOR |
| Movimentações | `POST /movements` (check-in/check-out) | ADMIN + OPERATOR |
| | `GET /movements` (histórico) | ADMIN |
| Produtos | `GET /products` | ADMIN + OPERATOR |
| | `POST /products`, `POST /products/import` | ADMIN |
| Relatórios | `GET /reports/*` (todos, retornam `.xlsx`) | ADMIN |

## Segurança

- Senhas com hash `bcrypt` (custo 12); `passwordHash` nunca é retornado em nenhuma resposta da API.
- `JWT_SECRET` validado na inicialização — o processo recusa subir com valor ausente, curto ou igual ao placeholder de exemplo.
- Rate limiting dedicado no `POST /auth/login`, além de um limite global mais permissivo para as demais rotas.
- CORS restrito a uma allowlist explícita (`FRONTEND_ORIGIN`), sem wildcard.
- Autorização por perfil garantida no backend (`RolesGuard`) — o que o frontend esconde na UI é só conveniência, não é a barreira de segurança real.

## Deploy em produção

- **Backend → [Railway](https://railway.app/)**: builder Nixpacks, configuração em `backend/railway.json`. `npm run start:prod` aplica `prisma migrate deploy` automaticamente antes de subir o servidor. Health check configurado em `/health`. Variáveis sensíveis (`JWT_SECRET`, `ADMIN_PASSWORD`, `OPERATOR_PASSWORD`, `DATABASE_URL`) devem ser cadastradas como *Sealed Variables* no painel do Railway, para nunca serem expostas nas camadas da imagem de build.
- **Frontend → [Vercel](https://vercel.com/)**: `frontend/vercel.json` faz o rewrite de SPA (todas as rotas caem em `index.html`, necessário por causa do React Router). `VITE_API_URL` deve apontar para a URL pública do backend no Railway e ser definida antes do build.
