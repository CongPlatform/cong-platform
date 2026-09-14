import { useRef, useState } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import {
  reportCommunityContent,
  type CommunityReportReason,
  type CommunityReportTargetType,
} from "../../services/communityService";
import { useModalFocus } from "../../hooks/useModalFocus";
import styles from "./CommunityReportModal.module.css";

interface Props {
  targetType: CommunityReportTargetType;
  targetId: string;
  targetLabel: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const reasons: Array<{ value: CommunityReportReason; label: string }> = [
  { value: "spam", label: "Spam ou conteúdo repetitivo" },
  { value: "harassment", label: "Assédio ou ataque pessoal" },
  { value: "hate", label: "Discurso de ódio ou discriminação" },
  { value: "misinformation", label: "Informação enganosa" },
  { value: "privacy", label: "Exposição indevida de dados ou privacidade" },
  { value: "scam", label: "Golpe, fraude ou solicitação suspeita" },
  { value: "other", label: "Outro motivo" },
];

export default function CommunityReportModal({
  targetType,
  targetId,
  targetLabel,
  onClose,
  onSubmitted,
}: Props) {
  const modalRef = useRef<HTMLElement>(null);
  useModalFocus(modalRef, onClose);

  const [reason, setReason] = useState<CommunityReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await reportCommunityContent({ targetType, targetId, reason, details });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a denúncia.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        tabIndex={-1}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-report-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span className={styles.alertIcon}>
            <FiAlertTriangle />
          </span>
          <div>
            <h2 id="community-report-title">Denunciar</h2>
            <p>{targetLabel}</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            <FiX />
          </button>
        </header>

        <label className={styles.field}>
          <span>Motivo</span>
          <select
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as CommunityReportReason)
            }
          >
            {reasons.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>
            Contexto adicional <small>opcional</small>
          </span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, 1200))}
            placeholder="Explique brevemente o problema para ajudar na análise."
            rows={4}
          />
          <small className={styles.counter}>{details.length}/1200</small>
        </label>

        <p className={styles.note}>
          A denúncia será registrada para análise. Denúncias repetidas do mesmo
          conteúdo não são aceitas.
        </p>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        <footer>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.submit}
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? "Enviando..." : "Enviar denúncia"}
          </button>
        </footer>
      </section>
    </div>
  );
}
