-- CONG / Auditoria e responsabilização: executar APÓS account_safe_erasure.
-- Acesso exclusivo pelo servidor. Identidade civil não é verificada por esta migration.
begin;

create table public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  organization_id uuid,
  actor_user_id uuid references public.users(id) on delete restrict,
  subject_user_id uuid references public.users(id) on delete restrict,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  retained_until timestamptz not null default (now() + interval '2 years')
);
create index security_audit_events_time_idx on public.security_audit_events (occurred_at desc);
create index security_audit_events_actor_idx on public.security_audit_events (actor_user_id, occurred_at desc);
create index security_audit_events_subject_idx on public.security_audit_events (subject_user_id, occurred_at desc);
create index security_audit_events_org_idx on public.security_audit_events (organization_id, occurred_at desc);

-- Dados pessoais sob retenção excepcional, não expostos por endpoints comuns.
-- Prazo inicial de 365 dias, sujeito à revisão jurídica e eventual preservação legal documentada.
create table public.security_audit_identities (
  user_id uuid primary key references public.users(id) on delete restrict,
  original_name text not null,
  original_username text,
  original_email text,
  retention_reason text not null,
  retained_at timestamptz not null default now(),
  retained_until timestamptz not null default (now() + interval '365 days')
);

-- Evidência mínima no momento da denúncia: sobrevive à exclusão em cascata do post.
-- report_id e original_target_id são identificadores históricos, SEM FK para alvos removíveis.
create table public.security_report_evidence (
  report_id uuid primary key,
  captured_at timestamptz not null default now(),
  reporter_user_id uuid references public.users(id) on delete restrict,
  subject_user_id uuid references public.users(id) on delete restrict,
  target_type text not null check (target_type in ('post','comment','user')),
  original_target_id uuid not null,
  reason text not null,
  details text not null default '',
  content_excerpt text,
  status_at_capture text not null,
  retained_until timestamptz not null default (now() + interval '365 days')
);
create index security_report_evidence_subject_idx on public.security_report_evidence(subject_user_id, captured_at desc);

-- Decisões sobre denúncias cujo post original deixou de existir por exclusão.
-- O caso continua investigável sem restaurar a conta excluída.
create table public.security_archived_case_reviews (
  report_id uuid primary key references public.security_report_evidence(report_id) on delete restrict,
  reviewed_by_user_id uuid not null references public.users(id) on delete restrict,
  decision text not null check (decision in ('substantiated','dismissed','needs_external_review')),
  note text not null check (char_length(note) between 10 and 1200),
  reviewed_at timestamptz not null default now()
);

alter table public.security_audit_events enable row level security;
alter table public.security_audit_identities enable row level security;
alter table public.security_report_evidence enable row level security;
alter table public.security_archived_case_reviews enable row level security;
revoke all on public.security_audit_events, public.security_audit_identities, public.security_report_evidence, public.security_archived_case_reviews from public, anon, authenticated;
-- Nenhuma policy de leitura para anon/authenticated. O backend usa uma conexão privilegiada.

-- Registros append-only para o aplicativo; expurgo administrativo é uma exceção controlada.
create or replace function public.security_audit_immutable()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('cong.authorized_audit_purge', true) = 'yes' then
    return old;
  end if;
  raise exception 'Security audit records are immutable';
end $$;
create trigger security_audit_events_immutable before update or delete on public.security_audit_events
  for each row execute function public.security_audit_immutable();
create trigger security_report_evidence_immutable before update or delete on public.security_report_evidence
  for each row execute function public.security_audit_immutable();
create trigger security_archived_case_reviews_immutable before update or delete on public.security_archived_case_reviews
  for each row execute function public.security_audit_immutable();
create trigger security_audit_identities_immutable before update or delete on public.security_audit_identities
  for each row execute function public.security_audit_immutable();

-- Contexto com identidade autenticada definida pelo serviço dentro da transação.
-- Nunca usar um header ou user_id enviado pelo browser para preencher esse contexto.
create or replace function public.security_audit_actor()
returns uuid language plpgsql stable set search_path = '' as $$
declare raw_value text;
begin
  raw_value := nullif(current_setting('cong.actor_user_id', true), '');
  return raw_value::uuid;
exception when invalid_text_representation then
  return null;
end $$;

-- Função genérica de auditoria para os registros administrativos atualmente existentes.
-- Só persiste campos previamente permitidos: NUNCA dumps arbitrários de JSON,
-- tokens, endereços, CNPJ ou conteúdo de doações. Hashes indicam alteração sem vazamento.
create or replace function public.security_audit_ngo_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  newer jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  older jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  selected_row jsonb;
  org_id uuid;
  row_id uuid;
  actor_id uuid;
  subj_id uuid;
  before_info jsonb := '{}'::jsonb;
  after_info jsonb := '{}'::jsonb;
