import { useMemo, useState, type CSSProperties } from "react";
import {
  FiActivity,
  FiAlignLeft,
  FiArrowDown,
  FiArrowUp,
  FiBox,
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
  FiSearch,
  FiStar,
  FiSun,
  FiTrash2,
  FiType,
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

import styles from "./SectionLibrary.module.css";

type LibraryCategory = "structure" | "sections" | "backgrounds" | "text" | "media" | "actions" | "information" | "layout";

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
  { id: "information", name: "Dados", icon: FiActivity, tone: "cyan" },
  { id: "layout", name: "Organizar", icon: FiGrid, tone: "coral" },
];

const elementItems: Array<{
  type: InstitutionalElementType;
  name: string;
  description: string;
  category: Exclude<LibraryCategory, "structure" | "sections" | "backgrounds">;
  icon: typeof FiType;
}> = [
  { type: "heading", name: "Título", description: "Uma chamada principal ou subtítulo", category: "text", icon: FiType },
  { type: "text", name: "Texto", description: "Um bloco de texto para explicar uma ideia", category: "text", icon: FiAlignLeft },
  { type: "quote", name: "Destaque", description: "Uma frase ou relato importante", category: "text", icon: FiHeart },
  { type: "image", name: "Imagem", description: "Uma foto que se adapta à página", category: "media", icon: FiImage },
  { type: "button", name: "Botão", description: "Uma ação para o visitante", category: "actions", icon: FiLink },
  { type: "icon", name: "Ícone", description: "Um apoio visual curto", category: "actions", icon: FiStar },
  { type: "metric", name: "Número em destaque", description: "Um resultado ou indicador com legenda", category: "information", icon: FiActivity },
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
  collapsed,
  onToggleCollapsed,
  onAddSection,
  onAddElement,
  onSelectSection,
  onSelectElement,
  onMoveSection,
  onToggleSectionVisibility,
  onElementStyleChange,
  onSectionStyleChange,
  onApplySectionStyleToAll,
  onUploadSectionBackground,
}: {
  disabled?: boolean;
  brand?: InstitutionalBrand;
  selectedSection: InstitutionalSection | null;
  variants?: InstitutionalVariant[];
  sections?: InstitutionalSection[];
  selectedSectionId?: string | null;
  selectedElementId?: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAddSection: (sectionType: InstitutionalSectionType, variantVersionId?: string) => void;
  onAddElement: (elementType: InstitutionalElementType) => void;
  onSelectSection?: (sectionId: string) => void;
  onSelectElement?: (sectionId: string, elementId: string) => void;
  onMoveSection?: (sectionId: string, direction: -1 | 1) => void;
  onToggleSectionVisibility?: (sectionId: string) => void;
  onElementStyleChange?: (sectionId: string, elementId: string, style: Partial<InstitutionalElementStyle>) => void;
  onSectionStyleChange?: (sectionId: string, style: Partial<InstitutionalSectionStyle>) => void;
  onApplySectionStyleToAll?: (style: Partial<InstitutionalSectionStyle>) => void;
  onUploadSectionBackground?: (sectionId: string, file: File, applyToAll: boolean) => void;
}) {
  const [category, setCategory] = useState<LibraryCategory>("structure");
  const [backgroundScope, setBackgroundScope] = useState<"section" | "all">("section");
  const [query, setQuery] = useState("");
  const [sectionType, setSectionType] = useState<InstitutionalSectionType>("organization_intro");

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredSections = sectionCatalog.filter((definition) => {
    if (!normalizedQuery) return true;
    return `${definition.name} ${definition.shortDescription}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });
  const filteredElements = elementItems.filter((item) => {
    if (item.category !== category) return false;
    if (!normalizedQuery) return true;
    return `${item.name} ${item.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });
  const selectedDefinition = getSectionDefinition(sectionType);
  const sectionVariants = useMemo(
    () => variants.filter((variant) => variant.sectionType === sectionType && (variant.isSystem || variant.status === "published")),
    [sectionType, variants],
  );

  const selectedSectionStyle = selectedSection ? getSectionStyle(selectedSection.settings) : {};
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
                placeholder={category === "sections" ? "Buscar tipo de seção" : "Buscar peça"}
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
                  const footer = section.sectionType === "site_footer";
                  const layout = ensureLayoutNodeIds(effectiveSectionLayout(section.layout, section.settings));
                  const layers = collectInstitutionalLayers(layout);
                  return (
                    <div key={section.id} className={styles.structureItem} data-selected={selected} data-hidden={!section.visible}>
                      <div className={styles.structureRow}>
                        <button type="button" className={styles.structureMain} onClick={() => onSelectSection?.(section.id)}>
                          <span className={styles.structureNumber}>{index + 1}</span>
                          <span><strong>{label}</strong><small>{section.variantName}</small></span>
                        </button>
                        <div className={styles.structureActions}>
                          {!footer ? (
                            <>
                              <button type="button" aria-label={`Mover ${label} para cima`} disabled={index === 0 || disabled} onClick={() => onMoveSection?.(section.id, -1)}><FiArrowUp /></button>
                              <button type="button" aria-label={`Mover ${label} para baixo`} disabled={index >= sections.length - (sections.at(-1)?.sectionType === "site_footer" ? 2 : 1) || disabled} onClick={() => onMoveSection?.(section.id, 1)}><FiArrowDown /></button>
                            </>
                          ) : null}
                          <button type="button" aria-label={section.visible ? `Ocultar ${label}` : `Mostrar ${label}`} disabled={disabled} onClick={() => onToggleSectionVisibility?.(section.id)}>
                            {section.visible ? <FiEye /> : <FiEyeOff />}
                          </button>
                        </div>
                      </div>

                      {selected ? (
                        <div className={styles.layerList}>
                          <div className={styles.layerHeading}>Elementos</div>
                          {layers.map((layer, layerIndex) => {
                            const itemStyle = layer.node.style ?? {};
                            const active = layer.id === selectedElementId;
                            return (
                              <div
                                className={styles.layerItem}
                                data-active={active}
                                data-hidden={Boolean(itemStyle.hidden)}
                                key={layer.id}
                                style={{ "--layer-depth": Math.min(layer.depth, 3) } as CSSProperties}
                              >
                                <button type="button" className={styles.layerMain} onClick={() => onSelectElement?.(section.id, layer.id)}>
                                  <span>{layerIndex + 1}</span>
                                  <strong>{layerLabel(layer.node)}</strong>
                                </button>
                                <div className={styles.layerActions}>
                                  <button type="button" title="Trazer para frente" aria-label="Trazer para frente" onClick={() => onElementStyleChange?.(section.id, layer.id, { zIndex: Math.min(50, (itemStyle.zIndex ?? 0) + 10) })}><FiArrowUp /></button>
                                  <button type="button" title="Enviar para trás" aria-label="Enviar para trás" onClick={() => onElementStyleChange?.(section.id, layer.id, { zIndex: Math.max(-20, (itemStyle.zIndex ?? 0) - 10) })}><FiArrowDown /></button>
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
                      <button type="button" data-active={backgroundScope === "all"} onClick={() => setBackgroundScope("all")}>Todas as seções</button>
                    </div>
                  </div>

                  <div className={styles.backgroundGroup}>
                    <div className={styles.backgroundGroupTitle}><strong>Cor do fundo</strong><span>As cores da identidade vêm primeiro, mas você pode escolher outra.</span></div>
                    <div className={styles.backgroundColorGrid}>
                      {([
                        ["background", "Fundo"], ["primary", "Principal"], ["secondary", "Secundária"], ["accent", "Destaque"],
                      ] as const).map(([value, label]) => (
                        <button type="button" key={value} data-color={value} data-active={selectedSectionStyle.backgroundColor === value} onClick={() => applyBackgroundStyle({ backgroundColor: value })}>
                          <i /><span>{label}</span>
                        </button>
                      ))}
                      <label className={styles.backgroundCustomColor}>
                        <input type="color" value={selectedSectionStyle.backgroundColor?.startsWith("#") ? selectedSectionStyle.backgroundColor : "#ffffff"} onChange={(event) => applyBackgroundStyle({ backgroundColor: event.target.value as `#${string}` })} />
                        <i>+</i><span>Outra cor</span>
                      </label>
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
              <div className={styles.sectionTypeTabs}>
                {filteredSections.map((definition) => (
                  <button
                    type="button"
                    key={definition.type}
                    data-active={definition.type === sectionType}
                    onClick={() => setSectionType(definition.type)}
                  >
                    <strong>{definition.name}</strong>
                    <span>{definition.shortDescription}</span>
                  </button>
                ))}
              </div>

              <div className={styles.sectionVariantHeader}>
                <div>
                  <strong>{selectedDefinition.name}</strong>
                  <span>{selectedDefinition.purpose}</span>
                </div>
                <small>{sectionVariants.length} estilo(s)</small>
              </div>

              <div className={styles.variantGallery}>
                {sectionVariants.map((variant) => (
                  <button
                    type="button"
                    key={variant.versionId}
                    className={styles.variantCard}
                    onClick={() => onAddSection(sectionType, variant.versionId)}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("application/x-cong-section-type", sectionType);
                      event.dataTransfer.setData("application/x-cong-variant-version", variant.versionId);
                    }}
                  >
                    <LiveSectionThumbnail sectionType={sectionType} variants={variants} preferredVariant={variant} />
                    <span>
                      <strong>{variant.name}</strong>
                      <small>{variant.description || "Um ponto de partida que pode ser personalizado."}</small>
                    </span>
                  </button>
                ))}
              </div>

              {sectionVariants.length === 0 ? (
                <div className={styles.selectionHint}>
                  <FiLayout aria-hidden="true" />
                  <div><strong>Nenhum estilo disponível</strong><span>Escolha outro tipo de seção ou publique uma variação como Designer.</span></div>
                </div>
              ) : null}
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

              <div className={styles.elementList}>
                {filteredElements.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.type}
                      className={styles.elementPiece}
                      data-category={item.category}
                      onClick={() => onAddElement(item.type)}
                      disabled={disabled || !selectedSection}
                      draggable={!disabled && Boolean(selectedSection)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData("application/x-cong-element", item.type);
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
