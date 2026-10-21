import LibraryHoverPreview from "./LibraryHoverPreview";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FiArrowLeft, FiCheck, FiEye, FiPlus, FiSearch, FiX } from "react-icons/fi";

import { buildBrandCssVariables } from "../../../utils/institutionalColors";
import { designSystemCssVariables, resolveDesignSystem } from "../../../features/site-builder/design-system/designTokens";
import { ensureFontsLoaded } from "../../../features/site-builder/design-system/fontCatalog";
import { createDefaultSectionContent } from "../../../data/institutional/sectionCatalog";
import { findNativeDesignFamilyById } from "../../../data/institutional/nativeDesignFamilies";
import {
  compositionCategories,
  settingsForComposition,
  siteCompositions,
  variantForComposition,
  type CompositionCategory,
  type SiteComposition,
} from "../../../features/site-builder/compositions/compositionCatalog";
import type { InstitutionalBrand, InstitutionalSection, InstitutionalVariant } from "../../../services/institutionalService";
import { previewBrandForVariant, previewContentForSection } from "../../../utils/institutionalPreview";
import SectionRenderer from "../renderer/SectionRenderer";
import styles from "./CompositionStudio.module.css";

function CompositionCanvas({
  composition,
  variant,
  brand,
  withExample,
}: {
  composition: SiteComposition;
  variant: InstitutionalVariant;
  brand?: InstitutionalBrand;
  withExample: boolean;
}) {
  const familyId = findNativeDesignFamilyById(variant.familyKey)?.id;
  const content = withExample
    ? previewContentForSection(composition.sectionType, undefined, familyId)
    : createDefaultSectionContent(composition.sectionType);
  const section: InstitutionalSection = {
    id: `composition-preview-${composition.id}`,
    pageId: "composition-preview-page",
    sectionType: composition.sectionType,
    variantVersionId: variant.versionId,
    variantId: variant.id,
    variantName: variant.name,
    variantVersion: variant.version,
    layout: variant.layout,
    position: 0,
    visible: true,
    content,
    settings: settingsForComposition(composition, variant),
  };
  const resolvedBrand = brand ?? previewBrandForVariant(variant);
  const design = resolveDesignSystem(resolvedBrand);
  const cssVariables = {
    ...buildBrandCssVariables(resolvedBrand),
    ...designSystemCssVariables(resolvedBrand, (font) => font === "brand" ? "var(--font-brand)" : font === "system" ? "var(--font-system)" : "var(--font-interface)"),
  } as CSSProperties;
  return (
    <div className={styles.renderSite} style={cssVariables}
      data-cong-custom-heading={design.headingFamily !== "legacy"}
      data-cong-custom-body={design.bodyFamily !== "legacy"}>
      <SectionRenderer section={section} brand={resolvedBrand} showEmptyMediaPreview={!withExample} />
    </div>
  );
}

