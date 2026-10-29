begin;
alter table public.institutional_section_variants drop constraint if exists institutional_section_variants_section_type_check;
alter table public.institutional_section_variants add constraint institutional_section_variants_section_type_check check (section_type in ('site_header','organization_intro','organization_about','projects_showcase','impact_metrics','support_actions','transparency','organization_contact','custom_content','site_footer'));
alter table public.institutional_sections drop constraint if exists institutional_sections_section_type_check;
alter table public.institutional_sections add constraint institutional_sections_section_type_check check (section_type in ('site_header','organization_intro','organization_about','projects_showcase','impact_metrics','support_actions','transparency','organization_contact','custom_content','site_footer'));
update public.institutional_section_variants set status='draft', visibility='private' where is_system=true;
update public.institutional_templates set status='draft', visibility='private' where is_system=true;
insert into public.institutional_section_variants (id,section_type,name,description,owner_user_id,is_system,visibility,status) values
  ('f1100000-0000-4000-8000-000000000001','site_header','Navegação humana','Cabeçalho global leve, com identidade, atalhos claros e uma ação principal.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000002','organization_intro','Presença humana','Hero editorial com fotografia protagonista, mensagem forte e ações claras.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000003','impact_metrics','Impacto em movimento','Faixa de resultados para leitura rápida, com números grandes e contexto suficiente.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000004','organization_about','História com presença','História da organização em uma composição humana com imagem e narrativa.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000005','projects_showcase','Projetos em mosaico','Projetos com fotografia, categoria e próximos passos em cards editoriais.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000006','support_actions','Caminhos para participar','Três convites claros para transformar interesse em participação.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000007','organization_contact','Contato próximo','Contato acolhedor com introdução e canais oficiais organizados.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000008','site_footer','Rodapé com propósito','Rodapé completo que encerra a narrativa sem parecer um bloco administrativo.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-000000000009','site_header','Navegação essencial','Cabeçalho compacto, direto e compatível com páginas de linguagem editorial.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-00000000000a','organization_intro','Manifesto claro','Hero tipográfico e arejado para organizações que preferem comunicação direta.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-00000000000b','impact_metrics','Números editoriais','Indicadores sem caixas pesadas, com hierarquia tipográfica e bastante respiro.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-00000000000c','projects_showcase','Projetos editoriais','Projetos em sequência ampla para dar espaço à fotografia e à história de cada iniciativa.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-00000000000d','site_footer','Rodapé essencial','Rodapé compacto com propósito, contato e redes sem excesso visual.',null,true,'public','published'),
  ('f1100000-0000-4000-8000-00000000000e','custom_content','Como o trabalho acontece','Fluxo visual em três etapas para explicar a atuação sem jargão.',null,true,'public','published')
