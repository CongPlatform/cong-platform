import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useParams } from "react-router-dom";

import InstitutionalSiteView from "../../components/institutional/renderer/InstitutionalSiteView";
import { ApiError } from "../../services/api";
import {
  getPublicInstitutionalSite,
  type InstitutionalSite,
} from "../../services/institutionalService";

import styles from "./PublicInstitutionalSite.module.css";

export default function PublicInstitutionalSite({
  slugOverride,
}: {
  slugOverride?: string;
}) {
  const params = useParams();
  const slug = slugOverride ?? params.slug ?? "";
  // On an NGO subdomain the slug is the first URL segment; /o/:slug supports
  // the equivalent nested route, without mixing other organizations' pages.
  const pageSlug = slugOverride
    ? (window.location.pathname.split("/").filter(Boolean)[0] ?? "")
    : typeof params.pageSlug === "string"
      ? params.pageSlug
      : "";
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
    const currentIcon =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
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

  const home = useMemo(() => {
    if (!site) return null;
    if (!pageSlug)
      return site.pages.find((page) => page.isHome) ?? site.pages[0] ?? null;
    return site.pages.find((page) => page.slug === pageSlug) ?? null;
  }, [site, pageSlug]);

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

  function navigateInternalLink(event: MouseEvent<HTMLDivElement>): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target === "_blank"
    )
      return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    const desired = href.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
    const matchingPage = site?.pages.find((item) => item.slug === desired);
    if (!matchingPage && desired !== "") return;
    event.preventDefault();
    const nextSlug = matchingPage?.isHome ? "" : (matchingPage?.slug ?? "");
    const prefix = slugOverride ? "" : `/o/${encodeURIComponent(slug)}`;
    window.location.assign(
      `${prefix}/${nextSlug}${href.includes("#") ? `#${href.split("#")[1]}` : ""}`,
    );
  }

  return (
    <div onClickCapture={navigateInternalLink}>
      <InstitutionalSiteView site={site} page={home} />
    </div>
  );
}
