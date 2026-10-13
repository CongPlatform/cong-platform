begin;

insert into public.permissions (code, name, description)
values
  ('institutional.read', 'Visualizar site institucional', 'Permite visualizar e editar o rascunho conforme as demais permissões concedidas.'),
  ('institutional.edit', 'Editar site institucional', 'Permite criar páginas, seções, conteúdo e identidade visual do site institucional.'),
  ('institutional.publish', 'Publicar site institucional', 'Permite publicar uma versão do site institucional.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('organization_admin', 'organization_representative')
  and r.is_system = true
  and p.code in ('institutional.read', 'institutional.edit', 'institutional.publish')
on conflict do nothing;

create table public.organization_media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  storage_path text not null unique,
  name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create index organization_media_assets_org_idx
  on public.organization_media_assets(organization_id, created_at desc);

create table public.organization_brand_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_asset_id uuid references public.organization_media_assets(id) on delete set null,
  primary_color text not null default '#1366c4' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#04523c' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#f7b534' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#ffffff' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#091c30' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  heading_font text not null default 'brand' check (heading_font in ('brand', 'interface', 'system')),
  body_font text not null default 'interface' check (body_font in ('brand', 'interface', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutional_section_variants (
  id uuid primary key default gen_random_uuid(),
  section_type text not null check (section_type in (
    'organization_intro',
    'organization_about',
    'projects_showcase',
    'impact_metrics',
    'support_actions',
    'transparency',
    'organization_contact'
  )),
  name text not null,
  description text not null default '',
  owner_user_id uuid references public.users(id) on delete set null,
  is_system boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutional_variant_owner_check check (
    (is_system = true and owner_user_id is null)
    or (is_system = false and owner_user_id is not null)
  )
);

create index institutional_section_variants_type_idx
  on public.institutional_section_variants(section_type, status, visibility);

create index institutional_section_variants_owner_idx
  on public.institutional_section_variants(owner_user_id, updated_at desc);

create table public.institutional_section_variant_versions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.institutional_section_variants(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  layout jsonb not null,
  created_at timestamptz not null default now(),
  unique (variant_id, version)
);

create table public.institutional_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'generic',
  owner_user_id uuid references public.users(id) on delete set null,
  is_system boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutional_template_owner_check check (
    (is_system = true and owner_user_id is null)
    or (is_system = false and owner_user_id is not null)
  )
);

create index institutional_templates_catalog_idx
  on public.institutional_templates(status, visibility, category, created_at);

create table public.institutional_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references public.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutional_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.institutional_sites(id) on delete cascade,
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_home boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug),
  unique (site_id, position)
);

create unique index institutional_pages_single_home_idx
  on public.institutional_pages(site_id)
  where is_home = true;

create table public.institutional_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.institutional_pages(id) on delete cascade,
  section_type text not null check (section_type in (
    'organization_intro',
    'organization_about',
    'projects_showcase',
    'impact_metrics',
    'support_actions',
    'transparency',
    'organization_contact'
  )),
  variant_version_id uuid not null references public.institutional_section_variant_versions(id) on delete restrict,
  position integer not null check (position >= 0),
  visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, position)
);

create index institutional_sections_page_idx
  on public.institutional_sections(page_id, position);

create table public.institutional_site_publications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.institutional_sites(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  published_by uuid not null references public.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  unique (site_id, version)
);

create index institutional_site_publications_latest_idx
  on public.institutional_site_publications(site_id, version desc);

create trigger set_organization_brand_profiles_updated_at
before update on public.organization_brand_profiles
for each row execute function public.set_updated_at();

create trigger set_institutional_section_variants_updated_at
before update on public.institutional_section_variants
for each row execute function public.set_updated_at();

create trigger set_institutional_templates_updated_at
before update on public.institutional_templates
for each row execute function public.set_updated_at();

create trigger set_institutional_sites_updated_at
before update on public.institutional_sites
for each row execute function public.set_updated_at();

create trigger set_institutional_pages_updated_at
before update on public.institutional_pages
for each row execute function public.set_updated_at();

