import { useEffect, useState } from "react";
import { FiDownload, FiExternalLink, FiFile, FiMaximize2 } from "react-icons/fi";
import { downloadEncryptedAttachment, type MessageScope } from "../../../services/messagesService";
import { decryptAttachment, type SecureAttachment } from "../../../services/messageAttachments";
import MessageMediaViewer from "./MessageMediaViewer";
import MessageAudioPlayer from "./MessageAudioPlayer";
import styles from "./MessageAttachmentDisplay.module.css";

/** The server stores encrypted bytes; the preview URL is created only after local decryption. */
export default function MessageAttachmentDisplay({
  attachment, scope, conversationId, onError,
}: {
  attachment: SecureAttachment;
  scope: MessageScope;
  conversationId: string;
  onError: (reason: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const category = attachment.mime.startsWith("image/") ? "image" : attachment.mime.startsWith("audio/") ? "audio" : attachment.mime.startsWith("video/") ? "video" : "other";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    async function load() {
      try {
        const { ciphertext } = await downloadEncryptedAttachment(scope, conversationId, attachment.id);
        const blob = await decryptAttachment(ciphertext, attachment);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) onError("Não foi possível abrir este anexo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // The attachment identity and conversation are stable for this renderer instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id, conversationId, scope]);

  function download() {
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.name.replace(/[\\/]/g, "_");
    anchor.click();
  }

  return (
    <div className={styles.attachment} onClick={(event) => event.stopPropagation()}>
      {loading ? <span className={styles.loading}>Abrindo mídia...</span> : null}
      {category === "image" && url ? (
        <button type="button" className={styles.previewButton} onClick={() => setOpen(true)} aria-label={`Ampliar foto: ${attachment.name}`}>
          <img src={url} alt={attachment.caption || attachment.name} />
          <span className={styles.expandIcon}><FiMaximize2 aria-hidden="true" /></span>
        </button>
      ) : null}
      {category === "video" && url ? (
        <button type="button" className={styles.previewButton} onClick={() => setOpen(true)} aria-label={`Reproduzir vídeo: ${attachment.name}`}>
          <video src={url} preload="metadata" muted playsInline aria-hidden="true" />
          <span className={styles.expandIcon}><FiExternalLink aria-hidden="true" /></span>
        </button>
      ) : null}
      {category === "audio" && url ? (
        <div className={styles.audioShell}>
          <MessageAudioPlayer key={url} url={url} name={`Mensagem de voz: ${attachment.name}`} />
        </div>
      ) : null}
      {category === "other" && !loading ? (
        <button type="button" className={styles.fileButton} onClick={download} disabled={!url} aria-label={`Baixar ${attachment.name}`}>
          <FiFile aria-hidden="true" />
          <span>{attachment.name}</span>
          <FiDownload aria-hidden="true" />
        </button>
      ) : null}
      {attachment.caption && (category === "image" || category === "video") ? (
        <p className={styles.caption}>{attachment.caption}</p>
      ) : null}
      {open && url && (category === "image" || category === "video") ? (
        <MessageMediaViewer url={url} name={attachment.name} caption={attachment.caption} kind={category} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
