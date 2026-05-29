# Truevestii

A modern crypto investment brokerage platform. Users can register, complete verification, browse investment plans, make crypto deposits, and track their portfolio — all through a polished, responsive interface.

> **Note:** This is a public showcase repository. Sensitive configuration, production secrets, and wallet infrastructure are excluded. See [Security](#security) below.

## Features

- **User Authentication** — Signup with email OTP verification, JWT-based sessions, password reset
- **Investment Plans** — Tiered plans with configurable limits, supported assets, and estimated returns
- **Crypto Deposits** — Generate deposit addresses, submit transaction proofs, admin-approved balance crediting
- **Withdrawal Requests** — Users request withdrawals; admins review and approve
- **Admin Dashboard** — Deposit/withdrawal approval, user management, investment oversight, audit logs
- **Notifications** — Real-time in-app notification system
- **Support Tickets** — Built-in customer support workflow
- **Audit Trail** — Every admin and user action is logged for compliance
- **Risk Disclosures** — Consent tracking and disclosure acceptance before investments

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React, TypeScript, TailwindCSS, Framer Motion |
| Backend | Express.js, TypeScript, Zod validation |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT access/refresh tokens, bcrypt, OTP email verification |
| Email | Resend / SendGrid / SMTP / Console (configurable) |
| Crypto | Pluggable provider architecture for deposit address generation |
| Infra | Docker Compose (local), Vercel (frontend), Render (backend) |

## Screenshots

<!-- Add screenshots here -->
![Dashboard](docs/screenshots/dashboard.png)
![Investment Plans](docs/screenshots/plans.png)
![Deposits](docs/screenshots/deposits.png)

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- npm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment templates
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Run database migrations
npm run prisma:migrate

# 5. Start development servers
npm run dev --workspace apps/api   # API on http://localhost:4000
npm run dev --workspace apps/web   # Web on http://localhost:3000
```

For local crypto address testing, set `CRYPTO_PROVIDER=mock` in `apps/api/.env` to generate fake addresses that cannot receive real funds.

## Project Structure

```
truevestii/
├── apps/
│   ├── api/          # Express backend (auth, payments, admin, investments)
│   │   ├── prisma/   # Database schema & migrations
│   │   └── src/      # Routes, middleware, libs, crypto providers
│   └── web/          # Next.js frontend (App Router)
│       ├── app/      # Pages and layouts
│       ├── components/  # Reusable UI components
│       └── lib/      # Client utilities
├── infra/            # Deployment configs (Render, Vercel)
├── docs/             # Documentation
└── wallet-core/      # Trust Wallet Core (vendored dependency)
```

## Scripts

```bash
npm run typecheck          # Type-check all workspaces
npm run build              # Build all workspaces
npm test --workspace apps/api   # Run API tests
```

## Security

- **No secrets in source.** All `.env` files are gitignored. Use `.env.example` templates and your platform's secret manager.
- **No auto-sweeping.** The backend generates deposit addresses only — it does not move, transfer, or sign transactions.
- **Admin approval required.** All deposits and withdrawals require explicit admin review.
- **Compliance ready.** Risk disclosures, consent tracking, and audit logs are built in.

> **Before deploying to production:** Add a real CAPTCHA provider, KYC/AML service, transaction monitoring, and HTTPS. See `apps/api/.env.example` for the full list of required environment variables.

## License

Proprietary — all rights reserved.