on conflict (id) do update set name=excluded.name, description=excluded.description, visibility=excluded.visibility, status=excluded.status;
insert into public.institutional_section_variant_versions (id,variant_id,version,status,layout) values
  ('f1110000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001',1,'published','{"type":"columns","ratio":"1:2","gap":"medium","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"brandLogo","presentation":"brandLogo"},{"type":"slot","slot":"brandLabel","presentation":"itemTitle"}]},{"type":"stack","gap":"small","children":[{"type":"repeat","source":"links","columns":4,"gap":"small","item":{"type":"slot","slot":"href","presentation":"navLink"}},{"type":"slot","slot":"primaryAction","presentation":"primaryAction"}],"align":"end"}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000002','f1100000-0000-4000-8000-000000000002',1,'published','{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"display"},{"type":"slot","slot":"description","presentation":"lead"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"primaryAction","presentation":"primaryAction"},{"type":"slot","slot":"secondaryAction","presentation":"secondaryAction"}],"direction":"row"}]},{"type":"slot","slot":"image","presentation":"heroImage"}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000003','f1100000-0000-4000-8000-000000000003',1,'published','{"type":"stack","gap":"large","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}]},{"type":"repeat","source":"items","columns":4,"gap":"none","item":{"type":"stack","gap":"small","children":[{"type":"slot","slot":"label","presentation":"metricIcon"},{"type":"slot","slot":"value","presentation":"metricValue"},{"type":"slot","slot":"label","presentation":"metricLabel"},{"type":"slot","slot":"period","presentation":"caption"}]}}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000004','f1100000-0000-4000-8000-000000000004',1,'published','{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"slot","slot":"image","presentation":"image"},{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"},{"type":"slot","slot":"action","presentation":"secondaryAction"}],"surface":"card"}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000005','f1100000-0000-4000-8000-000000000005',1,'published','{"type":"stack","gap":"large","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}]},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"small","children":[{"type":"slot","slot":"image","presentation":"cardImage"},{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"secondaryAction"}],"surface":"card"}}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000006','f1100000-0000-4000-8000-000000000006',1,'published','{"type":"stack","gap":"large","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}],"align":"center"},{"type":"repeat","source":"items","columns":3,"gap":"medium","item":{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"kind","presentation":"supportIcon"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"primaryAction"}],"surface":"card"}}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000007','f1100000-0000-4000-8000-000000000007',1,'published','{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}]},{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"email","presentation":"contactLink"},{"type":"slot","slot":"phone","presentation":"contactLine"},{"type":"slot","slot":"whatsapp","presentation":"contactLine"},{"type":"slot","slot":"address","presentation":"contactLine"},{"type":"slot","slot":"hours","presentation":"caption"},{"type":"repeat","source":"socialLinks","columns":2,"gap":"small","item":{"type":"slot","slot":"url","presentation":"socialLink"}}],"surface":"card"}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000008','f1100000-0000-4000-8000-000000000008',1,'published','{"type":"columns","ratio":"2:1","gap":"large","children":[{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"}]},{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"email","presentation":"contactLink"},{"type":"slot","slot":"phone","presentation":"contactLine"},{"type":"repeat","source":"socialLinks","columns":2,"gap":"small","item":{"type":"slot","slot":"url","presentation":"socialLink"}},{"type":"slot","slot":"copyright","presentation":"caption"}]}]}'::jsonb),
  ('f1110000-0000-4000-8000-000000000009','f1100000-0000-4000-8000-000000000009',1,'published','{"type":"columns","ratio":"1:2","gap":"small","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"brandLogo","presentation":"brandLogo"},{"type":"slot","slot":"brandLabel","presentation":"itemTitle"}]},{"type":"stack","gap":"small","children":[{"type":"repeat","source":"links","columns":4,"gap":"small","item":{"type":"slot","slot":"href","presentation":"navLink"}},{"type":"slot","slot":"primaryAction","presentation":"primaryAction"}],"align":"end"}]}'::jsonb),
  ('f1110000-0000-4000-8000-00000000000a','f1100000-0000-4000-8000-00000000000a',1,'published','{"type":"stack","gap":"large","children":[{"type":"slot","slot":"eyebrow","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"display"},{"type":"slot","slot":"description","presentation":"lead"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"primaryAction","presentation":"primaryAction"},{"type":"slot","slot":"secondaryAction","presentation":"secondaryAction"}],"direction":"row"},{"type":"slot","slot":"image","presentation":"wideImage"}],"align":"center"}'::jsonb),
  ('f1110000-0000-4000-8000-00000000000b','f1100000-0000-4000-8000-00000000000b',1,'published','{"type":"stack","gap":"large","children":[{"type":"columns","ratio":"1:1","gap":"large","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}]},{"type":"repeat","source":"items","columns":4,"gap":"medium","item":{"type":"stack","gap":"small","children":[{"type":"slot","slot":"value","presentation":"metricValue"},{"type":"slot","slot":"label","presentation":"metricLabel"},{"type":"slot","slot":"period","presentation":"caption"}]}}]}'::jsonb),
  ('f1110000-0000-4000-8000-00000000000c','f1100000-0000-4000-8000-00000000000c',1,'published','{"type":"stack","gap":"large","children":[{"type":"stack","gap":"small","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"lead"}]},{"type":"repeat","source":"items","columns":1,"gap":"medium","item":{"type":"columns","ratio":"1:2","gap":"medium","children":[{"type":"slot","slot":"image","presentation":"cardImage"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"category","presentation":"eyebrow"},{"type":"slot","slot":"title","presentation":"itemTitle"},{"type":"slot","slot":"description","presentation":"itemBody"},{"type":"slot","slot":"action","presentation":"secondaryAction"}]}],"surface":"card"}}]}'::jsonb),
  ('f1110000-0000-4000-8000-00000000000d','f1100000-0000-4000-8000-00000000000d',1,'published','{"type":"stack","gap":"medium","children":[{"type":"slot","slot":"title","presentation":"heading"},{"type":"slot","slot":"description","presentation":"body"},{"type":"stack","gap":"small","children":[{"type":"slot","slot":"email","presentation":"contactLink"},{"type":"slot","slot":"phone","presentation":"contactLine"},{"type":"repeat","source":"socialLinks","columns":3,"gap":"small","item":{"type":"slot","slot":"url","presentation":"socialLink"}}],"direction":"row"},{"type":"slot","slot":"copyright","presentation":"caption"}]}'::jsonb),
  ('f1110000-0000-4000-8000-00000000000e','f1100000-0000-4000-8000-00000000000e',1,'published','{"type":"stack","gap":"large","children":[{"type":"stack","gap":"small","children":[{"type":"element","id":"v110-process-kicker","elementType":"text","value":"Como o trabalho acontece","presentation":"eyebrow","style":{"size":"sm","color":"primary"}},{"type":"element","id":"v110-process-title","elementType":"heading","value":"Da mobilização ao impacto, cada etapa precisa ser compreensível","presentation":"heading","style":{"size":"2xl","color":"text"}}]},{"type":"grid","columns":3,"gap":"medium","children":[{"type":"stack","gap":"small","children":[{"type":"element","id":"v110-process-icon-1","elementType":"icon","value":"heart","style":{"size":"xl","color":"primary","width":"auto"}},{"type":"element","id":"v110-process-title-1","elementType":"heading","value":"1. A necessidade aparece","presentation":"itemTitle","style":{"size":"lg","color":"text"}},{"type":"element","id":"v110-process-text-1","elementType":"text","value":"Explique como a organização identifica pessoas, territórios ou demandas que precisam de atenção.","presentation":"itemBody","style":{"size":"md","color":"text"}}],"surface":"card"},{"type":"stack","gap":"small","children":[{"type":"element","id":"v110-process-icon-2","elementType":"icon","value":"users","style":{"size":"xl","color":"secondary","width":"auto"}},{"type":"element","id":"v110-process-title-2","elementType":"heading","value":"2. A rede se organiza","presentation":"itemTitle","style":{"size":"lg","color":"text"}},{"type":"element","id":"v110-process-text-2","elementType":"text","value":"Mostre como equipe, voluntários, parceiros e recursos se conectam para tornar a ação possível.","presentation":"itemBody","style":{"size":"md","color":"text"}}],"surface":"card"},{"type":"stack","gap":"small","children":[{"type":"element","id":"v110-process-icon-3","elementType":"icon","value":"star","style":{"size":"xl","color":"accent","width":"auto"}},{"type":"element","id":"v110-process-title-3","elementType":"heading","value":"3. O impacto chega","presentation":"itemTitle","style":{"size":"lg","color":"text"}},{"type":"element","id":"v110-process-text-3","elementType":"text","value":"Conte o que muda na prática e como a organização acompanha o resultado do trabalho.","presentation":"itemBody","style":{"size":"md","color":"text"}}],"surface":"card"}]}]}'::jsonb)
