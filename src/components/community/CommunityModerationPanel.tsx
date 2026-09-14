import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiShield,
  FiX,
} from "react-icons/fi";
import {
  getCommunityModerationReports,
  reviewCommunityReport,
  type CommunityModerationReport,
} from "../../services/communityService";
import { useModalFocus } from "../../hooks/useModalFocus";
import styles from "./CommunityModerationPanel.module.css";

type StatusFilter = "pending" | "reviewed" | "actioned" | "dismissed" | "all";

const reasonLabels: Record<CommunityModerationReport["reason"], string> = {
  spam: "Spam",
  harassment: "Assédio",
  hate: "Ódio / discriminação",
  misinformation: "Informação enganosa",
  privacy: "Privacidade / dados",
  scam: "Golpe / fraude",
  other: "Outro",
};
const targetLabels: Record<CommunityModerationReport["targetType"], string> = {
  post: "Publicação",
  comment: "Comentário",
  user: "Perfil",
};
const statusLabels: Record<CommunityModerationReport["status"], string> = {
  pending: "Pendente",
  reviewed: "Revisada",
  actioned: "Com ação",
  dismissed: "Dispensada",
};

interface Props {
  onClose?: () => void;
  variant?: "modal" | "page";
}

export default function CommunityModerationPanel({
  onClose = () => undefined,
  variant = "modal",
}: Props) {
  const modal = variant === "modal";
  const panelRef = useRef<HTMLElement>(null);
  useModalFocus(panelRef, onClose, modal);

  const [status, setStatus] = useState<StatusFilter>("pending");
  const [reports, setReports] = useState<CommunityModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await getCommunityModerationReports(status));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as denúncias.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status === "pending").length,
    [reports],
  );

  const act = async (
    report: CommunityModerationReport,
    action: "review" | "dismiss" | "hide_content" | "restore_content",
  ) => {
    setBusyId(report.id);
    setError(null);
    try {
      const note =
        notes[report.id]?.trim() ||
        (action === "hide_content" ? reasonLabels[report.reason] : "");
      await reviewCommunityReport(report.id, action, note);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a moderação.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const panel = (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`${styles.panel} ${!modal ? styles.pagePanel : ""}`}
      role={modal ? "dialog" : "region"}
      aria-modal={modal || undefined}
      aria-labelledby="community-moderation-title"
      onMouseDown={modal ? (event) => event.stopPropagation() : undefined}
    >
      <header className={styles.header}>
        <span className={styles.shield}>
          <FiShield />
        </span>
        <div>
          <h2 id="community-moderation-title">Moderação da comunidade</h2>
          <p>
            Revise denúncias, registre o motivo e mantenha um histórico claro
            das decisões.
          </p>
        </div>
        {modal ? (
          <button type="button" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        ) : (
          <span />
        )}
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(
            [
              ["pending", "Pendentes"],
              ["reviewed", "Revisadas"],
              ["actioned", "Com ação"],
              ["dismissed", "Dispensadas"],
              ["all", "Todas"],
            ] as Array<[StatusFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={status === value ? styles.activeFilter : undefined}
              onClick={() => setStatus(value)}
            >
              {label}
              {value === "pending" && status === "pending" && pendingCount
                ? ` (${pendingCount})`
                : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => void load()}
          disabled={loading}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.state}>Carregando denúncias...</div>
        ) : reports.length === 0 ? (
          <div className={styles.state}>Nenhuma denúncia nesta categoria.</div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className={styles.report}>
              <div className={styles.reportTop}>
                <div>
                  <span className={styles.targetType}>
                    {targetLabels[report.targetType]}
                  </span>
                  <strong>{report.target.label}</strong>
                </div>
                <span
                  className={`${styles.status} ${styles[`status_${report.status}`]}`}
                >
                  {statusLabels[report.status]}
                </span>
              </div>
              <div className={styles.meta}>
                <span>
                  <b>Denúncia:</b> {reasonLabels[report.reason]}
                </span>
                <span>
                  <b>Por:</b> {report.reporter.displayName}
                  {report.reporter.username
                    ? ` (@${report.reporter.username})`
                    : ""}
                </span>
                <span>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(report.createdAt))}
                </span>
              </div>
              {report.target.excerpt ? (
                <div className={styles.targetPreview}>
                  <small>Conteúdo denunciado</small>
                  <p>{report.target.excerpt}</p>
                </div>
              ) : null}
              {report.details ? (
                <p className={styles.details}>
                  <b>Contexto da denúncia:</b> {report.details}
                </p>
              ) : null}
              {report.targetType !== "user" ? (
                <label className={styles.moderationNote}>
                  <span>
                    Motivo / observação da moderação{" "}
                    <small>
                      será visível ao autor se o conteúdo for removido
                    </small>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={1200}
                    value={notes[report.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [report.id]: event.target.value,
                      }))
                    }
                    placeholder={`Ex.: ${reasonLabels[report.reason]}. Explique somente o necessário.`}
                  />
                </label>
              ) : null}
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => void act(report, "review")}
                  disabled={busyId === report.id}
                >
                  <FiCheck /> Marcar revisada
                </button>
                {report.targetType !== "user" ? (
                  <button
                    type="button"
                    onClick={() => void act(report, "hide_content")}
                    disabled={busyId === report.id}
                  >
                    <FiEyeOff /> Remover da comunidade
                  </button>
                ) : null}
                {report.targetType !== "user" ? (
                  <button
                    type="button"
                    onClick={() => void act(report, "restore_content")}
                    disabled={busyId === report.id}
                  >
                    <FiEye /> Restaurar conteúdo
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.dismiss}
                  onClick={() => void act(report, "dismiss")}
                  disabled={busyId === report.id}
                >
                  Dispensar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  if (!modal) return panel;
  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      {panel}
    </div>
  );
}