create trigger set_institutional_sections_updated_at
before update on public.institutional_sections
for each row execute function public.set_updated_at();

alter table public.organization_media_assets enable row level security;
alter table public.organization_brand_profiles enable row level security;
alter table public.institutional_section_variants enable row level security;
alter table public.institutional_section_variant_versions enable row level security;
alter table public.institutional_templates enable row level security;
alter table public.institutional_sites enable row level security;
alter table public.institutional_pages enable row level security;
alter table public.institutional_sections enable row level security;
alter table public.institutional_site_publications enable row level security;

revoke all on table public.organization_media_assets from anon, authenticated;
revoke all on table public.organization_brand_profiles from anon, authenticated;
revoke all on table public.institutional_section_variants from anon, authenticated;
revoke all on table public.institutional_section_variant_versions from anon, authenticated;
revoke all on table public.institutional_templates from anon, authenticated;
revoke all on table public.institutional_sites from anon, authenticated;
revoke all on table public.institutional_pages from anon, authenticated;
revoke all on table public.institutional_sections from anon, authenticated;
revoke all on table public.institutional_site_publications from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'institutional-media',
  'institutional-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.institutional_section_variants (
  id, section_type, name, description, is_system, visibility, status
)
values
  ('77a34e74-82e5-482f-bfb8-3343e5c203d5', 'organization_intro', 'Imagem lateral', 'Apresentação com conteúdo e imagem em duas colunas.', true, 'public', 'published'),
  ('531246b7-32ac-42dc-bf6b-8970d089c6f5', 'organization_intro', 'Destaque central', 'Apresentação centralizada com imagem abaixo do conteúdo.', true, 'public', 'published'),
  ('8278ef1d-5427-42dd-bf30-c0b785da3961', 'organization_about', 'Imagem à esquerda', 'Imagem e conteúdo lado a lado.', true, 'public', 'published'),
  ('410683b8-d0fc-4764-9ce9-d0611b1e041f', 'organization_about', 'Editorial', 'Conteúdo em destaque seguido por uma imagem ampla.', true, 'public', 'published'),
  ('68e4352e-181a-4e54-a7e6-031349a758f7', 'projects_showcase', 'Cards de projetos', 'Projetos organizados em uma grade de cards.', true, 'public', 'published'),
  ('ce076809-5191-4b08-ad6e-a1458a9fdf4e', 'projects_showcase', 'Lista editorial', 'Projetos apresentados em sequência vertical.', true, 'public', 'published'),
  ('f6f26196-6a1b-430a-8de2-91d22b0927f0', 'impact_metrics', 'Números em destaque', 'Indicadores principais apresentados em uma grade simples.', true, 'public', 'published'),
  ('5cc14412-1d60-4237-9a8c-4a622fa19872', 'impact_metrics', 'Cards de impacto', 'Indicadores organizados em cards individuais.', true, 'public', 'published'),
  ('b65ab6f3-7cf6-49be-adaa-4cc92fbf24a3', 'support_actions', 'Formas de ajudar', 'Ações de apoio apresentadas em cards.', true, 'public', 'published'),
  ('c9792dd4-0456-4427-85fd-c8a983c32ab5', 'support_actions', 'Ação principal', 'Uma ação em destaque seguida pelas alternativas.', true, 'public', 'published'),
  ('9297f9a8-4257-4706-90e9-75da9873373b', 'transparency', 'Lista de documentos', 'Documentos e prestações de contas em uma lista clara.', true, 'public', 'published'),
  ('1e3fdf9c-8a78-4102-9c45-d5bd89e52736', 'transparency', 'Documentos em cards', 'Documentos organizados em cards por item.', true, 'public', 'published'),
  ('1b59e0e9-c99e-49ea-bfbc-86ca0dec9145', 'organization_contact', 'Contato dividido', 'Informações de contato em duas colunas.', true, 'public', 'published'),
  ('94ecef98-96ed-4db1-9785-500c500db4d9', 'organization_contact', 'Contato centralizado', 'Informações de contato em uma composição centralizada.', true, 'public', 'published')
on conflict (id) do nothing;

