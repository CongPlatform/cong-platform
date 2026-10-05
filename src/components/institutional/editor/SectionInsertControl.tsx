import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";

import { sectionCatalog } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import LiveSectionThumbnail from "../preview/LiveSectionThumbnail";

import styles from "./SectionInsertControl.module.css";

const hiddenTypes = new Set<InstitutionalSectionType>(["site_footer"]);

export default function SectionInsertControl({
  variants,
  onAdd,
}: {
  variants: InstitutionalVariant[];
  onAdd: (sectionType: InstitutionalSectionType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrap} data-open={open}>
      <span className={styles.line} />
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? <FiX aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
        {open ? "Fechar" : "Adicionar aqui"}
      </button>
      <span className={styles.line} />

      {open ? (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <strong>O que você quer mostrar aqui?</strong>
            <span>Escolha pelo resultado. Você pode trocar o design depois.</span>
          </div>
          <div className={styles.options}>
            {sectionCatalog
              .filter((definition) => !hiddenTypes.has(definition.type))
              .map((definition) => (
                <button
                  type="button"
                  key={definition.type}
                  onClick={() => {
                    onAdd(definition.type);
                    setOpen(false);
                  }}
                >
                  <LiveSectionThumbnail sectionType={definition.type} variants={variants} />
                  <span>
                    <strong>{definition.name}</strong>
                    <small>{definition.shortDescription}</small>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
