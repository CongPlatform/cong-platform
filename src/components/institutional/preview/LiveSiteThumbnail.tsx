import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { InstitutionalSite } from "../../../services/institutionalService";
import InstitutionalSiteView from "../renderer/InstitutionalSiteView";

import styles from "./LiveSiteThumbnail.module.css";

export default function LiveSiteThumbnail({
  site,
  height = 210,
  sourceWidth = 1180,
}: {
  site: InstitutionalSite;
  height?: number;
  sourceWidth?: number;
}) {
  const page = site.pages.find((item) => item.isHome) ?? site.pages[0];
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const width = viewport.getBoundingClientRect().width;
      if (!width) return;
      setScale(width / sourceWidth);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [sourceWidth]);

  if (!page) return null;

  return (
    <div
      ref={viewportRef}
      className={styles.viewport}
      style={{
        "--preview-height": `${height}px`,
        "--preview-source-width": `${sourceWidth}px`,
      } as CSSProperties}
      aria-hidden="true"
    >
      <div
        className={styles.scaled}
        style={{ transform: `scale(${scale})` }}
      >
        <InstitutionalSiteView site={site} page={page} />
      </div>
      <div className={styles.guard} />
    </div>
  );
}
