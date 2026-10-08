import { useState, type CSSProperties } from "react";
import {
  FiActivity,
  FiAlignLeft,
  FiArrowDown,
  FiArrowUp,
  FiBox,
  FiCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiHeart,
  FiImage,
  FiLayers,
  FiLayout,
  FiLink,
  FiLock,
  FiMinus,
  FiMove,
  FiPlus,
  FiSearch,
  FiStar,
  FiSquare,
  FiTriangle,
  FiSun,
  FiTrash2,
  FiType,
  FiZap,
  FiUnlock,
  FiUpload,
} from "react-icons/fi";

import { getSectionDefinition, sectionCatalog } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalBrand,
  InstitutionalElementStyle,
  InstitutionalElementType,
  InstitutionalLayoutNode,
  InstitutionalSection,
  InstitutionalSectionStyle,
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import {
  collectInstitutionalLayers,
  effectiveSectionLayout,
  ensureLayoutNodeIds,
  getSectionStyle,
} from "../../../utils/institutionalLayout";
import LiveSectionThumbnail from "../preview/LiveSectionThumbnail";
import ColorPickerControl from "./ColorPickerControl";

import styles from "./SectionLibrary.module.css";

type LibraryCategory = "structure" | "sections" | "backgrounds" | "text" | "media" | "actions" | "shapes" | "information" | "layout";
type SectionGroup = "all" | "presentation" | "action" | "trust" | "structure";

const sectionGroups: Array<{ id: SectionGroup; name: string }> = [
  { id: "all", name: "Todas" },
  { id: "presentation", name: "Apresentação" },
  { id: "action", name: "Atuação e impacto" },
  { id: "trust", name: "Confiança" },
  { id: "structure", name: "Estrutura" },
];

function sectionGroupFor(type: InstitutionalSectionType): Exclude<SectionGroup, "all"> {
  if (["organization_intro", "organization_about"].includes(type)) return "presentation";
  if (["projects_showcase", "impact_metrics", "support_actions"].includes(type)) return "action";
  if (["transparency", "organization_contact"].includes(type)) return "trust";
  return "structure";
}

const categories: Array<{
  id: LibraryCategory;
  name: string;
  icon: typeof FiLayout;
  tone: string;
}> = [
  { id: "structure", name: "Camadas", icon: FiLayers, tone: "navy" },
  { id: "sections", name: "Seções", icon: FiLayout, tone: "blue" },
  { id: "backgrounds", name: "Fundos", icon: FiSun, tone: "yellow" },
  { id: "text", name: "Texto", icon: FiType, tone: "violet" },
  { id: "media", name: "Mídia", icon: FiImage, tone: "green" },
  { id: "actions", name: "Ações", icon: FiLink, tone: "yellow" },
  { id: "shapes", name: "Formas", icon: FiCircle, tone: "violet" },
  { id: "information", name: "Dados", icon: FiActivity, tone: "cyan" },
  { id: "layout", name: "Organizar", icon: FiGrid, tone: "coral" },
];

