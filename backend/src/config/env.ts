import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
const databaseCaCertPath = process.env.DATABASE_CA_CERT_PATH;
const frontendUrl = process.env.FRONTEND_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const port = Number(process.env.PORT ?? 3000);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

if (!databaseCaCertPath) {
  throw new Error("DATABASE_CA_CERT_PATH is not defined");
}

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not defined");
}

if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not defined");
}
if (!supabasePublishableKey) {
  throw new Error("SUPABASE_PUBLISHABLE_KEY is not defined");
}

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

if (!frontendUrl) throw new Error("FRONTEND_URL is not defined");

export const env = {
  databaseUrl,
  databaseCaCertPath,
  supabaseUrl,
  supabaseSecretKey,
  supabasePublishableKey,
  frontendUrl,
  port,
};
