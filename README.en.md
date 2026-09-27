# CONG — Operational Builder for NGOs

[Versão em português](https://github.com/CongPlatform/cong-platform/blob/dev/README.md)

**CONG** is an open-source platform under development designed to allow non-governmental organizations to build and operate digital environments adapted to their own needs.

The proposal combines a **multi-tenant SaaS architecture**, reusable modules, and an experience also designed for people without technical knowledge, reducing dependence on spreadsheets, disconnected tools, and systems that are difficult to adapt.

> CONG is still under active development and does not have a stable 1.0 release yet.

---

## Table of Contents

* [Project status](#project-status)
* [Product vision](#product-vision)
* [Architecture](#architecture)
* [Technologies](#technologies)
* [Repository structure](#repository-structure)
* [Running the project](#running-the-project)
* [Environment variables](#environment-variables)
* [Database](#database)
* [Mobile app](#mobile-app)
* [Development](#development)
* [Pre-contribution validation](#pre-contribution-validation)
* [Contributing](#contributing)
* [Security](#security)
* [Licensing](#licensing)
* [Code of Conduct](#code-of-conduct)
* [Team](#team)
* [Development status](#development-status)

---

## Project status

CONG already has a functional development foundation, including:

* web frontend built with React and TypeScript;
* backend built with Node.js, TypeScript, and Express, served as a serverless function on Vercel;
* PostgreSQL and Supabase as the data and authentication layer;
* email and password authentication;
* email confirmation;
* session renewal through refresh tokens;
* account and profile management;
* avatar upload and removal;
* initial creation and management of collaboration profiles;
* public institutional pages;
* initial community structure;
* versioned database migrations;
* a companion mobile application (Expo/React Native), which consumes the same API — see [Mobile app](#mobile-app).

The modular builder core, community evolution, and complete multi-tenant architecture are still under implementation.

---

## Product vision

Each organization is expected to have its own isolated environment within the platform, being able to enable and configure features according to its own reality.

Planned domains include:

* beneficiaries;
* volunteers;
* donations;
* inventory;
* projects;
* scheduling;
* communication;
* forms;
* documents;
* reports;
* routes and deliveries.

These modules are being implemented incrementally. The presence of a module in this list does not necessarily mean that it is already available in the current version.

---

## Architecture

CONG follows an architecture that separates the frontend, API, and data persistence, with a single API access point shared by all clients (web and mobile):

```text
                     User
                       │
          ┌────────────┴────────────┐
          │                         │
     Web Frontend              Mobile App
  React + TS + Vite       Expo + React Native
          │                         │
          └────────────┬────────────┘
                       │ HTTPS (/api/*)
                       ▼
             API (serverless function)
          Node.js + TypeScript + Express
           hosted on Vercel (api/index.ts)
                       │
                       ▼
             Services and business rules
                       │
                       ▼
               PostgreSQL / Supabase
```

Important points about this architecture:

* **The API is the only component that communicates with the database.** Neither the web frontend nor the mobile app has direct access to the production PostgreSQL database.
* **The mobile app does not include the Supabase SDK.** All authentication and data persistence from the mobile app goes through the Express API — the mobile app only knows the public API URL. See [Mobile app](#mobile-app) for the full details.
* **The web frontend may use the `@supabase/supabase-js` client** with the publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`) for operations that rely on Row Level Security (RLS) in Supabase, in addition to communicating with the Express API for other operations.
* The architecture is designed to evolve toward a multi-tenant SaaS model in which different organizations use the same platform while maintaining isolation of data, users, permissions, and configurations.

---

## Technologies

### Frontend

* React
* TypeScript
* Vite
* React Router
* CSS Modules
* Lucide React
* React Icons
* `@supabase/supabase-js` (publishable client, subject to RLS)

### Backend

* Node.js
* TypeScript
* Express (packaged as a serverless function in `api/index.ts`)
* Zod
* PostgreSQL
* Supabase (Auth + Database)

### Infrastructure and development

* Git
* GitHub
* Supabase
* Vercel

---

## Repository structure

```text
cong-platform/
├── api/
│   └── index.ts              # Serverless function entry point (Vercel)
├── backend/
│   ├── certs/                # Certificate used for the Postgres connection
│   ├── src/                  # Express API source code
│   ├── supabase/
│   │   ├── config.toml
│   │   └── migrations/       # Versioned database migrations
│   ├── .env.example
│   └── package.json
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   └── utils/
├── .env.example
├── vercel.json                # Rewrites and serverless function configuration
├── BRAND.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── MEDIA_RIGHTS.md
├── SECURITY.md
└── package.json
```

The mobile app repository is separate: [`cong-platform-mobile`](https://github.com/CongPlatform/cong-platform-mobile).

---

## Running the project

### Prerequisites

You will need:

* Node.js;
* npm;
* Git;
* your own Supabase project or a local Supabase environment;
* Supabase CLI, if you want to apply or develop migrations.

> Never use CONG production credentials in personal development environments.

### 1. Clone the repository

```bash
git clone https://github.com/CongPlatform/cong-platform.git
cd cong-platform
```

### 2. Install dependencies

```bash
npm ci
```

Installing the root project also installs the backend dependencies through the `postinstall` script.

### 3. Configure the frontend

Create a `.env` file in the root directory based on `.env.example`:

```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. Configure the backend

Create `backend/.env` based on `backend/.env.example`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://...
DATABASE_CA_CERT_PATH=./certs/supabase-ca.crt

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

---

## Environment variables

This section exists to make explicit **what each variable does, who should know it, and why** — avoiding both accidental leaks and unnecessary friction for people who simply want to contribute.

### Web frontend (`.env`, `VITE_*` prefix)

| **Variable**                    | **Purpose**                                                                                                                                                                         | **Visibility**                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                  | Base path for API calls. `/api` when frontend and backend are part of the same deployment.                                                                                          | Public — it is included in the JS bundle and visible to anyone inspecting the website's source code. |
| `VITE_SUPABASE_URL`             | URL of the Supabase project used by the `@supabase/supabase-js` client in the browser.                                                                                              | Public.                                                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. Allows the browser to make direct calls to the Supabase REST API, **always subject to the Row Level Security (RLS) policies** configured in the database. | Public by design — its name does not indicate that it should be secret.                              |

> Any variable with the `VITE_` prefix is embedded into the JavaScript bundle during the build and becomes visible to anyone who inspects the website's code. **Never put a secret value behind this prefix.**

### Backend (`backend/.env`, without a public prefix)

| **Variable**               | **Purpose**                                                                                                      | **Visibility**                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                     | Port on which Express listens locally.                                                                           | Not sensitive.                                                                                                               |
| `FRONTEND_URL`             | Origin allowed for CORS.                                                                                         | Not sensitive.                                                                                                               |
| `DATABASE_URL`             | Direct PostgreSQL connection string.                                                                             | **Secret — must never leave the server environment.**                                                                        |
| `DATABASE_CA_CERT_PATH`    | Path to the certificate used for the TLS database connection.                                                    | Not secret (it is a file path versioned in `backend/certs/`).                                                                |
| `SUPABASE_URL`             | Supabase project URL used by the backend.                                                                        | Public (it is the same URL used by the frontend).                                                                            |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key used by the backend when applicable.                                                             | Public.                                                                                                                      |
| `SUPABASE_SECRET_KEY`      | Privileged Supabase key (service role). Bypasses RLS. Used only for operations requiring server-side privileges. | **Secret — exclusive to the backend and must never reach the frontend, mobile app, or a `VITE_*`/`EXPO_PUBLIC_*` variable.** |

### General rule

* A public prefix (`VITE_*` on the web, `EXPO_PUBLIC_*` on mobile) means "this value will be sent to the client and will be publicly visible" — never put secrets there, regardless of the variable name.
* A variable without such a prefix, defined only in the backend/infrastructure (Vercel), is never delivered to the client and exists only within the serverless function's execution environment.
* Calling a variable "secret" (`SUPABASE_SECRET_KEY`) is not merely decorative: it grants privileged access to the database and must never be copied to the frontend, mobile app, logs, or any externally accessible location.

---

## Database

CONG migrations are versioned in:

```text
backend/supabase/migrations/
```

When contributing using a hosted Supabase project, use **your own development project** — never the production project.

From the `backend` directory:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Before running destructive commands, always confirm which project is linked. **Never run resets or destructive tests against production infrastructure.**

---

## Mobile app

The mobile app (repository [`cong-platform-mobile`](https://github.com/CongPlatform/cong-platform-mobile)) is an independent client that **does not access Supabase directly**. It:

* does not include the `@supabase/supabase-js` SDK among its dependencies;
* does not know `DATABASE_URL` or `SUPABASE_SECRET_KEY`;
* communicates exclusively with the same Express API used by the web frontend, authenticating through Supabase Auth behind the API.

The only environment variable the mobile app needs is:

```env
EXPO_PUBLIC_API_URL=https://YOUR-HOSTED-DOMAIN
```

This means anyone can develop and test the mobile app without ever having access to a production credential — the only information they need is the public API address, which is public by nature.

> **Important:** when configuring `EXPO_PUBLIC_API_URL`, use the development/staging environment indicated in the mobile repository's `CONTRIBUTING.md` — do not point it to the production domain. Network details and physical-device testing are documented in `CONEXAO.md` in the mobile repository.

---

## Development

To start the frontend and backend together:

```bash
npm run dev
```

By default:

```text
Frontend: http://localhost:5173
Backend: http://localhost:3000
```

They can also be run separately:

```bash
npm run frontend
npm run backend
```

---

## Pre-contribution validation

Before opening a Pull Request, run:

```bash
npm run lint
npm run build
npm --prefix backend run build
```

An alteration should not be submitted with known compilation errors.

---

## Contributing

Contributions are welcome in areas such as:

* code;
* bug fixes;
* tests;
* documentation;
* accessibility;
* design;
* translations;
* research;
* proposals for new modules.

Read first: [CONTRIBUTING.md](https://github.com/CongPlatform/cong-platform/blob/dev/CONTRIBUTING.md)

The general workflow is:

```text
Fork → Branch → Changes → Local validation → Pull Request → Review → Merge
```

Large changes, new modules, or architectural decisions should be discussed in an Issue before implementation.

**External contributors do not need and should not have access to CONG production credentials, production database, production Supabase project, production Vercel environment, or other private CONG infrastructure** — the project architecture (with the API centralizing database access and public variables separated from secrets) was designed precisely to make this possible.

---

## Security

Do not publish sensitive vulnerabilities in public Issues or Pull Requests.

See [SECURITY.md](https://github.com/CongPlatform/cong-platform/blob/dev/SECURITY.md).

Credentials, tokens, passwords, private keys, and real `.env` files must never be committed to the repository.

> This section will be expanded with additional hardening details (mobile development environment isolation, RLS policies, etc.) in a future update.

---

## Licensing

The **CONG source code** is distributed under the [MIT License](https://github.com/CongPlatform/cong-platform/blob/dev/LICENSE).

The MIT License does not automatically apply to all materials present in the repository.

### Brand and visual identity

The CONG name, logos, Cong mascot, and other visual identity elements have their own rules: [BRAND.md](https://github.com/CongPlatform/cong-platform/blob/dev/BRAND.md).

### Photographs and portraits

Team photographs and portraits are not licensed under the MIT License: [MEDIA_RIGHTS.md](https://github.com/CongPlatform/cong-platform/blob/dev/MEDIA_RIGHTS.md).

The presence of these files in a public repository does not represent general authorization to reuse the images.

---

## Code of Conduct

Community participation is subject to the [CODE_OF_CONDUCT.md](https://github.com/CongPlatform/cong-platform/blob/dev/CODE_OF_CONDUCT.md).

We aim to maintain a respectful, constructive, and accessible environment for both experienced contributors and those who are just getting started.

---

## Team

CONG is initially developed by:

* André Mendes — Mobile Development;
* João Palumbo — Documentation and Research;
* Kelvin Palka — Web Development.

The project originated as a Final Course Project for the Integrated High School and Technical Program in Systems Development at ETEC Hortolândia.

---

## Development status

CONG is under active development.

Interfaces, architecture, modules, database, and documentation may undergo significant changes as the project moves toward its first stable releases.

Issues and Pull Requests are welcome to help make the platform more secure, accessible, sustainable, and useful for social organizations.