begin
  selected_row := case when tg_op = 'DELETE' then older else newer end;
  row_id := (selected_row->>'id')::uuid;
  actor_id := public.security_audit_actor();
  if tg_table_name = 'organizations' then
    org_id := row_id;
    before_info := jsonb_build_object('name',older->>'name','active',older->'active', 'settings_hash',md5(coalesce(older->>'settings','')));
    after_info := jsonb_build_object('name',newer->>'name','active',newer->'active','settings_hash',md5(coalesce(newer->>'settings','')));
  elsif tg_table_name = 'organization_users' then
    org_id := (selected_row->>'organization_id')::uuid;
    subj_id := (selected_row->>'user_id')::uuid;
    before_info := jsonb_build_object('role_id',older->>'role_id','status',older->>'status');
    after_info := jsonb_build_object('role_id',newer->>'role_id','status',newer->>'status');
  elsif tg_table_name = 'organization_brand_profiles' then
    org_id := (selected_row->>'organization_id')::uuid;
    before_info := jsonb_build_object('logo_asset_id',older->>'logo_asset_id','primary_color',older->>'primary_color');
    after_info := jsonb_build_object('logo_asset_id',newer->>'logo_asset_id','primary_color',newer->>'primary_color');
  elsif tg_table_name = 'institutional_sites' then
    org_id := (selected_row->>'organization_id')::uuid;
    if actor_id is null and tg_op = 'INSERT' then actor_id := (selected_row->>'created_by')::uuid; end if;
    before_info := jsonb_build_object('name',older->>'name','slug',older->>'slug','published_at',older->>'published_at','is_primary',older->'is_primary');
    after_info := jsonb_build_object('name',newer->>'name','slug',newer->>'slug','published_at',newer->>'published_at','is_primary',newer->'is_primary');
  elsif tg_table_name = 'institutional_pages' then
    select s.organization_id into org_id from public.institutional_sites s
    where s.id = (selected_row->>'site_id')::uuid;
    before_info := jsonb_build_object('title',older->>'title','slug',older->>'slug','is_home',older->'is_home','position',older->'position');
    after_info := jsonb_build_object('title',newer->>'title','slug',newer->>'slug','is_home',newer->'is_home','position',newer->'position');
  elsif tg_table_name = 'institutional_sections' then
    select s.organization_id into org_id from public.institutional_pages p
      join public.institutional_sites s on s.id = p.site_id
      where p.id = (selected_row->>'page_id')::uuid;
    before_info := jsonb_build_object('type',older->>'section_type','position',older->'position','visible',older->'visible','content_fingerprint_md5',md5(coalesce(older->>'content','')));
    after_info := jsonb_build_object('type',newer->>'section_type','position',newer->'position','visible',newer->'visible','content_fingerprint_md5',md5(coalesce(newer->>'content','')));
  elsif tg_table_name = 'institutional_site_publications' then
    select s.organization_id into org_id from public.institutional_sites s
    where s.id = (selected_row->>'site_id')::uuid;
    actor_id := coalesce(actor_id, (selected_row->>'published_by')::uuid);
    before_info := jsonb_build_object('version',older->'version');
    after_info := jsonb_build_object('version',newer->'version','snapshot_md5',md5(coalesce(newer->>'snapshot','')));
  end if;
  if tg_op = 'UPDATE' and before_info = after_info then return new; end if;
  insert into public.security_audit_events
    (event_type,entity_type,entity_id,organization_id,actor_user_id,subject_user_id,before_state,after_state)
  values (tg_table_name || '.' || lower(tg_op),tg_table_name,row_id,org_id,actor_id,subj_id,before_info,after_info);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function public.security_audit_ngo_change();
create trigger audit_organization_users after insert or update or delete on public.organization_users
  for each row execute function public.security_audit_ngo_change();
create trigger audit_organization_brand_profiles after insert or update or delete on public.organization_brand_profiles
  for each row execute function public.security_audit_ngo_change();
create trigger audit_institutional_sites after insert or update or delete on public.institutional_sites
  for each row execute function public.security_audit_ngo_change();
create trigger audit_institutional_pages after insert or update or delete on public.institutional_pages
  for each row execute function public.security_audit_ngo_change();
create trigger audit_institutional_sections after insert or update or delete on public.institutional_sections
  for each row execute function public.security_audit_ngo_change();
create trigger audit_institutional_site_publications after insert on public.institutional_site_publications
  for each row execute function public.security_audit_ngo_change();

-- Evidências são capturadas na criação da denúncia, antes de qualquer exclusão.
create or replace function public.security_capture_community_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  subject_id uuid;
  target_id uuid;
  target_kind text;
  excerpt_value text;