export default function CompositionStudio({
  variants,
  brand,
  query,
  disabled,
  onAdd,
}: {
  variants: InstitutionalVariant[];
  brand?: InstitutionalBrand;
  query: string;
  disabled?: boolean;
  onAdd: (sectionType: SiteComposition["sectionType"], versionId: string, compositionId: string) => void;
}) {
  const [category, setCategory] = useState<CompositionCategory | "todas">("todas");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [hoveredComposition, setHoveredComposition] = useState<{ id: string; anchor: DOMRect } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [withExample, setWithExample] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

  const entries = useMemo(() => siteCompositions
    .filter((composition) => category === "todas" || composition.category === category)
    .filter((composition) => !normalizedQuery || [
      composition.title, composition.description, composition.sectionType,
      ...composition.traits,
      compositionCategories.find((item) => item.id === composition.category)?.label ?? "",
    ].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    .map((composition) => ({ composition, variant: variantForComposition(composition, variants) })),
  [category, normalizedQuery, variants]);

  useEffect(() => {
    if (!brand) return;
    const design = resolveDesignSystem(brand);
    ensureFontsLoaded([design.headingFamily, design.bodyFamily, ...Object.values(design.textStyles ?? {}).flatMap((item) => item ? [item.family] : [])]);
  }, [brand]);

  const selected = previewId ? siteCompositions.find((item) => item.id === previewId) : undefined;
  const selectedVariant = selected ? variantForComposition(selected, variants) : undefined;
  const unavailableCount = entries.filter((entry) => !entry.variant).length;

  const closePreview = () => {
    setPreviewId(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreviewId(null);
        triggerRef.current?.focus();
      }
      if (event.key !== "Tab" || !dialog) return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const openPreview = (id: string, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setPreviewDevice("desktop");
    setWithExample(true);
    setPreviewId(id);
  };

  return (
    <div className={styles.studio}>
      <div className={styles.intro}>
        <strong>Composições prontas para personalizar</strong>
        <p>Escolha pela estrutura, não apenas pelas cores. Tudo continua editável depois de inserir.</p>
      </div>
      <div className={styles.categoryScroll} role="group" aria-label="Filtrar composições">
        {compositionCategories.map((item) => (
          <button type="button" className={styles.category} data-active={category === item.id}
            aria-pressed={category === item.id} key={item.id} onClick={() => setCategory(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className={styles.listHeading}>
        <strong>{entries.length} {entries.length === 1 ? "composição disponível" : "composições disponíveis"}</strong>
        <span>Pré-visualizações ilustrativas</span>
      </div>
      {unavailableCount > 0 ? (
        <p role="status" className={styles.missingVariantNotice}>
          {unavailableCount} composição(ões) precisam de uma variante de seção ainda não disponibilizada pela API. Os modelos permanecem visíveis para diagnóstico, mas não podem ser inseridos até que a variante exista.
        </p>
      ) : null}
      <div className={styles.gallery}>
        {entries.map(({ composition, variant }) => (
          <article
            className={styles.card}
            key={composition.id}
            onMouseEnter={(event) => setHoveredComposition({ id: composition.id, anchor: event.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => setHoveredComposition(null)}
            onFocusCapture={(event) => setHoveredComposition({ id: composition.id, anchor: event.currentTarget.getBoundingClientRect() })}
            onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoveredComposition(null); }}
          >
            <button type="button" className={styles.thumbnailButton} onClick={(event) => openPreview(composition.id, event.currentTarget)}
              aria-label={`Visualizar ${composition.title} em tamanho maior`}>
              <span className={styles.thumbnail} aria-hidden="true">
                {variant ? (
                  <span className={styles.scaled}>
                    <CompositionCanvas composition={composition} variant={variant} brand={brand} withExample />
                  </span>
                ) : (
                  <span className={styles.variantMissing}>Prévia indisponível: falta uma variante para {composition.sectionType}</span>
                )}
              </span>
              <span className={styles.previewLabel}><FiEye aria-hidden="true" /> Ver composição</span>
            </button>
            <div className={styles.cardDetails}>
              <strong>{composition.title}</strong>
              <p>{composition.description}</p>
              <div className={styles.traits}>{composition.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
              <button type="button" className={styles.add} disabled={disabled || !variant}
                onClick={() => { if (variant) onAdd(composition.sectionType, variant.versionId, composition.id); }}
                title={!variant ? "Esta composição exige uma variante da mesma seção cadastrada no backend" : undefined}>
                <FiPlus aria-hidden="true" /> {variant ? "Inserir seção" : "Variante indisponível"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {entries.length === 0 ? (
        <div className={styles.empty}><FiSearch aria-hidden="true" /><strong>Nenhuma composição encontrada</strong>
          <p>Experimente outra categoria ou termo de busca.</p>
          <button type="button" onClick={() => setCategory("todas")}>Ver todas as categorias</button>
        </div>
      ) : null}
      <p className={styles.note}>As composições gráficas incluem conteúdo de demonstração editável, identificado como exemplo. Substitua imagens, números e textos antes de publicar.</p>

      {hoveredComposition ? (() => {
        const entry = entries.find(({ composition }) => composition.id === hoveredComposition.id);
        if (!entry?.variant) return null;
        return <LibraryHoverPreview
          anchor={hoveredComposition.anchor}
          title={entry.composition.title}
          description={entry.composition.description}
        >
          <CompositionCanvas composition={entry.composition} variant={entry.variant} brand={brand} withExample />
        </LibraryHoverPreview>;
      })() : null}

      {selected && selectedVariant ? (
        <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="composition-preview-title">
            <header className={styles.dialogHeader}>
              <button type="button" className={styles.back} onClick={closePreview} aria-label="Voltar à biblioteca"><FiArrowLeft /></button>
              <div className={styles.dialogHeading}>
                <span>Prévia da composição</span>
                <h2 id="composition-preview-title">{selected.title}</h2>
              </div>
              <button type="button" className={styles.close} onClick={closePreview} aria-label="Fechar prévia"><FiX /></button>
            </header>
            <div className={styles.previewToolbar}>
              <div className={styles.toggleGroup} role="group" aria-label="Conteúdo da prévia">
                <button type="button" aria-pressed={withExample} data-active={withExample} onClick={() => setWithExample(true)}>Exemplo</button>
                <button type="button" aria-pressed={!withExample} data-active={!withExample} onClick={() => setWithExample(false)}>Ao inserir</button>
              </div>
              <div className={styles.toggleGroup} role="group" aria-label="Tamanho da tela">
                <button type="button" aria-pressed={previewDevice === "desktop"} data-active={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>Desktop</button>
                <button type="button" aria-pressed={previewDevice === "mobile"} data-active={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>Celular</button>
              </div>
            </div>
            <div className={styles.previewStage} data-device={previewDevice}>
              <div className={styles.previewFrame} aria-label={withExample ? "Exemplo visual, não inserido no site" : "Conteúdo inicial que será inserido"}>
                <CompositionCanvas composition={selected} variant={selectedVariant} brand={brand} withExample={withExample} />
              </div>
            </div>
            <footer className={styles.footer}>
              <p>{withExample ? "Exemplo visual: composições gráficas contêm dados ilustrativos editáveis." : "Esta visualização mostra o conteúdo inicial, que poderá ser substituído."}</p>
              <button type="button" disabled={disabled} className={styles.insert} onClick={() => {
                onAdd(selected.sectionType, selectedVariant.versionId, selected.id);
                closePreview();
              }}><FiCheck aria-hidden="true" /> Adicionar ao site</button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