on conflict (id) do update set status=excluded.status, layout=excluded.layout;
-- Sites criados antes da V1.10 não tinham cabeçalho como uma seção editável.
-- Movemos o conteúdo existente uma posição para baixo e adicionamos o cabeçalho
-- da família Presença Humana sem alterar textos ou seções já criadas pela ONG.
with target_pages as (
  select p.id as page_id
  from public.institutional_pages p
  where p.is_home = true
    and not exists (
      select 1
      from public.institutional_pages other_page
      join public.institutional_sections existing_header
        on existing_header.page_id = other_page.id
      where other_page.site_id = p.site_id
        and existing_header.section_type = 'site_header'
    )
)
update public.institutional_sections s
set position = s.position + 1000
from target_pages tp
where s.page_id = tp.page_id;
with target_pages as (
  select p.id as page_id
  from public.institutional_pages p
  where p.is_home = true
    and not exists (
      select 1
      from public.institutional_pages other_page
      join public.institutional_sections existing_header
        on existing_header.page_id = other_page.id
      where other_page.site_id = p.site_id
        and existing_header.section_type = 'site_header'
    )
)
update public.institutional_sections s
set position = s.position - 999
from target_pages tp
where s.page_id = tp.page_id;
insert into public.institutional_sections (
  page_id,
  section_type,
  variant_version_id,
  position,
  visible,
  content,
  settings
)
select
  p.id,
  'site_header',
  'f1110000-0000-4000-8000-000000000001',
  0,
  true,
  jsonb_build_object(
    'brandLabel', o.name,
    'links', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Início', 'href', '#top'),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Impacto', 'href', '#impacto'),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Projetos', 'href', '#projetos'),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Sobre', 'href', '#sobre')
    ),
    'primaryAction', jsonb_build_object('label', 'Como ajudar', 'href', '#como-ajudar')
  ),
  '{"visualStyle":"header-human","sectionStyle":{"spacing":"compact","contentWidth":"wide","backgroundColor":"background"}}'::jsonb
