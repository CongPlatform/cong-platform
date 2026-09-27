# CONG — Construtor Operacional para ONGs

[English version](./README.en.md)

A **CONG** é uma plataforma open source em desenvolvimento para permitir que organizações não governamentais construam e operem ambientes digitais adaptados às próprias necessidades.

A proposta combina uma arquitetura **SaaS multi-tenant**, módulos reutilizáveis e uma experiência voltada também a pessoas sem conhecimento técnico, reduzindo a dependência de planilhas, ferramentas desconectadas e sistemas difíceis de adaptar.

> A CONG ainda está em desenvolvimento ativo e não possui uma versão estável 1.0.

---

## Índice

- [Status do projeto](#status-do-projeto)
- [Visão do produto](#visão-do-produto)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Executando o projeto](#executando-o-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [O app mobile](#o-app-mobile)
- [Desenvolvimento](#desenvolvimento)
- [Validação antes de contribuir](#validação-antes-de-contribuir)
- [Contribuindo](#contribuindo)
- [Segurança](#segurança)
- [Licenciamento](#licenciamento)
- [Código de Conduta](#código-de-conduta)
- [Equipe](#equipe)
- [Estado de desenvolvimento](#estado-de-desenvolvimento)

---

## Status do projeto

A CONG já possui uma base funcional em desenvolvimento, incluindo:

- frontend web em React e TypeScript;
- backend em Node.js, TypeScript e Express, servido como função serverless na Vercel;
- PostgreSQL e Supabase como camada de dados e autenticação;
- autenticação por e-mail e senha;
- confirmação de e-mail;
- renovação de sessão por refresh token;
- gerenciamento de conta e perfil;
- upload e remoção de avatar;
- criação e gerenciamento inicial de perfis de colaboração;
- páginas institucionais públicas;
- estrutura inicial da comunidade;
- migrations versionadas do banco de dados;
- um aplicativo mobile companion (Expo/React Native), que consome a mesma API — veja [O app mobile](#o-app-mobile).

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

A CONG segue uma arquitetura com separação entre frontend, API e persistência de dados, e um único ponto de acesso à API compartilhado por todos os clientes (web e mobile):

```
                     Usuário
                        │
          ┌─────────────┴─────────────┐
          │                           │
   Frontend Web                 App Mobile
 React + TS + Vite          Expo + React Native
          │                           │
          └─────────────┬─────────────┘
                        │  HTTPS (/api/*)
                        ▼
              API (função serverless)
           Node.js + TypeScript + Express
         hospedada na Vercel (api/index.ts)
                        │
                        ▼
             Serviços e regras de negócio
                        │
                        ▼
              PostgreSQL / Supabase
```

Pontos importantes dessa arquitetura:

- **A API é o único componente que fala com o banco de dados.** Nem o frontend web nem o app mobile têm acesso direto ao PostgreSQL de produção.
- **O app mobile não possui SDK do Supabase.** Toda autenticação e persistência de dados do mobile passa pela API Express — o mobile só conhece a URL pública da API. Veja [O app mobile](#o-app-mobile) para o detalhamento completo.
- **O frontend web pode usar o cliente `@supabase/supabase-js`** com a chave publicável (`VITE_SUPABASE_PUBLISHABLE_KEY`) para operações que dependem de Row Level Security (RLS) no Supabase, além de falar com a API Express para o restante.
- A arquitetura foi projetada para evoluir em direção a um modelo SaaS multi-tenant, no qual diferentes organizações utilizam a mesma plataforma mantendo isolamento de dados, usuários, permissões e configurações.

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
- `@supabase/supabase-js` (cliente publicável, sujeito a RLS)

### Backend

- Node.js
- TypeScript
- Express (empacotado como função serverless em `api/index.ts`)
- Zod
- PostgreSQL
- Supabase (Auth + Database)

### Infraestrutura e desenvolvimento

- Git
- GitHub
- Supabase
- Vercel

---

## Estrutura do repositório

```
cong-platform/
├── api/
│   └── index.ts              # Entry point da função serverless (Vercel)
├── backend/
│   ├── certs/                # Certificado usado na conexão com o Postgres
│   ├── src/                  # Código-fonte da API Express
│   ├── supabase/
│   │   ├── config.toml
│   │   └── migrations/       # Migrations versionadas do banco
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
├── vercel.json                # Rewrites e configuração da função serverless
├── BRAND.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── MEDIA_RIGHTS.md
├── SECURITY.md
└── package.json
```

O repositório do app mobile é separado: [`cong-platform-mobile`](https://github.com/CongPlatform/cong-platform-mobile).

---

## Executando o projeto

### Pré-requisitos

Você precisará de:

- Node.js;
- npm;
- Git;
- um projeto próprio no Supabase ou um ambiente Supabase local;
- Supabase CLI, caso queira aplicar ou desenvolver migrations.

> Nunca utilize credenciais de produção da CONG em ambientes pessoais de desenvolvimento.

### 1. Clone o repositório

```bash
git clone https://github.com/CongPlatform/cong-platform.git
cd cong-platform
```

### 2. Instale as dependências

```bash
npm ci
```

O processo de instalação da raiz também instala as dependências do backend (via script `postinstall`).

### 3. Configure o frontend

Crie um arquivo `.env` na raiz, baseado em `.env.example`:

```env
VITE_API_URL=/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. Configure o backend

Crie `backend/.env`, baseado em `backend/.env.example`:

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

## Variáveis de ambiente

Esta seção existe para deixar explícito **o que cada variável faz, quem deveria conhecê-la e por quê** — isso evita tanto vazamentos acidentais quanto burocracia desnecessária para quem só quer contribuir.

### Frontend web (`.env`, prefixo `VITE_*`)

| Variável                        | Função                                                                                                                                                                                | Visibilidade                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `VITE_API_URL`                  | Caminho base para chamadas à API. `/api` quando frontend e backend estão no mesmo deploy.                                                                                             | Pública — vai para o bundle JS, visível a qualquer visitante do site. |
| `VITE_SUPABASE_URL`             | URL do projeto Supabase usado pelo cliente `@supabase/supabase-js` no navegador.                                                                                                      | Pública.                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do Supabase. Permite ao navegador fazer chamadas diretas à API REST do Supabase, **sempre sujeitas às políticas de Row Level Security (RLS)** configuradas no banco. | Pública por design — o nome não indica que deveria ser secreta.       |

> Qualquer variável com prefixo `VITE_` é embutida no bundle JavaScript durante o build e fica visível a quem inspecionar o código-fonte do site. **Nunca coloque um valor secreto atrás desse prefixo.**

### Backend (`backend/.env`, sem prefixo)

| Variável                   | Função                                                                                                                  | Visibilidade                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                     | Porta em que o Express escuta localmente.                                                                               | Não sensível.                                                                                                                |
| `FRONTEND_URL`             | Origem permitida para CORS.                                                                                             | Não sensível.                                                                                                                |
| `DATABASE_URL`             | String de conexão direta com o PostgreSQL.                                                                              | **Secreta — nunca deve sair do ambiente do servidor.**                                                                       |
| `DATABASE_CA_CERT_PATH`    | Caminho para o certificado usado na conexão TLS com o banco.                                                            | Não secreta (é um caminho de arquivo versionado em `backend/certs/`).                                                        |
| `SUPABASE_URL`             | URL do projeto Supabase, usada pelo backend.                                                                            | Pública (é a mesma URL usada no frontend).                                                                                   |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável, usada pelo backend quando aplicável.                                                                  | Pública.                                                                                                                     |
| `SUPABASE_SECRET_KEY`      | Chave privilegiada do Supabase (service role). Ignora RLS. Usada apenas em operações que exigem privilégio de servidor. | **Secreta — exclusiva do backend, nunca deve chegar ao frontend, ao app mobile ou a uma variável `VITE_*`/`EXPO_PUBLIC_*`.** |

### Regra geral

- Um prefixo público (`VITE_*` no web, `EXPO_PUBLIC_*` no mobile) significa "este valor vai para o cliente e será visível publicamente" — nunca coloque segredos ali, independente do nome da variável.
- Uma variável sem esse prefixo, definida apenas no backend/infraestrutura (Vercel), nunca é entregue ao cliente e só existe dentro da execução da função serverless.
- Uma variável se chamar "secret" (`SUPABASE_SECRET_KEY`) não é decorativo: ela concede acesso privilegiado ao banco e nunca deve ser copiada para o frontend, para o app mobile, para logs, ou para qualquer lugar acessível externamente.

---

## Banco de dados

As migrations da CONG estão versionadas em:

```
backend/supabase/migrations/
```

Para contribuir utilizando um projeto Supabase hospedado, utilize **seu próprio projeto de desenvolvimento** — nunca o projeto de produção.

A partir da pasta `backend`:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Antes de executar comandos destrutivos, sempre confirme qual projeto está vinculado. **Nunca execute resets ou testes destrutivos contra infraestrutura de produção.**

---

## O app mobile

O app mobile (repositório [`cong-platform-mobile`](https://github.com/CongPlatform/cong-platform-mobile)) é um cliente independente que **não acessa o Supabase diretamente**. Ele:

- não possui o SDK `@supabase/supabase-js` entre suas dependências;
- não conhece `DATABASE_URL` nem `SUPABASE_SECRET_KEY`;
- fala exclusivamente com a mesma API Express usada pelo frontend web, autenticando-se via Supabase Auth por trás da API.

A única variável de ambiente que o mobile precisa é:

```env
EXPO_PUBLIC_API_URL=https://SEU-DOMINIO-HOSPEDADO
```

Isso significa que qualquer pessoa pode desenvolver e testar o app mobile sem jamais ter acesso a uma credencial de produção — o único dado que ela precisa é o endereço público da API, que já é, por natureza, público.

> **Importante:** ao configurar `EXPO_PUBLIC_API_URL`, use o ambiente de desenvolvimento/staging indicado no `CONTRIBUTING.md` do repositório mobile — não aponte para o domínio de produção. Detalhes de rede e testes em dispositivo físico estão documentados em `CONEXAO.md` no repositório mobile.

---

## Desenvolvimento

Para iniciar frontend e backend juntos:

```bash
npm run dev
```

Por padrão:

```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

Também é possível executar separadamente:

```bash
npm run frontend
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

Leia primeiro: [CONTRIBUTING.md](./CONTRIBUTING.md)

O fluxo geral é:

```
Fork → Branch → Alterações → Validação local → Pull Request → Revisão → Merge
```

Alterações grandes, novos módulos ou decisões arquiteturais devem ser discutidos em uma Issue antes da implementação.

**Contribuidores externos não precisam e não devem possuir acesso às credenciais, banco de produção, Supabase de produção, Vercel de produção ou outras infraestruturas privadas da CONG** — a arquitetura do projeto (API centralizando o acesso ao banco, variáveis públicas separadas de secretas) foi desenhada exatamente para tornar isso possível.

---

## Segurança

Não publique vulnerabilidades sensíveis em Issues ou Pull Requests públicos.

Consulte [SECURITY.md](./SECURITY.md).

Credenciais, tokens, senhas, chaves privadas e arquivos `.env` reais nunca devem ser enviados ao repositório.

> Esta seção será expandida com detalhes adicionais de hardening (isolamento de ambiente de dev para o mobile, políticas de RLS, etc.) em uma atualização futura.

---

## Licenciamento

O **código-fonte** da CONG é disponibilizado sob a [MIT License](./LICENSE).

A licença MIT não se aplica automaticamente a todos os materiais presentes no repositório.

### Marca e identidade visual

O nome CONG, os logotipos, o mascote Cong e demais elementos da identidade visual possuem regras próprias: [BRAND.md](./BRAND.md).

### Fotografias e retratos

As fotografias e retratos dos integrantes da equipe não estão licenciados sob a MIT License: [MEDIA_RIGHTS.md](./MEDIA_RIGHTS.md).

A presença desses arquivos em um repositório público não representa autorização geral para reutilização das imagens.

---

## Código de Conduta

A participação na comunidade está sujeita ao [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

Buscamos manter um ambiente respeitoso, construtivo e acessível tanto para pessoas experientes quanto para quem está começando.

---

## Equipe

A CONG é desenvolvida inicialmente por:

- André Mendes — Desenvolvimento Mobile;
- João Palumbo — Documentação e Pesquisa;
- Kelvin Palka — Desenvolvimento Web.

O projeto surgiu como Trabalho de Conclusão de Curso do Ensino Médio Integrado ao Técnico em Desenvolvimento de Sistemas da ETEC de Hortolândia.

---

## Estado de desenvolvimento

A CONG está em evolução ativa.

Interfaces, arquitetura, módulos, banco de dados e documentação podem sofrer alterações significativas enquanto o projeto se aproxima de suas primeiras versões estáveis.

Issues e Pull Requests são bem-vindos para ajudar a tornar a plataforma mais segura, acessível, sustentável e útil para organizações sociais.
