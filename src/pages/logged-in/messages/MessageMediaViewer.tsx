import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiExternalLink, FiMinus, FiPlus, FiX } from "react-icons/fi";
import styles from "./MessageMediaViewer.module.css";

export default function MessageMediaViewer({
  url, name, caption, kind, onClose,
}: {
  url: string;
  name: string;
  caption?: string;
  kind: "image" | "video";
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (kind === "image" && (event.key === "+" || event.key === "=")) setZoom((v) => Math.min(4, +(v + .25).toFixed(2)));
      if (kind === "image" && event.key === "-") setZoom((v) => Math.max(1, +(v - .25).toFixed(2)));
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [kind, onClose]);

  function download() {
    const link = document.createElement("a");
    link.href = url;
    link.download = name.replace(/[\\/]/g, "_");
    link.click();
  }

  return createPortal(
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.viewer} role="dialog" aria-modal="true" aria-label={`Visualizar ${name}`}>
        <header className={styles.toolbar}>
          <span className={styles.name} title={name}>{name}</span>
          <div className={styles.actions}>
            {kind === "image" ? (
              <>
                <button type="button" title="Diminuir zoom" aria-label="Diminuir zoom" onClick={() => setZoom((v) => Math.max(1, +(v - .25).toFixed(2)))} disabled={zoom === 1}><FiMinus /></button>
                <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                <button type="button" title="Aumentar zoom" aria-label="Aumentar zoom" onClick={() => setZoom((v) => Math.min(4, +(v + .25).toFixed(2)))} disabled={zoom === 4}><FiPlus /></button>
              </>
            ) : null}
            <button type="button" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} title="Abrir mídia em outra aba" aria-label="Abrir em outra aba"><FiExternalLink /></button>
            <button type="button" onClick={download} title="Baixar" aria-label="Baixar mídia"><FiDownload /></button>
            <button ref={closeButton} type="button" onClick={onClose} title="Fechar" aria-label="Fechar visualizador"><FiX /></button>
          </div>
        </header>
        <div className={styles.stage}>
          {kind === "image"
            ? <img src={url} alt={caption || name} className={styles.image} style={{ transform: `scale(${zoom})` }} onDoubleClick={() => setZoom((v) => v === 1 ? 2 : 1)} />
            : <video src={url} controls autoPlay playsInline className={styles.video} />}
        </div>
        {caption ? <footer className={styles.caption}>{caption}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
