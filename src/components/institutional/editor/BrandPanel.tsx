import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  FiCheckCircle,
  FiImage,
  FiInfo,
  FiX,
  FiType,
  FiDroplet,
  FiSliders,
} from "react-icons/fi";

import type {
  InstitutionalBrand,
  InstitutionalDesignPalette,
  InstitutionalDesignSystem,
  InstitutionalLogoVariant,
  InstitutionalMediaAsset,
} from "../../../services/institutionalService";
import { deriveColorTone } from "../../../utils/institutionalColors";
import {
  analyzeBrandContrast,
  analyzeBrandHarmony,
  buildBrandPaletteSuggestion,
} from "../../../utils/institutionalPalette";

import ColorPickerControl from "./ColorPickerControl";
import {
  DEFAULT_DESIGN_SYSTEM,
  TYPE_ROLES,
  typeRoleStyle,
  designSystemCssVariables,
  resolveDesignSystem,
} from "../../../features/site-builder/design-system/designTokens";
import styles from "./BrandPanel.module.css";
import FontFamilyPicker from "./FontFamilyPicker";
import BrandLogoLibrary from "./BrandLogoLibrary";
import { ensureFontsLoaded } from "../../../features/site-builder/design-system/fontCatalog";

type BrandDraft = Omit<
  InstitutionalBrand,
  "organizationId" | "publicSlug" | "logoAsset" | "logoVariantAssets"
>;

type BrandTab = "logos" | "colors" | "typography" | "styles";
const tabs = [
  { id: "logos", label: "Logos", icon: FiImage },
  { id: "colors", label: "Cores", icon: FiDroplet },
  { id: "typography", label: "Tipografia", icon: FiType },
  { id: "styles", label: "Estilos", icon: FiSliders },
] as const;

