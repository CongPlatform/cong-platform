import { apiGet } from "./api";

export interface StockMediaItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  sourceUrl: string;
  author: string;
  kind: "image" | "video";
  license: string;
}

export interface StockMediaResponse {
  configured: boolean;
  items: StockMediaItem[];
  hasMore: boolean;
}

export function searchPixabay(kind: "image" | "video", query: string, page: number) {
  const params = new URLSearchParams({ kind, q: query, page: String(page) });
  return apiGet<StockMediaResponse>(`/institutional/media/stock?${params}`);
}
