begin;

alter table public.institutional_section_variants
  drop constraint if exists institutional_section_variants_section_type_check;

alter table public.institutional_section_variants
  add constraint institutional_section_variants_section_type_check
  check (section_type in (
    'organization_intro',
    'organization_about',
    'projects_showcase',
    'impact_metrics',
    'support_actions',
    'transparency',
    'organization_contact',
    'custom_content',
    'site_footer'
  ));

alter table public.institutional_sections
  drop constraint if exists institutional_sections_section_type_check;

alter table public.institutional_sections
  add constraint institutional_sections_section_type_check
  check (section_type in (
    'organization_intro',
    'organization_about',
    'projects_showcase',
    'impact_metrics',
    'support_actions',
    'transparency',
    'organization_contact',
    'custom_content',
    'site_footer'
  ));

insert into public.institutional_section_variants (
  id,
  section_type,
  name,
  description,
  owner_user_id,
  is_system,
  visibility,
  status
)
values
  ('a1000000-0000-4000-8000-000000000001', 'custom_content', 'Seção em branco', 'Uma base simples para combinar elementos livremente.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000002', 'custom_content', 'Equipe', 'Apresente pessoas, funções ou responsáveis pela organização.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000003', 'custom_content', 'Parceiros', 'Organize apoiadores e organizações parceiras em uma grade simples.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000004', 'custom_content', 'Galeria', 'Uma composição visual para fotos da atuação da organização.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000005', 'custom_content', 'Perguntas frequentes', 'Ajude visitantes a encontrar respostas sem sobrecarregar a página.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000006', 'site_footer', 'Rodapé completo', 'Contato, redes e informações finais do site.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000007', 'site_footer', 'Rodapé compacto', 'Uma versão curta do rodapé institucional.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000008', 'custom_content', 'Depoimentos', 'Destaque relatos curtos de pessoas ligadas à organização.', null, true, 'public', 'published'),
  ('a1000000-0000-4000-8000-000000000009', 'custom_content', 'Chamada em destaque', 'Uma chamada clara para doação, voluntariado, inscrição ou outro próximo passo.', null, true, 'public', 'published')
on conflict (id) do nothing;

