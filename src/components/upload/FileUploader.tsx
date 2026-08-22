import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiFile,
  FiRefreshCw,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import type { FileUploaderProps, UploadStatus } from "./types";

import styles from "./FileUploader.module.css";

interface UploadItem {
  id: string;
  file: File;

  previewUrl: string | null;

  status: UploadStatus;
  progress: number;

  error: string | null;

  controller: AbortController | null;
}

interface RejectedFile {
  id: string;
  message: string;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function FileUploader({
  title = "Enviar arquivo",

  description = "Arraste um arquivo aqui ou escolha do seu computador.",

  accept = [],

  maxSize = DEFAULT_MAX_SIZE,

  maxFiles = 1,

  multiple = false,

  autoUpload = false,

  onUpload,

  onUploaded,

  mode = "upload",
  onSelect,
  onRemove,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dragDepthRef = useRef(0);

  const itemsRef = useRef<UploadItem[]>([]);

  const [items, setItems] = useState<UploadItem[]>([]);

  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }

        item.controller?.abort();
      });
    };
  }, []);

  function updateItem(
    id: string,
    changes: Partial<UploadItem> | ((item: UploadItem) => Partial<UploadItem>),
  ): void {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const nextChanges =
          typeof changes === "function" ? changes(item) : changes;

        return {
          ...item,
          ...nextChanges,
        };
      }),
    );
  }

  function rejectFile(message: string): void {
    const rejection = {
      id: createId(),
      message,
    };

    setRejected((current) => [...current, rejection]);

    window.setTimeout(() => {
      setRejected((current) =>
        current.filter((item) => item.id !== rejection.id),
      );
    }, 5000);
  }

  function validateFile(file: File, currentItems: UploadItem[]): string | null {
    if (file.size === 0) {
      return `${file.name}: o arquivo está vazio.`;
    }

    if (file.size > maxSize) {
      return `${file.name}: tamanho máximo de ` + `${formatFileSize(maxSize)}.`;
    }

    if (accept.length > 0 && !accept.includes(file.type)) {
      return `${file.name}: formato não permitido.`;
    }

    const duplicated = currentItems.some(
      (item) =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified,
    );

    if (duplicated) {
      return `${file.name}: este arquivo já foi adicionado.`;
    }

    return null;
  }

  async function beginUpload(item: UploadItem): Promise<void> {
    if (!onUpload) {
      return;
    }
    const controller = new AbortController();

    updateItem(item.id, {
      status: "uploading",
      progress: 0,
      error: null,
      controller,
    });

    try {
      await onUpload(item.file, {
        signal: controller.signal,

        onProgress: (progress) => {
          updateItem(item.id, {
            progress: Math.min(1, Math.max(0, progress)),
          });
        },
      });

      updateItem(item.id, {
        status: "success",
        progress: 1,
        controller: null,
      });

      onUploaded?.(item.file);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateItem(item.id, {
          status: "ready",
          progress: 0,
          controller: null,
          error: null,
        });

        return;
      }

      updateItem(item.id, {
        status: "error",
        controller: null,

        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o arquivo.",
      });
    }
  }

  function addFiles(fileList: FileList | File[]): void {
    const incoming = Array.from(fileList);

    if (incoming.length === 0) {
      return;
    }

    const current = itemsRef.current;

    const availableSlots = Math.max(0, maxFiles - current.length);

    if (availableSlots === 0) {
      rejectFile(
        `Você pode enviar no máximo ${maxFiles} arquivo${
          maxFiles === 1 ? "" : "s"
        }.`,
      );

      return;
    }

    const allowedIncoming = multiple
      ? incoming.slice(0, availableSlots)
      : incoming.slice(0, 1);

    if (incoming.length > allowedIncoming.length) {
      rejectFile(
        `O limite é de ${maxFiles} arquivo${maxFiles === 1 ? "" : "s"}.`,
      );
    }

    const created: UploadItem[] = [];

    let virtualItems = [...current];

    for (const file of allowedIncoming) {
      const validationError = validateFile(file, virtualItems);

      if (validationError) {
        rejectFile(validationError);

        continue;
      }

      const item: UploadItem = {
        id: createId(),

        file,

        previewUrl: isImage(file) ? URL.createObjectURL(file) : null,

        status: "ready",
        progress: 0,

        error: null,

        controller: null,
      };

      created.push(item);

      virtualItems = [...virtualItems, item];
    }

    if (created.length === 0) {
      return;
    }

    setItems((currentItems) => [...currentItems, ...created]);

    if (mode === "selection") {
      created.forEach((item) => {
        onSelect?.(item.file);
      });

      return;
    }

    if (autoUpload) {
      created.forEach((item) => {
        void beginUpload(item);
      });
    }
  }

  function removeItem(item: UploadItem): void {
    item.controller?.abort();

    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    onRemove?.(item.file);

    setItems((current) =>
      current.filter((candidate) => candidate.id !== item.id),
    );
  }

  function cancelUpload(item: UploadItem): void {
    item.controller?.abort();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();

    dragDepthRef.current = 0;

    setDragging(false);

    addFiles(event.dataTransfer.files);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();

    dragDepthRef.current += 1;

    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();

    dragDepthRef.current -= 1;

    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;

      setDragging(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>): void {
    const clipboardFiles = event.clipboardData.files;

    if (clipboardFiles.length === 0) {
      return;
    }

    event.preventDefault();

    addFiles(clipboardFiles);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      inputRef.current?.click();
    }
  }

  return (
    <section className={styles.uploader} onPaste={handlePaste}>
      {(title || description || maxFiles > 1) && (
        <header className={styles.header}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}

            {description && <p className={styles.description}>{description}</p>}
          </div>

          {maxFiles > 1 && (
            <span className={styles.counter}>
              {items.length}/{maxFiles}
            </span>
          )}
        </header>
      )}

      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept={accept.length > 0 ? accept.join(",") : undefined}
        multiple={multiple}
        onChange={handleInputChange}
      />

      <div
        className={styles.dropzone}
        data-dragging={dragging ? "true" : undefined}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.dropIcon}>
          <FiUploadCloud />
        </div>

        <div className={styles.dropText}>
          <strong>
            {dragging ? "Pode soltar aqui" : "Arraste seu arquivo aqui"}
          </strong>

          <span>
            ou <u>escolha do computador</u>
          </span>

          <small>Você também pode colar um arquivo com Ctrl+V.</small>
        </div>
      </div>

      {rejected.length > 0 && (
        <div className={styles.rejections}>
          {rejected.map((item) => (
            <div key={item.id} className={styles.rejection}>
              <FiAlertCircle />

              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.fileList}>
          {items.map((item) => {
            const percentage = Math.round(item.progress * 100);

            const progressStyle = {
              "--upload-progress": `${percentage}%`,
            } as CSSProperties;

            return (
              <article
                key={item.id}
                className={styles.fileItem}
                data-status={item.status}
                style={progressStyle}
              >
                <div className={styles.preview}>
                  {item.previewUrl ? (
                    <>
                      <img
                        className={styles.previewGhost}
                        src={item.previewUrl}
                        alt=""
                      />

                      <img
                        className={styles.previewProgress}
                        src={item.previewUrl}
                        alt=""
                      />
                    </>
                  ) : (
                    <FiFile />
                  )}

                  {item.status === "success" && (
                    <div className={styles.successBadge}>
                      <FiCheck />
                    </div>
                  )}
                </div>

                <div className={styles.fileContent}>
                  <div className={styles.fileHeading}>
                    <strong>{item.file.name}</strong>

                    <span>{formatFileSize(item.file.size)}</span>
                  </div>

                  <div className={styles.progressTrack} aria-hidden="true">
                    <div className={styles.progressBar} />
                  </div>

                  <div className={styles.fileFooter}>
                    <span className={styles.statusText}>
                      {item.status === "ready" &&
                        (mode === "selection"
                          ? "Selecionado"
                          : "Pronto para enviar")}

                      {item.status === "uploading" &&
                        `Enviando · ${percentage}%`}

                      {item.status === "success" && "Enviado com sucesso"}

                      {item.status === "error" &&
                        (item.error || "Falha no envio")}
                    </span>

                    <div className={styles.actions}>
                      {item.status === "ready" &&
                        mode === "upload" &&
                        !autoUpload && (
                          <button
                            type="button"
                            className={styles.primaryAction}
                            onClick={() => void beginUpload(item)}
                          >
                            <FiUploadCloud />
                            Enviar
                          </button>
                        )}

                      {item.status === "uploading" && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="Cancelar envio"
                          onClick={() => cancelUpload(item)}
                        >
                          <FiX />
                        </button>
                      )}

                      {item.status === "error" && (
                        <button
                          type="button"
                          className={styles.retryButton}
                          onClick={() => void beginUpload(item)}
                        >
                          <FiRefreshCw />
                          Tentar novamente
                        </button>
                      )}

                      {item.status !== "uploading" && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="Remover arquivo"
                          onClick={() => removeItem(item)}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
