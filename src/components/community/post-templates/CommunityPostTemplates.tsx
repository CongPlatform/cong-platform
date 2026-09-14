import { Link } from "react-router-dom";
import CommunityRichText from "../CommunityRichText";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiExternalLink,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHelpCircle,
  FiLayers,
  FiMessageCircle,
  FiPaperclip,
  FiSearch,
  FiTag,
  FiUsers,
} from "react-icons/fi";

import type {
  CommunityPost,
  RequestDetails,
  ResourceType,
  ResearchType,
  ResearchParticipationMode,
  CommunitySurveyResults,
  UpdateEntityType,
} from "../../../services/communityService";

import styles from "../CommunityPostCard.module.css";

interface TemplateProps {
  post: CommunityPost;
  onOpenComments: () => void;
  onOpenResearch?: () => void;
}

const roleLabels = {
  all: "Toda a comunidade",
  organization: "ONGs e organizações",
  developer: "Desenvolvedores",
  designer: "Designers",
  translator: "Tradutores",
  volunteer: "Voluntários",
  supporter: "Apoiadores",
} as const;

const requestLabels: Record<RequestDetails["requestType"], string> = {
  module: "Solicitação de módulo",
  development: "Apoio em desenvolvimento",
  design: "Apoio em design",
  marketing: "Apoio em comunicação",
  translation: "Tradução",
  documentation: "Documentação",
  research_support: "Apoio em pesquisa",
  volunteering: "Oportunidade de voluntariado",
  other: "Solicitação de ajuda",
};

const researchLabels: Record<ResearchType, string> = {
  questionnaire: "Questionário",
  interview: "Entrevista",
  usability_test: "Teste de usabilidade",
  validation: "Validação",
  field_research: "Pesquisa de campo",
};

const resourceLabels: Record<ResourceType, string> = {
  template: "Template",
  guide: "Guia",
  document: "Documento",
  toolkit: "Kit de ferramentas",
  code: "Código",
  link: "Referência",
  other: "Recurso",
};

const updateEntityLabels: Record<UpdateEntityType, string> = {
  project: "Projeto",
  module: "Módulo",
  organization: "Organização",
  other: "Iniciativa",
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className={styles.tags}>
      {items.map((item) => (
        <Link
          key={item}
          to={`/app/comunidade?tag=${encodeURIComponent(item.replace(/^#/, "").toLowerCase())}`}
        >
          {item}
        </Link>
      ))}
    </div>
  );
}