insert into public.institutional_section_variant_versions (
  id,
  variant_id,
  version,
  status,
  layout
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    1,
    'published',
    '{"type":"stack","id":"blank-root","gap":"medium","align":"stretch","children":[{"type":"element","id":"blank-heading","elementType":"heading","value":"Novo título","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"element","id":"blank-text","elementType":"text","value":"Comece por aqui e adicione os elementos que fizerem sentido para esta seção.","presentation":"body","style":{"size":"md","width":"100","color":"text","align":"left"}}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002',
    1,
    'published',
    '{"type":"stack","id":"team-root","gap":"large","align":"start","children":[{"type":"element","id":"team-heading","elementType":"heading","value":"Nossa equipe","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"element","id":"team-intro","elementType":"text","value":"Apresente as pessoas que tornam o trabalho da organização possível.","presentation":"body","style":{"size":"md","width":"100","color":"text","align":"left"}},{"type":"grid","id":"team-grid","columns":3,"gap":"medium","children":[{"type":"stack","id":"team-card-1","gap":"small","surface":"card","children":[{"type":"element","id":"team-icon-1","elementType":"icon","value":"users","style":{"size":"xl","color":"primary","width":"auto"}},{"type":"element","id":"team-name-1","elementType":"heading","value":"Nome da pessoa","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"team-role-1","elementType":"text","value":"Função ou responsabilidade","presentation":"body","style":{"size":"sm","color":"text","width":"100"}}]},{"type":"stack","id":"team-card-2","gap":"small","surface":"card","children":[{"type":"element","id":"team-icon-2","elementType":"icon","value":"users","style":{"size":"xl","color":"secondary","width":"auto"}},{"type":"element","id":"team-name-2","elementType":"heading","value":"Nome da pessoa","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"team-role-2","elementType":"text","value":"Função ou responsabilidade","presentation":"body","style":{"size":"sm","color":"text","width":"100"}}]},{"type":"stack","id":"team-card-3","gap":"small","surface":"card","children":[{"type":"element","id":"team-icon-3","elementType":"icon","value":"users","style":{"size":"xl","color":"accent","width":"auto"}},{"type":"element","id":"team-name-3","elementType":"heading","value":"Nome da pessoa","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"team-role-3","elementType":"text","value":"Função ou responsabilidade","presentation":"body","style":{"size":"sm","color":"text","width":"100"}}]}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000003',
    1,
    'published',
    '{"type":"stack","id":"partners-root","gap":"large","align":"start","children":[{"type":"element","id":"partners-heading","elementType":"heading","value":"Parceiros","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"element","id":"partners-intro","elementType":"text","value":"Reconheça organizações e pessoas que apoiam o trabalho da sua ONG.","presentation":"body","style":{"size":"md","width":"100","color":"text","align":"left"}},{"type":"grid","id":"partners-grid","columns":3,"gap":"medium","children":[{"type":"stack","id":"partner-1","gap":"small","align":"center","surface":"card","children":[{"type":"element","id":"partner-image-1","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}},{"type":"element","id":"partner-name-1","elementType":"heading","value":"Parceiro 1","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100","align":"center"}}]},{"type":"stack","id":"partner-2","gap":"small","align":"center","surface":"card","children":[{"type":"element","id":"partner-image-2","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}},{"type":"element","id":"partner-name-2","elementType":"heading","value":"Parceiro 2","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100","align":"center"}}]},{"type":"stack","id":"partner-3","gap":"small","align":"center","surface":"card","children":[{"type":"element","id":"partner-image-3","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}},{"type":"element","id":"partner-name-3","elementType":"heading","value":"Parceiro 3","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100","align":"center"}}]}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000004',
    1,
    'published',
    '{"type":"stack","id":"gallery-root","gap":"large","align":"start","children":[{"type":"element","id":"gallery-heading","elementType":"heading","value":"Nossa atuação em imagens","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"element","id":"gallery-intro","elementType":"text","value":"Use fotos reais e autorizadas para aproximar visitantes do trabalho da organização.","presentation":"body","style":{"size":"md","width":"100","color":"text","align":"left"}},{"type":"grid","id":"gallery-grid","columns":3,"gap":"small","children":[{"type":"element","id":"gallery-image-1","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}},{"type":"element","id":"gallery-image-2","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}},{"type":"element","id":"gallery-image-3","elementType":"image","value":null,"presentation":"image","style":{"width":"100","radius":"medium"}}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000005',
    1,
    'published',
    '{"type":"stack","id":"faq-root","gap":"medium","align":"stretch","children":[{"type":"element","id":"faq-heading","elementType":"heading","value":"Perguntas frequentes","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"stack","id":"faq-item-1","gap":"small","surface":"card","children":[{"type":"element","id":"faq-q-1","elementType":"heading","value":"Como posso ajudar?","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"faq-a-1","elementType":"text","value":"Explique aqui, de forma direta, como alguém pode apoiar a organização.","presentation":"body","style":{"size":"md","color":"text","width":"100"}}]},{"type":"stack","id":"faq-item-2","gap":"small","surface":"card","children":[{"type":"element","id":"faq-q-2","elementType":"heading","value":"Como funciona o atendimento?","presentation":"itemTitle","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"faq-a-2","elementType":"text","value":"Inclua apenas orientações que estejam atualizadas e sejam válidas para sua organização.","presentation":"body","style":{"size":"md","color":"text","width":"100"}}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000006',
    'a1000000-0000-4000-8000-000000000006',
    1,
    'published',
    '{"type":"columns","id":"footer-root","ratio":"2:1","gap":"large","children":[{"type":"stack","id":"footer-main","gap":"small","children":[{"type":"slot","id":"footer-title","slot":"title","presentation":"heading"},{"type":"slot","id":"footer-description","slot":"description","presentation":"body"},{"type":"slot","id":"footer-copyright","slot":"copyright","presentation":"caption"}]},{"type":"stack","id":"footer-contact","gap":"small","children":[{"type":"slot","id":"footer-email","slot":"email","presentation":"contactLink"},{"type":"slot","id":"footer-phone","slot":"phone","presentation":"contactLine"},{"type":"repeat","id":"footer-socials","source":"socialLinks","columns":1,"gap":"small","item":{"type":"slot","id":"footer-social-link","slot":"url","presentation":"socialLink"}}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000007',
    'a1000000-0000-4000-8000-000000000007',
    1,
    'published',
    '{"type":"stack","id":"footer-compact-root","gap":"small","align":"center","children":[{"type":"slot","id":"footer-compact-title","slot":"title","presentation":"itemTitle"},{"type":"slot","id":"footer-compact-description","slot":"description","presentation":"body"},{"type":"repeat","id":"footer-compact-socials","source":"socialLinks","columns":3,"gap":"small","item":{"type":"slot","id":"footer-compact-link","slot":"url","presentation":"socialLink"}},{"type":"slot","id":"footer-compact-copyright","slot":"copyright","presentation":"caption"}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000008',
    'a1000000-0000-4000-8000-000000000008',
    1,
    'published',
    '{"type":"stack","id":"testimonials-root","gap":"large","align":"start","children":[{"type":"element","id":"testimonials-heading","elementType":"heading","value":"Histórias de quem faz parte","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"left"}},{"type":"grid","id":"testimonials-grid","columns":2,"gap":"medium","children":[{"type":"stack","id":"testimonial-1","gap":"small","surface":"card","children":[{"type":"element","id":"testimonial-quote-1","elementType":"quote","value":"Use um relato real e autorizado que ajude a explicar o impacto da organização.","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"testimonial-author-1","elementType":"text","value":"Nome ou identificação apropriada","style":{"size":"sm","color":"primary","width":"100"}}]},{"type":"stack","id":"testimonial-2","gap":"small","surface":"card","children":[{"type":"element","id":"testimonial-quote-2","elementType":"quote","value":"Substitua este exemplo por um depoimento verdadeiro e autorizado antes de publicar.","style":{"size":"lg","color":"text","width":"100"}},{"type":"element","id":"testimonial-author-2","elementType":"text","value":"Nome ou identificação apropriada","style":{"size":"sm","color":"secondary","width":"100"}}]}]}]}'::jsonb
  ),
  (
    'b1000000-0000-4000-8000-000000000009',
    'a1000000-0000-4000-8000-000000000009',
    1,
    'published',
    '{"type":"stack","id":"cta-root","gap":"medium","align":"center","surface":"highlight","children":[{"type":"element","id":"cta-heading","elementType":"heading","value":"Convide para o próximo passo","presentation":"heading","style":{"size":"2xl","width":"100","color":"text","align":"center"}},{"type":"element","id":"cta-text","elementType":"text","value":"Explique em uma frase o que a pessoa pode fazer agora.","presentation":"body","style":{"size":"md","width":"75","color":"text","align":"center"}},{"type":"element","id":"cta-button","elementType":"button","value":{"label":"Quero participar","href":"#"},"presentation":"primaryAction","style":{"width":"auto","backgroundColor":"accent","color":"text","radius":"pill"}}]}'::jsonb
  )
on conflict (id) do nothing;

update public.institutional_templates as template
set definition = jsonb_set(
  template.definition,
  '{pages,0,sections}',
  coalesce(template.definition #> '{pages,0,sections}', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'sectionType', 'site_footer',
      'variantVersionId', 'b1000000-0000-4000-8000-000000000006',
      'content', jsonb_build_object(
        'title', '',
        'description', '',
        'email', '',
        'phone', '',
        'socialLinks', '[]'::jsonb,
        'copyright', ''
      )
    )
  ),
  true
)
where template.is_system = true
  and jsonb_array_length(coalesce(template.definition -> 'pages', '[]'::jsonb)) > 0
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(template.definition #> '{pages,0,sections}', '[]'::jsonb)) as section
    where section ->> 'sectionType' = 'site_footer'
  );

commit;
