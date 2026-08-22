# CONG — Operational Builder for NGOs

[Versão em português](./README.md)

**CONG** is an open-source platform under active development designed to help non-governmental organizations build and operate digital environments adapted to their own needs.

The project combines a **multi-tenant SaaS architecture**, reusable modules, and an experience intended to remain accessible to people without technical backgrounds, reducing dependence on spreadsheets, disconnected tools, and systems that are difficult to adapt.

> CONG is still under active development and has not yet reached a stable 1.0 release.

---

## Project status

CONG already has a functional development foundation, including:

- a React and TypeScript web frontend;
- a Node.js, TypeScript, and Express backend;
- PostgreSQL and Supabase;
- email and password authentication;
- email confirmation;
- session renewal through refresh tokens;
- account and profile management;
- avatar upload and removal;
- initial creation and management of collaboration profiles;
- public institutional pages;
- an initial community structure;
- versioned database migrations.

The modular builder core, community features, and the complete multi-tenant architecture are still being implemented.

---

## Product vision

Each organization is expected to have its own isolated environment inside the platform and to activate and configure resources according to its needs.

Planned operational domains include:

- beneficiaries;
- volunteers;
- donations;
- inventory;
- projects;
- scheduling;
- communication;
- forms;
- documents;
- reports;
- routes and deliveries.

These modules are implemented incrementally. A module being listed here does not necessarily mean that it is already available in the current version.

---

## Architecture

CONG follows a web architecture that separates the frontend, API, and data persistence layers.

```text
User
  ↓
Web Frontend
React + TypeScript + Vite
  ↓
API
Node.js + TypeScript + Express
  ↓
Services and business rules
  ↓
PostgreSQL / Supabase
```

The architecture is designed to evolve toward a multi-tenant SaaS model in which multiple organizations use the same platform while maintaining isolation of data, users, permissions, and settings.

---

## Technologies

### Frontend

- React
- TypeScript
- Vite
- React Router
- CSS Modules
- Lucide React
- React Icons

### Backend

- Node.js
- TypeScript
- Express
- Zod
- PostgreSQL
- Supabase

### Infrastructure and development

- Git
- GitHub
- Supabase
- Vercel

---

## Repository structure

```text
cong-platform/
├── api/
│   └── index.ts
├── backend/
│   ├── certs/
│   ├── src/
│   ├── supabase/
│   │   ├── config.toml
│   │   └── migrations/
│   ├── .env.example
│   └── package.json
├── public/
├── src/
│   ├── assets/
│   │   ├── brand/
│   │   ├── mascot/
│   │   └── team/
│   ├── components/
│   ├── contexts/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   └── utils/
├── .env.example
├── BRAND.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── MEDIA_RIGHTS.md
├── SECURITY.md
├── package.json
└── vercel.json
```

---

## Running the project

### Requirements

You will need:

- Node.js;
- npm;
- Git;
- your own Supabase project or a local Supabase environment;
- the Supabase CLI if you intend to apply or develop migrations.

Never use CONG production credentials in a personal development environment.

### 1. Clone the repository

```bash
git clone https://github.com/CongPlatform/cong-platform.git
cd cong-platform
```

### 2. Install dependencies

```bash
npm ci
```

The root installation process also installs backend dependencies.

### 3. Configure the frontend

Create a `.env` file based on `.env.example`.

```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. Configure the backend

Create `backend/.env` using `backend/.env.example` as a reference.

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://...
DATABASE_CA_CERT_PATH=./certs/supabase-ca.crt

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

`SUPABASE_SECRET_KEY` is server-only and must never be exposed in frontend code or in any `VITE_*` variable.

---

## Database

CONG database migrations are versioned under:

```text
backend/supabase/migrations/
```

When contributing with a hosted Supabase project, use **your own development project**.

From the `backend` directory:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Always confirm which project is linked before running destructive commands. Never run resets or destructive tests against production infrastructure.

---

## Development

Start the frontend and backend together with:

```bash
npm run dev
```

Default local addresses:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

You can also run them separately:

```bash
npm run frontend
```

```bash
npm run backend
```

---

## Validation before contributing

Before opening a Pull Request, run:

```bash
npm run lint
npm run build
npm --prefix backend run build
```

Do not submit changes with known compilation errors.

---

## Contributing

Contributions are welcome in areas such as:

- code;
- bug fixes;
- tests;
- documentation;
- accessibility;
- design;
- translations;
- research;
- proposals for new modules.

Read [CONTRIBUTING.md](./CONTRIBUTING.md).

The general workflow is:

```text
Fork
 ↓
Branch
 ↓
Changes
 ↓
Local validation
 ↓
Pull Request
 ↓
Review
 ↓
Merge
```

Large changes, new modules, and architectural decisions should be discussed in an Issue before implementation.

External contributors do not need and should not receive access to CONG production credentials, production databases, production Supabase projects, production Vercel projects, or other private infrastructure.

---

## Security

Do not disclose sensitive vulnerabilities in public Issues or Pull Requests.

See [SECURITY.md](./SECURITY.md).

Real credentials, tokens, passwords, private keys, and `.env` files must never be committed.

---

## Licensing

The **CONG source code** is distributed under the [MIT License](./LICENSE).

The MIT License does not automatically apply to every asset in this repository.

### Brand and visual identity

The CONG name, logos, Cong mascot, and other visual identity elements are governed separately:

[BRAND.md](./BRAND.md)

### Team photographs and likeness

Team photographs and portraits are not licensed under the MIT License:

[MEDIA_RIGHTS.md](./MEDIA_RIGHTS.md)

Their presence in a public repository does not grant general permission to reuse them.

---

## Code of Conduct

Community participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

We aim to maintain a respectful, constructive, and accessible environment for both experienced contributors and people who are just getting started.

---

## Team

CONG is initially developed by:

- André Mendes — Web Development;
- João Palumbo — Documentation and Research;
- Kelvin Palka — Leadership and Development.

The project originated as a Final Course Project for the Integrated High School and Technical Program in Systems Development at ETEC de Hortolândia, Brazil.

Future contributions become part of the project's collective evolution and are recognized through the Git and GitHub history.

---

## Development state

CONG is evolving actively.

Interfaces, architecture, modules, database structures, and documentation may change significantly while the project approaches its first stable versions.

Issues and Pull Requests are welcome to help make the platform safer, more accessible, more sustainable, and more useful to social organizations.
