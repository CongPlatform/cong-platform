import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

const AVATAR_BUCKET = "avatars";

function getAvatarExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      throw new AppError(
        "Formato de imagem inválido.",
        400,
        "INVALID_AVATAR_TYPE",
      );
  }
}

interface AvatarResult {
  avatarPath: string | null;
}

export function getAvatarPublicUrl(storagePath: string | null): string | null {
  if (!storagePath) {
    return null;
  }

  const { data } = supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function uploadAccountAvatar(
  authUserId: string,
  file: Express.Multer.File,
): Promise<AvatarResult> {
  const currentResult = await pool.query<{
    avatar_path: string | null;
  }>(
    `
        select avatar_path
        from public.users
        where
          auth_user_id = $1
          and active = true
        limit 1
      `,
    [authUserId],
  );

  const user = currentResult.rows[0];

  if (!user) {
    throw new AppError("Conta não encontrada.", 404, "ACCOUNT_NOT_FOUND");
  }

  const extension = getAvatarExtension(file.mimetype);

  const storagePath =
    `users/${authUserId}/` + `avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,

      cacheControl: "3600",

      upsert: false,
    });

  if (uploadError) {
    console.error("Erro no upload do avatar:", uploadError);

    throw new AppError(
      "Não foi possível salvar a imagem.",
      502,
      "AVATAR_UPLOAD_FAILED",
    );
  }

  try {
    const updateResult = await pool.query<{
      avatar_path: string;
    }>(
      `
          update public.users
          set
            avatar_path = $1,
            updated_at = now()
          where
            auth_user_id = $2
            and active = true
          returning avatar_path
        `,
      [storagePath, authUserId],
    );

    if (updateResult.rowCount === 0) {
      throw new AppError("Conta não encontrada.", 404, "ACCOUNT_NOT_FOUND");
    }
  } catch (error) {
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([storagePath]);

    throw error;
  }

  if (user.avatar_path && user.avatar_path !== storagePath) {
    const { error: removeError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .remove([user.avatar_path]);

    if (removeError) {
      console.error("Não foi possível remover o avatar anterior:", removeError);
    }
  }

  return {
    avatarPath: getAvatarPublicUrl(storagePath),
  };
}

export async function removeAccountAvatar(
  authUserId: string,
): Promise<AvatarResult> {
  const result = await pool.query<{
    avatar_path: string | null;
  }>(
    `
        SELECT avatar_path
        FROM public.users
        WHERE
          auth_user_id = $1
          AND active = TRUE
        LIMIT 1
      `,
    [authUserId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError("Conta não encontrada.", 404, "ACCOUNT_NOT_FOUND");
  }

  if (user.avatar_path) {
    const { error: removeError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .remove([user.avatar_path]);

    if (removeError) {
      console.error("Erro ao remover avatar:", removeError);

      throw new AppError(
        "Não foi possível remover a imagem.",
        502,
        "AVATAR_REMOVE_FAILED",
      );
    }
  }

  await pool.query(
    `
      UPDATE public.users
      SET
        avatar_path = NULL,
        updated_at = NOW()
      WHERE auth_user_id = $1
    `,
    [authUserId],
  );

  return {
    avatarPath: null,
  };
}
