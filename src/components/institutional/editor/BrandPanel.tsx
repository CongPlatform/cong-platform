import { useMemo, useState } from "react";
import { FiCheckCircle, FiImage, FiInfo, FiX } from "react-icons/fi";

import type {
  InstitutionalBrand,
  InstitutionalDesignPalette,
  InstitutionalFontKey,
} from "../../../services/institutionalService";
import {
  analyzeBrandContrast,
  analyzeBrandHarmony,
  buildBrandPaletteSuggestion,
} from "../../../utils/institutionalPalette";

import styles from "./BrandPanel.module.css";

type BrandDraft = Omit<InstitutionalBrand, "organizationId" | "publicSlug" | "logoAsset">;

const fontOptions: Array<{ value: InstitutionalFontKey; label: string }> = [
  { value: "interface", label: "Inter · interface CONG" },
  { value: "brand", label: "Short Stack · identidade CONG" },
  { value: "system", label: "Fonte do sistema" },
];

export default function BrandPanel({
  brand,
  saving,
  suggestedPalette,
  communityPalettes = [],
  onClose,
  onSave,
  onUploadLogo,
  onApplyPalette,
}: {
  brand: InstitutionalBrand;
  saving: boolean;
  suggestedPalette: string[];
  communityPalettes?: InstitutionalDesignPalette[];
  onClose: () => void;
  onSave: (brand: BrandDraft) => void;
  onUploadLogo: (file: File) => void;
  onApplyPalette: (palette: string[]) => void;
}) {
  const [draft, setDraft] = useState<BrandDraft>({
    logoAssetId: brand.logoAssetId,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
    headingFont: brand.headingFont,
    bodyFont: brand.bodyFont,
  });

  const paletteSuggestion = useMemo(
    () =>
      suggestedPalette.length > 0
        ? buildBrandPaletteSuggestion(suggestedPalette)
        : null,
    [suggestedPalette],
  );

  const contrastChecks = useMemo(
    () =>
      analyzeBrandContrast({
        primaryColor: draft.primaryColor,
        accentColor: draft.accentColor,
        backgroundColor: draft.backgroundColor,
        textColor: draft.textColor,
      }),
    [draft.accentColor, draft.backgroundColor, draft.primaryColor, draft.textColor],
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
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Identidade visual da organização"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <strong>Identidade da organização</strong>
            <span>A CONG usa estas definições em todo o site.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <strong>Logo</strong>
              <span>
                A CONG prepara o arquivo automaticamente para ele ficar leve e nítido.
              </span>
            </div>

            <div className={styles.logoRow}>
              <div className={styles.logoPreview}>
                {brand.logoAsset?.url ? (
                  <img src={brand.logoAsset.url} alt="Logo atual da organização" />
                ) : (
                  <FiImage aria-hidden="true" />
                )}
              </div>
              <div className={styles.logoActions}>
                <label className={styles.uploadButton}>
                  Escolher logo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadLogo(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <small>JPG, PNG ou WebP. A CONG prepara o arquivo automaticamente.</small>
              </div>
            </div>

            {paletteSuggestion ? (
              <div className={styles.paletteSuggestion}>
                <div>
                  <strong>Paleta sugerida a partir do logo</strong>
                  <span>
                    As cores são classificadas por função e ajustadas quando a leitura
                    precisa de mais contraste.
                  </span>
                </div>
                <div className={styles.swatches} aria-label="Cores sugeridas">
                  {[
                    paletteSuggestion.primaryColor,
                    paletteSuggestion.secondaryColor,
                    paletteSuggestion.accentColor,
                    paletteSuggestion.backgroundColor,
                    paletteSuggestion.textColor,
                  ].map((color) => (
                    <span key={color} style={{ background: color }} title={color} />
                  ))}
                </div>
                {paletteSuggestion.notes.length > 0 ? (
                  <p className={styles.paletteNote}>{paletteSuggestion.notes[0]}</p>
                ) : null}
                <button type="button" onClick={() => onApplyPalette(suggestedPalette)}>
                  Usar recomendação
                </button>
              </div>
            ) : null}
          </section>

          {communityPalettes.length > 0 ? (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <strong>Paletas criadas por Designers</strong>
                <span>Use como ponto de partida. Você pode trocar qualquer cor depois.</span>
              </div>
              <div className={styles.designerPaletteGrid}>
                {communityPalettes.filter((palette) => palette.status === "published").slice(0, 12).map((palette) => (
                  <button type="button" key={palette.id} className={styles.designerPaletteCard} onClick={() => onApplyPalette(palette.colors)}>
                    <span className={styles.designerPaletteSwatches}>{palette.colors.slice(0, 6).map((color) => <i key={color} style={{ background: color }} />)}</span>
                    <span><strong>{palette.name}</strong><small>{palette.description || "Paleta compartilhada"}</small></span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <strong>Cores</strong>
              <span>Estas são as cores recomendadas da identidade. Você ainda pode escolher outras cores em cada elemento.</span>
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
                  <div>
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(draft[key]) ? draft[key] : "#000000"}
                      onChange={(event) => setColor(key, event.target.value)}
                    />
                    <input
                      type="text"
                      value={draft[key]}
                      onChange={(event) => setColor(key, event.target.value)}
                      maxLength={7}
                      spellCheck={false}
                    />
                  </div>
                </label>
              ))}
            </div>

            <div className={styles.readability}>
              <div className={styles.readabilityTitle}>
                <FiInfo aria-hidden="true" />
                <div>
                  <strong>Leitura das cores</strong>
                  <span>A CONG avisa quando alguma combinação pode dificultar a leitura.</span>
                </div>
              </div>
              <div className={styles.checkList}>
                {contrastChecks.map((check) => (
                  <div key={check.label} className={styles.checkItem} data-pass={check.pass}>
                    <FiCheckCircle aria-hidden="true" />
                    <div>
                      <strong>
                        {check.label}
                      </strong>
                      <span>{check.message}</span>
                    </div>
                    <b>{check.pass ? "Boa leitura" : "Pode melhorar"}</b>
                  </div>
                ))}
                <div className={styles.checkItem} data-pass={harmonyCheck.pass}>
                  <FiCheckCircle aria-hidden="true" />
                  <div>
                    <strong>As cores combinam?</strong>
                    <span>{harmonyCheck.message}</span>
                  </div>
                  <b>{harmonyCheck.pass ? "Sim" : "Vale ajustar"}</b>
                </div>
              </div>
              <small className={styles.harmonyNote}>
                Essas são sugestões, não bloqueios: você continua livre para usar as cores que quiser.
              </small>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <strong>Fontes</strong>
              <span>Usamos somente famílias já disponíveis na CONG.</span>
            </div>

            <label className={styles.selectField}>
              <span>Títulos</span>
              <select
                value={draft.headingFont}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    headingFont: event.target.value as InstitutionalFontKey,
                  }))
                }
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.selectField}>
              <span>Textos</span>
              <select
                value={draft.bodyFont}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    bodyFont: event.target.value as InstitutionalFontKey,
                  }))
                }
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSave(draft)}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar identidade"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
