-- Backfill of omitted navigation IDs in published native catalog templates.
-- This migration updates only institutional_templates.definition and does not
-- change organization sites, private uploads or customized user templates.
BEGIN;

DO $repair$
DECLARE
  current_template RECORD;
  repaired_definition jsonb;
  page_data jsonb;
  section_data jsonb;
  link_data jsonb;
  link_count integer;
  page_idx integer;
  section_idx integer;
  link_idx integer;
  fixed_count integer;
BEGIN
  FOR current_template IN
    SELECT id, name, definition
    FROM public.institutional_templates
    WHERE is_system = true
      AND status = 'published'
      AND visibility = 'public'
    FOR UPDATE
  LOOP
    repaired_definition := current_template.definition;
    fixed_count := 0;
    IF jsonb_typeof(repaired_definition -> 'pages') IS DISTINCT FROM 'array' THEN
      CONTINUE;
    END IF;

    FOR page_idx IN 0 .. jsonb_array_length(repaired_definition -> 'pages') - 1 LOOP
      page_data := repaired_definition -> 'pages' -> page_idx;
      IF jsonb_typeof(page_data -> 'sections') IS DISTINCT FROM 'array' THEN
        CONTINUE;
      END IF;
      FOR section_idx IN 0 .. jsonb_array_length(page_data -> 'sections') - 1 LOOP
        section_data := page_data -> 'sections' -> section_idx;
        IF section_data ->> 'sectionType' IS DISTINCT FROM 'site_header' THEN
          CONTINUE;
        END IF;
        link_data := section_data #> '{content,links}';
        IF jsonb_typeof(link_data) IS DISTINCT FROM 'array' THEN
          CONTINUE;
        END IF;
        link_count := jsonb_array_length(link_data);
        FOR link_idx IN 0 .. link_count - 1 LOOP
          IF jsonb_typeof(link_data -> link_idx) = 'object'
             AND NOT ((link_data -> link_idx) ? 'id') THEN
            repaired_definition := jsonb_set(
              repaired_definition,
              ARRAY['pages', page_idx::text, 'sections', section_idx::text, 'content', 'links', link_idx::text, 'id'],
              to_jsonb(gen_random_uuid()::text),
              true
            );
            fixed_count := fixed_count + 1;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    IF fixed_count > 0 THEN
      UPDATE public.institutional_templates
      SET definition = repaired_definition
      WHERE id = current_template.id;
      RAISE NOTICE 'Repaired % missing navigation IDs in template % (%)',
        fixed_count, current_template.name, current_template.id;
    END IF;
  END LOOP;
END
$repair$;

COMMIT;
