import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiLock,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  closeCommunitySurvey,
  getCommunitySurvey,
  getCommunitySurveyResults,
  publishCommunitySurveyResults,
  submitCommunitySurveyResponse,
  type CommunityPost,
  type CommunitySurvey,
  type CommunitySurveyAnswerInput,
  type CommunitySurveyResults,
} from "../../services/communityService";
import CommunityResearchChart from "./CommunityResearchChart";
import styles from "./CommunityResearchPanel.module.css";

type AnswerValue = string | number | string[];

interface Props {
  post: CommunityPost;
  onClose: () => void;
  onRelatedPostCreated?: (post: CommunityPost) => void;
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function CommunityResearchPanel({
  post,
  onClose,
  onRelatedPostCreated,
}: Props) {
  const owner = post.permissions.canEdit;
  const details = post.details as {
    phase?: "collecting" | "results";
    participationMode?: "external" | "internal";
    resultsSourcePostId?: string | null;
  };
  const sourcePostId =
    details.phase === "results" && details.resultsSourcePostId
      ? details.resultsSourcePostId
      : post.id;
  const publicResultsView = details.phase === "results";

  const [survey, setSurvey] = useState<CommunitySurvey | null>(null);
  const [results, setResults] = useState<CommunitySurveyResults | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [view, setView] = useState<"form" | "results">(
    publicResultsView || owner ? "results" : "form",
  );
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "results") {
          const nextResults = await getCommunitySurveyResults(sourcePostId);
          if (!cancelled) {
            setResults(nextResults);
            setPublishedPostId(nextResults.resultsPostId);
          }
        } else {
          const nextSurvey = await getCommunitySurvey(sourcePostId);
          if (!cancelled) {
            setSurvey(nextSurvey);
            setPublishedPostId(nextSurvey.resultsPostId);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar a pesquisa.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sourcePostId, view]);

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setError(null);
  };

  const questionIsEmpty = (questionId: string) => {
    const value = answers[questionId];
    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  const validateCurrentQuestion = () => {
    const question = survey?.questions[step];
    if (!question) return true;
    if (question.required && questionIsEmpty(question.id)) {
      setError("Responda esta pergunta antes de continuar.");
      return false;
    }
    return true;
  };

  const buildPayload = (): CommunitySurveyAnswerInput[] => {
    if (!survey) return [];
    const payload: CommunitySurveyAnswerInput[] = [];
    for (const question of survey.questions) {
      const value = answers[question.id];
      if (value === undefined || value === null || questionIsEmpty(question.id))
        continue;
      if (question.type === "short_text" || question.type === "long_text") {
        payload.push({ questionId: question.id, textValue: String(value) });
      } else if (question.type === "scale") {
        payload.push({ questionId: question.id, numericValue: Number(value) });
      } else {
        payload.push({
          questionId: question.id,
          optionIds: Array.isArray(value) ? value : [String(value)],
        });
      }
    }
    return payload;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!survey || submitting || survey.alreadyResponded) return;
    if (!validateCurrentQuestion()) return;
    for (const question of survey.questions) {
      if (question.required && questionIsEmpty(question.id)) {
        setStep(survey.questions.findIndex((item) => item.id === question.id));
        setError("Ainda existe uma pergunta obrigatória sem resposta.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitCommunitySurveyResponse(
        sourcePostId,
        buildPayload(),
      );
      setSurvey(updated);
      setSuccess("Resposta enviada com sucesso. Obrigado por participar.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar as respostas.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeSurvey = async () => {
    if (!owner || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await closeCommunitySurvey(sourcePostId);
      setSurvey(updated);
      const nextResults = await getCommunitySurveyResults(sourcePostId);
      setResults(nextResults);
      setSuccess(
        "Coleta encerrada. As respostas existentes foram preservadas.",
      );
      setView("results");
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "Não foi possível encerrar a pesquisa.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const publishResults = async () => {
    if (!owner || submitting || publishedPostId) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await publishCommunitySurveyResults(sourcePostId);
      onRelatedPostCreated?.(created);
      setPublishedPostId(created.id);
      setResults((current) =>
        current ? { ...current, resultsPostId: created.id } : current,
      );
      setSuccess(
        "Resultados publicados. A publicação já está disponível para a comunidade.",
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Não foi possível publicar os resultados.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!results) return;
    const rows = [
      [
        "Pergunta",
        "Tipo",
        "Respondidas",
        "Opção/Resposta",
        "Quantidade",
        "Percentual/Média",
      ],
    ];
    for (const question of results.questions) {
      if (question.options.length) {
        for (const option of question.options) {
          rows.push([
            question.prompt,
            question.type,
            String(question.answeredCount),
            option.label,
            String(option.count),
            `${option.percentage}%`,
          ]);
        }
      } else if (question.average !== null) {
        rows.push([
          question.prompt,
          question.type,
          String(question.answeredCount),
          "Média",
          "",
          question.average.toFixed(2),
        ]);
      } else {
        for (const answer of question.textAnswers) {
          rows.push([
            question.prompt,
            question.type,
            String(question.answeredCount),
            answer,
            "",
            "",
          ]);
        }
      }
    }
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cong-pesquisa-${sourcePostId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const goToPublishedPost = () => {
    if (!publishedPostId) return;
    onClose();
    window.requestAnimationFrame(() => {
      document
        .getElementById(`community-post-${publishedPostId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const question = survey?.questions[step];
  const progress = survey?.questions.length
    ? ((step + 1) / survey.questions.length) * 100
    : 0;

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-research-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <span>
              <FiBarChart2 /> Pesquisa na CONG
            </span>
            <h2 id="community-research-title">
              {publicResultsView
                ? post.title
                : view === "results"
                  ? "Resultados da pesquisa"
                  : post.title}
            </h2>
            {!publicResultsView ? <p>{post.summary}</p> : null}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar"
          >
            <FiX />
          </button>
        </header>

        {owner && !publicResultsView ? (
          <nav
            className={styles.modeTabs}
            aria-label="Visualização da pesquisa"
          >
            <button
              type="button"
              data-active={view === "form"}
              onClick={() => {
                setView("form");
                setSuccess(null);
              }}
            >
              Formulário
            </button>
            <button
              type="button"
              data-active={view === "results"}
              onClick={() => {
                setView("results");
                setSuccess(null);
              }}
            >
              Resultados
            </button>
          </nav>
        ) : null}

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>Carregando pesquisa...</div>
          ) : null}
          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className={styles.success} role="status">
              <FiCheck />
              <div>
                <strong>{success}</strong>
                {publishedPostId ? (
                  <button type="button" onClick={goToPublishedPost}>
                    Ver publicação <FiArrowRight />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && view === "results" && results ? (
            <div className={styles.results}>
              <div className={styles.resultsSummary}>
                <div>
                  <strong>{results.responseCount}</strong>
                  <span>respostas</span>
                </div>
                <div>
                  <strong>
                    {results.status === "open" ? "Aberta" : "Encerrada"}
                  </strong>
                  <span>coleta</span>
                </div>
                <div>
                  <strong>
                    {results.anonymous ? "Anônima" : "Identificada"}
                  </strong>
                  <span>privacidade</span>
                </div>
              </div>

              <div className={styles.resultQuestions}>
                {results.questions.map((resultQuestion, index) => (
                  <article key={resultQuestion.id}>
                    <header>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{resultQuestion.prompt}</strong>
                        <small>{resultQuestion.answeredCount} respostas</small>
                      </div>
                    </header>
                    <CommunityResearchChart question={resultQuestion} />
                    {owner && resultQuestion.textAnswers.length ? (
                      <div className={styles.textAnswers}>
                        {resultQuestion.textAnswers
                          .slice(0, 8)
                          .map((answer, answerIndex) => (
                            <blockquote
                              key={`${resultQuestion.id}-${answerIndex}`}
                            >
                              {answer}
                            </blockquote>
                          ))}
                        {resultQuestion.textAnswers.length > 8 ? (
                          <small>
                            + {resultQuestion.textAnswers.length - 8} respostas
                            de texto no CSV
                          </small>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && view === "form" && survey ? (
            survey.alreadyResponded ? (
              <div className={styles.completed}>
                <FiCheck />
                <div>
                  <strong>Resposta registrada</strong>
                  <p>Você já participou desta pesquisa.</p>
                </div>
              </div>
            ) : survey.status === "closed" ? (
              <div className={styles.completed}>
                <FiLock />
                <div>
                  <strong>Coleta encerrada</strong>
                  <p>Esta pesquisa não está mais recebendo respostas.</p>
                </div>
              </div>
            ) : question ? (
              <form
                className={styles.form}
                onSubmit={(event) => void submit(event)}
              >
                <div className={styles.progressHeader}>
                  <span>
                    Pergunta {step + 1} de {survey.questions.length}
                  </span>
                  <strong>{Math.round(progress)}%</strong>
                </div>
                <div className={styles.progressTrack}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <fieldset className={styles.question}>
                  <legend>
                    {question.prompt}
                    {question.required ? <em>*</em> : null}
                  </legend>
                  {question.type === "short_text" ? (
                    <input
                      autoFocus
                      value={
                        typeof answers[question.id] === "string"
                          ? String(answers[question.id])
                          : ""
                      }
                      onChange={(event) =>
                        setAnswer(question.id, event.target.value)
                      }
                      maxLength={5000}
                      placeholder="Digite sua resposta"
                    />
                  ) : null}
                  {question.type === "long_text" ? (
                    <textarea
                      autoFocus
                      rows={6}
                      value={
                        typeof answers[question.id] === "string"
                          ? String(answers[question.id])
                          : ""
                      }
                      onChange={(event) =>
                        setAnswer(question.id, event.target.value)
                      }
                      maxLength={5000}
                      placeholder="Conte com mais detalhes"
                    />
                  ) : null}
                  {question.type === "single_choice" ? (
                    <div className={styles.choices}>
                      {question.options.map((option) => (
                        <label key={option.id}>
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option.id}
                            onChange={() => setAnswer(question.id, option.id)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {question.type === "multiple_choice" ? (
                    <div className={styles.choices}>
                      {question.options.map((option) => {
                        const selected = Array.isArray(answers[question.id])
                          ? (answers[question.id] as string[])
                          : [];
                        return (
                          <label key={option.id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(option.id)}
                              onChange={() =>
                                setAnswer(
                                  question.id,
                                  selected.includes(option.id)
                                    ? selected.filter((id) => id !== option.id)
                                    : [...selected, option.id],
                                )
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                  {question.type === "scale" ? (
                    <div className={styles.scale}>
                      {Array.from(
                        {
                          length:
                            (question.scaleMax ?? 5) -
                            (question.scaleMin ?? 1) +
                            1,
                        },
                        (_, offset) => (question.scaleMin ?? 1) + offset,
                      ).map((number) => (
                        <button
                          key={number}
                          type="button"
                          data-selected={answers[question.id] === number}
                          onClick={() => setAnswer(question.id, number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </fieldset>
                <footer className={styles.formFooter}>
                  <div>
                    <FiUsers /> {survey.responseCount} resposta
                    {survey.responseCount === 1 ? "" : "s"} até agora
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep((current) => Math.max(0, current - 1));
                      }}
                      disabled={step === 0}
                    >
                      <FiArrowLeft /> Voltar
                    </button>
                    {step < survey.questions.length - 1 ? (
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => {
                          if (validateCurrentQuestion())
                            setStep((current) => current + 1);
                        }}
                      >
                        Continuar <FiArrowRight />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className={styles.primaryAction}
                        disabled={submitting}
                      >
                        <FiSend />{" "}
                        {submitting ? "Enviando..." : "Enviar respostas"}
                      </button>
                    )}
                  </div>
                </footer>
              </form>
            ) : null
          ) : null}
        </div>

        {owner && view === "results" && results ? (
          <footer className={styles.ownerBar}>
            <button type="button" onClick={exportCsv}>
              <FiDownload /> Exportar CSV
            </button>
            <div>
              {results.status === "open" ? (
                <button
                  type="button"
                  onClick={() => void closeSurvey()}
                  disabled={submitting}
                >
                  Encerrar coleta
                </button>
              ) : null}
              {publishedPostId ? (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={goToPublishedPost}
                >
                  Resultados publicados <FiExternalLink />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => void publishResults()}
                  disabled={submitting || results.responseCount === 0}
                >
                  Publicar resultados <FiArrowRight />
                </button>
              )}
            </div>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
