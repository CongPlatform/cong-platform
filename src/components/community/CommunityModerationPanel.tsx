import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiExternalLink,
  FiShield,
  FiUserX,
  FiAlertTriangle,
  FiChevronDown,
  FiMoreHorizontal,
  FiMail,
  FiClipboard,
  FiFilter,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import {
  getCommunityModerationReports,
  reviewCommunityReport,
  type CommunityModerationReport,
} from "../../services/communityService";
import {
  getAccountDeletionQueue,
  type AccountDeletionQueueItem,
} from "../../services/accountService";
import { useModalFocus } from "../../hooks/useModalFocus";
import ModalMensagem from "../modalMensagem/ModalMensagem";
import styles from "./CommunityModerationPanel.module.css";

type StatusFilter =
  "pending" | "reviewed" | "actioned" | "dismissed" | "all" | "deletions";
type ModerationAction =
  | "review"
  | "dismiss"
  | "hide_content"
  | "restore_content"
  | "warn_user"
  | "suspend_24h"
  | "suspend_7d"
  | "ban_user"
  | "lift_restriction";
const sanctionLabels: Record<ModerationAction, string> = {
  review: "Marcar revisada",
  dismiss: "Dispensar",
  hide_content: "Remover conteúdo",
  restore_content: "Restaurar conteúdo",
  warn_user: "Enviar advertência",
  suspend_24h: "Suspender por 24 horas",
  suspend_7d: "Suspender por 7 dias",
  ban_user: "Banir conta",
  lift_restriction: "Retirar restrição",
};

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
  const [deletionRequests, setDeletionRequests] = useState<
    AccountDeletionQueueItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    report: CommunityModerationReport;
    action: ModerationAction;
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionGuidance, setDecisionGuidance] = useState("");
  const [responseHours, setResponseHours] = useState<24 | 168 | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (status === "deletions") {
        setDeletionRequests(await getAccountDeletionQueue());
        setReports([]);
      } else {
        setReports(await getCommunityModerationReports(status));
      }
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
    action: ModerationAction,
  ) => {
    if (decisionReason.trim().length < 5) {
      setDecisionError(
        "Explique o motivo da decisão com pelo menos 5 caracteres.",
      );
      return;
    }
    setBusyId(report.id);
    setDecisionError(null);
    setError(null);
    try {
      await reviewCommunityReport(
        report.id,
        action,
        decisionReason.trim(),
        decisionGuidance.trim(),
        responseHours,
      );
      setConfirm(null);
      setDecisionReason("");
      setDecisionGuidance("");
      setResponseHours(null);
      await load();
    } catch (err) {
      setDecisionError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a moderação.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const requestAction = (
    report: CommunityModerationReport,
    action: ModerationAction,
  ) => {
    const mayEscalate =
      report.status === "reviewed" &&
      ["warn_user", "suspend_24h", "suspend_7d", "ban_user"].includes(action);
    const mayReverse =
      report.status === "actioned" &&
      ["lift_restriction", "restore_content"].includes(action);
    if (report.status !== "pending" && !mayEscalate && !mayReverse) {
      setError(
        "Esta denúncia já foi concluída. Atualize a lista para consultar a decisão.",
      );
      return;
    }
    setDecisionReason("");
    setDecisionGuidance("");
    setResponseHours(
      action === "suspend_7d" ? 168 : action === "suspend_24h" ? 24 : null,
    );
    setDecisionError(null);
    setConfirm({ report, action });
  };

  const closeDecision = () => {
    if (busyId) return;
    setConfirm(null);
    setDecisionError(null);
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
          <span className={styles.brandKicker}>
            CONG <span aria-hidden="true">/</span> CUIDADO COM A COMUNIDADE
          </span>
          <h2 id="community-moderation-title">Central de moderação</h2>
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
        <div className={styles.toolbarHeading}>
          <strong>Fila de análise</strong>
          <span>Selecione uma categoria para acompanhar as decisões.</span>
        </div>
        <div className={styles.filters}>
          <label className={styles.filterSelect}>
            <FiFilter aria-hidden="true" />
            <span>Exibir</span>
            <select
              value={status}
              aria-label="Filtrar denúncias"
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
            >
              <option value="pending">Pendentes</option>
              <option value="reviewed">Revisadas</option>
              <option value="actioned">Com ação</option>
              <option value="dismissed">Dispensadas</option>
              <option value="all">Todas</option>
              <option value="deletions">Exclusões de conta</option>
            </select>
            {status === "pending" && pendingCount > 0 ? (
              <small>{pendingCount}</small>
            ) : null}
          </label>
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
          <div className={styles.state}>Carregando...</div>
        ) : status === "deletions" ? (
          <section
            className={styles.deletionQueue}
            aria-label="Solicitações de exclusão de conta"
          >
            <div className={styles.deletionIntro}>
              <strong>
                Solicitações recebidas pelos administradores da CONG
              </strong>
              <p>
                O pedido bloqueia a conta e aparece nesta fila. A exclusão
                definitiva ainda exige tratamento manual e verificação dos
                vínculos institucionais. Nenhum dado é apagado por este painel.
              </p>
            </div>
            {deletionRequests.length === 0 ? (
              <p className={styles.state}>Nenhuma solicitação pendente.</p>
            ) : (
              deletionRequests.map((item) => (
                <article key={item.id} className={styles.report}>
                  <div className={styles.reportTop}>
                    <strong>{item.displayName}</strong>
                    <span className={styles.status}>Pendente</span>
                  </div>
                  <div className={styles.meta}>
                    <span>
                      {item.username
                        ? `@${item.username}`
                        : "Sem nome de usuário"}
                    </span>
                    <span>
                      Solicitado em{" "}
                      {new Date(item.requestedAt).toLocaleString("pt-BR")}
                    </span>
                    <span>
                      {item.organizationMemberships} vínculo(s)
                      institucional(is) ativo(s)
                    </span>
                  </div>
                  <p className={styles.details}>
                    ID da conta: <code>{item.id}</code>. Verifique a
                    titularidade e os dados vinculados antes de executar
                    qualquer exclusão por procedimento administrativo.
                  </p>
                </article>
              ))
            )}
          </section>
        ) : reports.length === 0 ? (
          <div className={styles.state}>Nenhuma denúncia nesta categoria.</div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className={styles.report}>
              <div className={styles.reportReference}>
                <span className={styles.paperMark} aria-hidden="true" />
                <span>Registro {report.id.slice(0, 8).toUpperCase()}</span>
                <span className={styles.reportDate}>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                  }).format(new Date(report.createdAt))}
                </span>
              </div>
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
              {report.targetType === "user" && report.targetId ? (
                <a
                  className={styles.profileLink}
                  href={`/app/comunidade/perfil/user/${encodeURIComponent(report.targetId)}`}
                >
                  <FiExternalLink aria-hidden="true" /> Ver perfil denunciado
                </a>
              ) : null}
              {report.restriction ? (
                <p className={styles.restriction}>
                  <FiUserX aria-hidden="true" />
                  {report.restriction.status === "banned"
                    ? "Conta banida"
                    : `Suspensa até ${new Date(report.restriction.suspendedUntil ?? "").toLocaleString("pt-BR")}`}
                </p>
              ) : null}
              {report.target.authorUserId && !report.canRestrictUsers ? (
                <p className={styles.schemaHint} role="status">
                  Medidas disciplinares indisponíveis neste banco. Aplique a
                  migration de sanções para habilitar suspensões e banimentos.
                </p>
              ) : null}
              <div
                className={styles.actions}
                role="group"
                aria-label={`Ações de moderação para ${report.target.label}`}
              >
                <span className={styles.actionToolbarLabel}>
                  <FiShield aria-hidden="true" /> Decisão
                </span>
                {report.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className={styles.mainAction}
                      onClick={() => requestAction(report, "review")}
                      disabled={Boolean(busyId)}
                    >
                      {report.targetType === "user" ? (
                        <FiCheck />
                      ) : (
                        <FiEyeOff />
                      )}
                      {report.targetType === "user"
                        ? "Marcar revisada"
                        : "Ocultar e concluir"}
                    </button>
                    <button
                      type="button"
                      className={styles.dismiss}
                      onClick={() => requestAction(report, "dismiss")}
                      disabled={Boolean(busyId)}
                    >
                      Dispensar
                    </button>
                  </>
                ) : null}
                {(report.status === "pending" ||
                  report.status === "reviewed") &&
                report.target.authorUserId ? (
                  <details className={styles.sanctionMenu}>
                    <summary>
                      <FiMoreHorizontal aria-hidden="true" /> Medidas{" "}
                      <FiChevronDown aria-hidden="true" />
                    </summary>
                    <div className={styles.sanctionMenuItems}>
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          requestAction(report, "warn_user");
                        }}
                      >
                        <FiAlertTriangle /> Advertir
                      </button>
                      {report.canRestrictUsers ? (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(busyId)}
                            onClick={(event) => {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              requestAction(report, "suspend_24h");
                            }}
                          >
                            Suspender 24 horas
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyId)}
                            onClick={(event) => {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              requestAction(report, "suspend_7d");
                            }}
                          >
                            Suspender 7 dias
                          </button>
                          <button
                            type="button"
                            className={styles.dangerAction}
                            disabled={Boolean(busyId)}
                            onClick={(event) => {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              requestAction(report, "ban_user");
                            }}
                          >
                            <FiUserX /> Banir conta
                          </button>
                        </>
                      ) : null}
                    </div>
                  </details>
                ) : null}
                {report.status === "reviewed" ? (
                  <span className={styles.decisionHint}>
                    <FiCheck /> Revisada
                  </span>
                ) : null}
                {report.status === "actioned" ? (
                  <>
                    <span className={styles.decisionHint}>
                      <FiCheck /> Decisão registrada
                    </span>
                    {report.restriction && report.canRestrictUsers ? (
                      <button
                        type="button"
                        className={styles.restoreAction}
                        disabled={Boolean(busyId)}
                        onClick={() =>
                          requestAction(report, "lift_restriction")
                        }
                      >
                        <FiUserCheck /> Retirar restrição
                      </button>
                    ) : null}
                    {report.targetType !== "user" && report.contentHidden ? (
                      <button
                        type="button"
                        className={styles.restoreAction}
                        disabled={Boolean(busyId)}
                        onClick={() => requestAction(report, "restore_content")}
                      >
                        <FiEye /> Restaurar conteúdo
                      </button>
                    ) : null}
                  </>
                ) : null}
                {report.status === "dismissed" ? (
                  <span className={styles.decisionHint}>
                    <FiCheck /> Dispensada
                  </span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const confirmation = (
    <ModalMensagem
      aberto={Boolean(confirm)}
      titulo={confirm ? sanctionLabels[confirm.action] : "Decisão de moderação"}
      tamanho="medio"
      mostrarBotaoOk={false}
      fecharAoClicarFora={!busyId}
      onFechar={closeDecision}
      mensagem={
        confirm ? (
          <div className={styles.decisionForm}>
            <div className={styles.decisionSubject}>
              <FiClipboard aria-hidden="true" />
              <div>
                <strong>{confirm.report.target.label}</strong>
                <small>
                  {targetLabels[confirm.report.targetType]} ·{" "}
                  {reasonLabels[confirm.report.reason]}
                </small>
              </div>
            </div>
            {confirm.report.target.excerpt ? (
              <div className={styles.decisionPreview}>
                <small>Conteúdo analisado</small>
                <p>{confirm.report.target.excerpt}</p>
              </div>
            ) : null}
            <label className={styles.decisionField}>
              <strong>
                Motivo da decisão <span aria-hidden="true">*</span>
              </strong>
              <textarea
                value={decisionReason}
                maxLength={1200}
                rows={3}
                placeholder="Descreva a infração e a justificativa da medida."
                onChange={(event) => setDecisionReason(event.target.value)}
              />
              <small>
                Registrado na auditoria e informado ao usuário nas medidas
                aplicáveis.
              </small>
            </label>
            {["warn_user", "suspend_24h", "suspend_7d", "ban_user"].includes(
              confirm.action,
            ) ? (
              <label className={styles.decisionField}>
                <strong>
                  <FiMail aria-hidden="true" /> Orientações para o e-mail{" "}
                  <em>(opcional)</em>
                </strong>
                <textarea
                  value={decisionGuidance}
                  maxLength={600}
                  rows={3}
                  placeholder="Ex.: Para esclarecer a identidade da conta, escreva para congplatform@gmail.com dentro de 7 dias."
                  onChange={(event) => setDecisionGuidance(event.target.value)}
                />
                <small>
                  O e-mail identifica a conduta e nunca quem denunciou ou
                  moderou.
                </small>
              </label>
            ) : null}
            {["warn_user", "suspend_24h", "suspend_7d"].includes(
              confirm.action,
            ) ? (
              <label className={styles.responseDeadline}>
                <span>Prazo para resposta</span>
                <select
                  value={responseHours ?? ""}
                  onChange={(event) =>
                    setResponseHours(
                      event.target.value
                        ? (Number(event.target.value) as 24 | 168)
                        : null,
                    )
                  }
                >
                  <option value="">Sem prazo adicional</option>
                  <option value="24">24 horas</option>
                  <option value="168">7 dias</option>
                </select>
                <small>
                  Prazo informativo no e-mail. Não aplica banimento automático.
                </small>
              </label>
            ) : null}
            {confirm.report.targetType !== "user" &&
            [
              "review",
              "warn_user",
              "suspend_24h",
              "suspend_7d",
              "ban_user",
              "hide_content",
            ].includes(confirm.action) ? (
              <div className={styles.decisionImpact}>
                <FiEyeOff /> O conteúdo denunciado será ocultado da comunidade
                ao confirmar.
              </div>
            ) : null}
            {decisionError ? (
              <p className={styles.decisionError} role="alert">
                {decisionError}
              </p>
            ) : null}
            <div className={styles.decisionButtons}>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={closeDecision}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  ["ban_user", "suspend_7d", "suspend_24h"].includes(
                    confirm.action,
                  )
                    ? styles.decisionDanger
                    : styles.decisionSubmit
                }
                disabled={Boolean(busyId) || decisionReason.trim().length < 5}
                onClick={() => void act(confirm.report, confirm.action)}
              >
                {busyId ? "Registrando..." : "Confirmar decisão"}
              </button>
            </div>
          </div>
        ) : null
      }
    />
  );
  if (!modal)
    return (
      <>
        {panel}
        {confirmation}
      </>
    );
  return (
    <>
      <div
        className={styles.backdrop}
        onMouseDown={onClose}
        role="presentation"
      >
        {panel}
      </div>
      {confirmation}
    </>
  );
}
