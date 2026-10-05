import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import InstitutionalSiteView from "../../components/institutional/renderer/InstitutionalSiteView";
import { ApiError } from "../../services/api";
import {
  getPublicInstitutionalSite,
  type InstitutionalSite,
} from "../../services/institutionalService";

import styles from "./PublicInstitutionalSite.module.css";

export default function PublicInstitutionalSite({ slugOverride }: { slugOverride?: string }) {
  const params = useParams();
  const slug = slugOverride ?? params.slug ?? "";
  const [site, setSite] = useState<InstitutionalSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getPublicInstitutionalSite(slug)
      .then((loaded) => {
        if (active) setSite(loaded);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 404) {
          setError("Este site ainda não está disponível publicamente.");
        } else {
          setError("Não foi possível carregar este site agora.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);


  useEffect(() => {
    if (!site) return;

    const previousTitle = document.title;
    const currentIcon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousIconHref = currentIcon?.href ?? null;
    let icon = currentIcon;
    let createdIcon = false;

    document.title = site.organization.name;

    if (site.brand.logoAsset?.url) {
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.appendChild(icon);
        createdIcon = true;
      }
      icon.href = site.brand.logoAsset.url;
    }

    return () => {
      document.title = previousTitle;
      if (createdIcon && icon) {
        icon.remove();
      } else if (icon && previousIconHref) {
        icon.href = previousIconHref;
      }
    };
  }, [site]);

  const home = useMemo(
    () => site?.pages.find((page) => page.isHome) ?? site?.pages[0] ?? null,
    [site],
  );

  if (loading) {
    return <main className={styles.state}>Carregando...</main>;
  }

  if (!site || !home) {
    return (
      <main className={styles.state}>
        <div>
          <strong>Site não encontrado</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return <InstitutionalSiteView site={site} page={home} />;
}
