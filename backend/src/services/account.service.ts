import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

interface Account {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateAccountInput {
  name?: string;
  username?: string;
  bio?: string | null;
}

interface AccountRow {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAccount(
  authUserId: string,
  email: string,
): Promise<Account> {
  const result = await pool.query<AccountRow>(
    `
      select
        id,
        name,
        username,
        bio,
        avatar_path as "avatarPath",
        active,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from public.users
      where auth_user_id = $1
      limit 1
    `,
    [authUserId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(
      "User account was not found",
      404,
      "USER_ACCOUNT_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarPath: getAvatarPublicUrl(user.avatarPath),
    email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateAccount(
  authUserId: string,
  email: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const fields: string[] = [];
  const values: unknown[] = [authUserId];

  let parameterIndex = 2;

  if (input.name !== undefined) {
    fields.push(`name = $${parameterIndex}`);
    values.push(input.name);
    parameterIndex++;
  }

  if (input.username !== undefined) {
    fields.push(`username = $${parameterIndex}`);
    values.push(input.username);
    parameterIndex++;
  }

  if (input.bio !== undefined) {
    fields.push(`bio = $${parameterIndex}`);
    values.push(input.bio);
  }

  try {
    const result = await pool.query<AccountRow>(
      `
        update public.users
        set ${fields.join(", ")}
        where auth_user_id = $1
        returning
          id,
          name,
          username,
          bio,
          avatar_path as "avatarPath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError(
        "User account was not found",
        404,
        "USER_ACCOUNT_NOT_FOUND",
      );
    }

    if (!user.active) {
      throw new AppError("User account is inactive", 403, "USER_INACTIVE");
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarPath: getAvatarPublicUrl(user.avatarPath),
      email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AppError(
        "Username is already in use",
        409,
        "USERNAME_ALREADY_IN_USE",
      );
    }

    throw error;
  }
}
