import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./LibraryHoverPreview.module.css";

const CONTENT_WIDTH = 800;

export default function LibraryHoverPreview({
  anchor,
  title,
  description,
  children,
  theme,
}: {
  anchor: DOMRect | null;
  title: string;
  description: string;
  children: ReactNode;
  theme?: CSSProperties;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(440);

  useEffect(() => {
    const stage = stageRef.current;
    if (!anchor || !stage || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [anchor]);

  if (!anchor || typeof document === "undefined") return null;

  const width = Math.min(740, window.innerWidth - 24);
  const availableRight = window.innerWidth - anchor.right;
  const left = availableRight >= width + 22
    ? anchor.right + 12
    : Math.max(12, anchor.left - width - 12);
  const top = Math.max(12, Math.min(anchor.top - 25, window.innerHeight - 370));
  const scale = Math.min(1, Math.max(0.1, (stageWidth - 28) / CONTENT_WIDTH));

  return createPortal(
    <div className={styles.preview} style={{ ...theme, left, top, width }} aria-hidden="true">
      <div className={styles.stage} ref={stageRef}>
        <div
          className={styles.canvas}
          style={{ width: CONTENT_WIDTH, minWidth: CONTENT_WIDTH, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      <div className={styles.details}>
        <span>Prévia da composição</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>,
    document.body,
  );
}
