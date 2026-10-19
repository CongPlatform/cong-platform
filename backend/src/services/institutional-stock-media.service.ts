export type StockKind = "image" | "video";

export interface StockMediaItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  sourceUrl: string;
  author: string;
  kind: StockKind;
  license: string;
}

interface PixabayResponse {
  totalHits?: number;
  hits?: Array<{
    id: number;
    tags?: string;
    user?: string;
    pageURL?: string;
    previewURL?: string;
    webformatURL?: string;
    largeImageURL?: string;
    picture_id?: string;
    videos?: Record<string, { url?: string }>;
  }>;
}

const searchCache = new Map<string, { expires: number; items: StockMediaItem[]; hasMore: boolean }>();
const CACHE_MS = 24 * 60 * 60 * 1000;
const allowedAsset = (raw: unknown): raw is string => {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

export async function searchInstitutionalStockMedia(kind: StockKind, term: string, page: number) {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return { configured: false, items: [], hasMore: false };

  const query = term.trim().slice(0, 80);
  const cacheKey = `${kind}:${page}:${query.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { configured: true, items: cached.items, hasMore: cached.hasMore };
  }

  const params = new URLSearchParams({
    key,
    q: query,
    safesearch: "true",
    per_page: "18",
    page: String(page),
    order: "popular",
  });
  if (kind === "image") params.set("image_type", "photo");

  const path = kind === "video" ? "/api/videos/" : "/api/";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  let response: Response;
  try {
    response = await fetch(`https://pixabay.com${path}?${params}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    if (response.status === 429) throw new Error("O acervo está temporariamente ocupado. Tente novamente em instantes.");
    throw new Error("Não foi possível consultar o acervo agora.");
  }

  const data = await response.json() as PixabayResponse;
  const items: StockMediaItem[] = (data.hits ?? []).flatMap((hit) => {
    const url = kind === "video"
      ? hit.videos?.medium?.url ?? hit.videos?.small?.url ?? ""
      : hit.largeImageURL ?? hit.webformatURL ?? "";
    const thumbnail = kind === "video"
      ? (hit.picture_id && /^[A-Za-z0-9_-]{2,100}$/.test(hit.picture_id)
        ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
        : "")
      : hit.webformatURL ?? hit.previewURL ?? "";
    if (!allowedAsset(url) || (kind === "video" && !/^https:\/\/cdn\.pixabay\.com\/video\//.test(url))) return [];
    return [{
      id: `pixabay-${kind}-${hit.id}`,
      kind,
      title: (hit.tags ?? (kind === "video" ? "Vídeo" : "Fotografia")).slice(0, 150),
      thumbnail: allowedAsset(thumbnail) ? thumbnail : "",
      url,
      sourceUrl: allowedAsset(hit.pageURL) ? hit.pageURL : "https://pixabay.com/",
      author: (hit.user ?? "Pixabay").slice(0, 80),
      license: "Licença de Conteúdo Pixabay",
    }];
  });
  const hasMore = page * 18 < (data.totalHits ?? 0);
  if (searchCache.size > 200) {
    for (const [id, entry] of searchCache) if (entry.expires < Date.now()) searchCache.delete(id);
    if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value!);
  }
  searchCache.set(cacheKey, { expires: Date.now() + CACHE_MS, items, hasMore });
  return { configured: true, items, hasMore };
}
