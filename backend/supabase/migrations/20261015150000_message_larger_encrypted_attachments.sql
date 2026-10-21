begin;
-- 25 MB plaintext plus 16 bytes AES-GCM authentication tag; only ciphertext is stored.
-- This bucket stays private. The Express API issues one-path short-lived upload grants
-- and short-lived signed download URLs after membership checks.
update storage.buckets
   set file_size_limit = 25000016
 where id = 'cong-message-attachments'
   and public = false;
commit;
