import type { CSSProperties } from "react";

import type { InstitutionalSite } from "../../../services/institutionalService";
import InstitutionalSiteView from "../renderer/InstitutionalSiteView";

import styles from "./LiveSiteThumbnail.module.css";

export default function LiveSiteThumbnail({
  site,
  scale = 0.3,
  height = 210,
}: {
  site: InstitutionalSite;
  scale?: number;
  height?: number;
}) {
  const page = site.pages.find((item) => item.isHome) ?? site.pages[0];
  if (!page) return null;

  return (
    <div
      className={styles.viewport}
      style={{ "--preview-height": `${height}px` } as CSSProperties}
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
