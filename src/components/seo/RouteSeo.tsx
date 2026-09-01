import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://cong.com.br";
const SOCIAL_IMAGE_URL = `${SITE_URL}/logo-extended-dark.png`;

interface PublicPageSeo {
  title: string;
  description: string;
}

const PUBLIC_PAGES: Record<string, PublicPageSeo> = {
  "/": {
    "title": "CONG | Construtor Operacional para ONGs",
    "description": "A CONG conecta organizações e pessoas para criar, adaptar e compartilhar soluções digitais para o terceiro setor."
  },
  "/como-funciona": {
    "title": "Como funciona | CONG",
    "description": "Entenda como a CONG conecta organizações, colaboradores e recursos para criar soluções digitais modulares para o terceiro setor."
  },
  "/documentacao": {
    "title": "Documentação | CONG",
    "description": "Conheça a proposta, a arquitetura, os módulos e os fundamentos técnicos que orientam o desenvolvimento da plataforma CONG."
  },
  "/comunidade": {
    "title": "Comunidade | CONG",
    "description": "Conheça a comunidade da CONG e descubra formas de colaborar com soluções digitais, projetos e oportunidades voltadas ao terceiro setor."
  },
  "/sobre": {
    "title": "Sobre a CONG | Construtor Operacional para ONGs",
    "description": "Conheça a história, a equipe e a proposta da CONG, uma plataforma criada para ampliar o acesso de organizações sociais a soluções digitais."
  }
};

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(href: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPathname = normalizePathname(pathname);
    const page = PUBLIC_PAGES[normalizedPathname];

    if (!page) {
      document.title = "CONG";
      upsertMeta("name", "description", "Área da plataforma CONG.");
      upsertMeta("name", "robots", "noindex, nofollow");
      upsertMeta("name", "googlebot", "noindex, nofollow");
      setCanonical(null);
      return;
    }

    const canonicalUrl = `${SITE_URL}${normalizedPathname === "/" ? "/" : normalizedPathname}`;

    document.title = page.title;

    upsertMeta("name", "description", page.description);
    upsertMeta(
      "name",
      "robots",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
    upsertMeta(
      "name",
      "googlebot",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );

    setCanonical(canonicalUrl);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "CONG");
    upsertMeta("property", "og:locale", "pt_BR");
    upsertMeta("property", "og:title", page.title);
    upsertMeta("property", "og:description", page.description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", SOCIAL_IMAGE_URL);
    upsertMeta(
      "property",
      "og:image:alt",
      "CONG — Construtor Operacional para ONGs",
    );

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", page.title);
    upsertMeta("name", "twitter:description", page.description);
    upsertMeta("name", "twitter:image", SOCIAL_IMAGE_URL);
  }, [pathname]);

  return null;
}
