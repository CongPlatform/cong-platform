import CongLoadingState from "../feedback/CongLoadingState";
import { useCallback, useEffect, useState } from "react";
import {
  FiArchive,
  FiClipboard,
  FiEye,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiX,
} from "react-icons/fi";
import {
  getSecurityCases,
  getSecurityEvents,
  revealSecurityIdentity,
  reviewArchivedSecurityCase,
  type SecurityAuditEvent,
  type SecurityCaseEvidence,
  type SecurityRetainedIdentity,
} from "../../services/securityAuditService";
import styles from "./SecurityAuditPanel.module.css";

type Tab = "events" | "cases";
function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}
function prettyName(value: string): string {
  const known: Record<string, string> = {
    "account.deleted": "Conta excluída",
    "community_report.created": "Denúncia registrada",
    "institutional_sites.update": "Site alterado",
    "institutional_site_publications.insert": "Site publicado",
    "security.identity_access": "Identidade consultada",
    "security.archived_case_review": "Caso arquivado revisado",
    "organization_users.delete": "Vínculo institucional removido",
  };
  return known[value] ?? value.replaceAll("_", " ").replaceAll(".", " · ");
}
export default function SecurityAuditPanel() {
  const [tab, setTab] = useState<Tab>("events");
  const [events, setEvents] = useState<SecurityAuditEvent[]>([]);
  const [cases, setCases] = useState<SecurityCaseEvidence[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [identityUserId, setIdentityUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [identity, setIdentity] = useState<SecurityRetainedIdentity | null>(
    null,
  );
  const [identityMessage, setIdentityMessage] = useState("");
  const [reviewReportId, setReviewReportId] = useState<string | null>(null);
  const [decision, setDecision] = useState("needs_external_review");
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const userId = appliedFilter || undefined;
      if (tab === "events") setEvents(await getSecurityEvents(userId));
      else setCases(await getSecurityCases(userId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao consultar a auditoria.",
      );
    } finally {
      setBusy(false);
    }
  }, [tab, appliedFilter]);
  useEffect(() => {
    // Agenda a busca após o efeito; atualizações de estado ocorrem fora
    // da fase de sincronização do React, inclusive em Strict Mode.
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);
  async function showIdentity() {
    if (!identityUserId) return;
    setIdentityMessage("");
    try {
      const record = await revealSecurityIdentity(identityUserId, reason);
      setIdentity(record);
      if (!record)
        setIdentityMessage(
          "Não há dados de identidade retidos para esta conta ou o prazo expirou.",
        );
    } catch (err) {
      setIdentityMessage(
        err instanceof Error ? err.message : "Consulta indisponível.",
      );
    }
  }
  async function submitReview() {
    if (!reviewReportId) return;
    try {
      await reviewArchivedSecurityCase(reviewReportId, decision, note);
      setReviewReportId(null);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revisar caso.");
    }
  }
  return (
    <section className={styles.panel} aria-label="Auditoria de segurança">
      <div className={styles.tape} aria-hidden="true" />
      <header className={styles.top}>
        <div className={styles.emblem}>
          <FiShield />
        </div>
        <div>
          <span className={styles.eyebrow}>
            ACESSO RESTRITO · ADMINISTRAÇÃO
          </span>
          <h2>Auditoria e responsabilização</h2>
          <p>
            Eventos institucionais, denúncias e evidências que sobrevivem à
            exclusão da conta.
          </p>
        </div>
      </header>
      <div className={styles.toolbar}>
        <div
          className={styles.tabs}
          role="group"
          aria-label="Visualização da auditoria"
        >
          <button
            type="button"
            aria-pressed={tab === "events"}
            onClick={() => setTab("events")}
          >
            <FiClipboard /> Eventos
          </button>
          <button
            type="button"
            aria-pressed={tab === "cases"}
            onClick={() => setTab("cases")}
          >
            <FiArchive /> Denúncias preservadas
          </button>
        </div>
        <form
          className={styles.filter}
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedFilter(userFilter.trim());
          }}
        >
          <input
            aria-label="Filtrar por ID do usuário"
            placeholder="Filtrar por UUID da conta"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className={styles.refresh}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {busy ? (
        <div className={styles.empty}><CongLoadingState variant="list" count={4} label="Preparando histórico"/></div>
      ) : tab === "events" ? (
        events.length ? (
          <div className={styles.entries}>
            {events.map((event) => (
              <article key={event.id} className={styles.entry}>
                <div className={styles.entryHeader}>
                  <strong>{prettyName(event.eventType)}</strong>
                  <time>{formatDate(event.occurredAt)}</time>
                </div>
                <p>
                  {event.actorDisplayName ||
                    "Conta não identificada no registro"}{" "}
                  · {event.entityType}
                </p>
                <div className={styles.meta}>
                  <span>Autor: {event.actorUserId || "não identificado"}</span>
                  {event.organizationId && (
                    <span>ONG: {event.organizationId}</span>
                  )}
                  {event.subjectUserId && (
                    <span>Conta envolvida: {event.subjectUserId}</span>
                  )}
                </div>
                <details>
                  <summary>Alterações registradas</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        antes: event.beforeState,
                        depois: event.afterState,
                        contexto: event.context,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
                {event.actorUserId && (
                  <button
                    className={styles.identify}
                    type="button"
                    onClick={() => {
                      setIdentityUserId(event.actorUserId);
                      setIdentity(null);
                      setReason("");
                      setIdentityMessage("");
                    }}
                  >
                    Consultar identidade retida
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            Nenhum evento encontrado com esses filtros.
          </p>
        )
      ) : cases.length ? (
        <div className={styles.entries}>
          {cases.map((item) => (
            <article className={styles.entry} key={item.reportId}>
              <div className={styles.entryHeader}>
                <strong>Denúncia · {item.reason}</strong>
                <time>{formatDate(item.capturedAt)}</time>
              </div>
              <p>
                Alvo: {item.targetType} ·{" "}
                {item.originalReportExists
                  ? "Registro original disponível"
                  : "Registro original removido; evidência preservada"}
              </p>
              {item.contentExcerpt && (
                <blockquote className={styles.evidence}>
                  {item.contentExcerpt}
                </blockquote>
              )}
              {item.details && <p className={styles.note}>{item.details}</p>}
              <div className={styles.meta}>
                <span>
                  Conta denunciada: {item.subjectUserId || "indisponível"}
                </span>
                <span>Denúncia: {item.reportId}</span>
                <span>Até: {formatDate(item.retainedUntil)}</span>
              </div>
              {item.archivedDecision ? (
                <p className={styles.done}>
                  Análise arquivada: {item.archivedDecision}
                </p>
              ) : !item.originalReportExists ? (
                <button
                  type="button"
                  className={styles.identify}
                  onClick={() => {
                    setReviewReportId(item.reportId);
                    setNote("");
                  }}
                >
                  Registrar análise do caso
                </button>
              ) : null}
              {item.subjectUserId && (
                <button
                  type="button"
                  className={styles.identify}
                  onClick={() => {
                    setIdentityUserId(item.subjectUserId);
                    setIdentity(null);
                    setReason("");
                    setIdentityMessage("");
                  }}
                >
                  Consultar identidade retida
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          Não há evidências preservadas para o filtro escolhido.
        </p>
      )}
      {identityUserId && (
        <div className={styles.dialogBackdrop} role="presentation">
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label="Consulta excepcional de identidade"
          >
            <button
              type="button"
              className={styles.close}
              aria-label="Fechar"
              onClick={() => setIdentityUserId(null)}
            >
              <FiX />
            </button>
            <h3>
              <FiLock /> Consulta de identidade
            </h3>
            <p>
              Somente para finalidade legítima de investigação. A consulta é
              registrada com sua identificação.
            </p>
            <small>Conta: {identityUserId}</small>
            <textarea
              aria-label="Justificativa da consulta"
              placeholder="Explique por que precisa identificar esta conta (mínimo de 10 caracteres)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            {identity && (
              <div className={styles.identity}>
                <strong>{identity.originalName}</strong>
                <span>{identity.originalEmail || "Sem e-mail retido"}</span>
                <small>Retenção até {formatDate(identity.retainedUntil)}</small>
              </div>
            )}
            {identityMessage && (
              <p className={styles.error}>{identityMessage}</p>
            )}
            <button
              className={styles.primary}
              type="button"
              disabled={reason.trim().length < 10}
              onClick={() => void showIdentity()}
            >
              <FiEye /> Consultar e registrar acesso
            </button>
          </section>
        </div>
      )}
      {reviewReportId && (
        <div className={styles.dialogBackdrop} role="presentation">
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label="Revisão administrativa de denúncia arquivada"
          >
            <button
              type="button"
              className={styles.close}
              aria-label="Fechar"
              onClick={() => setReviewReportId(null)}
            >
              <FiX />
            </button>
            <h3>
              <FiShield /> Revisar evidência preservada
            </h3>
            <p>
              Essa decisão não reativa a conta nem aplica uma nova sanção. A
              análise ficará registrada para auditoria.
            </p>
            <select
              aria-label="Decisão"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="needs_external_review">
                Encaminhar para análise adicional
              </option>
              <option value="substantiated">Procedente</option>
              <option value="dismissed">Improcedente</option>
            </select>
            <textarea
              aria-label="Justificativa"
              placeholder="Motivo da decisão (mínimo 10 caracteres)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1200}
            />
            <button
              type="button"
              className={styles.primary}
              disabled={note.trim().length < 10}
              onClick={() => void submitReview()}
            >
              Registrar decisão
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