export default function BrandPanel({
  brand,
  saving,
  suggestedPalette,
  communityPalettes = [],
  onClose,
  onSave,
  onUploadLogo,
  onSuggestLogoPalette,
}: {
  brand: InstitutionalBrand;
  saving: boolean;
  suggestedPalette: string[];
  communityPalettes?: InstitutionalDesignPalette[];
  onClose: () => void;
  onSave: (brand: BrandDraft) => void;
  onUploadLogo: (
    file: File,
    primary: boolean,
  ) => Promise<InstitutionalMediaAsset>;
  onSuggestLogoPalette?: (slot: "primary" | InstitutionalLogoVariant, pending?: InstitutionalMediaAsset) => Promise<string[]>;
}) {
  const [activeTab, setActiveTab] = useState<BrandTab>("logos");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [paletteLogo, setPaletteLogo] = useState<"primary" | InstitutionalLogoVariant>("primary");
  const [paletteError, setPaletteError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [sitePaletteColors, setSitePaletteColors] = useState<string[]>([]);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const [uploadedLogos, setUploadedLogos] = useState<
    Partial<
      Record<"primary" | InstitutionalLogoVariant, InstitutionalMediaAsset>
    >
  >({});
  const [draft, setDraft] = useState<BrandDraft>({
    logoAssetId: brand.logoAssetId,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
    headingFont: brand.headingFont,
    bodyFont: brand.bodyFont,
    designSystem: resolveDesignSystem(brand),
  });

  async function uploadLogoSlot(
    slot: "primary" | InstitutionalLogoVariant,
    file: File,
  ): Promise<void> {
    setUploadsInProgress((count) => count + 1);
    try {
      const asset = await onUploadLogo(file, slot === "primary");
      if (slot === paletteLogo) setPaletteError("Use o botão de extrair cores para analisar esta logo.");
      setUploadedLogos((current) => ({ ...current, [slot]: asset }));
      changeLogoSlot(slot, asset.id);
    } finally {
      setUploadsInProgress((count) => Math.max(count - 1, 0));
    }
  }

  function changeLogoSlot(
    slot: "primary" | InstitutionalLogoVariant,
    assetId: string | null,
  ): void {
    setDraft((current) => {
      if (slot === "primary") return { ...current, logoAssetId: assetId };
      const config = resolveDesignSystem(current);
      return {
        ...current,
        designSystem: {
          ...config,
          logos: { ...config.logos, [slot]: assetId },
        },
      };
    });
  }

  const design = resolveDesignSystem(draft);
  useEffect(() => {
    ensureFontsLoaded([
      design.headingFamily,
      design.bodyFamily,
      ...Object.values(design.textStyles ?? {}).flatMap((item) =>
        item ? [item.family] : [],
      ),
    ]);
  }, [design.headingFamily, design.bodyFamily, design.textStyles]);
  const sampleStyle = {
    ...designSystemCssVariables({ ...draft, designSystem: design }, (font) =>
      font === "brand"
        ? "var(--font-brand)"
        : font === "system"
          ? "var(--font-system)"
          : "var(--font-interface)",
    ),
    "--org-primary": draft.primaryColor,
    "--org-accent": draft.accentColor,
    "--org-text": draft.textColor,
    "--org-background": draft.backgroundColor,
  } as CSSProperties;

  function setDesign<K extends keyof InstitutionalDesignSystem>(
    key: K,
    value: InstitutionalDesignSystem[K],
  ): void {
    setDraft((current) => ({
      ...current,
      designSystem: { ...resolveDesignSystem(current), [key]: value },
    }));
  }

  function updateTypeStyle(
    role: (typeof TYPE_ROLES)[number]["key"],
    patch: Partial<{
      family: string;
      size: number;
      weight: 400 | 500 | 600 | 700 | 800;
    }>,
  ): void {
    setDraft((current) => {
      const base = resolveDesignSystem(current);
      const previous = typeRoleStyle(current, role);
      return {
        ...current,
        designSystem: {
          ...base,
          textStyles: { ...base.textStyles, [role]: { ...previous, ...patch } },
        },
      };
    });
  }

  const paletteSuggestion = useMemo(
    () =>
      (sitePaletteColors.length > 0 || suggestedPalette.length > 0)
        ? buildBrandPaletteSuggestion(sitePaletteColors.length > 0 ? sitePaletteColors : suggestedPalette)
        : null,
    [suggestedPalette, sitePaletteColors],
  );

  const contrastChecks = useMemo(
    () =>
      analyzeBrandContrast({
        primaryColor: draft.primaryColor,
        accentColor: draft.accentColor,
        backgroundColor: draft.backgroundColor,
        textColor: draft.textColor,
      }),
    [
      draft.accentColor,
      draft.backgroundColor,
      draft.primaryColor,
      draft.textColor,
    ],
  );

  const harmonyCheck = useMemo(
    () =>
      analyzeBrandHarmony({
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        accentColor: draft.accentColor,
      }),
    [draft.accentColor, draft.primaryColor, draft.secondaryColor],
  );

  function applyPaletteAndKeepDraft(colors: string[]): void {
    const palette = buildBrandPaletteSuggestion(colors);
    setDraft((current) => ({
      ...current,
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
      accentColor: palette.accentColor,
      backgroundColor: palette.backgroundColor,
      textColor: palette.textColor,
    }));
  }

  function setColor(
    key:
      | "primaryColor"
      | "secondaryColor"
      | "accentColor"
      | "backgroundColor"
      | "textColor",
    value: string,
  ): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={`${styles.panel} ${styles.brandDialog}`}
        role="dialog"
        aria-modal="true"
        aria-label="Identidade visual exclusiva deste site"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <strong>Identidade deste site</strong>
            <span>
              Ajuste logos, cores e fontes deste site sem alterar a identidade principal da ONG nem outros sites.
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </header>

        <div className={styles.brandWorkspace}>
          <nav
            className={styles.brandNav}
            aria-label="Seções da identidade visual"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                data-active={activeTab === id}
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => setActiveTab(id)}
              >
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>
          <div className={styles.body}>
            {activeTab === "logos" ? (
              <>
              <BrandLogoLibrary
                brand={brand}
                primaryId={draft.logoAssetId}
                variantIds={design.logos ?? {}}
                uploaded={uploadedLogos}
                onChange={changeLogoSlot}
                onUpload={uploadLogoSlot}
                disabled={saving || uploadsInProgress > 0}
              />
              <div className={styles.siteLogoUsage}>
                {([ ["headerLogoVariant", "Logo do cabeçalho"], ["footerLogoVariant", "Logo do rodapé"] ] as const).map(([key, title]) =>
                  <label key={key}><span>{title}</span><select value={design[key] ?? "primary"} onChange={(event) => setDesign(key, event.target.value as "primary" | InstitutionalLogoVariant)}>
                    <option value="primary">Principal</option><option value="compact">Reduzida</option><option value="light">Clara</option><option value="dark">Escura</option>
                  </select></label>
                )}
                <small>Você pode escolher uma versão diferente para cada posição. Se uma versão não estiver cadastrada, será utilizada a principal.</small>
              </div>
              </>
            ) : null}

            {activeTab === "colors" && onSuggestLogoPalette ? <div className={styles.siteLogoUsage}>
              <label><span>Gerar paleta a partir de qual logo?</span>
                <select value={paletteLogo} onChange={(event) => { setPaletteLogo(event.target.value as "primary" | InstitutionalLogoVariant); setPaletteError(""); }}>
                  <option value="primary">Principal</option><option value="compact">Reduzida</option>
                  <option value="light">Clara</option><option value="dark">Escura</option>
                </select></label>
              <button type="button" disabled={extracting || saving} onClick={async () => {
                setExtracting(true); setPaletteError("");
                try {
                  const colors = await onSuggestLogoPalette(paletteLogo, uploadedLogos[paletteLogo]);
                  if (!colors.length) setPaletteError("Não foi possível extrair cores desta logo. Tente uma imagem enviada neste site.");
                  else setSitePaletteColors(colors);
                } catch { setPaletteError("Não foi possível ler a imagem selecionada. Verifique a permissão da mídia."); }
                finally { setExtracting(false); }
              }}>{extracting ? "Analisando..." : "Extrair cores dessa logo"}</button>
              {paletteError ? <small role="status">{paletteError}</small> : null}
              <small>A extração apenas sugere cores. Sua paleta muda somente após clicar em Aplicar e depois Salvar.</small>
            </div> : null}
            {activeTab === "colors" && paletteSuggestion ? (
              <div className={styles.paletteSuggestion}>
                <strong>Paleta sugerida a partir da logo</strong>
                <div className={styles.swatches} aria-label="Cores sugeridas">
                  {[
                    paletteSuggestion.primaryColor,
                    paletteSuggestion.secondaryColor,
                    paletteSuggestion.accentColor,
                    paletteSuggestion.backgroundColor,
                    paletteSuggestion.textColor,
                  ].map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => applyPaletteAndKeepDraft(sitePaletteColors.length ? sitePaletteColors : suggestedPalette)}
                  disabled={saving}
                >
                  Aplicar cores sugeridas
                </button>
              </div>
            ) : null}

            {activeTab === "colors" && communityPalettes.length > 0 ? (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>
                  <strong>Paletas criadas por Designers</strong>
                  <span>
                    Use como ponto de partida. Você pode trocar qualquer cor
                    depois.
                  </span>
                </div>
                <div className={styles.designerPaletteGrid}>
                  {communityPalettes
                    .filter((palette) => palette.status === "published")
                    .slice(0, 12)
                    .map((palette) => (
                      <button
                        type="button"
                        key={palette.id}
                        className={styles.designerPaletteCard}
                        onClick={() => applyPaletteAndKeepDraft(palette.colors)}
                        disabled={saving}
                      >
                        <span className={styles.designerPaletteSwatches}>
                          {palette.colors.slice(0, 6).map((color) => (
                            <i key={color} style={{ background: color }} />
                          ))}
                        </span>
                        <span>
                          <strong>{palette.name}</strong>
                          <small>
                            {palette.description || "Paleta compartilhada"}
                          </small>
                        </span>
                      </button>
                    ))}
                </div>
              </section>
            ) : null}

            {activeTab === "colors" ? (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>
                  <strong>Cores</strong>
                  <span>
                    Estas são as cores recomendadas da identidade. Você ainda
                    pode escolher outras cores em cada elemento.
                  </span>
                </div>

                <div className={styles.colorGrid}>
                  {(
                    [
                      ["primaryColor", "Principal"],
                      ["secondaryColor", "Complementar"],
                      ["accentColor", "Destaque"],
                      ["backgroundColor", "Fundo"],
                      ["textColor", "Texto"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className={styles.colorField} key={key}>
                      <span>{label}</span>
                      <ColorPickerControl
                        value={
                          /^#[0-9a-f]{6}$/i.test(draft[key])
                            ? draft[key]
                            : "#000000"
                        }
                        onChange={(hex) => setColor(key, hex)}
                        label={`Cor ${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>

                <div className={styles.generatedTones}>
                  <div>
                    <strong>Variações automáticas</strong>
                    <span>
                      Os templates guardam a relação com a cor da ONG, não um
                      HEX fixo. Assim, “Principal · Profunda” acompanha qualquer
                      nova cor principal.
                    </span>
                  </div>
                  <div className={styles.generatedToneGrid}>
                    {(
                      [
                        ["primaryColor", "Principal"],
                        ["secondaryColor", "Complementar"],
                        ["accentColor", "Destaque"],
                        ["backgroundColor", "Fundo"],
                        ["textColor", "Texto"],
                      ] as const
                    ).map(([key, label]) => (
                      <div className={styles.generatedToneRow} key={key}>
                        <span>{label}</span>
                        <div>
                          {(
                            ["soft", "light", "base", "strong", "deep"] as const
                          ).map((tone) => (
                            <i
                              key={tone}
                              title={tone}
                              style={{
                                background: deriveColorTone(draft[key], tone),
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.readability}>
                  <div className={styles.readabilityTitle}>
                    <FiInfo aria-hidden="true" />
                    <div>
                      <strong>Leitura das cores</strong>
                      <span>
                        A CONG avisa quando alguma combinação pode dificultar a
                        leitura.
                      </span>
                    </div>
                  </div>
                  <div className={styles.checkList}>
                    {contrastChecks.map((check) => (
                      <div
                        key={check.label}
                        className={styles.checkItem}
                        data-pass={check.pass}
                      >
                        <FiCheckCircle aria-hidden="true" />
                        <div>
                          <strong>{check.label}</strong>
                          <span>{check.message}</span>
                        </div>
                        <b>{check.pass ? "Boa leitura" : "Pode melhorar"}</b>
                      </div>
                    ))}
                    <div
                      className={styles.checkItem}
                      data-pass={harmonyCheck.pass}
                    >
                      <FiCheckCircle aria-hidden="true" />
                      <div>
                        <strong>As cores combinam?</strong>
                        <span>{harmonyCheck.message}</span>
                      </div>
                      <b>{harmonyCheck.pass ? "Sim" : "Vale ajustar"}</b>
                    </div>
                  </div>
                  <small className={styles.harmonyNote}>
                    Essas são sugestões, não bloqueios: você continua livre para
                    usar as cores que quiser.
                  </small>
                </div>
              </section>
            ) : null}

            {activeTab === "typography" ? (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>
                  <strong>Fontes oficiais</strong>
                  <span>
                    Escolha suas fontes. As que você salvar ficam disponíveis
                    nos elementos e no site público.
                  </span>
                </div>
                <div className={styles.typeFamilies}>
                  <FontFamilyPicker
                    value={design.headingFamily}
                    onChange={(value) => setDesign("headingFamily", value)}
                    label="Fonte dos títulos"
                  />
                  <FontFamilyPicker
                    value={design.bodyFamily}
                    onChange={(value) => setDesign("bodyFamily", value)}
                    label="Fonte dos textos"
                  />
                </div>
                <div className={styles.sectionTitle}>
                  <strong>Estilos salvos da marca</strong>
                  <span>
                    Configure cada estilo uma vez. No editor, vincule um texto a
                    ele para receber futuras alterações automaticamente.
                  </span>
                </div>
                <div className={styles.typeStyleList}>
                  {TYPE_ROLES.map(({ key, label }) => {
                    const preset = typeRoleStyle(draft, key);
                    const customized = Boolean(design.textStyles?.[key]);
                    return (
                      <div className={styles.typeStyleRow} key={key}>
                        <div className={styles.typeStyleRowHeading}>
                          <strong>{label}</strong>
                          <small>
                            {customized ? "Personalizado" : "Padrão sugerido"}
                          </small>
                        </div>
                        <div className={styles.typeStyleControls}>
                          <FontFamilyPicker
                            value={preset.family}
                            label="Família"
                            onChange={(family) =>
                              updateTypeStyle(key, { family })
                            }
                          />
                          <label className={styles.typeSize}>
                            <span>Tamanho</span>
                            <input
                              type="number"
                              min={10}
                              max={160}
                              value={preset.size}
                              onChange={(event) => {
                                const number = Number(event.target.value);
                                if (
                                  Number.isInteger(number) &&
                                  number >= 10 &&
                                  number <= 160
                                )
                                  updateTypeStyle(key, { size: number });
                              }}
                            />
                          </label>
                          <div className={styles.typeWeight}>
                            <span>Espessura</span>
                            <div
                              className={styles.weightChoices}
                              role="group"
                              aria-label={`Espessura: ${label}`}
                            >
                              {([400, 500, 600, 700, 800] as const).map(
                                (weight) => (
                                  <button
                                    key={weight}
                                    type="button"
                                    title={`Peso ${weight}`}
                                    data-active={preset.weight === weight}
                                    aria-pressed={preset.weight === weight}
                                    style={{ fontWeight: weight }}
                                    onClick={() =>
                                      updateTypeStyle(key, { weight })
                                    }
                                  >
                                    {weight}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                        <p
                          className={styles.typeSample}
                          style={{
                            fontFamily:
                              preset.family === "legacy"
                                ? ["display", "heading", "subheading"].includes(
                                    key,
                                  )
                                  ? "var(--font-brand)"
                                  : "var(--font-interface)"
                                : preset.family,
                            fontSize: Math.min(preset.size, 42),
                            fontWeight: preset.weight,
                          }}
                        >
                          Sua organização, sua identidade.
                        </p>
                        {customized ? (
                          <button
                            type="button"
                            className={styles.resetType}
                            onClick={() =>
                              setDraft((current) => {
                                const base = resolveDesignSystem(current);
                                const next = { ...base.textStyles };
                                delete next[key];
                                return {
                                  ...current,
                                  designSystem: { ...base, textStyles: next },
                                };
                              })
                            }
                          >
                            Remover personalização
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeTab === "styles" ? (
              <section className={styles.section}>
                <div className={styles.designSectionHeading}>
                  <div className={styles.sectionTitle}>
                    <strong>Estilo do site</strong>
                    <span>
                      Definições gerais. Estilos manuais dos elementos continuam
                      sendo respeitados.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.resetDesign}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        designSystem: {
                          ...DEFAULT_DESIGN_SYSTEM,
                          logos: resolveDesignSystem(current).logos,
                        },
                      }))
                    }
                  >
                    Restaurar padrões
                  </button>
                </div>
                <div className={styles.previewShell} style={sampleStyle}>
                  <div className={styles.previewOverline}>
                    PRÉVIA · IDENTIDADE DA ONG
                  </div>
                  <div className={styles.previewHeading}>
                    Sua causa, seu estilo.
                  </div>
                  <p className={styles.previewParagraph}>
                    Visualize os padrões antes de salvar.
                  </p>
                  <span className={styles.previewButton}>Exemplo de botão</span>
                  <div className={styles.previewSurface}>Exemplo de cartão</div>
                </div>
                <div className={styles.designControls}>
                  {(
                    [
                      [
                        "headingScale",
                        "Tamanho dos títulos",
                        [
                          ["compact", "Contido"],
                          ["standard", "Equilibrado"],
                          ["expressive", "Marcante"],
                        ],
                      ],
                      [
                        "bodyScale",
                        "Tamanho dos textos",
                        [
                          ["compact", "Compacto"],
                          ["standard", "Equilibrado"],
                          ["relaxed", "Confortável"],
                        ],
                      ],
                      [
                        "spacing",
                        "Espaço entre elementos",
                        [
                          ["compact", "Próximo"],
                          ["standard", "Equilibrado"],
                          ["spacious", "Arejado"],
                        ],
                      ],
                      [
                        "corners",
                        "Formato dos cantos",
                        [
                          ["original", "Do design"],
                          ["square", "Reto"],
                          ["subtle", "Suave"],
                          ["rounded", "Arredondado"],
                        ],
                      ],
                    ] as const
                  ).map(([key, label, choices]) => (
                    <fieldset className={styles.visualChoiceGroup} key={key}>
                      <legend>{label}</legend>
                      <div className={styles.visualChoices}>
                        {choices.map(([value, name]) => (
                          <button
                            key={value}
                            type="button"
                            className={styles.visualChoice}
                            data-active={design[key] === value}
                            aria-pressed={design[key] === value}
                            onClick={() => setDesign(key, value)}
                          >
                            <span
                              className={styles.choiceIllustration}
                              data-choice={value}
                              data-kind={key}
                              aria-hidden="true"
                            >
                              <i />
                              <i />
                              <i />
                            </span>
                            <span>{name}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className={styles.advancedArea}>
                  <button
                    type="button"
                    aria-expanded={showAdvanced}
                    className={styles.advancedToggle}
                    onClick={() => setShowAdvanced((current) => !current)}
                  >
                    {showAdvanced
                      ? "Ocultar opções avançadas"
                      : "Mostrar opções avançadas"}
                  </button>
                  {showAdvanced ? (
                    <div className={styles.advancedControls}>
                      <p>
                        Fontes de substituição usadas apenas quando você mantém
                        o estilo padrão do modelo.
                      </p>
                      {(
                        [
                          ["headingFont", "Fonte original dos títulos"],
                          ["bodyFont", "Fonte original dos textos"],
                        ] as const
                      ).map(([key, label]) => (
                        <fieldset
                          className={styles.visualChoiceGroup}
                          key={key}
                        >
                          <legend>{label}</legend>
                          <div className={styles.simpleChoices}>
                            {(
                              [
                                ["interface", "Inter"],
                                ["brand", "Marca CONG"],
                                ["system", "Dispositivo"],
                              ] as const
                            ).map(([value, title]) => (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={draft[key] === value}
                                data-active={draft[key] === value}
                                onClick={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    [key]: value,
                                  }))
                                }
                              >
                                {title}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  ) : null}
                </div>
                <p className={styles.designHint}>
                  Os ajustes individuais continuam disponíveis no editor. As
                  fontes gratuitas dependem de conexão à internet para carregar.
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSave({ ...draft, designSystem: design })}
            disabled={saving || uploadsInProgress > 0}
          >
            {uploadsInProgress > 0
              ? "Enviando imagem..."
              : saving
                ? "Salvando..."
                : "Salvar identidade"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
