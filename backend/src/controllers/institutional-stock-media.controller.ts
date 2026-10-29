import type { Request, Response } from "express";
import { AppError } from "../utils/app-error.js";
import { uploadInstitutionalMedia } from "../services/institutional-media.service.js";
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

/** Import only a server-discovered Pixabay photo into this organization's own assets.
 * The client never supplies a URL. Limit bytes and time to avoid unbounded downloads.
 */
export async function importStockMedia(req: Request, res: Response): Promise<void> {
  const {query, id, page} = req.body ?? {};
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 80 ||
      typeof id !== "string" || !/^pixabay-image-[0-9]+$/.test(id) ||
      !Number.isInteger(page) || page < 1 || page > 25) {
    res.status(400).json({error:"Selecao de fotografia invalida.",code:"STOCK_IMAGE_INVALID"});
    return;
  }
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const selection = await searchInstitutionalStockMedia("image", query, page);
    const item = selection.items.find(entry => entry.id === id);
    if (!item || !/^https:\/\/(?:cdn\.)?pixabay\.com\//i.test(item.url)) {
      throw new AppError("Fotografia indisponivel no acervo.", 404, "STOCK_IMAGE_NOT_FOUND");
    }
    const result = await fetch(item.url, {signal:abort.signal, redirect:"error"});
    if (!result.ok || !result.body) throw new Error("Falha ao obter fotografia.");
    const chunks:Uint8Array[] = []; let bytes = 0;
    for await (const chunk of result.body) {
      bytes += chunk.byteLength;
      if (bytes > 5 * 1024 * 1024) { abort.abort(); throw new AppError("Imagem excede 5MB.", 413, "STOCK_IMAGE_TOO_LARGE"); }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const mime = buffer.subarray(0,3).equals(Buffer.from([255,216,255])) ? "image/jpeg" :
      buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" :
      buffer.toString("ascii",0,4)==="RIFF" && buffer.toString("ascii",8,12)==="WEBP" ? "image/webp" : "";
    if (!mime) throw new AppError("Formato de fotografia invalido.", 415, "STOCK_IMAGE_BAD_FORMAT");
    const file={ buffer, size:buffer.length, mimetype:mime,
      originalname:`cong-${id}.${mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp"}` } as Express.Multer.File;
    const asset=await uploadInstitutionalMedia(res.locals.authUser.id,
      res.locals.organizationContext.organizationId, file);
    res.status(201).json({asset,credit:{author:item.author,sourceUrl:item.sourceUrl,license:item.license}});
  }catch(error){
    console.error("Erro ao importar fotografia do acervo",error instanceof Error?error.message:"indefinido");
    const e=error as {status?:number;code?:string};
    res.status((e as {statusCode?:number}).statusCode??502).json({error:"Nao foi possivel importar esta fotografia.",code:e.code??"STOCK_IMAGE_IMPORT_FAILED"});
  }finally{clearTimeout(timeout);}
}
