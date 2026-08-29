import type { NextFunction, Request, Response } from "express";

import multer from "multer";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const avatarParser = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      callback(new Error("INVALID_AVATAR_TYPE"));

      return;
    }

    callback(null, true);
  },
}).single("avatar");

export function parseAvatarUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  avatarParser(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      res.status(413).json({
        message: "A imagem deve ter no máximo 5 MB.",
        code: "AVATAR_TOO_LARGE",
      });

      return;
    }

    if (error instanceof Error && error.message === "INVALID_AVATAR_TYPE") {
      res.status(400).json({
        message: "Envie uma imagem JPG, PNG ou WebP.",
        code: "INVALID_AVATAR_TYPE",
      });

      return;
    }

    res.status(400).json({
      message: "Não foi possível processar a imagem.",
      code: "INVALID_AVATAR_UPLOAD",
    });
  });
}
