/** One-time optional cleanup. Run ONLY after the new chat is validated. */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

if (process.env.CONFIRM_OLD_CHAT_DELETE !== "APAGAR_APENAS_ANEXOS_ANTIGOS") {
  throw new Error("Para confirmar, defina CONFIRM_OLD_CHAT_DELETE=APAGAR_APENAS_ANEXOS_ANTIGOS.");
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY.");
const client = createClient(url, key, { auth: { persistSession: false } });
const oldBucket = "cong-message-attachments";
const { data: buckets, error: listError } = await client.storage.listBuckets();
if (listError) throw listError;
if (!buckets?.some(item => item.id === oldBucket)) {
  console.log("Bucket antigo não existe. Nenhuma alteração.");
  process.exit(0);
}
const { error: emptyError } = await client.storage.emptyBucket(oldBucket);
if (emptyError) throw emptyError;
const { error: removeError } = await client.storage.deleteBucket(oldBucket);
if (removeError) throw removeError;
console.log("Bucket antigo de mensagens removido; os arquivos de outros módulos não foram afetados.");