insert into public.institutional_section_variant_versions (
  id, variant_id, version, status, layout
)
values
  (
    'e0004189-dcb2-4125-9427-9dfe39581f8f',
    '77a34e74-82e5-482f-bfb8-3343e5c203d5',
    1,
    'published',
    '{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"display"},{"type":"slot","slot":"description","presentation":"body"},{"type":"stack","gap":"small","direction":"row","children":[{"type":"slot","slot":"primaryAction","presentation":"primaryAction"},{"type":"slot","slot":"secondaryAction","presentation":"secondaryAction"}]}]},{"type":"slot","slot":"image","presentation":"heroImage"}]}'::jsonb
  ),
  (
    'e78520f9-b477-4364-ba9c-9ff3d7d65ea4',
    '531246b7-32ac-42dc-bf6b-8970d089c6f5',
    1,
    'published',
    '{"type":"stack","gap":"large","align":"center","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"display"},{"type":"slot","slot":"description","presentation":"body"},{"type":"stack","gap":"small","direction":"row","children":[{"type":"slot","slot":"primaryAction","presentation":"primaryAction"},{"type":"slot","slot":"secondaryAction","presentation":"secondaryAction"}]},{"type":"slot","slot":"image","presentation":"wideImage"}]}'::jsonb
  ),
  (
    '8b0dc077-72f5-444e-bc28-b0bbf80d9346',
    '8278ef1d-5427-42dd-bf30-c0b785da3961',
    1,
    'published',
    '{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"slot","slot":"image","presentation":"image"},{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"slot","slot":"action","presentation":"secondaryAction"}]}]}'::jsonb
  ),
  (
    'a7561a65-2843-419a-96a2-d41d696a7fe2',
    '410683b8-d0fc-4764-9ce9-d0611b1e041f',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"},{"type":"slot","slot":"action","presentation":"secondaryAction"},{"type":"slot","slot":"image","presentation":"wideImage"}]}'::jsonb
  ),
  (
    '5b9f66d2-37b9-4991-ab0f-264b955658fc',
    '68e4352e-181a-4e54-a7e6-031349a758f7',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"image","presentation":"cardImage"},{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"secondaryAction"}]}}]}'::jsonb
  ),
  (
    '759ad988-231b-4541-98a1-2d801929acf9',
    'ce076809-5191-4b08-ad6e-a1458a9fdf4e',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":1,"gap":"medium","item":{"type":"columns","ratio":"1:2","gap":"medium","surface":"card","children":[{"type":"slot","slot":"image","presentation":"cardImage"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"secondaryAction"}]}]}}]}'::jsonb
  ),
  (
    '339f526f-9f5e-4859-b72f-1e8810b9b738',
    'f6f26196-6a1b-430a-8de2-91d22b0927f0',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":4,"gap":"medium","item":{"type":"stack","gap":"small","align":"center","children":[{"type":"slot","slot":"value","presentation":"metricValue"},{"type":"slot","slot":"label","presentation":"metricLabel"},{"type":"slot","slot":"period","presentation":"caption"}]}}]}'::jsonb
  ),
  (
    '58492c9d-03a0-42e1-8baf-56e3723f7c64',
    '5cc14412-1d60-4237-9a8c-4a622fa19872',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"value","presentation":"metricValue"},{"type":"slot","slot":"label","presentation":"metricLabel"},{"type":"slot","slot":"period","presentation":"caption"},{"type":"slot","slot":"source","presentation":"caption"}]}}]}'::jsonb
  ),
  (
    '680556fd-59a2-4c91-bc91-8c97e53b5612',
    'b65ab6f3-7cf6-49be-adaa-4cc92fbf24a3',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"primaryAction"}]}}]}'::jsonb
  ),
  (
    '5ab3e78d-0676-458c-9367-9923c0389567',
    'c9792dd4-0456-4427-85fd-c8a983c32ab5',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":1,"gap":"small","item":{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"primaryAction"}]}}]}'::jsonb
  ),
  (
    '8c237dca-d82b-4373-b94e-a8af6f3a5a7a',
    '9297f9a8-4257-4706-90e9-75da9873373b',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":1,"gap":"small","item":{"type":"columns","ratio":"1:2","gap":"medium","surface":"list","children":[{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"period","presentation":"caption"},{"type":"slot","slot":"url","presentation":"documentLink"}]}]}}]}'::jsonb
  ),
  (
    '4ea8657d-2dde-4f60-ad2e-1c45ba460038',
    '1e3fdf9c-8a78-4102-9c45-d5bd89e52736',
    1,
    'published',
    '{"type":"stack","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"period","presentation":"caption"},{"type":"slot","slot":"url","presentation":"documentLink"}]}}]}'::jsonb
  ),
  (
    '7ec3c4d9-aea9-4cd9-8cb3-b9ad4879e215',
    '1b59e0e9-c99e-49ea-bfbc-86ca0dec9145',
    1,
    'published',
    '{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"slot","slot":"address","presentation":"contactLine"},{"type":"slot","slot":"hours","presentation":"contactLine"}]},{"type":"stack","gap":"small","surface":"card","children":[{"type":"slot","slot":"email","presentation":"contactLink"},{"type":"slot","slot":"phone","presentation":"contactLink"},{"type":"slot","slot":"whatsapp","presentation":"contactLink"},{"type":"repeat","source":"socialLinks","columns":1,"gap":"small","item":{"type":"slot","slot":"url","presentation":"socialLink"}}]}]}'::jsonb
  ),
  (
    'a5a23498-cf97-4c3f-98a6-e28ed969a2ea',
    '94ecef98-96ed-4db1-9785-500c500db4d9',
    1,
    'published',
    '{"type":"stack","gap":"medium","align":"center","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"slot","slot":"email","presentation":"contactLink"},{"type":"slot","slot":"phone","presentation":"contactLink"},{"type":"slot","slot":"address","presentation":"contactLine"},{"type":"repeat","source":"socialLinks","columns":3,"gap":"small","item":{"type":"slot","slot":"url","presentation":"socialLink"}}]}'::jsonb
  )
