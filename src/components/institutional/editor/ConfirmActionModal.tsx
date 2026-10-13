import type { ReactNode } from "react";

import ModalMensagem from "../../modalMensagem/ModalMensagem";

import styles from "./ConfirmActionModal.module.css";

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  tone = "primary",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalMensagem
      aberto={open}
      titulo={title}
      tamanho="pequeno"
      mostrarBotaoOk={false}
      onFechar={onCancel}
      mensagem={
        <div className={styles.content}>
          <div className={styles.description}>{description}</div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onCancel}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={tone === "danger" ? styles.danger : styles.confirm}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Processando..." : confirmLabel}
            </button>
          </div>
        </div>
      }
    />
  );
}
