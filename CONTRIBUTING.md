# Guia de Contribuição — CONG

[English version below](#contribution-guide--cong)

Obrigado pelo interesse em contribuir com a **CONG — Construtor Operacional para ONGs**.

A CONG é um projeto open source em desenvolvimento. Este documento define o fluxo de contribuição para manter alterações revisáveis, seguras e coerentes com a arquitetura do projeto.

---

## Antes de contribuir

Antes de começar:

1. leia o `README.md`;
2. leia o `CODE_OF_CONDUCT.md`;
3. leia o `SECURITY.md`;
4. verifique Issues abertas relacionadas ao que você pretende alterar;
5. para mudanças grandes, novos módulos ou decisões arquiteturais, abra ou participe de uma Issue antes de implementar.

Correções pequenas, documentação e ajustes localizados normalmente podem seguir diretamente para um Pull Request.

---

## Formas de contribuir

Contribuições são bem-vindas em áreas como:

- código;
- correções de bugs;
- testes;
- documentação;
- acessibilidade;
- design;
- traduções;
- pesquisa;
- melhorias de experiência;
- propostas de módulos;
- melhorias de segurança;
- manutenção e atualização de dependências.

---

## Ambiente de desenvolvimento

Contribuidores externos devem trabalhar em seus próprios ambientes.

Você **não precisa e não deve ter acesso** a:

- banco de produção da CONG;
- Supabase de produção;
- Vercel de produção;
- segredos de deploy;
- chaves privadas;
- tokens ou credenciais de mantenedores.

Para desenvolvimento com Supabase, utilize um projeto próprio ou uma instância local.

Nunca utilize dados pessoais ou dados reais de organizações em testes.

---

## Fluxo recomendado

```text
Fork
 ↓
Branch
 ↓
Alterações
 ↓
Validação local
 ↓
Commit
 ↓
Push para o fork
 ↓
Pull Request
 ↓
Revisão
 ↓
Merge
```

### 1. Faça um fork

Crie um fork do repositório oficial da CONG em sua conta do GitHub.

### 2. Clone seu fork

```bash
git clone https://github.com/SEU-USUARIO/cong-platform.git
cd cong-platform
```

### 3. Adicione o repositório oficial como upstream

```bash
git remote add upstream https://github.com/CongPlatform/cong-platform.git
```

### 4. Atualize sua base

Salvo indicação diferente em uma Issue, novas contribuições devem partir da branch `dev`.

```bash
git fetch upstream
git checkout dev
git pull upstream dev
```

### 5. Crie uma branch

Exemplos:

```text
feature/beneficiaries-module
feature/community-posts
fix/login-validation
fix/avatar-upload
docs/readme-update
docs/architecture
refactor/auth-service
test/account-service
```

Evite trabalhar diretamente em `main` ou `dev`.

---

## Convenção de branches

Prefira prefixos descritivos:

```text
feature/   nova funcionalidade
fix/       correção de bug
docs/      documentação
refactor/  reorganização de código
test/      testes
chore/     manutenção e configuração
```

Use nomes curtos, em inglês e separados por hífen.

---

## Instalação

Instale as dependências:

```bash
npm ci
```

A instalação da raiz também instala as dependências do backend.

Configure:

```text
.env
backend/.env
```

usando:

```text
.env.example
backend/.env.example
```

como referência.

Nunca copie credenciais reais da infraestrutura oficial da CONG.

---

## Banco de dados e Supabase

As migrations estão em:

```text
backend/supabase/migrations/
```

Contribuições que alterem o banco devem incluir migrations versionadas quando necessário.

Para usar um projeto Supabase próprio:

```bash
cd backend
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Antes de qualquer operação destrutiva, confirme o projeto vinculado.

Não envie para o repositório:

- senhas de banco;
- connection strings reais;
- `SUPABASE_SECRET_KEY`;
- chaves privadas;
- arquivos `.env` reais;
- tokens;
- dumps contendo dados reais.

---

## Padrão de código

Ao alterar o projeto:

- preserve a tipagem TypeScript;
- evite `any` sem justificativa;
- reutilize componentes e serviços existentes quando fizer sentido;
- mantenha regras de negócio fora de componentes visuais quando possível;
- preserve isolamento entre frontend e backend;
- não coloque segredos no frontend;
- respeite a estrutura de assets;
- mantenha alterações pequenas e focadas;
- atualize documentação quando o comportamento público mudar.

---

## Assets e identidade visual

Assets de runtime estão organizados por finalidade:

```text
src/assets/
├── brand/
├── mascot/
└── team/
```

O fato de logos, mascotes ou fotografias estarem presentes em um repositório público **não significa que estejam licenciados sob a MIT License**.

Antes de modificar ou reutilizar elementos visuais, consulte:

- `BRAND.md`;
- `MEDIA_RIGHTS.md`.

Alterações de identidade visual destinadas ao projeto oficial podem ser propostas por Pull Request, mas a licença do código não concede direito geral de reutilização da marca CONG.

---

## Commits

Use mensagens objetivas.

Exemplos:

```text
feat: add collaboration profile creation
fix: correct login validation
docs: update local setup guide
style: adjust community layout
refactor: simplify auth token handling
test: add account service tests
chore: update repository configuration
```

Tipos recomendados:

```text
feat:     nova funcionalidade
fix:      correção de erro
docs:     documentação
style:    ajustes visuais ou formatação
refactor: reorganização sem alterar comportamento esperado
test:     testes
chore:    configuração e manutenção
```

Não é necessário colocar muitas mudanças independentes no mesmo commit.

---

## Validação local

Antes de abrir um Pull Request, execute:

```bash
npm run lint
npm run build
npm --prefix backend run build
```

Se sua alteração envolver comportamento específico, faça também testes manuais relevantes.

Não envie um Pull Request sabendo que o projeto não compila, a menos que o próprio propósito da contribuição seja investigar uma falha e isso esteja claramente explicado.

---

## Pull Requests

Ao abrir um Pull Request:

- explique o que mudou;
- explique por que a alteração foi necessária;
- informe quais partes do projeto foram afetadas;
- descreva como você validou a mudança;
- inclua screenshots quando houver alteração visual relevante;
- relacione a Issue correspondente quando existir;
- destaque migrations, mudanças de configuração ou breaking changes;
- mantenha o PR focado em um objetivo principal.

Um Pull Request pode receber solicitações de alteração antes de ser aceito.

A abertura de um Pull Request não garante merge automático.

---

## Novos módulos e alterações grandes

Antes de implementar um novo módulo, mudança estrutural ampla ou decisão arquitetural importante, abra uma Issue.

Explique:

- qual problema será resolvido;
- quem será beneficiado;
- comportamento esperado;
- impacto na arquitetura;
- possíveis dependências;
- impacto no banco de dados;
- riscos de segurança ou privacidade;
- alternativas consideradas.

Isso evita retrabalho e ajuda a manter a plataforma modular.

---

## Segurança

Vulnerabilidades sensíveis não devem ser publicadas em Issues, Discussions ou Pull Requests.

Consulte `SECURITY.md`.

Se você encontrar uma possível vulnerabilidade, utilize o mecanismo privado indicado pela política de segurança.

Não faça testes destrutivos ou não autorizados em infraestrutura de produção.

---

## Privacidade e dados

Não utilize em código, testes, screenshots ou documentação:

- dados reais de beneficiários;
- dados reais de voluntários sem autorização;
- documentos pessoais;
- tokens;
- senhas;
- dados internos de organizações;
- informações privadas de usuários.

Use dados fictícios em exemplos e testes.

---

## Código de Conduta

Toda participação na comunidade da CONG está sujeita ao `CODE_OF_CONDUCT.md`.

Discussões técnicas podem envolver discordância, mas devem permanecer respeitosas e construtivas.

---

## Revisão e manutenção

Os mantenedores podem:

- solicitar alterações;
- pedir divisão de um Pull Request muito grande;
- fechar propostas duplicadas;
- rejeitar alterações incompatíveis com a direção do projeto;
- editar títulos, labels ou metadados de Issues e Pull Requests;
- solicitar documentação adicional;
- adiar funcionalidades que ainda não façam parte das prioridades do projeto.

Essas decisões devem buscar preservar segurança, manutenção, consistência arquitetural e utilidade para as organizações atendidas.

---

## Dúvidas

Se você não tiver certeza de como implementar uma contribuição, abra uma Issue ou participe de uma discussão existente antes de investir em uma alteração grande.

Contribuições pequenas e bem explicadas são preferíveis a grandes mudanças difíceis de revisar.

---

# Contribution Guide — CONG

[Versão em português acima](#guia-de-contribuição--cong)

Thank you for your interest in contributing to **CONG — Operational Builder for NGOs**.

CONG is an open-source project under active development. This document defines the contribution workflow used to keep changes reviewable, secure, and consistent with the project architecture.

---

## Before contributing

Before you start:

1. read `README.md`;
2. read `CODE_OF_CONDUCT.md`;
3. read `SECURITY.md`;
4. check existing Issues related to your intended change;
5. for large changes, new modules, or architectural decisions, open or join an Issue before implementation.

Small fixes, documentation changes, and localized improvements can normally proceed directly to a Pull Request.

---

## Ways to contribute

Contributions are welcome in areas such as:

- code;
- bug fixes;
- tests;
- documentation;
- accessibility;
- design;
- translations;
- research;
- user experience improvements;
- module proposals;
- security improvements;
- dependency maintenance.

---

## Development environment

External contributors should work in their own environments.

You **do not need and should not receive access** to:

- CONG production databases;
- production Supabase projects;
- production Vercel projects;
- deployment secrets;
- private keys;
- maintainer tokens or credentials.

Use your own Supabase project or a local Supabase environment.

Never use personal data or real organization data in tests.

---

## Recommended workflow

```text
Fork
 ↓
Branch
 ↓
Changes
 ↓
Local validation
 ↓
Commit
 ↓
Push to fork
 ↓
Pull Request
 ↓
Review
 ↓
Merge
```

### 1. Fork the repository

Create a fork of the official CONG repository in your GitHub account.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR-USERNAME/cong-platform.git
cd cong-platform
```

### 3. Add the official repository as upstream

```bash
git remote add upstream https://github.com/CongPlatform/cong-platform.git
```

### 4. Update your base branch

Unless an Issue states otherwise, new contributions should start from `dev`.

```bash
git fetch upstream
git checkout dev
git pull upstream dev
```

### 5. Create a branch

Examples:

```text
feature/beneficiaries-module
feature/community-posts
fix/login-validation
fix/avatar-upload
docs/readme-update
docs/architecture
refactor/auth-service
test/account-service
```

Avoid working directly on `main` or `dev`.

---

## Branch naming

Prefer descriptive prefixes:

```text
feature/   new functionality
fix/       bug fix
docs/      documentation
refactor/  code reorganization
test/      tests
chore/     maintenance and configuration
```

Use short English names separated by hyphens.

---

## Installation

Install dependencies:

```bash
npm ci
```

The root installation also installs backend dependencies.

Configure:

```text
.env
backend/.env
```

using:

```text
.env.example
backend/.env.example
```

as references.

Never copy real credentials from CONG's official infrastructure.

---

## Database and Supabase

Migrations are stored in:

```text
backend/supabase/migrations/
```

Database changes should include versioned migrations when required.

To use your own Supabase project:

```bash
cd backend
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Always verify the linked project before running destructive operations.

Never commit:

- database passwords;
- real connection strings;
- `SUPABASE_SECRET_KEY`;
- private keys;
- real `.env` files;
- tokens;
- dumps containing real data.

---

## Code standards

When changing the project:

- preserve TypeScript typing;
- avoid `any` without justification;
- reuse existing components and services when appropriate;
- keep business rules outside visual components when possible;
- preserve frontend/backend separation;
- never expose secrets in frontend code;
- respect the asset structure;
- keep changes focused;
- update documentation when public behavior changes.

---

## Assets and visual identity

Runtime assets are organized by purpose:

```text
src/assets/
├── brand/
├── mascot/
└── team/
```

The presence of logos, mascots, or photographs in a public repository **does not mean that they are licensed under the MIT License**.

Before modifying or reusing visual elements, read:

- `BRAND.md`;
- `MEDIA_RIGHTS.md`.

Brand changes intended for the official project may be proposed through Pull Requests, but the software license does not grant general rights to reuse the CONG brand.

---

## Commits

Use clear commit messages.

Examples:

```text
feat: add collaboration profile creation
fix: correct login validation
docs: update local setup guide
style: adjust community layout
refactor: simplify auth token handling
test: add account service tests
chore: update repository configuration
```

Recommended types:

```text
feat:     new feature
fix:      bug fix
docs:     documentation
style:    visual or formatting changes
refactor: code reorganization without changing expected behavior
test:     tests
chore:    configuration and maintenance
```

Avoid grouping many unrelated changes into the same commit.

---

## Local validation

Before opening a Pull Request, run:

```bash
npm run lint
npm run build
npm --prefix backend run build
```

Also perform relevant manual checks when your change affects user-facing behavior.

Do not knowingly submit a Pull Request with compilation errors unless the contribution is specifically intended to investigate such a failure and that is clearly explained.

---

## Pull Requests

When opening a Pull Request:

- explain what changed;
- explain why the change was needed;
- identify affected areas;
- describe how you validated the change;
- include screenshots for relevant visual changes;
- link the related Issue when one exists;
- highlight migrations, configuration changes, or breaking changes;
- keep the PR focused on one main objective.

A Pull Request may receive requested changes before acceptance.

Opening a Pull Request does not guarantee that it will be merged.

---

## New modules and large changes

Before implementing a new module, broad structural change, or significant architectural decision, open an Issue.

Explain:

- the problem being solved;
- who benefits;
- expected behavior;
- architectural impact;
- dependencies;
- database impact;
- security or privacy risks;
- alternatives considered.

This reduces rework and helps preserve the modular architecture.

---

## Security

Sensitive vulnerabilities must not be disclosed in public Issues, Discussions, or Pull Requests.

See `SECURITY.md`.

Use the private reporting mechanism described in the security policy.

Do not perform destructive or unauthorized testing against production infrastructure.

---

## Privacy and data

Do not include in code, tests, screenshots, or documentation:

- real beneficiary data;
- real volunteer data without authorization;
- personal documents;
- tokens;
- passwords;
- internal organization data;
- private user information.

Use fictional data in examples and tests.

---

## Code of Conduct

All participation in the CONG community is governed by `CODE_OF_CONDUCT.md`.

Technical discussions may involve disagreement, but they must remain respectful and constructive.

---

## Review and maintenance

Maintainers may:

- request changes;
- ask for a very large Pull Request to be split;
- close duplicate proposals;
- reject changes that conflict with the project's direction;
- edit Issue or Pull Request titles, labels, or metadata;
- request additional documentation;
- postpone features that are not currently part of project priorities.

These decisions should aim to preserve security, maintainability, architectural consistency, and usefulness for the organizations the platform is intended to support.

---

## Questions

If you are unsure how to approach a contribution, open an Issue or join an existing discussion before investing in a large implementation.

Small, focused, well-explained contributions are preferred over large changes that are difficult to review.
