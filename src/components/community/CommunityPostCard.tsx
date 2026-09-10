import {
  FiBookmark,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHelpCircle,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPaperclip,
  FiSearch,
  FiShare2,
  FiTag,
  FiUsers,
} from "react-icons/fi";

import type {
  CommunityPost,
  RequestDetails,
} from "../../services/communityService";

import styles from "./CommunityPostCard.module.css";

interface CommunityPostCardProps {
  post: CommunityPost;
  onPendingAction?: () => void;
}

const areaLabels: Record<CommunityPost["area"], string> = {
  desenvolvimento: "Desenvolvimento",
  design: "Design",
  pesquisa: "Pesquisa",
  documentacao: "Documentação",
  voluntariado: "Voluntariado",
  ongs: "ONGs",
};

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
  module: "Módulo solicitado",
  development: "Ajuda em desenvolvimento",
  design: "Ajuda em design",
  marketing: "Ajuda em marketing",
  translation: "Tradução solicitada",
  documentation: "Ajuda em documentação",
  research_support: "Apoio em pesquisa",
  volunteering: "Apoio voluntário",
  other: "Solicitação de ajuda",
};

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

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

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function RequestBody({ post }: { post: CommunityPost }) {
  const details = post.details as RequestDetails;
  const deadline = formatDate(details.deadline);

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiUsers aria-hidden="true" />
        <strong>{requestLabels[details.requestType]}</strong>
      </div>

      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>

      {details.requestType === "translation" ? (
        <div className={styles.highlightPanel}>
          <strong>
            {details.sourceLanguage} → {details.targetLanguages.join(", ")}
          </strong>
          <span>
            {details.contentType} · {details.approximateVolume}
          </span>
        </div>
      ) : null}

      {details.requestType === "module" ? (
        <div className={styles.highlightPanel}>
          <strong>Problema a resolver</strong>
          <span>{details.problem}</span>
          <small>Para: {details.users}</small>
        </div>
      ) : null}

      {details.requestType === "marketing" ? (
        <div className={styles.highlightPanel}>
          <strong>Objetivo</strong>
          <span>{details.objective}</span>
          <small>Canais: {details.channels.join(", ")}</small>
        </div>
      ) : null}

      {details.requestType === "design" ? (
        <div className={styles.highlightPanel}>
          <strong>Entrega esperada</strong>
          <span>{details.deliverables.join(" · ")}</span>
        </div>
      ) : null}

      {details.requestType === "development" ? (
        <div className={styles.highlightPanel}>
          <strong>Escopo técnico</strong>
          <span>{details.scope}</span>
          {details.stack.length > 0 ? (
            <small>Stack: {details.stack.join(", ")}</small>
          ) : null}
        </div>
      ) : null}

      {details.requestType === "documentation" ? (
        <div className={styles.highlightPanel}>
          <strong>{details.documentationType}</strong>
          <span>Público: {details.audience}</span>
        </div>
      ) : null}

      {details.requestType === "research_support" ? (
        <div className={styles.highlightPanel}>
          <strong>Objetivo da pesquisa</strong>
          <span>{details.researchGoal}</span>
        </div>
      ) : null}

      {details.requestType === "volunteering" ? (
        <div className={styles.highlightPanel}>
          <strong>Atividade</strong>
          <span>{details.activity}</span>
          {details.location ? <small>{details.location}</small> : null}
        </div>
      ) : null}

      {details.requestType === "other" ? (
        <div className={styles.highlightPanel}>
          <strong>Contexto</strong>
          <span>{details.context}</span>
        </div>
      ) : null}

      <div className={styles.metaGrid}>
        <span>
          <FiGlobe aria-hidden="true" />
          {details.engagementMode === "remote"
            ? "Remoto"
            : details.engagementMode === "in_person"
              ? "Presencial"
              : details.engagementMode === "hybrid"
                ? "Híbrido"
                : "Flexível"}
        </span>

        {details.peopleNeeded ? (
          <span>
            <FiUsers aria-hidden="true" />
            {details.peopleNeeded} pessoa(s)
          </span>
        ) : null}

        {deadline ? (
          <span>
            <FiClock aria-hidden="true" />
            Até {deadline}
          </span>
        ) : null}
      </div>

      {details.skills.length > 0 ? (
        <div className={styles.tags}>
          {details.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResearchBody({ post }: { post: CommunityPost }) {
  const details = post.details as {
    researchType: string;
    estimatedMinutes?: number | null;
    deadline?: string | null;
    responseUrl?: string | null;
    criteria: string;
  };

  const researchLabels: Record<string, string> = {
    questionnaire: "Questionário",
    interview: "Entrevista",
    usability_test: "Teste de usabilidade",
    validation: "Validação",
    field_research: "Pesquisa de campo",
  };

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiSearch aria-hidden="true" />
        <strong>Pesquisa · {researchLabels[details.researchType]}</strong>
      </div>

      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>

      <div className={styles.researchAudience}>
        <small>Queremos ouvir</small>
        <strong>{post.targetRoles.map((role) => roleLabels[role]).join(" · ")}</strong>
      </div>

      <p>{post.content}</p>

      <div className={styles.metaGrid}>
        {details.estimatedMinutes ? (
          <span>
            <FiClock aria-hidden="true" />
            Cerca de {details.estimatedMinutes} min
          </span>
        ) : null}

        {details.deadline ? (
          <span>
            <FiFlag aria-hidden="true" />
            Até {formatDate(details.deadline)}
          </span>
        ) : null}
      </div>

      {details.criteria ? (
        <div className={styles.criteria}>
          <strong>Quem pode participar</strong>
          <span>{details.criteria}</span>
        </div>
      ) : null}

      {details.responseUrl ? (
        <a
          className={styles.inlineAction}
          href={details.responseUrl}
          target="_blank"
          rel="noreferrer"
        >
          Responder pesquisa <FiExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function QuestionBody({ post }: { post: CommunityPost }) {
  const details = post.details as { topic: string; resolved?: boolean };

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiHelpCircle aria-hidden="true" />
        <strong>Pergunta · {details.topic}</strong>
      </div>

      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>
      <p>{post.content}</p>

      <div className={styles.audienceLine}>
        <FiUsers aria-hidden="true" />
        Direcionada para {post.targetRoles.map((role) => roleLabels[role]).join(", ")}
      </div>
    </div>
  );
}

function UpdateBody({ post }: { post: CommunityPost }) {
  const details = post.details as {
    entityType: string;
    entityLabel: string;
    version: string;
    progress?: number | null;
    referenceUrl?: string | null;
  };

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiCheckCircle aria-hidden="true" />
        <strong>Atualização · {details.entityLabel}</strong>
      </div>

      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>
      <p>{post.content}</p>

      {details.progress !== null && details.progress !== undefined ? (
        <div className={styles.progressBlock}>
          <div>
            <span>Progresso informado</span>
            <strong>{details.progress}%</strong>
          </div>
          <i>
            <b style={{ width: `${details.progress}%` }} />
          </i>
        </div>
      ) : null}

      <div className={styles.metaGrid}>
        {details.version ? <span>Versão {details.version}</span> : null}
        <span>{details.entityType}</span>
      </div>

      {details.referenceUrl ? (
        <a
          className={styles.inlineAction}
          href={details.referenceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir referência <FiExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function ResourceBody({ post }: { post: CommunityPost }) {
  const details = post.details as {
    resourceType: string;
    resourceUrl?: string | null;
    version: string;
    license: string;
    tags: string[];
  };

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiPaperclip aria-hidden="true" />
        <strong>Recurso compartilhado · {details.resourceType}</strong>
      </div>

      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>
      <p>{post.content}</p>

      <div className={styles.resourceBox}>
        <FiBox aria-hidden="true" />
        <div>
          <strong>{post.title}</strong>
          <small>
            {[details.version && `v${details.version}`, details.license]
              .filter(Boolean)
              .join(" · ") || "Recurso da comunidade"}
          </small>
        </div>
      </div>

      {details.tags.length > 0 ? (
        <div className={styles.tags}>
          {details.tags.map((tag) => (
            <span key={tag}>
              <FiTag aria-hidden="true" /> {tag}
            </span>
          ))}
        </div>
      ) : null}

      {details.resourceUrl ? (
        <a
          className={styles.inlineAction}
          href={details.resourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir recurso <FiExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function GeneralBody({ post }: { post: CommunityPost }) {
  const details = post.details as {
    generalType: "comment" | "idea" | "experience";
    tags: string[];
  };

  const label =
    details.generalType === "idea"
      ? "Ideia"
      : details.generalType === "experience"
        ? "Relato"
        : "Publicação";

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiMessageCircle aria-hidden="true" />
        <strong>{label}</strong>
      </div>
      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>
      <p>{post.content}</p>
      {details.tags.length > 0 ? (
        <div className={styles.tags}>
          {details.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AnnouncementBody({ post }: { post: CommunityPost }) {
  const details = post.details as { priority: "normal" | "important" };

  return (
    <div className={styles.structuredBody}>
      <div className={styles.kindLine}>
        <FiFlag aria-hidden="true" />
        <strong>
          {details.priority === "important" ? "Comunicado importante" : "Comunicado"}
        </strong>
      </div>
      <h2>{post.title}</h2>
      <p className={styles.summary}>{post.summary}</p>
      <p>{post.content}</p>
      <div className={styles.audienceLine}>
        <FiUsers aria-hidden="true" />
        Para {post.targetRoles.map((role) => roleLabels[role]).join(", ")}
      </div>
    </div>
  );
}

function PostBody({ post }: { post: CommunityPost }) {
  switch (post.kind) {
    case "request":
      return <RequestBody post={post} />;
    case "research":
      return <ResearchBody post={post} />;
    case "question":
      return <QuestionBody post={post} />;
    case "update":
      return <UpdateBody post={post} />;
    case "resource":
      return <ResourceBody post={post} />;
    case "announcement":
      return <AnnouncementBody post={post} />;
    case "general":
      return <GeneralBody post={post} />;
  }
}

export default function CommunityPostCard({
  post,
  onPendingAction,
}: CommunityPostCardProps) {
  const authorName = post.author.organization?.name ?? post.author.displayName;
  const authorContext = post.author.organization
    ? "Organização"
    : post.author.collaborationProfile?.role
      ? post.author.collaborationProfile.role
      : areaLabels[post.area];

  return (
    <article className={styles.card} data-kind={post.kind}>
      <header className={styles.header}>
        {post.author.avatarUrl && !post.author.organization ? (
          <img className={styles.avatarImage} src={post.author.avatarUrl} alt="" />
        ) : (
          <span className={styles.avatar}>{getInitials(authorName)}</span>
        )}

        <div className={styles.author}>
          <div>
            <strong>{authorName}</strong>
            {post.author.organization ? (
              <FiCheckCircle title="Organização" aria-label="Organização" />
            ) : null}
          </div>
          <small>
            {authorContext} · {areaLabels[post.area]} · {formatPublishedAt(post.publishedAt)}
          </small>
        </div>

        <button
          type="button"
          className={styles.moreButton}
          aria-label="Mais opções"
          onClick={onPendingAction}
        >
          <FiMoreHorizontal aria-hidden="true" />
        </button>
      </header>

      <PostBody post={post} />

      <footer className={styles.engagement}>
        <div>
          <button type="button" onClick={onPendingAction}>
            <FiHeart aria-hidden="true" /> Apoiar
          </button>
          <button type="button" onClick={onPendingAction}>
            <FiMessageCircle aria-hidden="true" />
            {post.kind === "question" ? "Responder" : "Comentar"}
          </button>
          <button type="button" onClick={onPendingAction}>
            <FiShare2 aria-hidden="true" /> Compartilhar
          </button>
        </div>

        <button
          type="button"
          className={styles.saveButton}
          onClick={onPendingAction}
          aria-label="Salvar publicação"
        >
          <FiBookmark aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
