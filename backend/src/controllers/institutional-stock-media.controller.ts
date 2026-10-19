import type { Request, Response } from "express";
import { searchInstitutionalStockMedia, type StockKind } from "../services/institutional-stock-media.service.js";

export async function searchStockMedia(req: Request, res: Response): Promise<void> {
  const rawQuery = req.query.q;
  const rawPage = req.query.page;
  const kind: StockKind = req.query.kind === "video" ? "video" : "image";
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const page = typeof rawPage === "string" ? Number(rawPage) : 1;
  if (query.length < 2 || query.length > 80 || !Number.isInteger(page) || page < 1 || page > 25) {
    res.status(400).json({ error: "Informe uma busca de 2 a 80 caracteres e uma página válida." });
    return;
  }
  try {
    const result = await searchInstitutionalStockMedia(kind, query, page);
    res.setHeader("Cache-Control", "private, max-age=120");
    res.status(200).json(result);
  } catch (error) {
    console.error("Falha na busca de mídia", error instanceof Error ? error.message : "erro desconhecido");
    res.status(502).json({ error: "O acervo está indisponível no momento. Tente novamente em instantes." });
  }
}
