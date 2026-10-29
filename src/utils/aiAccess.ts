/** Apenas exibicao de navegacao; a autorizacao real e aplicada no backend. */
const AI_ALLOWED_EMAILS = new Set([
  "kelvinpalka07@gmail.com",
  "andremendesmoura1309@gmail.com",
  "joaofeliperocha77@gmail.com",
  "congplatform@gmail.com",
]);

export function isAllowedAiEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && AI_ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
