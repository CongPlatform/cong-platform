import { useEffect } from "react";
import { FiEdit3, FiExternalLink, FiInfo, FiX } from "react-icons/fi";

import type { InstitutionalSite } from "../../../services/institutionalService";
import InstitutionalSiteView from "../renderer/InstitutionalSiteView";

import styles from "./SitePreviewModal.module.css";

type PreviewDetails = {
  category?: string;
  description?: string;
  bestFor?: string;
  composition?: string;
  traits?: string[];
};

export default function SitePreviewModal({
  site,
  title,
  eyebrow = "Pré-visualização",
  actionLabel,
  publicUrl,
  details,
  onClose,
  onAction,
}: {
  site: InstitutionalSite;
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  publicUrl?: string | null;
  details?: PreviewDetails;
  onClose: () => void;
  onAction?: () => void;
}) {
  const page = site.pages.find((item) => item.isHome) ?? site.pages[0];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!page) return null;

  const hasDetails = Boolean(
    details?.category || details?.description || details?.bestFor || details?.composition || details?.traits?.length,
  );

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Pré-visualização de ${title}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
          </div>
          <div className={styles.headerActions}>
            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className={styles.secondaryAction}>
                Abrir publicado <FiExternalLink />
              </a>
            ) : null}
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar pré-visualização">
              <FiX />
            </button>
          </div>
        </header>

        <div className={styles.previewLayout} data-has-details={hasDetails}>
          <div className={styles.browserShell}>
            <div className={styles.browserBar} aria-hidden="true">
              <span /><span /><span />
              <div>{title}</div>
            </div>
            <div className={styles.siteViewport}>
              <InstitutionalSiteView site={site} page={page} />
            </div>
          </div>

          {hasDetails ? (
            <aside className={styles.detailsPanel} aria-label="Informações do modelo">
              <div className={styles.detailsIntro}>
                <span className={styles.detailsKicker}><FiInfo /> Sobre este modelo</span>
                {details?.category ? <small>{details.category}</small> : null}
                <h2>{title}</h2>
                {details?.description ? <p>{details.description}</p> : null}
              </div>

              {details?.bestFor ? (
                <div className={styles.detailGroup}>
                  <span>Funciona melhor para</span>
                  <p>{details.bestFor}</p>
                </div>
              ) : null}

              {details?.composition ? (
                <div className={styles.detailGroup}>
                  <span>Direção visual</span>
                  <p>{details.composition}</p>
                </div>
              ) : null}

              {details?.traits?.length ? (
                <div className={styles.detailGroup}>
                  <span>Características</span>
                  <div className={styles.traits}>
                    {details.traits.map((trait) => <em key={trait}>{trait}</em>)}
                  </div>
                </div>
              ) : null}

              {onAction && actionLabel ? (
                <button type="button" className={styles.primaryAction} onClick={onAction}>
                  <FiEdit3 /> {actionLabel}
                </button>
              ) : null}
            </aside>
          ) : onAction && actionLabel ? (
            <button type="button" className={styles.floatingPrimaryAction} onClick={onAction}>
              <FiEdit3 /> {actionLabel}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