function RequestSpecificContent({ details }: { details: RequestDetails }) {
  switch (details.requestType) {
    case "module":
      return (
        <div className={styles.requestFocus}>
          <small>Problema a resolver</small>
          <strong>{details.problem}</strong>
          <span>Para {details.users}</span>
          {details.essentialFeatures.length ? (
            <div className={styles.requestFeatureList}>
              {details.essentialFeatures.slice(0, 4).map((feature) => (
                <span key={feature}>
                  <FiCheckCircle /> {feature}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "development":
      return (
        <div className={styles.requestFocus}>
          <small>Escopo técnico</small>
          <strong>{details.scope}</strong>
          {details.stack.length ? (
            <span>Stack: {details.stack.join(" · ")}</span>
          ) : null}
        </div>
      );
    case "design":
      return (
        <div className={styles.requestFocus}>
          <small>Necessidade de design</small>
          <strong>{details.designNeed}</strong>
          {details.deliverables.length ? (
            <span>Entregas: {details.deliverables.join(" · ")}</span>
          ) : null}
        </div>
      );
    case "marketing":
      return (
        <div className={styles.requestFocus}>
          <small>Objetivo</small>
          <strong>{details.objective}</strong>
          {details.channels.length ? (
            <span>Canais: {details.channels.join(" · ")}</span>
          ) : null}
        </div>
      );
    case "translation":
      return (
        <div className={styles.requestFocus}>
          <small>Tradução</small>
          <strong>
            {details.sourceLanguage} → {details.targetLanguages.join(", ")}
          </strong>
          <span>
            {details.contentType} · {details.approximateVolume}
          </span>
        </div>
      );
    case "documentation":
      return (
        <div className={styles.requestFocus}>
          <small>Documentação</small>
          <strong>{details.documentationType}</strong>
          <span>Para {details.audience}</span>
        </div>
      );
    case "research_support":
      return (
        <div className={styles.requestFocus}>
          <small>Objetivo da pesquisa</small>
          <strong>{details.researchGoal}</strong>
          {details.method ? <span>Método: {details.method}</span> : null}
        </div>
      );
    case "volunteering":
      return (
        <div className={styles.requestFocus}>
          <small>Atividade</small>
          <strong>{details.activity}</strong>
          {[details.location, details.schedule].filter(Boolean).length ? (
            <span>
              {[details.location, details.schedule].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>
      );
    case "other":
      return (
        <div className={styles.requestFocus}>
          <small>Contexto</small>
          <strong>{details.context}</strong>
        </div>
      );
  }
}

function RequestTemplate({ post, onOpenComments }: TemplateProps) {
  const details = post.details as RequestDetails;
  const deadline = formatDate(details.deadline);
  const mode =
    details.engagementMode === "remote"
      ? "Remoto"
      : details.engagementMode === "in_person"
        ? "Presencial"
        : details.engagementMode === "hybrid"
          ? "Híbrido"
          : "Flexível";

  return (
    <div className={`${styles.templateBody} ${styles.requestTemplate}`}>
      <div className={styles.templateMain}>
        <span className={styles.kindBadge}>
          <FiHeart /> {requestLabels[details.requestType]}
        </span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <RequestSpecificContent details={details} />
        <TagList items={details.skills} />
      </div>

      <aside className={styles.requestSidePanel}>
        <div className={styles.sidePanelIcon}>
          <FiUsers />
        </div>
        <div className={styles.sidePanelTitle}>
          <small>Precisamos de ajuda</small>
          <strong>
            {details.peopleNeeded
              ? `${details.peopleNeeded} pessoa${details.peopleNeeded > 1 ? "s" : ""}`
              : "Aberto à comunidade"}
          </strong>
        </div>
        <dl className={styles.requestFacts}>
          <div>
            <dt>
              <FiGlobe /> Modalidade
            </dt>
            <dd>{mode}</dd>
          </div>
          {deadline ? (
            <div>
              <dt>
                <FiCalendar /> Prazo
              </dt>
              <dd>{deadline}</dd>
            </div>
          ) : null}
          <div>
            <dt>
              <FiUsers /> Público
            </dt>
            <dd>
              {post.targetRoles.map((role) => roleLabels[role]).join(" · ")}
            </dd>
          </div>
        </dl>
        {post.status === "published" ? (
          <button
            type="button"
            className={styles.requestCta}
            onClick={onOpenComments}
          >
            Quero ajudar <FiArrowRight />
          </button>
        ) : (
          <span className={styles.archivedTemplateNotice}>
            Arquivada · restaure para receber novas interações
          </span>
        )}
      </aside>
    </div>
  );
}

function UpdateTemplate({ post }: TemplateProps) {
  const details = post.details as {
    entityType: UpdateEntityType;
    entityLabel: string;
    version: string;
    progress?: number | null;
    referenceUrl?: string | null;
    milestones: string[];
    completedMilestones: number;
  };
  const progress = details.progress ?? 0;
  const milestoneTotal = details.milestones.length;
  const completedMilestones = Math.min(
    Math.max(details.completedMilestones, 0),
    milestoneTotal,
  );

  return (
    <div className={`${styles.templateBody} ${styles.updateTemplate}`}>
      <div className={styles.templateMain}>
        <span className={styles.kindBadge}>
          <FiActivity /> Atualização de{" "}
          {updateEntityLabels[details.entityType].toLowerCase()}
        </span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <div className={styles.entityStrip}>
          <FiLayers />
          <div>
            <small>{updateEntityLabels[details.entityType]}</small>
            <strong>{details.entityLabel}</strong>
          </div>
          {details.version ? <span>{details.version}</span> : null}
        </div>
        {details.referenceUrl ? (
          <a
            className={styles.inlineLink}
            href={details.referenceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir referência <FiExternalLink />
          </a>
        ) : null}
      </div>

      <aside className={styles.updateVisual}>
        <div className={styles.progressHeading}>
          <div>
            <small>Andamento</small>
            <strong>
              {details.progress === null || details.progress === undefined
                ? "Em andamento"
                : `${progress}%`}
            </strong>
          </div>
          {milestoneTotal ? (
            <span className={styles.progressCount}>
              {completedMilestones}/{milestoneTotal} etapas
            </span>
          ) : (
            <FiActivity />
          )}
        </div>

        {details.progress !== null && details.progress !== undefined ? (
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Progresso informado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        {milestoneTotal ? (
          <>
            <div className={styles.progressMilestoneSummary}>
              <span>
                {completedMilestones} concluída
                {completedMilestones === 1 ? "" : "s"}
              </span>
              <span>
                {Math.max(milestoneTotal - completedMilestones, 0)} restante
                {milestoneTotal - completedMilestones === 1 ? "" : "s"}
              </span>
            </div>
            <div className={styles.milestoneList}>
              {details.milestones.slice(0, 5).map((milestone, index) => (
                <span
                  key={`${milestone}-${index}`}
                  data-complete={index < completedMilestones}
                >
                  <b aria-hidden="true">
                    {index < completedMilestones ? (
                      <FiCheckCircle />
                    ) : (
                      index + 1
                    )}
                  </b>
                  <em>{milestone}</em>
                </span>
              ))}
              {milestoneTotal > 5 ? (
                <small>
                  + {milestoneTotal - 5} etapa
                  {milestoneTotal - 5 === 1 ? "" : "s"}
                </small>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.updateStatusCard}>
            <FiCheckCircle />
            <div>
              <small>Última atualização</small>
              <strong>{details.entityLabel}</strong>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function ResourceTemplate({ post }: TemplateProps) {
  const details = post.details as {
    resourceType: ResourceType;
    resourceUrl?: string | null;
    version: string;
    license: string;
    tags: string[];
  };

  const isCode = details.resourceType === "code";

  return (
    <div className={`${styles.templateBody} ${styles.resourceTemplate}`}>
      <div className={styles.templateMain}>
        <span className={styles.kindBadge}>
          <FiPaperclip /> Recurso compartilhado
        </span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <TagList items={details.tags} />
      </div>

      <aside className={styles.resourcePreview}>
        <div className={styles.resourcePreviewTop}>
          <span>{isCode ? <FiCode /> : <FiBox />}</span>
          <div>
            <small>{resourceLabels[details.resourceType]}</small>
            <strong>
              {<CommunityRichText text={post.title} mentions={post.mentions} />}
            </strong>
          </div>
          {details.version ? <b>{details.version}</b> : null}
        </div>
        <div className={styles.resourcePreviewMeta}>
          {details.license ? (
            <span>
              <FiCheckCircle /> {details.license}
            </span>
          ) : null}
          {details.tags.slice(0, 2).map((tag) => (
            <span key={tag}>
              <FiTag /> {tag}
            </span>
          ))}
        </div>
        {details.resourceUrl ? (
          <a href={details.resourceUrl} target="_blank" rel="noreferrer">
            Abrir recurso <FiExternalLink />
          </a>
        ) : (
          <span className={styles.resourceUnavailable}>
            Recurso sem link externo
          </span>
        )}
      </aside>
    </div>
  );
}

function QuestionTemplate({ post, onOpenComments }: TemplateProps) {
  const details = post.details as { topic: string; resolved?: boolean };
  return (
    <div className={`${styles.templateBody} ${styles.questionTemplate}`}>
      <div className={styles.questionMark}>
        <FiHelpCircle />
      </div>
      <div className={styles.questionContent}>
        <span className={styles.kindBadge}>Discussão · {details.topic}</span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <div className={styles.questionAudience}>
          <FiUsers /> Direcionada para{" "}
          {post.targetRoles.map((role) => roleLabels[role]).join(", ")}
        </div>
      </div>
      <button
        type="button"
        className={styles.answerPreview}
        onClick={onOpenComments}
        disabled={post.status !== "published"}
      >
        <span>
          <FiMessageCircle />
        </span>
        <div>
          <small>
            {post.status === "published"
              ? "Discussão aberta"
              : "Discussão arquivada"}
          </small>
          <strong>
            {post.engagement.commentCount
              ? `${post.engagement.commentCount} resposta${post.engagement.commentCount > 1 ? "s" : ""}`
              : post.status === "published"
                ? "Seja a primeira pessoa a responder"
                : "Sem novas interações"}
          </strong>
        </div>
        <FiArrowRight />
      </button>
    </div>
  );
}

function ResearchTemplate({ post, onOpenResearch }: TemplateProps) {
  const details = post.details as {
    researchType: ResearchType;
    participationMode: ResearchParticipationMode;
    phase: "collecting" | "results";
    estimatedMinutes?: number | null;
    deadline?: string | null;
    responseUrl?: string | null;
    criteria: string;
    responseCount?: number;
    resultsSourcePostId?: string | null;
    resultsSnapshot?: CommunitySurveyResults | null;
  };
  const deadline = formatDate(details.deadline);

  if (details.phase === "results" && details.resultsSnapshot) {
    const quantitative = details.resultsSnapshot.questions
      .filter(
        (question) => question.options.length > 0 || question.average !== null,
      )
      .slice(0, 3);

    return (
      <div
        className={`${styles.templateBody} ${styles.researchTemplate} ${styles.researchResultsTemplate}`}
      >
        <div className={styles.templateMain}>
          <span className={styles.kindBadge}>
            <FiBarChart2 /> Resultados da pesquisa
          </span>
          <h2>
            {<CommunityRichText text={post.title} mentions={post.mentions} />}
          </h2>
          <p className={styles.bodyText}>
            {<CommunityRichText text={post.content} mentions={post.mentions} />}
          </p>
          <div className={styles.researchResultMeta}>
            <strong>{details.resultsSnapshot.responseCount}</strong>
            <span>respostas analisadas</span>
          </div>
        </div>
        <aside className={styles.researchResultsPreview}>
          {quantitative.length ? (
            quantitative.map((question) => (
              <div key={question.id} className={styles.researchResultQuestion}>
                <strong>{question.prompt}</strong>
                {question.options.length ? (
                  question.options.slice(0, 3).map((option) => (
                    <span key={option.id}>
                      <i>
                        <b
                          style={{
                            width: `${Math.min(option.percentage, 100)}%`,
                          }}
                        />
                      </i>
                      <em>{option.label}</em>
                      <small>{option.percentage}%</small>
                    </span>
                  ))
                ) : question.average !== null ? (
                  <span className={styles.researchAverage}>
                    Média <b>{question.average.toFixed(1)}</b>
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <p>Os resultados desta pesquisa foram publicados.</p>
          )}
          <button
            type="button"
            className={styles.researchActionButton}
            onClick={onOpenResearch}
            disabled={post.status !== "published"}
          >
            {post.status === "published"
              ? "Explorar resultados"
              : "Resultados arquivados"}{" "}
            <FiArrowRight />
          </button>
        </aside>
      </div>
    );
  }

  const internal = details.participationMode === "internal";
  return (
    <div className={`${styles.templateBody} ${styles.researchTemplate}`}>
      <div className={styles.templateMain}>
        <span className={styles.kindBadge}>
          <FiSearch /> Pesquisa · {researchLabels[details.researchType]}
        </span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <div className={styles.criteriaBox}>
          <small>Quem queremos ouvir</small>
          <strong>{details.criteria}</strong>
        </div>
      </div>
      <aside className={styles.researchVisual}>
        <FiBarChart2 className={styles.researchIcon} />
        <strong>
          {internal ? "Pesquisa na CONG" : "Participe da pesquisa"}
        </strong>
        <div className={styles.researchFacts}>
          {details.estimatedMinutes ? (
            <span>
              <FiClock /> ~{details.estimatedMinutes} min
            </span>
          ) : null}
          {deadline ? (
            <span>
              <FiCalendar /> Até {deadline}
            </span>
          ) : null}
          <span>
            <FiUsers />{" "}
            {post.targetRoles.map((role) => roleLabels[role]).join(" · ")}
          </span>
          {internal ? (
            <span>
              <FiMessageCircle /> {details.responseCount ?? 0} resposta
              {details.responseCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {internal ? (
          <button
            type="button"
            className={styles.researchActionButton}
            onClick={onOpenResearch}
            disabled={post.status !== "published"}
          >
            {post.status !== "published"
              ? "Pesquisa arquivada"
              : post.permissions.canEdit
                ? "Ver pesquisa e resultados"
                : "Responder na CONG"}{" "}
            <FiArrowRight />
          </button>
        ) : details.responseUrl ? (
          <a href={details.responseUrl} target="_blank" rel="noreferrer">
            Responder <FiArrowRight />
          </a>
        ) : null}
      </aside>
    </div>
  );
}

function AnnouncementTemplate({ post }: TemplateProps) {
  const details = post.details as { priority: "normal" | "important" };
  return (
    <div
      className={`${styles.templateBody} ${styles.announcementTemplate}`}
      data-priority={details.priority}
    >
      <div className={styles.announcementStripe}>
        <FiFlag />
      </div>
      <div className={styles.announcementContent}>
        <span className={styles.kindBadge}>
          {details.priority === "important"
            ? "Comunicado importante"
            : "Comunicado"}
        </span>
        <h2>
          {<CommunityRichText text={post.title} mentions={post.mentions} />}
        </h2>
        <p className={styles.bodyText}>
          {<CommunityRichText text={post.content} mentions={post.mentions} />}
        </p>
        <div className={styles.questionAudience}>
          <FiUsers /> Para{" "}
          {post.targetRoles.map((role) => roleLabels[role]).join(", ")}
        </div>
      </div>
    </div>
  );
}

function GeneralTemplate({ post }: TemplateProps) {
  const details = post.details as {
    generalType: "comment" | "idea" | "experience";
    tags: string[];
  };
  const label =
    details.generalType === "idea"
      ? "Ideia"
      : details.generalType === "experience"
        ? "Experiência"
        : "Publicação";
  return (
    <div className={`${styles.templateBody} ${styles.generalTemplate}`}>
      <span className={styles.kindBadge}>
        <FiMessageCircle /> {label}
      </span>
      <h2>
        {<CommunityRichText text={post.title} mentions={post.mentions} />}
      </h2>
      <p className={styles.bodyText}>
        {<CommunityRichText text={post.content} mentions={post.mentions} />}
      </p>
      <TagList items={details.tags} />
    </div>
  );
}

export default function CommunityPostTemplate({
  post,
  onOpenComments,
  onOpenResearch,
}: TemplateProps) {
  switch (post.kind) {
    case "request":
      return <RequestTemplate post={post} onOpenComments={onOpenComments} />;
    case "update":
      return <UpdateTemplate post={post} onOpenComments={onOpenComments} />;
    case "resource":
      return <ResourceTemplate post={post} onOpenComments={onOpenComments} />;
    case "question":
      return <QuestionTemplate post={post} onOpenComments={onOpenComments} />;
    case "research":
      return (
        <ResearchTemplate
          post={post}
          onOpenComments={onOpenComments}
          onOpenResearch={onOpenResearch}
        />
      );
    case "announcement":
      return (
        <AnnouncementTemplate post={post} onOpenComments={onOpenComments} />
      );
    case "general":
      return <GeneralTemplate post={post} onOpenComments={onOpenComments} />;
  }
}
