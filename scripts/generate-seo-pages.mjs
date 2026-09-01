import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://cong.com.br";
const SOCIAL_IMAGE_URL = `${SITE_URL}/logo-extended-dark.png`;

const PUBLIC_PAGES = {
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

const distDir = path.resolve("dist");
const rootIndexPath = path.join(distDir, "index.html");

if (!fs.existsSync(rootIndexPath)) {
  console.error("[seo] dist/index.html não encontrado. Rode este script após o vite build.");
  process.exit(1);
}

const baseHtml = fs.readFileSync(rootIndexPath, "utf8");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(value)}</title>`);
}

function replaceMeta(html, attribute, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(
    `<meta\\s+[^>]*${attribute}=["']${escapedKey}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;

  if (expression.test(html)) {
    return html.replace(expression, tag);
  }

  return html.replace("</head>", `  ${tag}\n  </head>`);
}

function replaceCanonical(html, value) {
  const tag = `<link rel="canonical" href="${escapeHtml(value)}" />`;
  const expression = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;

  if (expression.test(html)) {
    return html.replace(expression, tag);
  }

  return html.replace("</head>", `  ${tag}\n  </head>`);
}

for (const [route, page] of Object.entries(PUBLIC_PAGES)) {
  if (route === "/") {
    continue;
  }

  const canonicalUrl = `${SITE_URL}${route}`;
  let html = baseHtml;

  html = replaceTitle(html, page.title);
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceCanonical(html, canonicalUrl);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:url", canonicalUrl);
  html = replaceMeta(html, "property", "og:image", SOCIAL_IMAGE_URL);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", SOCIAL_IMAGE_URL);

  const outputDir = path.join(distDir, route.slice(1));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
  console.log(`[seo] gerado: ${route}/index.html`);
}
