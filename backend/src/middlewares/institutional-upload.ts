import multer from "multer";
import type { NextFunction, Request, Response } from "express";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 2,
  },
  fileFilter: (_req, file, done) => {
    done(
      null,
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
    );
  },
}).single("file");

export function parseInstitutionalUpload(
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
          error: "Envie uma imagem JPG, PNG ou WebP de até 5 MB.",
          code: "INVALID_INSTITUTIONAL_UPLOAD",
        });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: "Selecione uma imagem JPG, PNG ou WebP.",
        code: "INSTITUTIONAL_FILE_REQUIRED",
      });
      return;
    }

    next();
  });
}
