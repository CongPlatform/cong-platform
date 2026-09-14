import multer from "multer";
import type { Request, Response, NextFunction } from "express";
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4194304, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, done) =>
    done(
      null,
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.mimetype,
      ),
    ),
}).single("file");
export function parseCommunityUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  parser(req, res, (error: unknown) => {
    if (error) {
      res
        .status(
          error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
            ? 413
            : 400,
        )
        .json({
          message: "Envie um arquivo JPG, PNG, WebP ou PDF de até 4 MB.",
          code: "INVALID_COMMUNITY_UPLOAD",
        });
      return;
    }
    if (!req.file) {
      res.status(400).json({
        message: "Selecione um arquivo JPG, PNG, WebP ou PDF.",
        code: "COMMUNITY_FILE_REQUIRED",
      });
      return;
    }
    next();
  });
}