const elementItems: Array<{
  type: InstitutionalElementType;
  name: string;
  description: string;
  category: Exclude<LibraryCategory, "structure" | "sections" | "backgrounds">;
  icon: typeof FiType;
  value?: string;
}> = [
  { type: "heading", name: "Título", description: "Uma chamada principal ou subtítulo", category: "text", icon: FiType },
  { type: "text", name: "Texto", description: "Um bloco de texto para explicar uma ideia", category: "text", icon: FiAlignLeft },
  { type: "quote", name: "Destaque", description: "Uma frase ou relato importante", category: "text", icon: FiHeart },
  { type: "image", name: "Imagem", description: "Uma foto que se adapta à página", category: "media", icon: FiImage },
  { type: "button", name: "Botão", description: "Uma ação para o visitante", category: "actions", icon: FiLink },
  { type: "icon", name: "Ícone", description: "SVG puro, sem fundo automático", category: "actions", icon: FiStar },
  { type: "shape", value: "circle", name: "Círculo", description: "Forma geométrica independente", category: "shapes", icon: FiCircle },
  { type: "shape", value: "square", name: "Quadrado", description: "Forma geométrica independente", category: "shapes", icon: FiSquare },
  { type: "shape", value: "rectangle", name: "Retângulo", description: "Forma geométrica independente", category: "shapes", icon: FiBox },
  { type: "shape", value: "triangle", name: "Triângulo", description: "Forma geométrica independente", category: "shapes", icon: FiTriangle },
  { type: "shape", value: "diamond", name: "Losango", description: "Forma geométrica independente", category: "shapes", icon: FiSquare },
  { type: "shape", value: "star", name: "Estrela", description: "Forma geométrica independente", category: "shapes", icon: FiStar },
  { type: "shape", value: "line", name: "Linha", description: "Linha decorativa independente", category: "shapes", icon: FiMinus },
  { type: "metric", name: "Número em destaque", description: "Um número importante com uma explicação curta", category: "information", icon: FiActivity },
  { type: "divider", name: "Linha divisória", description: "Uma separação visual sutil", category: "layout", icon: FiMinus },
  { type: "spacer", name: "Espaço", description: "Mais respiro entre conteúdos", category: "layout", icon: FiBox },
];

function categoryDescription(category: LibraryCategory): string {
  if (category === "structure") return "Veja a ordem das seções e dos elementos. Você pode selecionar, ocultar, travar e reorganizar.";
  if (category === "sections") return "Escolha o tipo de seção e compare composições prontas antes de inserir.";
  if (category === "backgrounds") return "Troque cor, foto e detalhes visuais sem alterar o conteúdo da seção.";
  return "Adicione peças simples. A CONG cuida da adaptação para telas diferentes.";
}

function layerLabel(node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>): string {
  if (node.type === "slot") {
    const names: Record<string, string> = {
      title: "Título",
      description: "Texto",
      image: "Imagem",
      heroImage: "Imagem principal",
      primaryAction: "Botão principal",
      secondaryAction: "Botão secundário",
      action: "Botão",
      eyebrow: "Texto auxiliar",
    };
    return names[node.slot] ?? "Conteúdo";
  }

  const names: Record<InstitutionalElementType, string> = {
    heading: "Título",
    text: "Texto",
    image: "Imagem",
    button: "Botão",
    icon: "Ícone",
    shape: "Forma",
    metric: "Número em destaque",
    quote: "Destaque",
    divider: "Linha divisória",
    spacer: "Espaço",
  };
  return names[node.elementType];
}

