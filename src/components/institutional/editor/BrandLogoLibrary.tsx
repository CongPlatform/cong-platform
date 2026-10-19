import { useState, type ClipboardEvent, type DragEvent } from "react";
import {
  FiCheck,
  FiClipboard,
  FiImage,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import type {
  InstitutionalBrand,
  InstitutionalLogoVariant,
  InstitutionalMediaAsset,
} from "../../../services/institutionalService";
import styles from "./BrandLogoLibrary.module.css";

type Slot = "primary" | InstitutionalLogoVariant;
const logoSlots: { key: Slot; title: string; description: string }[] = [
  {
    key: "primary",
    title: "Principal",
    description: "Versão padrão da organização",
  },
  {
    key: "compact",
    title: "Reduzida",
    description: "Símbolo ou versão horizontal curta",
  },
  { key: "light", title: "Clara", description: "Para superfícies escuras" },
  { key: "dark", title: "Escura", description: "Para superfícies claras" },
];

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export default function BrandLogoLibrary({
  brand,
  primaryId,
  variantIds,
  uploaded,
  onChange,
  onUpload,
  disabled,
}: {
  brand: InstitutionalBrand;
  primaryId: string | null;
  variantIds: Partial<Record<InstitutionalLogoVariant, string | null>>;
  uploaded: Partial<Record<Slot, InstitutionalMediaAsset>>;
  onChange: (slot: Slot, id: string | null) => void;
  onUpload: (slot: Slot, file: File) => Promise<void>;
  disabled: boolean;
}) {
  const [busySlot, setBusySlot] = useState<Slot | null>(null);
  const [message, setMessage] = useState("");

  async function upload(slot: Slot, file: File | undefined): Promise<void> {
    if (!file || disabled || busySlot) return;
    if (!acceptedTypes.has(file.type)) {
      setMessage(
        "Envie uma imagem PNG, JPG ou WebP. SVG ainda não é aceito por segurança.",
      );
      return;
    }
    setMessage("");
    setBusySlot(slot);
    try {
      await onUpload(slot, file);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar esta imagem.",
      );
    } finally {
      setBusySlot(null);
    }
  }

  async function pasteFromClipboard(slot: Slot): Promise<void> {
    try {
      if (!navigator.clipboard?.read) {
        setMessage("Clique no cartão e pressione Ctrl+V para colar a imagem.");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const mime = item.types.find((type) => acceptedTypes.has(type));
        if (!mime) continue;
        const blob = await item.getType(mime);
        const extension =
          mime === "image/jpeg"
            ? "jpg"
            : mime === "image/webp"
              ? "webp"
              : "png";
        await upload(
          slot,
          new File([blob], `logo-${slot}.${extension}`, { type: mime }),
        );
        return;
      }
      setMessage(
        "A área de transferência não contém uma imagem PNG, JPG ou WebP.",
      );
    } catch {
      setMessage(
        "O navegador bloqueou a leitura. Clique no cartão e pressione Ctrl+V.",
      );
    }
  }

  function pasteEvent(slot: Slot, event: ClipboardEvent<HTMLDivElement>): void {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      acceptedTypes.has(entry.type),
    );
    if (!item) return;
    event.preventDefault();
    const file = item.getAsFile();
    if (file) void upload(slot, file);
  }

  function dropFile(slot: Slot, event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    void upload(slot, event.dataTransfer.files[0]);
  }

  return (
    <section
      className={styles.library}
      aria-label="Biblioteca de logos da organização"
    >
      <div className={styles.intro}>
        <strong>Suas versões da marca</strong>
        <p>
          Salve as versões que já possui. Arraste um arquivo, escolha no
          computador ou cole uma imagem copiada.
        </p>
      </div>
      <div className={styles.grid}>
        {logoSlots.map(({ key, title, description }) => {
          const selectedId = key === "primary" ? primaryId : variantIds[key];
          const currentAsset =
            key === "primary"
              ? brand.logoAsset
              : brand.logoVariantAssets?.[key];
          const preview =
            uploaded[key]?.id === selectedId
              ? uploaded[key]
              : currentAsset?.id === selectedId
                ? currentAsset
                : null;
          const busy = busySlot === key;
          const pending = uploaded[key]?.id === selectedId;
          return (
            <div
              key={key}
              className={styles.card}
              data-slot={key}
              aria-label={`Logo ${title.toLowerCase()}. Cole com Ctrl+V ou arraste uma imagem.`}
              tabIndex={0}
              role="group"
              onPaste={(event) => pasteEvent(key, event)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropFile(key, event)}
            >
              <div className={styles.preview}>
                {preview ? (
                  <img
                    src={preview.url}
                    alt={`Versão ${title.toLowerCase()} da logo`}
                  />
                ) : (
                  <FiImage aria-hidden="true" />
                )}
                {selectedId && preview ? (
                  <span className={styles.allocated}>
                    <FiCheck aria-hidden="true" />{" "}
                    {pending ? "A salvar" : "Salva"}
                  </span>
                ) : null}
              </div>
              <div className={styles.meta}>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
              <div className={styles.actions}>
                <label className={styles.fileButton}>
                  <FiUploadCloud aria-hidden="true" />{" "}
                  {busy ? "Enviando..." : preview ? "Trocar" : "Adicionar"}
                  <input
                    aria-label={`Enviar logo ${title.toLowerCase()}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={disabled || Boolean(busySlot)}
                    onChange={(event) => {
                      void upload(key, event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Colar imagem copiada"
                  aria-label={`Colar logo ${title.toLowerCase()}`}
                  disabled={disabled || Boolean(busySlot)}
                  onClick={() => void pasteFromClipboard(key)}
                >
                  <FiClipboard aria-hidden="true" />
                </button>
                {selectedId ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Remover esta versão"
                    aria-label={`Remover logo ${title.toLowerCase()}`}
                    disabled={disabled || Boolean(busySlot)}
                    onClick={() => onChange(key, null)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
      <small className={styles.note}>
        PNG, JPG ou WebP. As alterações da biblioteca só são confirmadas ao
        clicar em “Salvar identidade”.
      </small>
    </section>
  );
}
