# CONG — Construtor Operacional para ONGs

[English version](./README.en.md)

A **CONG** é uma plataforma open source em desenvolvimento para permitir que organizações não governamentais construam e operem ambientes digitais adaptados às próprias necessidades.

A proposta combina uma arquitetura **SaaS multi-tenant**, módulos reutilizáveis e uma experiência voltada também a pessoas sem conhecimento técnico, reduzindo a dependência de planilhas, ferramentas desconectadas e sistemas difíceis de adaptar.

> A CONG ainda está em desenvolvimento ativo e não possui uma versão estável 1.0.

---

## Status do projeto

A CONG já possui uma base funcional em desenvolvimento, incluindo:

- frontend web em React e TypeScript;
- backend em Node.js, TypeScript e Express;
- PostgreSQL e Supabase;
- autenticação por e-mail e senha;
- confirmação de e-mail;
- renovação de sessão por refresh token;
- gerenciamento de conta e perfil;
- upload e remoção de avatar;
- criação e gerenciamento inicial de perfis de colaboração;
- páginas institucionais públicas;
- estrutura inicial da comunidade;
- migrations versionadas do banco de dados.

O núcleo de construção modular, a evolução da comunidade e a arquitetura multi-tenant completa continuam em implementação.

---

## Visão do produto

Cada organização deverá possuir seu próprio ambiente isolado dentro da plataforma, podendo ativar e configurar recursos de acordo com sua realidade.

Entre os domínios planejados estão:

- beneficiários;
- voluntários;
- doações;
- estoque;
- projetos;
- agenda;
- comunicação;
- formulários;
- documentos;
- relatórios;
- rotas e entregas.

A implementação desses módulos ocorre de forma incremental. A presença de um módulo nesta lista não significa necessariamente que ele já esteja disponível na versão atual.

---

## Arquitetura

A CONG segue uma arquitetura web com separação entre frontend, API e persistência de dados.

```text
Usuário
   ↓
Frontend Web
React + TypeScript + Vite
   ↓
API
Node.js + TypeScript + Express
   ↓
Serviços e regras de negócio
   ↓
PostgreSQL / Supabase
```

A arquitetura foi projetada para evoluir em direção a um modelo SaaS multi-tenant, no qual diferentes organizações utilizam a mesma plataforma mantendo isolamento de dados, usuários, permissões e configurações.

---

## Tecnologias

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

### Infraestrutura e desenvolvimento

- Git
- GitHub
- Supabase
- Vercel

---

## Estrutura do repositório

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

## Executando o projeto

### Pré-requisitos

Você precisará de:

- Node.js;
- npm;
- Git;
- um projeto próprio no Supabase ou um ambiente Supabase local;
- Supabase CLI caso queira aplicar ou desenvolver migrations.

Nunca utilize credenciais de produção da CONG em ambientes pessoais de desenvolvimento.

### 1. Clone o repositório

```bash
git clone https://github.com/CongPlatform/cong-platform.git
cd cong-platform
```

### 2. Instale as dependências

```bash
npm ci
```

O processo de instalação da raiz também instala as dependências do backend.

### 3. Configure o frontend

Crie um arquivo `.env` baseado em `.env.example`.

```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. Configure o backend

Crie `backend/.env` usando `backend/.env.example` como referência.

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://...
DATABASE_CA_CERT_PATH=./certs/supabase-ca.crt

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

`SUPABASE_SECRET_KEY` é uma credencial exclusiva do servidor e nunca deve ser exposta em código frontend ou em uma variável `VITE_*`.

---

## Banco de dados

As migrations da CONG estão versionadas em:

```text
backend/supabase/migrations/
```

Para contribuir utilizando um projeto Supabase hospedado, utilize **seu próprio projeto de desenvolvimento**.

A partir da pasta `backend`:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Antes de executar comandos destrutivos, sempre confirme qual projeto está vinculado. Nunca execute resets ou testes destrutivos contra infraestrutura de produção.

---

## Desenvolvimento

Para iniciar frontend e backend juntos:

```bash
npm run dev
```

Por padrão:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

Também é possível executar separadamente:

```bash
npm run frontend
```

```bash
npm run backend
```

---

## Validação antes de contribuir

Antes de abrir um Pull Request, execute:

```bash
npm run lint
npm run build
npm --prefix backend run build
```

Uma alteração não deve ser enviada com erros conhecidos de compilação.

---

## Contribuindo

Contribuições são bem-vindas em áreas como:

- código;
- correções de bugs;
- testes;
- documentação;
- acessibilidade;
- design;
- traduções;
- pesquisa;
- propostas de novos módulos.

Leia primeiro:

[CONTRIBUTING.md](./CONTRIBUTING.md)

O fluxo geral é:

```text
Fork
 ↓
Branch
 ↓
Alterações
 ↓
Validação local
 ↓
Pull Request
 ↓
Revisão
 ↓
Merge
```

Alterações grandes, novos módulos ou decisões arquiteturais devem ser discutidos em uma Issue antes da implementação.

Contribuidores externos não precisam e não devem possuir acesso às credenciais, banco de produção, Supabase de produção, Vercel de produção ou outras infraestruturas privadas da CONG.

---

## Segurança

Não publique vulnerabilidades sensíveis em Issues ou Pull Requests públicos.

Consulte [SECURITY.md](./SECURITY.md).

Credenciais, tokens, senhas, chaves privadas e arquivos `.env` reais nunca devem ser enviados ao repositório.

---

## Licenciamento

O **código-fonte** da CONG é disponibilizado sob a [MIT License](./LICENSE).

A licença MIT não se aplica automaticamente a todos os materiais presentes no repositório.

### Marca e identidade visual

O nome CONG, os logotipos, o mascote Cong e demais elementos da identidade visual possuem regras próprias:

[BRAND.md](./BRAND.md)

### Fotografias e retratos

As fotografias e retratos dos integrantes da equipe não estão licenciados sob a MIT License:

[MEDIA_RIGHTS.md](./MEDIA_RIGHTS.md)

A presença desses arquivos em um repositório público não representa autorização geral para reutilização das imagens.

---

## Código de Conduta

A participação na comunidade está sujeita ao [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

Buscamos manter um ambiente respeitoso, construtivo e acessível tanto para pessoas experientes quanto para quem está começando.

---

## Equipe

A CONG é desenvolvida inicialmente por:

- André Mendes — Desenvolvimento Web;
- João Palumbo — Documentação e Pesquisa;
- Kelvin Palka — Liderança e Desenvolvimento.

O projeto surgiu como Trabalho de Conclusão de Curso do Ensino Médio Integrado ao Técnico em Desenvolvimento de Sistemas da ETEC de Hortolândia.

Contribuições futuras passam a fazer parte da evolução coletiva do projeto e são reconhecidas através do histórico do Git e do GitHub.

---

## Estado de desenvolvimento

A CONG está em evolução ativa.

Interfaces, arquitetura, módulos, banco de dados e documentação podem sofrer alterações significativas enquanto o projeto se aproxima de suas primeiras versões estáveis.

Issues e Pull Requests são bem-vindos para ajudar a tornar a plataforma mais segura, acessível, sustentável e útil para organizações sociais.
