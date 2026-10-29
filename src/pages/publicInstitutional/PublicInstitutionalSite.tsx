import CongLoadingState from "../../components/feedback/CongLoadingState";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useParams } from "react-router-dom";

import InstitutionalSiteView from "../../components/institutional/renderer/InstitutionalSiteView";
import SiteConnectedForms from "../../components/operational/SiteConnectedForms";
import { ApiError } from "../../services/api";
import {publicPortalInfo} from "../../features/operational/operationalPortalService";
import {institutionalRootDomain} from "../../utils/institutionalDomain";
import {placedOperationalPieces} from "../../utils/institutionalOperational";
import { applyPublicInstitutionalMetadata, buildPublicInstitutionalMetadata } from "../../utils/publicInstitutionalSeo";
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
  const [portalInfo,setPortalInfo] = useState<{slug:string;available:boolean}|null>(null);
  const portalAvailable=Boolean(site&&portalInfo?.slug===site.slug&&portalInfo.available);

  useEffect(()=>{if(!site)return;let active=true;void publicPortalInfo(site.slug).then(result=>{if(active)setPortalInfo({slug:site.slug,available:Boolean(result.portal)});}).catch(()=>{if(active)setPortalInfo({slug:site.slug,available:false});});return()=>{active=false;};},[site]);

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

  const home = useMemo(() => {
    if (!site) return null;
    if (!pageSlug)
      return site.pages.find((page) => page.isHome) ?? site.pages[0] ?? null;
    return site.pages.find((page) => page.slug === pageSlug) ?? null;
  }, [site, pageSlug]);

  useEffect(() => {
    if (!site || !home) return;
    const metadata = buildPublicInstitutionalMetadata(site, home, window.location.href);
    const cleanupMetadata = applyPublicInstitutionalMetadata(metadata);

    // The site icon belongs to this public organization only.
    const icon = document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const oldHref = icon?.getAttribute("href") ?? null;
    const logo = site.brand.logoAsset?.url;
    if (icon && logo && (/^https?:\/\//i.test(logo) || logo.startsWith("/"))) {
      icon.href = logo;
    }
    return () => {
      cleanupMetadata();
      if (icon && oldHref !== null) icon.setAttribute("href", oldHref);
    };
  }, [site, home]);

  if (loading) {
    return <main className={styles.state}><CongLoadingState variant="page" count={3} label="Preparando site"/></main>;
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

  const portalPath=`/app/portal/${encodeURIComponent(site.slug)}`;
  const defaultOrigin=`https://${institutionalRootDomain()}`;
  const configuredOrigin=(import.meta.env.VITE_PLATFORM_ORIGIN as string|undefined)?.trim();
  const platformOrigin=configuredOrigin&&/^https:\/\/[-a-z0-9.]+(?::443)?$/i.test(configuredOrigin)?configuredOrigin:defaultOrigin;
  const portalHref=slugOverride?`${platformOrigin}${portalPath}`:portalPath;

  const placed=placedOperationalPieces(home);
  const header=site.pages.flatMap(candidate=>candidate.sections).find(section=>section.sectionType==="site_header"&&section.visible);
  const headerLinks=Array.isArray(header?.content.links)?header.content.links as Array<{href?:string}>:[];
  const headerAction=header?.content.primaryAction as {href?:string}|null|undefined;
  const hasHeaderLogin=headerAction?.href==="#cong-portal"||headerLinks.some(link=>link?.href==="#cong-portal");
  return (
    <div onClickCapture={navigateInternalLink}>
      {portalAvailable&&!placed.hasLogin&&!hasHeaderLogin&&<div className={styles.portalAccess}><span>Área da organização</span><a href={portalHref}>Entrar com minha conta CONG <span aria-hidden="true">↗</span></a></div>}
      <InstitutionalSiteView site={site} page={home} publicAccessSlug={slug} portalHref={portalHref} portalEnabled={portalAvailable} beforeFooter={<SiteConnectedForms slug={slug} page={home.slug} excludedFormIds={placed.formIds}/>} />
    </div>
  );
}
