import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import FileUploader from "../../../../components/upload/FileUploader";

import type {
  UploadExecutionOptions,
} from "../../../../components/upload/types";

import styles from "./AvatarUploader.module.css";

type LocalAvatarDraft =
  | {
      type: "unchanged";
    }
  | {
      type: "upload";
      file: File;
      previewUrl: string;
    }
  | {
      type: "default";
    };

interface AvatarUploaderProps {
  open: boolean;

  currentAvatarUrl: string;

  defaultAvatarUrl: string;

  usingDefaultAvatar: boolean;

  name: string;

  onSelectFile: (
    file: File,
  ) => void;

  onUseDefault: () => void;

  onClose: () => void;
}

export default function AvatarUploader({
  open,
  currentAvatarUrl,
  defaultAvatarUrl,
  usingDefaultAvatar,
  name,
  onSelectFile,
  onUseDefault,
  onClose,
}: AvatarUploaderProps) {
  const previewUrlRef =
    useRef<string | null>(null);

  const [
    localDraft,
    setLocalDraft,
  ] = useState<LocalAvatarDraft>({
    type: "unchanged",
  });

  const [
    uploaderKey,
    setUploaderKey,
  ] = useState(0);

  const clearPreview =
    useCallback((): void => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        );

        previewUrlRef.current =
          null;
      }
    }, []);

  const resetLocalDraft =
    useCallback((): void => {
      clearPreview();

      setLocalDraft({
        type: "unchanged",
      });

      setUploaderKey(
        (current) =>
          current + 1,
      );
    }, [clearPreview]);

  const handleCancel =
    useCallback((): void => {
      resetLocalDraft();

      onClose();
    }, [
      onClose,
      resetLocalDraft,
    ]);

  /*
   * Enquanto o modal estiver aberto,
   * bloqueamos o scroll da página.
   *
   * Nenhum setState acontece aqui.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  /*
   * Escape cancela somente as alterações
   * feitas dentro deste modal.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key === "Escape"
      ) {
        handleCancel();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    handleCancel,
  ]);

  /*
   * Limpa qualquer Object URL que ainda
   * exista se o componente for desmontado.
   */
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  if (!open) {
    return null;
  }

  const previewUrl =
    localDraft.type === "upload"
      ? localDraft.previewUrl
      : localDraft.type ===
          "default"
        ? defaultAvatarUrl
        : currentAvatarUrl;

  const previewIsDefault =
    localDraft.type ===
      "default" ||
    (
      localDraft.type ===
        "unchanged" &&
      usingDefaultAvatar
    );

  const changed =
    localDraft.type !==
    "unchanged";

  /*
   * O botão "Enviar" do FileUploader
   * NÃO envia ao backend neste contexto.
   *
   * Ele apenas confirma localmente a foto
   * escolhida e a move para a prévia.
   */
  async function stageFile(
    file: File,
    options: UploadExecutionOptions,
  ): Promise<void> {
    clearPreview();

    const preview =
      URL.createObjectURL(file);

    previewUrlRef.current =
      preview;

    options.onProgress(1);

    setLocalDraft({
      type: "upload",
      file,
      previewUrl: preview,
    });
  }

  /*
   * Depois de "Enviar", recriamos o
   * FileUploader vazio.
   */
  function handleFileStaged(): void {
    setUploaderKey(
      (current) =>
        current + 1,
    );
  }

  function handleUseDefault(): void {
    clearPreview();

    setLocalDraft({
      type: "default",
    });

    setUploaderKey(
      (current) =>
        current + 1,
    );
  }

  /*
   * Salvar aqui significa confirmar
   * apenas o rascunho do avatar.
   *
   * O backend continua intocado.
   */
  function handleSave(): void {
    if (
      localDraft.type ===
      "upload"
    ) {
      onSelectFile(
        localDraft.file,
      );
    }

    if (
      localDraft.type ===
      "default"
    ) {
      onUseDefault();
    }

    resetLocalDraft();

    onClose();
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleCancel();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-uploader-title"
      >
        <header
          className={
            styles.modalHeader
          }
        >
          <h2
            id="avatar-uploader-title"
          >
            Alterar foto
          </h2>

          <button
            type="button"
            className={
              styles.closeButton
            }
            aria-label="Fechar"
            onClick={
              handleCancel
            }
          >
            <FiX />
          </button>
        </header>

        <div
          className={
            styles.previewArea
          }
        >
          <div
            className={
              styles.avatarPreview
            }
          >
            <img
              src={previewUrl}
              alt={`Prévia da foto de ${name}`}
            />
          </div>

          <button
            type="button"
            className={
              styles.defaultAction
            }
            disabled={
              previewIsDefault
            }
            onClick={
              handleUseDefault
            }
          >
            <FiRefreshCw />

            {previewIsDefault
              ? "Avatar padrão em uso"
              : "Usar avatar padrão"}
          </button>
        </div>

        <div
          className={
            styles.uploaderArea
          }
        >
          <FileUploader
            key={uploaderKey}
            title=""
            description=""
            accept={[
              "image/jpeg",
              "image/png",
              "image/webp",
            ]}
            maxSize={
              5 * 1024 * 1024
            }
            maxFiles={1}
            multiple={false}
            autoUpload={false}
            onUpload={
              stageFile
            }
            onUploaded={
              handleFileStaged
            }
          />
        </div>

        <footer
          className={
            styles.modalFooter
          }
        >
          <button
            type="button"
            className={
              styles.cancelButton
            }
            onClick={
              handleCancel
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className={
              styles.saveButton
            }
            disabled={
              !changed
            }
            onClick={
              handleSave
            }
          >
            Salvar
          </button>
        </footer>
      </section>
    </div>
  );
}