export default function SectionLibrary({
  disabled,
  brand,
  selectedSection,
  variants = [],
  sections = [],
  selectedSectionId,
  selectedElementId,
  selectedElementIds = [],
  collapsed,
  onToggleCollapsed,
  onAddSection,
  onAddElement,
  onSelectSection,
  onSelectElement,
  onMoveSection,
  onToggleSectionVisibility,
  onElementStyleChange,
  onReorderLayers,
  onSectionStyleChange,
  onApplySectionStyleToAll,
  onUploadSectionBackground,
  onAutoOrganizeSection,
}: {
  disabled?: boolean;
  brand?: InstitutionalBrand;
  selectedSection: InstitutionalSection | null;
  variants?: InstitutionalVariant[];
  sections?: InstitutionalSection[];
  selectedSectionId?: string | null;
  selectedElementId?: string | null;
  selectedElementIds?: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAddSection: (sectionType: InstitutionalSectionType, variantVersionId?: string) => void;
  onAddElement: (elementType: InstitutionalElementType, initialValue?: string) => void;
  onSelectSection?: (sectionId: string) => void;
  onSelectElement?: (sectionId: string, elementId: string, additive?: boolean) => void;
  onMoveSection?: (sectionId: string, direction: -1 | 1) => void;
  onToggleSectionVisibility?: (sectionId: string) => void;
  onElementStyleChange?: (sectionId: string, elementId: string, style: Partial<InstitutionalElementStyle>) => void;
  onReorderLayers?: (sectionId: string, orderedElementIds: string[]) => void;
  onSectionStyleChange?: (sectionId: string, style: Partial<InstitutionalSectionStyle>) => void;
  onApplySectionStyleToAll?: (style: Partial<InstitutionalSectionStyle>) => void;
  onUploadSectionBackground?: (sectionId: string, file: File, applyToAll: boolean) => void;
  onAutoOrganizeSection?: (sectionId: string) => void;
}) {
  const [category, setCategory] = useState<LibraryCategory>("structure");
  const [sectionGroup, setSectionGroup] = useState<SectionGroup>("all");
  const [backgroundScope, setBackgroundScope] = useState<"section" | "all">("section");
  const [query, setQuery] = useState("");
  const [sectionType, setSectionType] = useState<InstitutionalSectionType>("organization_intro");
  const [draggedLayer, setDraggedLayer] = useState<{ sectionId: string; layerId: string } | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredSections = sectionCatalog.filter((definition) => {
    if (sectionGroup !== "all" && sectionGroupFor(definition.type) !== sectionGroup) return false;
    if (!normalizedQuery) return true;
    const variantTerms = variants
      .filter((variant) => variant.sectionType === definition.type && (variant.isSystem || variant.status === "published"))
      .map((variant) => `${variant.name} ${variant.description}`)
      .join(" ");
    return `${definition.name} ${definition.shortDescription} ${definition.purpose} ${variantTerms}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedQuery);
  });
  const filteredElements = elementItems.filter((item) => {
    if (item.category !== category) return false;
    if (!normalizedQuery) return true;
    return `${item.name} ${item.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });
  const activeSectionType = filteredSections.some((definition) => definition.type === sectionType)
    ? sectionType
    : filteredSections[0]?.type ?? sectionType;
  const selectedDefinition = getSectionDefinition(activeSectionType);
  const sectionVariants = variants.filter(
    (variant) => variant.sectionType === activeSectionType && (variant.isSystem || variant.status === "published"),
  );

  const selectedSectionStyle = selectedSection ? getSectionStyle(selectedSection.settings) : {};
  const firstMovableIndex = sections.findIndex(
    (section) => !["site_header", "site_footer"].includes(section.sectionType),
  );
  const lastMovableIndex = sections.reduce(
    (last, section, index) =>
      !["site_header", "site_footer"].includes(section.sectionType) ? index : last,
    -1,
  );
  const applyBackgroundStyle = (style: Partial<InstitutionalSectionStyle>) => {
    if (!selectedSection) return;
    if (backgroundScope === "all") onApplySectionStyleToAll?.(style);
    else onSectionStyleChange?.(selectedSection.id, style);
  };

  return (
    <aside
      className={styles.panel}
      data-collapsed={collapsed}
      data-category={category}
      aria-label="Biblioteca do construtor"
      style={{
        "--org-primary": brand?.primaryColor,
        "--org-secondary": brand?.secondaryColor,
        "--org-accent": brand?.accentColor,
        "--org-background": brand?.backgroundColor,
      } as CSSProperties}
    >
      <nav className={styles.categoryRail} aria-label="Categorias da biblioteca">
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Abrir biblioteca" : "Recolher biblioteca"}
          title={collapsed ? "Abrir biblioteca" : "Recolher biblioteca"}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>

        {categories.map((item) => {
          const Icon = item.icon;
          const active = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={styles.categoryButton}
              data-active={active}
              data-tone={item.tone}
              onClick={() => {
                setCategory(item.id);
                setQuery("");
                if (collapsed) onToggleCollapsed();
              }}
              title={item.name}
              aria-label={item.name}
            >
              <span><Icon aria-hidden="true" /></span>
              <small>{item.name}</small>
            </button>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className={styles.libraryBody}>
          <div className={styles.libraryHeader}>
            <div>
              <strong>{categories.find((item) => item.id === category)?.name}</strong>
              <span>{categoryDescription(category)}</span>
            </div>
          </div>

          {category !== "structure" && category !== "backgrounds" ? (
            <label className={styles.search}>
              <FiSearch aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={category === "sections" ? "Buscar seção ou estilo" : "Buscar peça"}
              />
            </label>
          ) : null}

          {category === "structure" ? (
            <div className={styles.scrollContent}>
              <div className={styles.structureIntro}>
                <strong>Página inicial</strong>
                <span>Selecione uma seção para ver suas camadas.</span>
              </div>
              <div className={styles.structureList}>
                {sections.map((section, index) => {
                  const label = getSectionDefinition(section.sectionType).name;
                  const selected = section.id === selectedSectionId;
                  const header = section.sectionType === "site_header";
                  const footer = section.sectionType === "site_footer";
                  const fixed = header || footer;
                  const layout = ensureLayoutNodeIds(effectiveSectionLayout(section.layout, section.settings));
                  const layers = collectInstitutionalLayers(layout);
                  const visualLayers = [...layers].sort((a, b) => {
                    const zA = a.node.style?.zIndex ?? 0;
                    const zB = b.node.style?.zIndex ?? 0;
                    if (zA !== zB) return zB - zA;
                    return layers.findIndex((item) => item.id === b.id) - layers.findIndex((item) => item.id === a.id);
                  });
                  return (
                    <div key={section.id} className={styles.structureItem} data-selected={selected} data-hidden={!section.visible}>
                      <div className={styles.structureRow}>
                        <button type="button" className={styles.structureMain} onClick={() => onSelectSection?.(section.id)}>
                          <span className={styles.structureNumber}>{index + 1}</span>
                          <span><strong>{label}</strong><small>{section.variantName}</small></span>
                        </button>
                        <div className={styles.structureActions}>
                          {!fixed ? (
                            <>
                              <button type="button" aria-label={`Mover ${label} para cima`} disabled={index <= firstMovableIndex || disabled} onClick={() => onMoveSection?.(section.id, -1)}><FiArrowUp /></button>
                              <button type="button" aria-label={`Mover ${label} para baixo`} disabled={index >= lastMovableIndex || disabled} onClick={() => onMoveSection?.(section.id, 1)}><FiArrowDown /></button>
                            </>
                          ) : null}
                          {!header ? (
                            <button type="button" aria-label={section.visible ? `Ocultar ${label}` : `Mostrar ${label}`} disabled={disabled} onClick={() => onToggleSectionVisibility?.(section.id)}>
                              {section.visible ? <FiEye /> : <FiEyeOff />}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {selected ? (
                        <div className={styles.layerList}>
                          <div className={styles.layerHeading}>Elementos</div>
                          {visualLayers.map((layer, layerIndex) => {
                            const itemStyle = layer.node.style ?? {};
                            const active = selectedElementIds.includes(layer.id) || layer.id === selectedElementId;
                            return (
                              <div
                                className={styles.layerItem}
                                data-active={active}
                                data-hidden={Boolean(itemStyle.hidden)}
                                data-locked={Boolean(itemStyle.locked)}
                                data-dragging={draggedLayer?.layerId === layer.id}
                                data-grouped={Boolean(itemStyle.groupId)}
                                key={layer.id}
                                draggable={!disabled}
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("application/x-cong-layer", layer.id);
                                  setDraggedLayer({ sectionId: section.id, layerId: layer.id });
                                }}
                                onDragEnd={() => setDraggedLayer(null)}
                                onDragOver={(event) => {
                                  if (draggedLayer?.sectionId === section.id) event.preventDefault();
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (!draggedLayer || draggedLayer.sectionId !== section.id || draggedLayer.layerId === layer.id) return;
                                  const ordered = visualLayers.map((item) => item.id);
                                  const from = ordered.indexOf(draggedLayer.layerId);
                                  const to = ordered.indexOf(layer.id);
                                  if (from < 0 || to < 0) return;
                                  const [moved] = ordered.splice(from, 1);
                                  ordered.splice(to, 0, moved);
                                  onReorderLayers?.(section.id, ordered);
                                  setDraggedLayer(null);
                                }}
                                style={{ "--layer-depth": Math.min(layer.depth, 3) } as CSSProperties}
                              >
                                <span className={styles.layerDragHandle} title="Arraste para mudar a ordem" aria-hidden="true"><FiMove /></span>
                                <button type="button" className={styles.layerMain} onClick={(event) => onSelectElement?.(section.id, layer.id, event.shiftKey || event.ctrlKey || event.metaKey)}>
                                  <span>{layerIndex + 1}</span>
                                  <strong>{layerLabel(layer.node)}</strong>
                                  {itemStyle.groupId ? <em className={styles.layerGroupBadge}>{itemStyle.groupKind === "native" ? "Grupo do design" : "Grupo"}</em> : null}
                                  {itemStyle.hidden ? <small>Oculto</small> : itemStyle.locked ? <small>Travado</small> : null}
                                </button>
                                <div className={styles.layerActions}>
                                  <button type="button" title="Trazer para frente" aria-label="Trazer para frente" onClick={() => onElementStyleChange?.(section.id, layer.id, { zIndex: 50 })}><FiArrowUp /></button>
                                  <button type="button" title="Enviar para trás" aria-label="Enviar para trás" onClick={() => onElementStyleChange?.(section.id, layer.id, { zIndex: -20 })}><FiArrowDown /></button>
                                  <button
                                    type="button"
                                    title={itemStyle.hidden ? "Mostrar" : "Ocultar"}
                                    aria-label={itemStyle.hidden ? "Mostrar elemento" : "Ocultar elemento"}
                                    onClick={() => onElementStyleChange?.(section.id, layer.id, { hidden: !itemStyle.hidden })}
                                  >
                                    {itemStyle.hidden ? <FiEyeOff /> : <FiEye />}
                                  </button>
                                  <button
                                    type="button"
                                    title={itemStyle.locked ? "Destravar" : "Travar"}
                                    aria-label={itemStyle.locked ? "Destravar elemento" : "Travar elemento"}
                                    onClick={() => onElementStyleChange?.(section.id, layer.id, { locked: !itemStyle.locked })}
                                  >
                                    {itemStyle.locked ? <FiLock /> : <FiUnlock />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <button type="button" className={styles.addSectionShortcut} onClick={() => setCategory("sections")}><FiLayout /> Adicionar uma seção</button>
            </div>
          ) : null}

          {category === "backgrounds" ? (
            <div className={styles.scrollContent}>
              {!selectedSection ? (
                <div className={styles.selectionHint}>
                  <FiSun aria-hidden="true" />
                  <div><strong>Selecione uma seção</strong><span>Depois escolha como o fundo deve aparecer.</span></div>
                </div>
              ) : (
                <div className={styles.backgroundPanel}>
                  <div className={styles.backgroundScope}>
                    <span>Aplicar em</span>
                    <div>
                      <button type="button" data-active={backgroundScope === "section"} onClick={() => setBackgroundScope("section")}>Esta seção</button>
                      <button type="button" data-active={backgroundScope === "all"} onClick={() => setBackgroundScope("all")}>Toda a página</button>
                    </div>
                  </div>

                  <div className={styles.backgroundGroup}>
                    <div className={styles.backgroundGroupTitle}><strong>Cor do fundo</strong><span>As cores da identidade vêm primeiro, mas você pode escolher outra.</span></div>
                    <div className={styles.backgroundColorGrid}>
                      {([
                        ["background", "Fundo", brand?.backgroundColor],
                        ["primary", "Principal", brand?.primaryColor],
                        ["secondary", "Secundária", brand?.secondaryColor],
                        ["accent", "Destaque", brand?.accentColor],
                      ] as const).map(([value, label, hex]) => (
                        <button type="button" key={value} data-color={value} data-active={selectedSectionStyle.backgroundColor === value} onClick={() => applyBackgroundStyle({ backgroundColor: value })}>
                          <i style={hex ? { background: hex } : undefined} /><span>{label}</span>
                        </button>
                      ))}
                      {["#ffffff", "#f4f6fa", "#091c30", "#1366c4", "#6f35c5", "#f6c445"].map((hex) => (
                        <button type="button" key={hex} className={styles.backgroundHexSwatch} data-active={selectedSectionStyle.backgroundColor === hex} onClick={() => applyBackgroundStyle({ backgroundColor: hex as `#${string}` })}>
                          <i style={{ background: hex }} /><span>{hex.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                    <div className={styles.backgroundCustomColor}>
                      <span>Outra cor</span>
                      <ColorPickerControl
                        value={
                          selectedSectionStyle.backgroundColor?.startsWith("#")
                            ? selectedSectionStyle.backgroundColor
                            : selectedSectionStyle.backgroundColor === "primary"
                              ? brand?.primaryColor ?? "#1366C4"
                              : selectedSectionStyle.backgroundColor === "secondary"
                                ? brand?.secondaryColor ?? "#04523C"
                                : selectedSectionStyle.backgroundColor === "accent"
                                  ? brand?.accentColor ?? "#F7B534"
                                  : brand?.backgroundColor ?? "#FFFFFF"
                        }
                        onChange={(hex) => applyBackgroundStyle({ backgroundColor: hex })}
                        label="Cor do fundo"
                      />
                    </div>
                  </div>

                  <div className={styles.backgroundGroup}>
                    <div className={styles.backgroundGroupTitle}><strong>Detalhes do fundo</strong><span>Troque ou remova brilhos, manchas e formas decorativas do modelo.</span></div>
                    <div className={styles.backgroundDecorGrid}>
                      {([
                        ["template", "Do modelo"], ["none", "Limpo"], ["soft-glow", "Luzes suaves"],
                        ["corner-glow", "Luz no canto"], ["rings", "Círculos"], ["wash", "Mancha suave"],
                      ] as const).map(([value, label]) => (
                        <button type="button" key={value} data-active={(selectedSectionStyle.backgroundDecor ?? "template") === value} onClick={() => applyBackgroundStyle({ backgroundDecor: value })}>
                          <span className={styles.backgroundDecorPreview} data-decor={value}><i /></span>
                          <strong>{label}</strong>
                        </button>
                      ))}
                    </div>
                    {(selectedSectionStyle.backgroundDecor ?? "template") !== "none" ? (
                      <div className={styles.backgroundToneRow}>
                        <span>Cor dos detalhes</span>
                        <div>
                          {(["primary", "secondary", "accent", "mixed"] as const).map((tone) => (
                            <button type="button" key={tone} data-tone={tone} data-active={(selectedSectionStyle.backgroundDecorTone ?? "mixed") === tone} onClick={() => applyBackgroundStyle({ backgroundDecorTone: tone })} aria-label={tone === "primary" ? "Cor principal" : tone === "secondary" ? "Cor secundária" : tone === "accent" ? "Cor de destaque" : "Misturar cores"} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(selectedSectionStyle.backgroundDecor ?? "template") !== "none" && (selectedSectionStyle.backgroundDecor ?? "template") !== "template" ? (
                      <div className={styles.backgroundAdjustments}>
                        <label><span>Intensidade</span><input type="range" min="0" max="100" step="5" value={selectedSectionStyle.backgroundDecorIntensity ?? 55} onChange={(event) => applyBackgroundStyle({ backgroundDecorIntensity: Number(event.target.value) })} /><strong>{selectedSectionStyle.backgroundDecorIntensity ?? 55}%</strong></label>
                        {(selectedSectionStyle.backgroundDecor ?? "template") === "rings" ? <label><span>Tamanho</span><input type="range" min="60" max="160" step="5" value={selectedSectionStyle.backgroundDecorScale ?? 100} onChange={(event) => applyBackgroundStyle({ backgroundDecorScale: Number(event.target.value) })} /><strong>{selectedSectionStyle.backgroundDecorScale ?? 100}%</strong></label> : null}
                      </div>
                    ) : (selectedSectionStyle.backgroundDecor ?? "template") === "template" ? <p className={styles.backgroundControlHint}>Escolha um estilo acima para ajustar intensidade e aparência.</p> : null}
                  </div>

                  {onUploadSectionBackground ? (
                  <div className={styles.backgroundGroup}>
                    <div className={styles.backgroundGroupTitle}><strong>Foto de fundo</strong><span>Use uma foto e deixe a CONG aplicar um tratamento para manter o texto legível.</span></div>
                    {selectedSectionStyle.backgroundImage?.url ? (
                      <div className={styles.backgroundImagePreview}>
                        <img src={selectedSectionStyle.backgroundImage.url} alt="" />
                        <div>
                          <label><FiUpload /> Trocar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && selectedSection) onUploadSectionBackground?.(selectedSection.id, file, backgroundScope === "all"); event.currentTarget.value = ""; }} /></label>
                          <button type="button" onClick={() => applyBackgroundStyle({ backgroundImage: null, backgroundTreatment: "original" })}><FiTrash2 /> Remover</button>
                        </div>
                      </div>
                    ) : (
                      <label className={styles.backgroundUpload}>
                        <FiUpload /><strong>Escolher foto</strong><span>JPG, PNG ou WebP</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && selectedSection) onUploadSectionBackground?.(selectedSection.id, file, backgroundScope === "all"); event.currentTarget.value = ""; }} />
                      </label>
                    )}

                    {selectedSectionStyle.backgroundImage?.url ? (
                      <>
                        <div className={styles.backgroundTreatmentGrid}>
                          {([
                            ["original", "Original"], ["soft", "Suave"], ["dark", "Texto claro"], ["light", "Texto escuro"], ["brand", "Cor da marca"], ["gradient", "Destaque lateral"],
                          ] as const).map(([value, label]) => (
                            <button type="button" key={value} data-active={(selectedSectionStyle.backgroundTreatment ?? "original") === value} onClick={() => applyBackgroundStyle({ backgroundTreatment: value })}><i data-treatment={value} /><span>{label}</span></button>
                          ))}
                        </div>
                        <div className={styles.backgroundFocus}>
                          <span>Ponto principal da foto</span>
                          <div>
                            {[25, 50, 75].flatMap((y) => [25, 50, 75].map((x) => (
                              <button type="button" key={`${x}-${y}`} data-active={Math.abs((selectedSectionStyle.backgroundPositionX ?? 50) - x) < 3 && Math.abs((selectedSectionStyle.backgroundPositionY ?? 50) - y) < 3} onClick={() => applyBackgroundStyle({ backgroundPositionX: x, backgroundPositionY: y })} aria-label={`Foco ${x}-${y}`}><i /></button>
                            )))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {category === "sections" ? (
            <div className={styles.scrollContent}>
              <div className={styles.sectionDiscovery}>
                <div className={styles.sectionDiscoveryHeading}>
                  <strong>Adicionar uma seção</strong>
                  <span>Escolha primeiro o que ela comunica. Depois compare os designs disponíveis.</span>
                </div>

                <div className={styles.sectionFilterFields}>
                  <label>
                    <span>Categoria</span>
                    <select
                      value={sectionGroup}
                      onChange={(event) => setSectionGroup(event.target.value as SectionGroup)}
                    >
                      {sectionGroups.map((group) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Tipo de seção</span>
                    <select
                      value={activeSectionType}
                      onChange={(event) => setSectionType(event.target.value as InstitutionalSectionType)}
                      disabled={filteredSections.length === 0}
                    >
                      {filteredSections.map((definition) => {
                        const count = variants.filter((variant) =>
                          variant.sectionType === definition.type && (variant.isSystem || variant.status === "published"),
                        ).length;
                        return (
                          <option key={definition.type} value={definition.type}>
                            {definition.name} · {count} {count === 1 ? "design" : "designs"}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                {(query || sectionGroup !== "all") ? (
                  <button
                    type="button"
                    className={styles.clearSectionFilters}
                    onClick={() => { setQuery(""); setSectionGroup("all"); }}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>

              {filteredSections.length > 0 ? (
                <>
                  <div className={styles.sectionVariantHeader}>
                    <div>
                      <strong>{selectedDefinition.name}</strong>
                      <span>{selectedDefinition.purpose}</span>
                    </div>
                    <small>{sectionVariants.length} {sectionVariants.length === 1 ? "design" : "designs"}</small>
                  </div>

                  <div className={styles.variantGallery}>
                    {sectionVariants.map((variant) => (
                      <article
                        key={variant.versionId}
                        className={styles.variantCard}
                        draggable={!disabled}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "copy";
                          event.dataTransfer.setData("application/x-cong-section-type", activeSectionType);
                          event.dataTransfer.setData("application/x-cong-variant-version", variant.versionId);
                        }}
                      >
                        <button
                          type="button"
                          className={styles.variantPreviewButton}
                          onClick={() => onAddSection(activeSectionType, variant.versionId)}
                          disabled={disabled}
                          aria-label={`Adicionar ${variant.name}`}
                        >
                          <LiveSectionThumbnail sectionType={activeSectionType} variants={variants} preferredVariant={variant} size="large" />
                        </button>
                        <div className={styles.variantMeta}>
                          <div>
                            <strong>{variant.name}</strong>
                            <small>{variant.description || "Um ponto de partida que pode ser personalizado."}</small>
                            {variant.isSystem ? <em>Design CONG</em> : null}
                          </div>
                          <button
                            type="button"
                            className={styles.variantAddButton}
                            onClick={() => onAddSection(activeSectionType, variant.versionId)}
                            disabled={disabled}
                          >
                            <FiPlus aria-hidden="true" /> Adicionar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {sectionVariants.length === 0 ? (
                    <div className={styles.selectionHint}>
                      <FiLayout aria-hidden="true" />
                      <div><strong>Nenhum design disponível</strong><span>Escolha outro tipo de seção ou publique uma variação como Designer.</span></div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.sectionEmptyState}>
                  <FiSearch aria-hidden="true" />
                  <strong>Nenhuma seção encontrada</strong>
                  <span>Limpe a busca ou escolha outro filtro.</span>
                  <button type="button" onClick={() => { setQuery(""); setSectionGroup("all"); }}>Mostrar todas</button>
                </div>
              )}
            </div>
          ) : null}

          {category !== "sections" && category !== "structure" && category !== "backgrounds" ? (
            <div className={styles.scrollContent}>
              {!selectedSection ? (
                <div className={styles.selectionHint}>
                  <FiLayout aria-hidden="true" />
                  <div><strong>Escolha onde colocar</strong><span>Clique numa seção do site. Depois adicione a peça.</span></div>
                </div>
              ) : null}

              {category === "layout" && selectedSection ? (
                <div className={styles.autoOrganizeCard}>
                  <span><FiZap aria-hidden="true" /></span>
                  <div>
                    <strong>Auto-organizar esta seção</strong>
                    <small>Recoloca elementos no fluxo responsivo mais provável, removendo deslocamentos manuais sem apagar conteúdo nem tamanhos.</small>
                  </div>
                  <button type="button" onClick={() => onAutoOrganizeSection?.(selectedSection.id)} disabled={disabled || !onAutoOrganizeSection}>Organizar</button>
                </div>
              ) : null}

              <div className={styles.elementList}>
                {filteredElements.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={`${item.type}-${item.value ?? item.name}`}
                      className={styles.elementPiece}
                      data-category={item.category}
                      onClick={() => onAddElement(item.type, item.value)}
                      disabled={disabled || !selectedSection}
                      draggable={!disabled && Boolean(selectedSection)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData("application/x-cong-element", item.type);
                        if (item.value) event.dataTransfer.setData("application/x-cong-element-value", item.value);
                      }}
                      title={item.description}
                    >
                      <span className={styles.elementIcon}><Icon aria-hidden="true" /></span>
                      <strong>{item.name}</strong>
                      <i className={styles.dragDots} aria-hidden="true">⋮⋮</i>
                    </button>
                  );
                })}
              </div>

              <div className={styles.bottomTip}>
                <strong>Você continua no controle</strong>
                <span>Use o mouse para ajustar posição e tamanho. A CONG avisa quando algo pode sair da área segura.</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