from public.institutional_pages p
join public.institutional_sites site on site.id = p.site_id
join public.organizations o on o.id = site.organization_id
where p.is_home = true
  and not exists (
    select 1
    from public.institutional_pages other_page
    join public.institutional_sections existing_header
      on existing_header.page_id = other_page.id
    where other_page.site_id = p.site_id
      and existing_header.section_type = 'site_header'
  );
-- Seções antigas que ainda usam um modelo nativo da CONG recebem a nova peça
-- equivalente apenas quando não existe um layout personalizado. O conteúdo da
-- ONG é preservado; só a composição visual é atualizada.
with replacements(section_type, version_id, visual_style) as (
  values
    ('organization_intro', 'f1110000-0000-4000-8000-000000000002'::uuid, 'hero-human-v2'),
    ('impact_metrics', 'f1110000-0000-4000-8000-000000000003'::uuid, 'impact-story'),
    ('organization_about', 'f1110000-0000-4000-8000-000000000004'::uuid, 'about-human-v2'),
    ('projects_showcase', 'f1110000-0000-4000-8000-000000000005'::uuid, 'projects-mosaic-v2'),
    ('support_actions', 'f1110000-0000-4000-8000-000000000006'::uuid, 'support-human-v2'),
    ('organization_contact', 'f1110000-0000-4000-8000-000000000007'::uuid, 'contact-human-v2'),
    ('site_footer', 'f1110000-0000-4000-8000-000000000008'::uuid, 'footer-purpose')
)
update public.institutional_sections s
set
  variant_version_id = replacements.version_id,
  settings = jsonb_set(
    s.settings,
    '{visualStyle}',
    to_jsonb(replacements.visual_style),
    true
  )
from public.institutional_section_variant_versions current_version
join public.institutional_section_variants current_variant
  on current_variant.id = current_version.variant_id
cross join replacements
where s.variant_version_id = current_version.id
  and replacements.section_type = s.section_type
  and current_variant.is_system = true
  and not (s.settings ? 'layoutOverride')
  and s.variant_version_id <> replacements.version_id;
