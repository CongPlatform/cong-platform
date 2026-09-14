import { useEffect, useRef, useState } from "react";
import { FiX, FiLink, FiFileText, FiPaperclip } from "react-icons/fi";
import FileUploader from "../upload/FileUploader";
import type { UploadExecutionOptions } from "../upload/types";
import { apiUpload } from "../../services/api";
import {
  deleteCommunityMedia,
  getCommunityLinkPreview,
  type CommunityMedia,
  type CommunityLinkPreview,
} from "../../services/communityService";
import styles from "./CommunityMedia.module.css";

interface Props {
  media: CommunityMedia[];
  onMedia: (media: CommunityMedia[]) => void;
  link: CommunityLinkPreview | null;
  onLink: (link: CommunityLinkPreview | null) => void;
  text: string;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}

const COMMUNITY_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const COMMUNITY_MEDIA_MAX_SIZE = 4 * 1024 * 1024;

export default function CommunityMediaEditor({
  media,
  onMedia,
  link,
  onLink,
  text,
  disabled,
  onBusy,
}: Props) {
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  const linkCallback = useRef(onLink);
  const [uploading, setUploading] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [dismissedUrl, setDismissedUrl] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const automaticUrl =
    text.match(/https:\/\/[^\s<>]+/i)?.[0]?.replace(/[.,;!?)\]]+$/, "") ?? "";
  const candidate = manualUrl.trim() || automaticUrl;

  useEffect(() => {
    linkCallback.current = onLink;
  }, [onLink]);

  useEffect(() => {
    onBusy(
      uploading ||
        (previewBusy &&
          Boolean(candidate) &&
          candidate !== link?.url &&
          candidate !== dismissedUrl),
    );
  }, [uploading, previewBusy, candidate, link?.url, dismissedUrl, onBusy]);

  useEffect(() => {
    mounted.current = true;
    const ids = pending.current;

    return () => {
      mounted.current = false;
      for (const id of ids) void deleteCommunityMedia(id).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (
      !candidate ||
      candidate === dismissedUrl ||
      candidate === link?.url ||
      disabled
    )
      return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPreviewBusy(true);
      setLinkError("");
      void getCommunityLinkPreview(candidate)
        .then((preview) => {
          if (!cancelled) linkCallback.current(preview);
        })
        .catch((error) => {
          if (!cancelled)
            setLinkError(
              error instanceof Error ? error.message : "Prévia indisponível.",
            );
        })
        .finally(() => {
          if (!cancelled) setPreviewBusy(false);
        });
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [candidate, dismissedUrl, link?.url, disabled]);

  async function send(file: File, options: UploadExecutionOptions) {
    if (disabled || uploading) return;
    if (media.length >= 4) {
      throw new Error("Você pode anexar até quatro arquivos.");
    }

    setError("");
    setUploading(true);

    try {
      const uploaded = await apiUpload<CommunityMedia>(
        "/community/media",
        file,
        {
          signal: options.signal,
          onProgress: options.onProgress,
        },
      );

      pending.current.add(uploaded.id);

      if (mounted.current) {
        onMedia([...media, uploaded]);
      } else {
        void deleteCommunityMedia(uploaded.id).catch(() => {});
      }
    } catch (uploadError) {
      if (mounted.current) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Falha ao enviar o anexo.";
        setError(message);
      }
      throw uploadError;
    } finally {
      if (mounted.current) setUploading(false);
    }
  }

  async function remove(item: CommunityMedia) {
    if (disabled || uploading) return;

    if (pending.current.has(item.id)) {
      try {
        await deleteCommunityMedia(item.id);
        pending.current.delete(item.id);
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : "Não foi possível remover o anexo.",
        );
        return;
      }
    }

    onMedia(media.filter((current) => current.id !== item.id));
  }

  return (
    <div className={styles.editor}>
      <div className={styles.tools}>
        {media.length < 4 ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => setUploaderOpen((value) => !value)}
            aria-expanded={uploaderOpen}
          >
            <FiPaperclip />
            Imagem ou arquivo
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setLinkOpen((value) => !value)}
          aria-expanded={linkOpen}
        >
          <FiLink />
          Link
        </button>
        <small>{media.length}/4 anexos · até 4 MB cada</small>
      </div>

      {uploaderOpen && media.length < 4 ? (
        <FileUploader
          key={uploaderKey}
          title="Adicionar imagem ou arquivo"
          description="Arraste, cole ou escolha JPG, PNG, WebP ou PDF de até 4 MB."
          accept={COMMUNITY_MEDIA_TYPES}
          maxSize={COMMUNITY_MEDIA_MAX_SIZE}
          maxFiles={1}
          multiple={false}
          autoUpload
          disabled={disabled || uploading}
          onUpload={send}
          onUploaded={() => {
            setUploaderKey((current) => current + 1);
            setUploaderOpen(false);
          }}
        />
      ) : null}

      {media.length ? (
        <div className={styles.editGrid}>
          {media.map((item) => (
            <div className={styles.editAttachment} key={item.id}>
              {item.mimeType.startsWith("image/") ? (
                <img src={item.url} alt={item.name} decoding="async" />
              ) : (
                <FiFileText />
              )}
              <span title={item.name}>{item.name}</span>
              <button
                type="button"
                disabled={disabled || uploading}
                aria-label={`Remover ${item.name}`}
                onClick={() => void remove(item)}
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {linkOpen ? (
        <label className={styles.urlField}>
          <span>Link da publicação</span>
          <input
            type="url"
            value={manualUrl}
            maxLength={1000}
            disabled={disabled}
            placeholder="https://..."
            onChange={(event) => {
              setManualUrl(event.target.value);
              setDismissedUrl("");
            }}
          />
        </label>
      ) : null}

      {previewBusy && candidate !== link?.url && candidate !== dismissedUrl ? (
        <small role="status">Carregando prévia do link...</small>
      ) : null}

      {link ? (
        <div className={styles.previewWrapper}>
          <a
            className={styles.linkPreview}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <small>{link.hostname}</small>
            <strong>{link.title}</strong>
            <p>{link.description}</p>
          </a>
          <button
            type="button"
            disabled={disabled}
            aria-label="Remover prévia do link"
            onClick={() => {
              setDismissedUrl(candidate);
              onLink(null);
            }}
          >
            <FiX />
          </button>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {linkError && candidate !== dismissedUrl ? (
        <p className={styles.error} role="status">
          {linkError}
        </p>
      ) : null}
    </div>
  );
}
