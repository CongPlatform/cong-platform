import { FiCheck, FiLayout } from "react-icons/fi";

import type {
  InstitutionalBrand,
  InstitutionalSection,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import LiveVariantThumbnail from "../preview/LiveVariantThumbnail";

import styles from "./SectionDesignPicker.module.css";

export default function SectionDesignPicker({
  section,
  brand,
  variants,
  busy,
  onSelect,
}: {
  section: InstitutionalSection;
  brand: InstitutionalBrand;
  variants: InstitutionalVariant[];
  busy?: boolean;
  onSelect: (variantVersionId: string) => void;
}) {
  const choices = variants.filter(
    (variant) =>
      variant.sectionType === section.sectionType &&
      (variant.isSystem || variant.status === "published"),
  );

  return (
    <div className={styles.picker} onClick={(event) => event.stopPropagation()}>
      <div className={styles.header}>
        <span className={styles.icon}><FiLayout aria-hidden="true" /></span>
        <div>
          <strong>Trocar o design</strong>
          <small>Seu conteúdo permanece. Compare usando o próprio texto da seção.</small>
        </div>
      </div>

      <div className={styles.grid}>
        {choices.map((variant) => {
          const active = variant.versionId === section.variantVersionId;
          return (
            <button
              type="button"
              key={variant.versionId}
              className={styles.option}
              data-active={active}
              disabled={busy || active}
              onClick={() => onSelect(variant.versionId)}
            >
              <LiveVariantThumbnail section={section} variant={variant} brand={brand} />
              <span className={styles.optionTitle}>
                <strong>{variant.name}</strong>
                {active ? <em><FiCheck /> Atual</em> : null}
              </span>
              {variant.description ? <small>{variant.description}</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
