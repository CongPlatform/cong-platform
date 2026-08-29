import * as z from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(
    /^[A-Za-z0-9._]+$/,
    "Username may only contain letters, numbers, dots and underscores",
  )
  .transform((value) => value.toLowerCase());

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    username: usernameSchema.optional(),

    bio: z
      .union([
        z
          .string()
          .trim()
          .max(300)
          .transform((value) => (value === "" ? null : value)),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.username !== undefined ||
      data.bio !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
