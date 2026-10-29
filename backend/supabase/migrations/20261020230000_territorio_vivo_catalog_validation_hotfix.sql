-- Corrige a definicao publicada do catalogo Territorio Vivo v7.
-- Nenhum dado de institutional_sites, institutional_pages ou institutional_sections e modificado.
-- Cada link mantem label/href e recebe um UUID estavel apenas quando nao possui id.
BEGIN;
WITH target AS (
  SELECT id, definition #> '{pages,0,sections,0,content,links}' AS links
  FROM public.institutional_templates
  WHERE id = 'c11aaafb-f131-5a4e-b08e-bafa9919244d'::uuid
    AND family_key = 'territorio-vivo'
    AND is_system = true
    AND definition #>> '{pages,0,sections,0,sectionType}' = 'site_header'
    AND jsonb_typeof(definition #> '{pages,0,sections,0,content,links}') = 'array'
    AND jsonb_array_length(definition #> '{pages,0,sections,0,content,links}') = 6
), repaired AS (
  SELECT t.id,
         jsonb_agg(
           CASE WHEN jsonb_typeof(item.link) = 'object'
             AND (NOT (item.link ? 'id') OR nullif(item.link->>'id', '') IS NULL)
             THEN item.link || jsonb_build_object(
               'id', (ARRAY['d3aaa424-803b-54d6-be72-366c73eff191','442fab04-b2f7-53f6-a156-0163cbb1dac9','bf8829d9-ab29-5ede-bd18-c6bd0036128b','2db93b46-b4b2-55c4-b5ab-28957e39b577','ad1a0adf-3b73-54fb-a30f-dbd882aea667','1d08110c-2a27-5e1c-ba09-e8e9e35d54c5']::uuid[])[item.position::integer]::text
             )
             ELSE item.link
           END
           ORDER BY item.position
         ) AS fixed_links
  FROM target AS t
  CROSS JOIN LATERAL jsonb_array_elements(t.links)
    WITH ORDINALITY AS item(link, position)
  GROUP BY t.id
)
UPDATE public.institutional_templates AS template
SET definition = jsonb_set(
  template.definition,
  '{pages,0,sections,0,content,links}',
  repaired.fixed_links,
  false
)
FROM repaired
WHERE template.id = repaired.id
  AND template.definition #> '{pages,0,sections,0,content,links}'
      IS DISTINCT FROM repaired.fixed_links;
-- Duas proporcoes invalidas ('wide') no layout publicado.
-- A representacao permitida equivalente e '16:9'.
UPDATE public.institutional_section_variant_versions
SET layout = jsonb_set(layout, '{children,2,style,imageAspect}', '"16:9"'::jsonb, false)
WHERE id = '8a73a8d9-f7bc-525e-9b4c-928c6f2a7418'::uuid
  AND layout #>> '{children,2,style,imageAspect}' = 'wide';
UPDATE public.institutional_section_variant_versions
SET layout = jsonb_set(layout, '{children,3,style,imageAspect}', '"16:9"'::jsonb, false)
WHERE id = '0e1e3e3f-4768-58a2-b6a0-43031feb3db0'::uuid
  AND layout #>> '{children,3,style,imageAspect}' = 'wide';
COMMIT;
