import { useEffect, useState } from "react";
import { FiDownload, FiFile, FiMaximize2 } from "react-icons/fi";
import MessageMediaViewer from "./MessageMediaViewer";
import MessageAudioPlayer from "./MessageAudioPlayer";
import {
  getMessageAttachmentLink,
  type MessageScope,
} from "../../../services/messagesService";
import {
  MAX_INLINE_PREVIEW_BYTES,
  PREVIEW_IMAGE_TYPES,
  PREVIEW_VIDEO_TYPES,
  PREVIEW_AUDIO_TYPES,
} from "../../../services/messageAttachments";
import styles from "./MessageAttachmentDisplay.module.css";

export default function MessageAttachmentDisplay({
  id,
  conversationId,
  scope,
  name,
  mime,
  size,
  caption,
  onError,
}: {
  id: string;
  conversationId: string;
  scope: MessageScope;
  name: string;
  mime: string;
  size: number;
  caption?: string;
  onError: (text: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  const inline = size <= MAX_INLINE_PREVIEW_BYTES;
  const image = inline && PREVIEW_IMAGE_TYPES.has(mime);
  const video = inline && PREVIEW_VIDEO_TYPES.has(mime);
  const audio = inline && PREVIEW_AUDIO_TYPES.has(mime);
  useEffect(() => {
    if (!image && !video && !audio) return;
    let disposed = false;
    let localUrl: string | null = null;
    void getMessageAttachmentLink(scope, conversationId, id)
      .then(({ url: remote }) => fetch(remote))
      .then((r) => {
        if (!r.ok) throw new Error("Anexo indisponível.");
        return r.blob();
      })
      .then((blob) => {
        if (disposed) return;
        localUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
        setUrl(localUrl);
      })
      .catch(() => {
        if (!disposed) onError("Falha ao abrir anexo.");
      });
    return () => {
      disposed = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
    // One authorized request per attachment mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, conversationId, scope]);
  async function download() {
    try {
      const signed = await getMessageAttachmentLink(scope, conversationId, id);
      const response = await fetch(signed.url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = name.replace(/[\\/]/g, "_");
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      onError("Não foi possível baixar o arquivo.");
    }
  }
  return (
    <div
      className={styles.wrapper}
      onClick={(event) => event.stopPropagation()}
    >
      {(image || video) && url ? (
        <button
          type="button"
          className={styles.preview}
          onClick={() => setViewer(true)}
          title="Ampliar"
        >
          {image ? (
            <img src={url} alt={caption || name} />
          ) : (
            <video src={url} muted playsInline preload="metadata" />
          )}
          <FiMaximize2 className={styles.expand} />
        </button>
      ) : null}
      {audio && url ? <MessageAudioPlayer url={url} name={name} /> : null}
      {!image && !video && !audio ? (
        <button
          className={styles.document}
          type="button"
          onClick={() => void download()}
        >
          <FiFile />
          <span>
            {name}
            <small>{(size / 1_000_000).toFixed(2)} MB · Documento</small>
          </span>
          <FiDownload />
        </button>
      ) : null}
      {(image || video || audio) && !url ? (
        <div className={styles.loading}>Carregando mídia...</div>
      ) : null}
      {viewer && url && (image || video) ? (
        <MessageMediaViewer
          url={url}
          name={name}
          caption={caption}
          kind={image ? "image" : "video"}
          onClose={() => setViewer(false)}
        />
      ) : null}
    </div>
  );
}
