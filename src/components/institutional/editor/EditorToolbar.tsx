import {
  FiChevronLeft,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiHelpCircle,
  FiMonitor,
  FiSmartphone,
  FiTablet,
} from "react-icons/fi";

import styles from "./EditorToolbar.module.css";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export default function EditorToolbar({
  title,
  subtitle,
  device,
  savingState,
  publishing,
  published,
  canUndo = false,
  canRedo = false,
  showBrand = true,
  publishLabel,
  onBack,
  onDeviceChange,
  onHelp,
  onUndo,
  onRedo,
  onPreview,
  onBrand,
  onPublish,
}: {
  title: string;
  subtitle: string;
  device: PreviewDevice;
  savingState: "idle" | "saving" | "saved" | "error";
  publishing: boolean;
  published: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  showBrand?: boolean;
  publishLabel?: string;
  onBack: () => void;
  onDeviceChange: (device: PreviewDevice) => void;
  onHelp: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onPreview: () => void;
  onBrand?: () => void;
  onPublish: () => void;
}) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.start}>
        <button type="button" className={styles.iconButton} onClick={onBack} aria-label="Voltar">
          <FiChevronLeft />
        </button>
        <div className={styles.title}>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className={styles.devices} aria-label="Tamanho da visualização">
        <button type="button" className={device === "desktop" ? styles.active : ""} onClick={() => onDeviceChange("desktop")} aria-label="Visualização desktop"><FiMonitor /></button>
        <button type="button" className={device === "tablet" ? styles.active : ""} onClick={() => onDeviceChange("tablet")} aria-label="Visualização tablet"><FiTablet /></button>
        <button type="button" className={device === "mobile" ? styles.active : ""} onClick={() => onDeviceChange("mobile")} aria-label="Visualização mobile"><FiSmartphone /></button>
      </div>

      <div className={styles.end}>
        <div className={styles.historyButtons} aria-label="Histórico de edição">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Desfazer" title="Desfazer (Ctrl+Z)"><FiCornerUpLeft /></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)"><FiCornerUpRight /></button>
        </div>
        <span className={`${styles.saveState} ${savingState === "error" ? styles.saveError : ""}`}>
          {savingState === "saving" ? "Salvando..." : savingState === "error" ? "Não foi possível salvar" : "Salvo"}
        </span>

        <button type="button" className={styles.textButton} onClick={onHelp}>
          <FiHelpCircle /> Ajuda
        </button>
        {showBrand && onBrand ? (
          <button type="button" className={styles.textButton} onClick={onBrand}>Marca</button>
        ) : null}
        <button type="button" className={styles.textButton} onClick={onPreview}>Visualizar</button>
        <button type="button" className={styles.publishButton} onClick={onPublish} disabled={publishing}>
          {publishing ? "Publicando..." : publishLabel ?? (published ? "Publicar nova versão" : "Publicar site")}
        </button>
      </div>
    </header>
  );
}