on conflict (id) do nothing;

insert into public.institutional_templates (
  id, name, description, category, is_system, visibility, status, definition
)
values
  (
    'c25c912b-57d6-49c8-bd42-11d915f5e2bb',
    'Institucional essencial',
    'Uma estrutura direta para apresentar a organização, seus projetos, impacto e formas de contato.',
    'generic',
    true,
    'public',
    'published',
    '{"pages":[{"title":"Home","slug":"home","isHome":true,"sections":[{"sectionType":"organization_intro","variantVersionId":"e0004189-dcb2-4125-9427-9dfe39581f8f","content":{"eyebrow":"","title":"Apresente sua organização","description":"Explique de forma clara o que vocês fazem e por que esse trabalho importa.","image":null,"primaryAction":{"label":"Conheça nosso trabalho","href":"#projetos"},"secondaryAction":null}},{"sectionType":"organization_about","variantVersionId":"8b0dc077-72f5-444e-bc28-b0bbf80d9346","content":{"eyebrow":"Quem somos","title":"Conte quem vocês são","description":"Use este espaço para apresentar a história, o público atendido e a região de atuação da organização.","image":null,"action":null}},{"sectionType":"projects_showcase","variantVersionId":"5b9f66d2-37b9-4991-ab0f-264b955658fc","content":{"title":"Nossos projetos","description":"Mostre as principais iniciativas da organização.","items":[]}},{"sectionType":"impact_metrics","variantVersionId":"339f526f-9f5e-4859-b72f-1e8810b9b738","content":{"title":"Nosso impacto","description":"Apresente apenas indicadores que a organização possa confirmar.","items":[]}},{"sectionType":"support_actions","variantVersionId":"680556fd-59a2-4c91-bc91-8c97e53b5612","content":{"title":"Como ajudar","description":"Mostre formas reais de participação e apoio.","items":[]}},{"sectionType":"organization_contact","variantVersionId":"7ec3c4d9-aea9-4cd9-8cb3-b9ad4879e215","content":{"title":"Entre em contato","description":"Informe os canais oficiais da organização.","email":"","phone":"","whatsapp":"","address":"","hours":"","socialLinks":[]}}]}]}'::jsonb
  ),
  (
    'a778f1bc-8eb8-47e9-bafe-f5c4bfb809e3',
    'Instituto Sementes',
    'Exemplo fictício completo para visualizar como uma organização educacional pode estruturar sua presença institucional.',
    'education',
    true,
    'public',
    'published',
    '{"example":true,"pages":[{"title":"Home","slug":"home","isHome":true,"sections":[{"sectionType":"organization_intro","variantVersionId":"e0004189-dcb2-4125-9427-9dfe39581f8f","content":{"eyebrow":"Instituto Sementes · exemplo fictício","title":"Mais oportunidades para um futuro mais justo","description":"Educação, comunidade e meio ambiente caminhando juntos para transformar realidades.","image":null,"primaryAction":{"label":"Conheça nosso trabalho","href":"#projetos"},"secondaryAction":{"label":"Como ajudar","href":"#como-ajudar"}}},{"sectionType":"organization_about","variantVersionId":"8b0dc077-72f5-444e-bc28-b0bbf80d9346","content":{"eyebrow":"Quem somos","title":"Uma organização que acredita nas pessoas","description":"O Instituto Sementes é uma organização fictícia criada apenas para demonstrar a estrutura do editor da CONG. Substitua este texto pelas informações reais da sua organização.","image":null,"action":{"label":"Nossa história","href":"#quem-somos"}}},{"sectionType":"projects_showcase","variantVersionId":"5b9f66d2-37b9-4991-ab0f-264b955658fc","content":{"title":"Iniciativas que geram transformação","description":"Estes projetos são fictícios e servem somente como exemplo de preenchimento.","items":[{"id":"699a6abc-f608-4d21-8ac9-e8ef2bf36503","title":"Jovens em Movimento","description":"Apoio educacional para jovens em situação de vulnerabilidade.","category":"Educação","image":null,"action":null},{"id":"3ad82d90-9ecb-4a95-894e-d1bbf8dc7990","title":"Territórios Vivos","description":"Atividades comunitárias de educação ambiental.","category":"Meio ambiente","image":null,"action":null}] }},{"sectionType":"impact_metrics","variantVersionId":"339f526f-9f5e-4859-b72f-1e8810b9b738","content":{"title":"Resultados que inspiram","description":"Os números abaixo são fictícios. Troque-os por indicadores confirmados antes de publicar.","items":[{"id":"32fc5fd8-a7e5-42cc-a088-a59ecfe15437","value":"1.200+","label":"pessoas atendidas","period":"exemplo fictício","source":""},{"id":"6fba1c38-b4de-44fd-a02d-98a7ae23a88d","value":"15","label":"comunidades","period":"exemplo fictício","source":""},{"id":"55336769-a7c1-4d74-9ce7-59fc04e57b3e","value":"28","label":"projetos realizados","period":"exemplo fictício","source":""}] }},{"sectionType":"support_actions","variantVersionId":"680556fd-59a2-4c91-bc91-8c97e53b5612","content":{"title":"Faça parte","description":"Personalize estas opções conforme as formas reais de apoio da organização.","items":[{"id":"1dcaa125-b753-4892-993b-eb04b8ebba76","kind":"donate","title":"Doe","description":"Explique como as doações contribuem para o trabalho da organização.","action":null},{"id":"075f42b9-7bed-4be4-8aa8-32f020f9287e","kind":"volunteer","title":"Seja voluntário","description":"Apresente como funciona a participação voluntária.","action":null}] }},{"sectionType":"transparency","variantVersionId":"8c237dca-d82b-4373-b94e-a8af6f3a5a7a","content":{"title":"Transparência","description":"Organize documentos e informações que ajudem o público a compreender a atuação da organização.","items":[]}},{"sectionType":"organization_contact","variantVersionId":"7ec3c4d9-aea9-4cd9-8cb3-b9ad4879e215","content":{"title":"Fale com a gente","description":"Substitua pelos canais oficiais da organização.","email":"contato@exemplo.org","phone":"","whatsapp":"","address":"","hours":"","socialLinks":[]}}]}]}'::jsonb
  )
on conflict (id) do nothing;

commit;