insert into public.institutional_templates (id,name,description,category,is_system,visibility,status,definition) values
  ('f1120000-0000-4000-8000-000000000001','Presença Humana','Uma família calorosa e editorial inspirada em sites sociais que colocam pessoas, impacto e participação no centro.','Humana · editorial',true,'public','published','{"example":true,"editorConstraints":{"mode":"guided","minWidthPercent":25,"maxWidthPercent":100,"minFontSize":12,"maxFontSize":86,"maxOffset":36},"pages":[{"title":"Home","slug":"home","isHome":true,"sections":[{"sectionType":"site_header","variantVersionId":"f1110000-0000-4000-8000-000000000001","content":{"brandLabel":"Nome da organização","links":[],"primaryAction":{"label":"Como ajudar","href":"#como-ajudar"}},"settings":{"visualStyle":"header-human","sectionStyle":{"spacing":"compact","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"organization_intro","variantVersionId":"f1110000-0000-4000-8000-000000000002","content":{"eyebrow":"Uma causa que aproxima pessoas","title":"Uma transformação importante começa com presença","description":"Conte de forma clara quem vocês alcançam e por que esse trabalho importa.","image":null,"primaryAction":{"label":"Conheça nosso trabalho","href":"#projetos"},"secondaryAction":{"label":"Ver nosso impacto","href":"#impacto"}},"settings":{"visualStyle":"hero-human-v2","sectionStyle":{"spacing":"generous","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"impact_metrics","variantVersionId":"f1110000-0000-4000-8000-000000000003","content":{"title":"Resultados que ajudam a contar essa história","description":"Use números confirmados e fáceis de entender.","items":[]},"settings":{"visualStyle":"impact-story","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"organization_about","variantVersionId":"f1110000-0000-4000-8000-000000000004","content":{"eyebrow":"Nossa história","title":"Uma história feita de pessoas, território e continuidade","description":"Conte como a organização nasceu e o que mantém o trabalho em movimento.","image":null,"action":null},"settings":{"visualStyle":"about-human-v2","sectionStyle":{"spacing":"generous","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"projects_showcase","variantVersionId":"f1110000-0000-4000-8000-000000000005","content":{"title":"Ações que transformam intenção em presença","description":"Mostre as iniciativas que melhor representam a atuação atual.","items":[]},"settings":{"visualStyle":"projects-mosaic-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"custom_content","variantVersionId":"f1110000-0000-4000-8000-00000000000e","content":{},"settings":{"visualStyle":"process-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"support_actions","variantVersionId":"f1110000-0000-4000-8000-000000000006","content":{"title":"Há mais de uma forma de fazer parte","description":"Transforme interesse em próximos passos claros.","items":[]},"settings":{"visualStyle":"support-human-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"organization_contact","variantVersionId":"f1110000-0000-4000-8000-000000000007","content":{"title":"Vamos construir o próximo passo juntos?","description":"Mantenha os canais oficiais e atualizados.","email":"","phone":"","whatsapp":"","address":"","hours":"","socialLinks":[]},"settings":{"visualStyle":"contact-human-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"normal","backgroundColor":"background"}}},{"sectionType":"site_footer","variantVersionId":"f1110000-0000-4000-8000-000000000008","content":{"title":"Nome da organização","description":"Uma frase curta sobre o propósito da organização.","email":"","phone":"","socialLinks":[],"copyright":""},"settings":{"visualStyle":"footer-purpose","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"primary"}}}]}]}'::jsonb),
  ('f1120000-0000-4000-8000-000000000002','Clareza em Ação','Uma família mais limpa e tipográfica, com bastante respiro e foco em mensagem, dados e projetos.','Clara · contemporânea',true,'public','published','{"example":true,"editorConstraints":{"mode":"guided","minWidthPercent":25,"maxWidthPercent":100,"minFontSize":12,"maxFontSize":86,"maxOffset":36},"pages":[{"title":"Home","slug":"home","isHome":true,"sections":[{"sectionType":"site_header","variantVersionId":"f1110000-0000-4000-8000-000000000009","content":{"brandLabel":"Nome da organização","links":[],"primaryAction":{"label":"Participar","href":"#como-ajudar"}},"settings":{"visualStyle":"header-essential","sectionStyle":{"spacing":"compact","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"organization_intro","variantVersionId":"f1110000-0000-4000-8000-00000000000a","content":{"eyebrow":"Propósito em primeiro plano","title":"Uma frase clara pode abrir a porta para uma causa inteira","description":"Explique em poucas linhas o que a organização faz, para quem e onde.","image":null,"primaryAction":{"label":"Conhecer projetos","href":"#projetos"},"secondaryAction":{"label":"Como ajudar","href":"#como-ajudar"}},"settings":{"visualStyle":"hero-clear","sectionStyle":{"spacing":"generous","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"impact_metrics","variantVersionId":"f1110000-0000-4000-8000-00000000000b","content":{"title":"O impacto em números","description":"Escolha poucos dados que realmente ajudam a entender a escala do trabalho.","items":[]},"settings":{"visualStyle":"impact-editorial","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"projects_showcase","variantVersionId":"f1110000-0000-4000-8000-00000000000c","content":{"title":"Projetos que merecem espaço para contar sua história","description":"Apresente as iniciativas mais representativas sem transformar a página em catálogo.","items":[]},"settings":{"visualStyle":"projects-editorial-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"normal","backgroundColor":"background"}}},{"sectionType":"organization_about","variantVersionId":"f1110000-0000-4000-8000-000000000004","content":{"eyebrow":"Quem somos","title":"O que sustenta esse trabalho ao longo do tempo","description":"Conte de onde a organização veio e como atua hoje.","image":null,"action":null},"settings":{"visualStyle":"about-human-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"support_actions","variantVersionId":"f1110000-0000-4000-8000-000000000006","content":{"title":"Escolha como você quer participar","description":"Deixe apenas os caminhos que realmente fazem sentido para a organização.","items":[]},"settings":{"visualStyle":"support-human-v2","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"background"}}},{"sectionType":"site_footer","variantVersionId":"f1110000-0000-4000-8000-00000000000d","content":{"title":"Nome da organização","description":"Uma frase curta sobre o propósito da organização.","email":"","phone":"","socialLinks":[],"copyright":""},"settings":{"visualStyle":"footer-essential","sectionStyle":{"spacing":"comfortable","contentWidth":"wide","backgroundColor":"primary"}}}]}]}'::jsonb)
on conflict (id) do update set name=excluded.name, description=excluded.description, category=excluded.category, visibility=excluded.visibility, status=excluded.status, definition=excluded.definition;
create table if not exists public.platform_user_capabilities (
  user_id uuid not null references public.users(id) on delete cascade,
  capability text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, capability)
);
revoke all on table public.platform_user_capabilities from anon, authenticated;
insert into public.platform_user_capabilities (user_id, capability)
select u.id, 'institutional.native_designs.manage'
from public.users u
join auth.users au on au.id = u.auth_user_id
where lower(au.email) = lower('kelvinpalka07@gmail.com')
on conflict (user_id, capability) do nothing;
commit;