begin
  if new.post_id is not null then
    target_kind := 'post'; target_id := new.post_id;
    select author_user_id, left(concat_ws(' — ',title,description,content),1800)
    into subject_id,excerpt_value from public.community_posts where id=target_id;
  elsif new.comment_id is not null then
    target_kind := 'comment'; target_id := new.comment_id;
    select author_user_id, left(content,1800)
    into subject_id,excerpt_value from public.community_post_comments where id=target_id;
  else
    target_kind := 'user'; target_id := new.reported_user_id;
    subject_id := new.reported_user_id;
    excerpt_value := null;
  end if;
  insert into public.security_report_evidence
    (report_id,reporter_user_id,subject_user_id,target_type,original_target_id,reason,details,content_excerpt,status_at_capture)
  values (new.id,new.reporter_user_id,subject_id,target_kind,target_id,new.reason,left(coalesce(new.details,''),1200),excerpt_value,new.status)
  on conflict(report_id) do nothing;
  insert into public.security_audit_events
    (event_type,entity_type,entity_id,actor_user_id,subject_user_id,after_state,context)
  values ('community_report.created','community_report',new.id,new.reporter_user_id,subject_id,
    jsonb_build_object('reason',new.reason,'target_type',target_kind,'target_id',target_id),
    jsonb_build_object('evidence_report_id',new.id));
  return new;
end $$;
create trigger security_report_captured after insert on public.community_reports
  for each row execute function public.security_capture_community_report();

-- Só a auditoria administrativa conhece a identidade do moderador.
create or replace function public.security_capture_moderation_action()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  subject_id uuid;
  target_kind text;
  target_id uuid;
begin
  select e.subject_user_id,e.target_type,e.original_target_id
    into subject_id,target_kind,target_id from public.security_report_evidence e where e.report_id=new.report_id;
  insert into public.security_audit_events
    (event_type,entity_type,entity_id,actor_user_id,subject_user_id,after_state,context)
  values ('community_moderation.' || new.action,'community_moderation_action',new.id,new.moderator_user_id,subject_id,
    jsonb_build_object('action',new.action,'report_id',new.report_id,'target_type',target_kind,'target_id',target_id),
    jsonb_build_object('report_id',new.report_id));
  return new;
end $$;
create trigger security_moderation_action_captured after insert on public.community_moderation_actions
  for each row execute function public.security_capture_moderation_action();

-- Dados anteriores à migration: preserva denúncias e ações que ainda existam,
-- sem falsificar um registro completo de alterações históricas inexistentes.
insert into public.security_report_evidence
  (report_id,reporter_user_id,subject_user_id,target_type,original_target_id,reason,details,content_excerpt,status_at_capture,captured_at)
select r.id,r.reporter_user_id,
  case when r.post_id is not null then p.author_user_id when r.comment_id is not null then c.author_user_id else r.reported_user_id end,
  case when r.post_id is not null then 'post' when r.comment_id is not null then 'comment' else 'user' end,
  coalesce(r.post_id,r.comment_id,r.reported_user_id),r.reason,left(coalesce(r.details,''),1200),
  case when r.post_id is not null then left(concat_ws(' — ',p.title,p.description,p.content),1800)
       when r.comment_id is not null then left(c.content,1800) else null end,
  r.status,r.created_at
from public.community_reports r
left join public.community_posts p on p.id=r.post_id
left join public.community_post_comments c on c.id=r.comment_id
where coalesce(r.post_id,r.comment_id,r.reported_user_id) is not null
on conflict(report_id) do nothing;

insert into public.security_audit_events
  (occurred_at,event_type,entity_type,entity_id,actor_user_id,subject_user_id,after_state,context)
select ma.created_at,'community_moderation.'||ma.action,'community_moderation_action',ma.id,
 ma.moderator_user_id,e.subject_user_id,jsonb_build_object('action',ma.action,'report_id',ma.report_id),
 jsonb_build_object('report_id',ma.report_id,'imported_historical',true)
from public.community_moderation_actions ma
left join public.security_report_evidence e on e.report_id=ma.report_id;

-- Expurgo: função administrativa sem exposição ao cliente, a agendar APÓS
-- aprovar política de retenção e garantias de preservação legal.
create or replace function public.security_audit_purge_expired()
returns table (identities_removed bigint, evidence_removed bigint, events_removed bigint)
language plpgsql security definer set search_path = '' as $$
declare a bigint; b bigint; c bigint;
begin
  perform set_config('cong.authorized_audit_purge','yes',true);
  delete from public.security_audit_identities where retained_until < now();
  get diagnostics a = row_count;
  delete from public.security_archived_case_reviews r using public.security_report_evidence e
    where r.report_id=e.report_id and e.retained_until < now();
  delete from public.security_report_evidence where retained_until < now();
  get diagnostics b = row_count;
  delete from public.security_audit_events where retained_until < now();
  get diagnostics c = row_count;
  return query select a,b,c;
end $$;
revoke all on function public.security_audit_purge_expired() from public, anon, authenticated;
revoke all on function public.security_capture_community_report() from public, anon, authenticated;
revoke all on function public.security_capture_moderation_action() from public, anon, authenticated;
revoke all on function public.security_audit_ngo_change() from public, anon, authenticated;

commit;
