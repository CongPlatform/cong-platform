import type { NextFunction, Request, Response } from "express";

/** Restricao temporaria do assistente para a apresentacao do TCC.
 * Sempre usa a identidade devolvida pelo Supabase Auth no middleware authenticate;
 * nunca confia no email enviado no body, query ou headers do cliente.
 */
const AI_ALLOWED_EMAILS = new Set([
  "kelvinpalka07@gmail.com",
  "andremendesmoura1309@gmail.com",
  "joaofeliperocha77@gmail.com",
  "congplatform@gmail.com",
]);

export function isAllowedAiEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && AI_ALLOWED_EMAILS.has(email.trim().toLowerCase());
}

export function requireAiDemoAccess(_req: Request, res: Response, next: NextFunction): void {
  const user = res.locals.authUser;
  if (!user || !isAllowedAiEmail(user.email) || !user.email_confirmed_at) {
    res.status(403).json({
      code: "AI_ACCOUNT_NOT_ALLOWED",
      error: "O assistente de IA esta disponivel somente para as contas de demonstracao autorizadas.",
    });
    return;
  }
  next();
}
