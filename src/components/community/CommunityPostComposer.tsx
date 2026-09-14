import { useEffect, useState, type FormEvent } from "react";
import CommunityMediaEditor from "./CommunityMediaEditor";
import CommunityMentionInput from "./CommunityMentionInput";
import {
  getCommunityPublishingOrganizations,
  type CommunityMedia,
  type CommunityMention,
  type CommunityLinkPreview,
} from "../../services/communityService";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiBox,
  FiBriefcase,
  FiCheck,
  FiCode,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHelpCircle,
  FiMessageCircle,
  FiPenTool,
  FiPlus,
  FiSearch,
  FiSend,
  FiSliders,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../../contexts/auth-context";
import { buildDefaultAvatarUrl } from "../../utils/avatar";
import {
  createCommunityPost,
  updateCommunityPost,
  type CommunityArea,
  type CommunityPost,
  type CommunityPostKind,
  type CommunityTargetRole,
  type CreateCommunityPostInput,
  type EngagementMode,
  type RequestDetails,
  type RequestType,
  type ResourceType,
  type ResearchParticipationMode,
  type ResearchType,
  type CommunitySurveyQuestionDraft,
  type CommunitySurveyQuestionType,
  type UpdateEntityType,
} from "../../services/communityService";
import {
  LANGUAGE_OPTIONS,
  TECHNOLOGY_OPTIONS,
} from "../../data/profileCatalog";
import CommunitySelectionField from "./CommunitySelectionField";
import {
  communitySkillOptions,
  communityTagOptions,
} from "./communitySelectionOptions";

import styles from "./CommunityPostComposer.module.css";

interface CommunityPostComposerProps {
  initialKind?: CommunityPostKind;
  initialPost?: CommunityPost | null;
  onClose: () => void;
  onCreated?: (post: CommunityPost) => void;
  onUpdated?: (post: CommunityPost) => void;
}

type IdentityValue =
  "personal" | `profile:${string}` | `organization:${string}`;

type KindOption = {
  id: CommunityPostKind;
  label: string;
  helper: string;
  icon: IconType;
};

type RequestOption = {
  id: RequestType;
  label: string;
  icon: IconType;
  area: CommunityArea;
  targetRoles: CommunityTargetRole[];
};

type ComposerState = {
  title: string;
  summary: string;
  content: string;
  generalType: "comment" | "idea" | "experience";
  generalTags: string[];
  questionTopic: string;
  requestType: RequestType;
  deadline: string;
  engagementMode: EngagementMode;
  peopleNeeded: string;
  skills: string[];
  moduleProblem: string;
  moduleUsers: string;
  moduleFeatures: string;
  moduleCurrentProcess: string;
  developmentScope: string;
  developmentStack: string[];
  repositoryUrl: string;
  designNeed: string;
  designDeliverables: string;
  existingMaterialUrl: string;
  marketingObjective: string;
  marketingChannels: string;
  marketingAudience: string;
  sourceLanguage: string;
  targetLanguages: string[];
  translationContentType: string;
  translationVolume: string;
  documentationType: string;
  documentationAudience: string;
  researchSupportGoal: string;
  researchSupportMethod: string;
  researchSupportAudience: string;
  volunteeringActivity: string;
  volunteeringLocation: string;
  volunteeringSchedule: string;
  otherRequestContext: string;
  researchType: ResearchType;
  researchParticipationMode: ResearchParticipationMode;
  researchAnonymous: boolean;
  surveyQuestions: CommunitySurveyQuestionDraft[];
  estimatedMinutes: string;
  researchResponseUrl: string;
  researchCriteria: string;
  entityType: UpdateEntityType;
  entityLabel: string;
  updateVersion: string;
  updateProgress: string;
  updateReferenceUrl: string;
  updateMilestones: string;
  updateTotalMilestones: string;
  updateCompletedMilestones: string;
  resourceType: ResourceType;
  resourceUrl: string;
  resourceVersion: string;
  resourceLicense: string;
  resourceTags: string[];
  announcementPriority: "normal" | "important";
};

const kindOptions: KindOption[] = [
  {
    id: "general",
    label: "Publicação",
    helper: "Ideia, relato ou atualização livre",
    icon: FiMessageCircle,
  },
  {
    id: "question",
    label: "Pergunta",
    helper: "Abra uma discussão objetiva",
    icon: FiHelpCircle,
  },
  {
    id: "request",
    label: "Solicitação",
    helper: "Peça ajuda à comunidade",
    icon: FiHeart,
  },
  {
    id: "research",
    label: "Pesquisa",
    helper: "Convide pessoas para participar",
    icon: FiSearch,
  },
  {
    id: "update",
    label: "Atualização",
    helper: "Mostre o avanço de algo",
    icon: FiActivity,
  },
  {
    id: "resource",
    label: "Recurso",
    helper: "Compartilhe algo reutilizável",
    icon: FiBox,
  },
  {
    id: "announcement",
    label: "Comunicado",
    helper: "Divulgue uma informação importante",
    icon: FiFlag,
  },
];

const requestOptions: RequestOption[] = [
  {
    id: "module",
    label: "Módulo",
    icon: FiBox,
    area: "desenvolvimento",
    targetRoles: ["developer"],
  },
  {
    id: "development",
    label: "Desenvolvimento",
    icon: FiCode,
    area: "desenvolvimento",
    targetRoles: ["developer"],
  },
  {
    id: "design",
    label: "Design",
    icon: FiPenTool,
    area: "design",
    targetRoles: ["designer"],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: FiBriefcase,
    area: "ongs",
    targetRoles: ["all"],
  },
  {
    id: "translation",
    label: "Tradução",
    icon: FiGlobe,
    area: "documentacao",
    targetRoles: ["translator"],
  },
  {
    id: "documentation",
    label: "Documentação",
    icon: FiFileText,
    area: "documentacao",
    targetRoles: ["all"],
  },
  {
    id: "research_support",
    label: "Apoio em pesquisa",
    icon: FiSearch,
    area: "pesquisa",
    targetRoles: ["all"],
  },
  {
    id: "volunteering",
    label: "Voluntariado",
    icon: FiUsers,
    area: "voluntariado",
    targetRoles: ["volunteer"],
  },
  {
    id: "other",
    label: "Outro",
    icon: FiHeart,
    area: "ongs",
    targetRoles: ["all"],
  },
];

const areaLabels: Record<CommunityArea, string> = {
  desenvolvimento: "Desenvolvimento",
  design: "Design",
  pesquisa: "Pesquisa",
  documentacao: "Documentação",
  voluntariado: "Voluntariado",
  ongs: "ONGs",
};

const roleLabels: Record<CommunityTargetRole, string> = {
  all: "Toda a comunidade",
  organization: "ONGs",
  developer: "Desenvolvedores",
  designer: "Designers",
  translator: "Tradutores",
  volunteer: "Voluntários",
  supporter: "Apoiadores",
};

const collaborationRoleLabels = {
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradutor",
  volunteer: "Voluntário",
} as const;

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
  link: "Link / referência",
  other: "Outro recurso",
};

const surveyQuestionTypeLabels: Record<CommunitySurveyQuestionType, string> = {
  short_text: "Resposta curta",
  long_text: "Resposta longa",
  single_choice: "Escolha única",
  multiple_choice: "Múltipla escolha",
  scale: "Escala",
};

const languageSelectionOptions = LANGUAGE_OPTIONS.map((language) => ({
  value: language.value,
  label: language.label,
  code: language.code,
}));

function newSurveyQuestion(
  type: CommunitySurveyQuestionType = "short_text",
): CommunitySurveyQuestionDraft {
  return {
    clientId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    prompt: "",
    required: true,
    options:
      type === "single_choice" || type === "multiple_choice"
        ? ["Opção 1", "Opção 2"]
        : [],
    scaleMin: type === "scale" ? 1 : undefined,
    scaleMax: type === "scale" ? 5 : undefined,
  };
}

function listFromText(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index);
}

function listToText(value?: string[]): string {
  return value?.join(", ") ?? "";
}

function buildUpdateMilestones(
  labelsText: string,
  totalText: string,
): string[] {
  const labels = listFromText(labelsText).slice(0, 12);
  const parsedTotal = Number(totalText || 0);
  const requestedTotal = Number.isFinite(parsedTotal)
    ? Math.max(0, Math.min(12, Math.trunc(parsedTotal)))
    : 0;
  const total = Math.max(labels.length, requestedTotal);

  return Array.from(
    { length: total },
    (_, index) => labels[index] || `Etapa ${index + 1}`,
  );
}

function initialIdentity(post?: CommunityPost | null): IdentityValue {
  if (post?.author.organization)
    return `organization:${post.author.organization.id}`;
  if (post?.author.collaborationProfile)
    return `profile:${post.author.collaborationProfile.id}`;
  return "personal";
}

function createInitialState(post?: CommunityPost | null): ComposerState {
  const state: ComposerState = {
    title: post?.title ?? "",
    summary: post?.summary ?? "",
    content: post?.content ?? "",
    generalType: "comment",
    generalTags: [],
    questionTopic: "",
    requestType: "module",
    deadline: "",
    engagementMode: "flexible",
    peopleNeeded: "",
    skills: [],
    moduleProblem: "",
    moduleUsers: "",
    moduleFeatures: "",
    moduleCurrentProcess: "",
    developmentScope: "",
    developmentStack: [],
    repositoryUrl: "",
    designNeed: "",
    designDeliverables: "",
    existingMaterialUrl: "",
    marketingObjective: "",
    marketingChannels: "",
    marketingAudience: "",
    sourceLanguage: "Português",
    targetLanguages: [],
    translationContentType: "",
    translationVolume: "",
    documentationType: "",
    documentationAudience: "",
    researchSupportGoal: "",
    researchSupportMethod: "",
    researchSupportAudience: "",
    volunteeringActivity: "",
    volunteeringLocation: "",
    volunteeringSchedule: "",
    otherRequestContext: "",
    researchType: "questionnaire",
    researchParticipationMode: "external",
    researchAnonymous: true,
    surveyQuestions: [],
    estimatedMinutes: "",
    researchResponseUrl: "",
    researchCriteria: "",
    entityType: "project",
    entityLabel: "",
    updateVersion: "",
    updateProgress: "",
    updateReferenceUrl: "",
    updateMilestones: "",
    updateTotalMilestones: "0",
    updateCompletedMilestones: "0",
    resourceType: "template",
    resourceUrl: "",
    resourceVersion: "",
    resourceLicense: "",
    resourceTags: [],
    announcementPriority: "normal",
  };

  if (!post) return state;

  if (post.kind === "general") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { generalType: string }
    >;
    state.generalType = details.generalType;
    state.generalTags = details.tags;
  }

  if (post.kind === "question") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { topic: string }
    >;
    state.questionTopic = details.topic;
  }

  if (post.kind === "request") {
    const details = post.details as RequestDetails;
    state.requestType = details.requestType;
    state.deadline = details.deadline ?? "";
    state.engagementMode = details.engagementMode;
    state.peopleNeeded = details.peopleNeeded
      ? String(details.peopleNeeded)
      : "";
    state.skills = details.skills;

    switch (details.requestType) {
      case "module":
        state.moduleProblem = details.problem;
        state.moduleUsers = details.users;
        state.moduleFeatures = listToText(details.essentialFeatures);
        state.moduleCurrentProcess = details.currentProcess;
        break;
      case "development":
        state.developmentScope = details.scope;
        state.developmentStack = details.stack;
        state.repositoryUrl = details.repositoryUrl ?? "";
        break;
      case "design":
        state.designNeed = details.designNeed;
        state.designDeliverables = listToText(details.deliverables);
        state.existingMaterialUrl = details.existingMaterialUrl ?? "";
        break;
      case "marketing":
        state.marketingObjective = details.objective;
        state.marketingChannels = listToText(details.channels);
        state.marketingAudience = details.audience;
        break;
      case "translation":
        state.sourceLanguage = details.sourceLanguage;
        state.targetLanguages = details.targetLanguages;
        state.translationContentType = details.contentType;
        state.translationVolume = details.approximateVolume;
        break;
      case "documentation":
        state.documentationType = details.documentationType;
        state.documentationAudience = details.audience;
        state.existingMaterialUrl = details.existingMaterialUrl ?? "";
        break;
      case "research_support":
        state.researchSupportGoal = details.researchGoal;
        state.researchSupportMethod = details.method;
        state.researchSupportAudience = details.targetAudience;
        break;
      case "volunteering":
        state.volunteeringActivity = details.activity;
        state.volunteeringLocation = details.location;
        state.volunteeringSchedule = details.schedule;
        break;
      case "other":
        state.otherRequestContext = details.context;
        break;
    }
  }

  if (post.kind === "research") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { researchType: ResearchType }
    >;
    state.researchType = details.researchType;
    state.researchParticipationMode = details.participationMode ?? "external";
    state.researchAnonymous = details.survey?.anonymous ?? true;
    state.surveyQuestions = details.survey?.questions ?? [];
    state.estimatedMinutes = details.estimatedMinutes
      ? String(details.estimatedMinutes)
      : "";
    state.deadline = details.deadline ?? "";
    state.researchResponseUrl = details.responseUrl ?? "";
    state.researchCriteria = details.criteria;
  }

  if (post.kind === "update") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { entityType: UpdateEntityType }
    >;
    state.entityType = details.entityType;
    state.entityLabel = details.entityLabel;
    state.updateVersion = details.version;
    state.updateProgress =
      details.progress !== null && details.progress !== undefined
        ? String(details.progress)
        : "";
    state.updateReferenceUrl = details.referenceUrl ?? "";
    state.updateMilestones = listToText(details.milestones);
    state.updateTotalMilestones = String(details.milestones.length);
    state.updateCompletedMilestones = String(details.completedMilestones ?? 0);
  }

  if (post.kind === "resource") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { resourceType: ResourceType }
    >;
    state.resourceType = details.resourceType;
    state.resourceUrl = details.resourceUrl ?? "";
    state.resourceVersion = details.version;
    state.resourceLicense = details.license;
    state.resourceTags = details.tags;
  }

  if (post.kind === "announcement") {
    const details = post.details as Extract<
      CommunityPost["details"],
      { priority: string }
    >;
    state.announcementPriority = details.priority;
  }

  return state;
}

function buildAutomaticSummary(content: string, title: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  const source = normalized || title.trim();
  if (source.length <= 240) return source;
  return `${source.slice(0, 237).trimEnd()}...`;
}

export default function CommunityPostComposer({
  initialKind,
  initialPost,
  onClose,
  onCreated,
  onUpdated,
}: CommunityPostComposerProps) {
  const { account, collaborationProfiles, collaborationProfilesLoading } =
    useAuth();

  const composerAvatarUrl = account
    ? account.avatarPath || buildDefaultAvatarUrl(account)
    : null;

  const editing = Boolean(initialPost);
  const [kind, setKind] = useState<CommunityPostKind>(
    initialPost?.kind ?? initialKind ?? "general",
  );
  const [identity, setIdentity] = useState<IdentityValue>(() =>
    initialIdentity(initialPost),
  );
  const [area, setArea] = useState<CommunityArea>(initialPost?.area ?? "ongs");
  const [targetRoles, setTargetRoles] = useState<CommunityTargetRole[]>(
    initialPost?.targetRoles ?? ["all"],
  );
  const [form, setForm] = useState<ComposerState>(() =>
    createInitialState(initialPost),
  );
  const [advancedOpen, setAdvancedOpen] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<CommunityMedia[]>(
    initialPost?.media ?? [],
  );
  const [linkPreview, setLinkPreview] = useState<CommunityLinkPreview | null>(
    initialPost?.linkPreview ?? null,
  );
  const [mentions, setMentions] = useState<CommunityMention[]>(
    initialPost?.mentions ?? [],
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const [publishingOrganizations, setPublishingOrganizations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void getCommunityPublishingOrganizations()
      .then((items) => {
        if (!cancelled) setPublishingOrganizations(items);
      })
      .catch(() => {
        if (!cancelled)
          setOrganizationsError(
            "Não foi possível carregar suas organizações. Reabra o editor para tentar novamente.",
          );
      })
      .finally(() => {
        if (!cancelled) setOrganizationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const personalName =
    account?.displayName?.trim() || account?.name || "Perfil pessoal";
  const selectedKind =
    kindOptions.find((item) => item.id === kind) ?? kindOptions[0];
  const selectedRequest =
    requestOptions.find((item) => item.id === form.requestType) ??
    requestOptions[0];

  const patch = <K extends keyof ComposerState>(
    key: K,
    value: ComposerState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addSurveyQuestion = (
    type: CommunitySurveyQuestionType = "short_text",
  ) => {
    patch("surveyQuestions", [
      ...form.surveyQuestions,
      newSurveyQuestion(type),
    ]);
  };

  const updateSurveyQuestion = (
    clientId: string,
    changes: Partial<CommunitySurveyQuestionDraft>,
  ) => {
    patch(
      "surveyQuestions",
      form.surveyQuestions.map((question) =>
        question.clientId === clientId ? { ...question, ...changes } : question,
      ),
    );
  };

  const changeSurveyQuestionType = (
    clientId: string,
    type: CommunitySurveyQuestionType,
  ) => {
    const choice = type === "single_choice" || type === "multiple_choice";
    updateSurveyQuestion(clientId, {
      type,
      options: choice ? ["Opção 1", "Opção 2"] : [],
      scaleMin: type === "scale" ? 1 : undefined,
      scaleMax: type === "scale" ? 5 : undefined,
    });
  };

  const removeSurveyQuestion = (clientId: string) => {
    patch(
      "surveyQuestions",
      form.surveyQuestions.filter((question) => question.clientId !== clientId),
    );
  };

  const updateSurveyOption = (
    clientId: string,
    index: number,
    value: string,
  ) => {
    const question = form.surveyQuestions.find(
      (item) => item.clientId === clientId,
    );
    if (!question) return;
    const options = [...question.options];
    options[index] = value;
    updateSurveyQuestion(clientId, { options });
  };

  const addSurveyOption = (clientId: string) => {
    const question = form.surveyQuestions.find(
      (item) => item.clientId === clientId,
    );
    if (!question || question.options.length >= 12) return;
    updateSurveyQuestion(clientId, {
      options: [...question.options, `Opção ${question.options.length + 1}`],
    });
  };

  const removeSurveyOption = (clientId: string, index: number) => {
    const question = form.surveyQuestions.find(
      (item) => item.clientId === clientId,
    );
    if (!question || question.options.length <= 2) return;
    updateSurveyQuestion(clientId, {
      options: question.options.filter(
        (_, optionIndex) => optionIndex !== index,
      ),
    });
  };

  const selectKind = (nextKind: CommunityPostKind) => {
    if (editing || nextKind === kind) return;
    setKind(nextKind);
    setError(null);

    if (nextKind === "request") {
      const request = requestOptions[0];
      setArea(request.area);
      setTargetRoles(request.targetRoles);
    } else if (nextKind === "research") {
      setArea("pesquisa");
      setTargetRoles(["organization"]);
    } else if (nextKind === "update") {
      setArea("desenvolvimento");
      setTargetRoles(["all"]);
    } else if (nextKind === "resource") {
      setArea("documentacao");
      setTargetRoles(["all"]);
    } else {
      setArea("ongs");
      setTargetRoles(["all"]);
    }
  };

  const selectRequestType = (nextType: RequestType) => {
    const option = requestOptions.find((item) => item.id === nextType);
    if (!option) return;
    patch("requestType", nextType);
    setArea(option.area);
    setTargetRoles(option.targetRoles);
  };

  const toggleTargetRole = (role: CommunityTargetRole) => {
    if (role === "all") {
      setTargetRoles(["all"]);
      return;
    }

    setTargetRoles((current) => {
      const withoutAll = current.filter((item) => item !== "all");
      const next = withoutAll.includes(role)
        ? withoutAll.filter((item) => item !== role)
        : [...withoutAll, role];
      return next.length > 0 ? next : ["all"];
    });
  };

  const buildRequestDetails = (): RequestDetails => {
    const common = {
      deadline: form.deadline || null,
      engagementMode: form.engagementMode,
      peopleNeeded: form.peopleNeeded ? Number(form.peopleNeeded) : null,
      skills: form.skills,
    };

    switch (form.requestType) {
      case "module":
        return {
          requestType: "module",
          ...common,
          problem: form.moduleProblem.trim(),
          users: form.moduleUsers.trim(),
          essentialFeatures: listFromText(form.moduleFeatures),
          currentProcess: form.moduleCurrentProcess.trim(),
        };
      case "development":
        return {
          requestType: "development",
          ...common,
          scope: form.developmentScope.trim(),
          stack: form.developmentStack,
          repositoryUrl: form.repositoryUrl.trim() || null,
        };
      case "design":
        return {
          requestType: "design",
          ...common,
          designNeed: form.designNeed.trim(),
          deliverables: listFromText(form.designDeliverables),
          existingMaterialUrl: form.existingMaterialUrl.trim() || null,
        };
      case "marketing":
        return {
          requestType: "marketing",
          ...common,
          objective: form.marketingObjective.trim(),
          channels: listFromText(form.marketingChannels),
          audience: form.marketingAudience.trim(),
        };
      case "translation":
        return {
          requestType: "translation",
          ...common,
          sourceLanguage: form.sourceLanguage.trim(),
          targetLanguages: form.targetLanguages,
          contentType: form.translationContentType.trim(),
          approximateVolume: form.translationVolume.trim(),
        };
      case "documentation":
        return {
          requestType: "documentation",
          ...common,
          documentationType: form.documentationType.trim(),
          audience: form.documentationAudience.trim(),
          existingMaterialUrl: form.existingMaterialUrl.trim() || null,
        };
      case "research_support":
        return {
          requestType: "research_support",
          ...common,
          researchGoal: form.researchSupportGoal.trim(),
          method: form.researchSupportMethod.trim(),
          targetAudience: form.researchSupportAudience.trim(),
        };
      case "volunteering":
        return {
          requestType: "volunteering",
          ...common,
          activity: form.volunteeringActivity.trim(),
          location: form.volunteeringLocation.trim(),
          schedule: form.volunteeringSchedule.trim(),
        };
      case "other":
        return {
          requestType: "other",
          ...common,
          context: form.otherRequestContext.trim(),
        };
    }
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Escreva um título para a publicação.";
    if (!form.content.trim()) return "Adicione o conteúdo da publicação.";

    if (kind === "question" && !form.questionTopic.trim())
      return "Informe o assunto da pergunta.";
    if (kind === "research") {
      if (!form.researchCriteria.trim())
        return "Explique quem pode participar da pesquisa.";
      if (
        form.researchParticipationMode === "external" &&
        !form.researchResponseUrl.trim()
      ) {
        return "Informe o link externo da pesquisa.";
      }
      if (form.researchParticipationMode === "internal") {
        if (form.surveyQuestions.length === 0)
          return "Adicione pelo menos uma pergunta à pesquisa.";
        for (const question of form.surveyQuestions) {
          if (!question.prompt.trim())
            return "Todas as perguntas precisam de um enunciado.";
          if (
            (question.type === "single_choice" ||
              question.type === "multiple_choice") &&
            question.options.filter((option) => option.trim()).length < 2
          ) {
            return "Perguntas de escolha precisam de pelo menos duas opções.";
          }
        }
      }
    }
    if (kind === "update") {
      if (!form.entityLabel.trim())
        return "Informe o projeto, módulo ou iniciativa atualizada.";
      const milestones = buildUpdateMilestones(
        form.updateMilestones,
        form.updateTotalMilestones,
      );
      const completedMilestones = Number(form.updateCompletedMilestones || 0);
      if (completedMilestones > milestones.length)
        return "As etapas concluídas não podem ser maiores que a quantidade total de etapas.";
    }

    if (kind === "request") {
      switch (form.requestType) {
        case "module":
          if (
            !form.moduleProblem.trim() ||
            !form.moduleUsers.trim() ||
            listFromText(form.moduleFeatures).length === 0
          )
            return "Informe o problema, quem usa a solução e pelo menos uma funcionalidade essencial.";
          break;
        case "development":
          if (!form.developmentScope.trim())
            return "Explique o escopo técnico da solicitação.";
          break;
        case "design":
          if (
            !form.designNeed.trim() ||
            listFromText(form.designDeliverables).length === 0
          )
            return "Informe a necessidade de design e pelo menos uma entrega.";
          break;
        case "marketing":
          if (
            !form.marketingObjective.trim() ||
            listFromText(form.marketingChannels).length === 0
          )
            return "Informe o objetivo e pelo menos um canal.";
          break;
        case "translation":
          if (
            !form.sourceLanguage.trim() ||
            form.targetLanguages.length === 0 ||
            !form.translationContentType.trim() ||
            !form.translationVolume.trim()
          )
            return "Informe origem, destino, tipo e volume da tradução.";
          break;
        case "documentation":
          if (
            !form.documentationType.trim() ||
            !form.documentationAudience.trim()
          )
            return "Informe o tipo de documentação e seu público.";
          break;
        case "research_support":
          if (!form.researchSupportGoal.trim())
            return "Informe o objetivo da pesquisa.";
          break;
        case "volunteering":
          if (!form.volunteeringActivity.trim())
            return "Descreva a atividade voluntária.";
          break;
        case "other":
          if (!form.otherRequestContext.trim())
            return "Explique a necessidade.";
          break;
      }
    }

    return null;
  };

  const buildPayload = (): CreateCommunityPostInput => {
    let authorCollaborationProfileId: string | null = null;
    let authorOrganizationId: string | null = null;

    if (identity.startsWith("profile:"))
      authorCollaborationProfileId = identity.slice("profile:".length);
    if (identity.startsWith("organization:"))
      authorOrganizationId = identity.slice("organization:".length);

    const base = {
      mediaIds: media.map((item) => item.id),
      linkPreviewId: linkPreview?.id ?? null,
      mentions: mentions
        .filter((mention) =>
          form.content
            .toLocaleLowerCase("pt-BR")
            .includes(mention.token.toLocaleLowerCase("pt-BR")),
        )
        .map(({ entityType, entityId }) => ({ entityType, entityId })),
      area,
      title: form.title.trim(),
      summary: buildAutomaticSummary(form.content, form.title),
      content: form.content.trim(),
      targetRoles,
      authorCollaborationProfileId,
      authorOrganizationId,
    };

    switch (kind) {
      case "general":
        return {
          ...base,
          kind,
          details: { generalType: form.generalType, tags: form.generalTags },
        };
      case "question":
        return { ...base, kind, details: { topic: form.questionTopic.trim() } };
      case "request":
        return { ...base, kind, details: buildRequestDetails() };
      case "research":
        return {
          ...base,
          kind,
          details: {
            researchType: form.researchType,
            participationMode: form.researchParticipationMode,
            phase: "collecting",
            estimatedMinutes: form.estimatedMinutes
              ? Number(form.estimatedMinutes)
              : null,
            deadline: form.deadline || null,
            responseUrl:
              form.researchParticipationMode === "external"
                ? form.researchResponseUrl.trim() || null
                : null,
            criteria: form.researchCriteria.trim(),
            survey:
              form.researchParticipationMode === "internal"
                ? {
                    anonymous: form.researchAnonymous,
                    questions: form.surveyQuestions,
                  }
                : null,
          },
        };
      case "update":
        return {
          ...base,
          kind,
          details: {
            entityType: form.entityType,
            entityLabel: form.entityLabel.trim(),
            version: form.updateVersion.trim(),
            progress: form.updateProgress ? Number(form.updateProgress) : null,
            referenceUrl: form.updateReferenceUrl.trim() || null,
            milestones: buildUpdateMilestones(
              form.updateMilestones,
              form.updateTotalMilestones,
            ),
            completedMilestones: Number(form.updateCompletedMilestones || 0),
          },
        };
      case "resource":
        return {
          ...base,
          kind,
          details: {
            resourceType: form.resourceType,
            resourceUrl: form.resourceUrl.trim() || null,
            version: form.resourceVersion.trim(),
            license: form.resourceLicense.trim(),
            tags: form.resourceTags,
          },
        };
      case "announcement":
        return {
          ...base,
          kind,
          details: { priority: form.announcementPriority },
        };
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || mediaBusy) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = buildPayload();

      if (initialPost) {
        const updated = await updateCommunityPost(initialPost.id, payload);
        onUpdated?.(updated);
      } else {
        const created = await createCommunityPost(payload);
        onCreated?.(created);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível salvar a publicação.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderRequestFields = () => {
    switch (form.requestType) {
      case "module":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>Problema que o módulo precisa resolver</span>
              <textarea
                rows={3}
                value={form.moduleProblem}
                onChange={(e) => patch("moduleProblem", e.target.value)}
              />
            </label>
            <label>
              <span>Quem vai usar?</span>
              <input
                value={form.moduleUsers}
                onChange={(e) => patch("moduleUsers", e.target.value)}
              />
            </label>
            <label>
              <span>Funcionalidades essenciais</span>
              <input
                value={form.moduleFeatures}
                onChange={(e) => patch("moduleFeatures", e.target.value)}
                placeholder="Uma por vírgula"
              />
            </label>
            <label className={styles.fieldWide}>
              <span>
                Como isso é feito hoje? <em>Opcional</em>
              </span>
              <textarea
                rows={2}
                value={form.moduleCurrentProcess}
                onChange={(e) => patch("moduleCurrentProcess", e.target.value)}
              />
            </label>
          </>
        );
      case "development":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>Escopo técnico</span>
              <textarea
                rows={3}
                value={form.developmentScope}
                onChange={(e) => patch("developmentScope", e.target.value)}
              />
            </label>
            <CommunitySelectionField
              label="Stack"
              values={form.developmentStack}
              onChange={(value) => patch("developmentStack", value)}
              options={TECHNOLOGY_OPTIONS}
              optional
              maxSelected={12}
              buttonLabel="Adicionar tecnologias"
              customLabel="Adicionar outra tecnologia"
            />
            <label>
              <span>
                Repositório <em>Opcional</em>
              </span>
              <input
                type="url"
                value={form.repositoryUrl}
                onChange={(e) => patch("repositoryUrl", e.target.value)}
                placeholder="https://"
              />
            </label>
          </>
        );
      case "design":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>O que precisa ser desenhado ou revisado?</span>
              <textarea
                rows={3}
                value={form.designNeed}
                onChange={(e) => patch("designNeed", e.target.value)}
              />
            </label>
            <label>
              <span>Entregas esperadas</span>
              <input
                value={form.designDeliverables}
                onChange={(e) => patch("designDeliverables", e.target.value)}
              />
            </label>
            <label>
              <span>
                Material existente <em>Opcional</em>
              </span>
              <input
                type="url"
                value={form.existingMaterialUrl}
                onChange={(e) => patch("existingMaterialUrl", e.target.value)}
              />
            </label>
          </>
        );
      case "marketing":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>Objetivo</span>
              <textarea
                rows={3}
                value={form.marketingObjective}
                onChange={(e) => patch("marketingObjective", e.target.value)}
              />
            </label>
            <label>
              <span>Canais</span>
              <input
                value={form.marketingChannels}
                onChange={(e) => patch("marketingChannels", e.target.value)}
              />
            </label>
            <label>
              <span>
                Público <em>Opcional</em>
              </span>
              <input
                value={form.marketingAudience}
                onChange={(e) => patch("marketingAudience", e.target.value)}
              />
            </label>
          </>
        );
      case "translation":
        return (
          <>
            <label>
              <span>Idioma de origem</span>
              <input
                value={form.sourceLanguage}
                onChange={(e) => patch("sourceLanguage", e.target.value)}
              />
            </label>
            <CommunitySelectionField
              label="Traduzir para"
              values={form.targetLanguages}
              onChange={(value) => patch("targetLanguages", value)}
              options={languageSelectionOptions}
              maxSelected={8}
              buttonLabel="Adicionar idiomas"
              customLabel="Adicionar outro idioma"
            />
            <label>
              <span>Tipo de conteúdo</span>
              <input
                value={form.translationContentType}
                onChange={(e) =>
                  patch("translationContentType", e.target.value)
                }
              />
            </label>
            <label>
              <span>Volume aproximado</span>
              <input
                value={form.translationVolume}
                onChange={(e) => patch("translationVolume", e.target.value)}
              />
            </label>
          </>
        );
      case "documentation":
        return (
          <>
            <label>
              <span>Tipo de documentação</span>
              <input
                value={form.documentationType}
                onChange={(e) => patch("documentationType", e.target.value)}
              />
            </label>
            <label>
              <span>Público</span>
              <input
                value={form.documentationAudience}
                onChange={(e) => patch("documentationAudience", e.target.value)}
              />
            </label>
            <label className={styles.fieldWide}>
              <span>
                Material existente <em>Opcional</em>
              </span>
              <input
                type="url"
                value={form.existingMaterialUrl}
                onChange={(e) => patch("existingMaterialUrl", e.target.value)}
              />
            </label>
          </>
        );
      case "research_support":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>Objetivo da pesquisa</span>
              <textarea
                rows={3}
                value={form.researchSupportGoal}
                onChange={(e) => patch("researchSupportGoal", e.target.value)}
              />
            </label>
            <label>
              <span>
                Método <em>Opcional</em>
              </span>
              <input
                value={form.researchSupportMethod}
                onChange={(e) => patch("researchSupportMethod", e.target.value)}
              />
            </label>
            <label>
              <span>
                Público-alvo <em>Opcional</em>
              </span>
              <input
                value={form.researchSupportAudience}
                onChange={(e) =>
                  patch("researchSupportAudience", e.target.value)
                }
              />
            </label>
          </>
        );
      case "volunteering":
        return (
          <>
            <label className={styles.fieldWide}>
              <span>Atividade</span>
              <textarea
                rows={3}
                value={form.volunteeringActivity}
                onChange={(e) => patch("volunteeringActivity", e.target.value)}
              />
            </label>
            <label>
              <span>
                Local <em>Opcional</em>
              </span>
              <input
                value={form.volunteeringLocation}
                onChange={(e) => patch("volunteeringLocation", e.target.value)}
              />
            </label>
            <label>
              <span>
                Horário / frequência <em>Opcional</em>
              </span>
              <input
                value={form.volunteeringSchedule}
                onChange={(e) => patch("volunteeringSchedule", e.target.value)}
              />
            </label>
          </>
        );
      case "other":
        return (
          <label className={styles.fieldWide}>
            <span>Explique a necessidade</span>
            <textarea
              rows={3}
              value={form.otherRequestContext}
              onChange={(e) => patch("otherRequestContext", e.target.value)}
            />
          </label>
        );
    }
  };

  return (
    <section className={styles.composer} data-kind={kind}>
      <header className={styles.header}>
        <div className={styles.headerIdentity}>
          <span className={styles.avatar}>
            {composerAvatarUrl ? (
              <img
                className={styles.avatarImage}
                src={composerAvatarUrl}
                alt=""
              />
            ) : (
              <FiUser />
            )}
          </span>
          <div>
            <strong>
              {editing ? "Editar publicação" : "Criar publicação"}
            </strong>
            <small>{selectedKind.helper}</small>
          </div>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar publicação"
        >
          <FiX />
        </button>
      </header>

      <div className={styles.kindTabs} aria-label="Tipo de publicação">
        {kindOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={kind === id ? styles.kindTabActive : styles.kindTab}
            onClick={() => selectKind(id)}
            disabled={editing}
            aria-pressed={kind === id}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.primaryFields}>
          <label className={styles.titleField}>
            <span>
              {kind === "question"
                ? "Pergunta"
                : kind === "request"
                  ? "Título da solicitação"
                  : kind === "research"
                    ? "Título da pesquisa"
                    : "Título"}
            </span>
            <input
              maxLength={160}
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder={
                kind === "question"
                  ? "O que você quer perguntar à comunidade?"
                  : "Dê um título claro para a publicação"
              }
            />
          </label>

          <div className={styles.contentField}>
            <span>Conteúdo</span>
            <CommunityMentionInput
              value={form.content}
              mentions={mentions}
              disabled={submitting}
              onChange={(value) => {
                patch("content", value);
                setMentions((current) =>
                  current.filter((mention) =>
                    value
                      .toLocaleLowerCase("pt-BR")
                      .includes(mention.token.toLocaleLowerCase("pt-BR")),
                  ),
                );
              }}
              onMention={(mention) =>
                setMentions((current) =>
                  [
                    ...current.filter(
                      (m) =>
                        m.entityId !== mention.entityId &&
                        m.token.toLowerCase() !== mention.token.toLowerCase(),
                    ),
                    mention,
                  ].slice(-20),
                )
              }
            />
          </div>
        </div>

        <CommunityMediaEditor
          media={media}
          onMedia={setMedia}
          link={linkPreview}
          onLink={setLinkPreview}
          text={form.content}
          disabled={submitting}
          onBusy={setMediaBusy}
        />

        {kind === "general" ? (
          <div className={styles.templatePanel}>
            <div className={styles.compactGrid}>
              <label>
                <span>Formato</span>
                <select
                  value={form.generalType}
                  onChange={(e) =>
                    patch(
                      "generalType",
                      e.target.value as ComposerState["generalType"],
                    )
                  }
                >
                  <option value="comment">Publicação</option>
                  <option value="idea">Ideia</option>
                  <option value="experience">Relato / experiência</option>
                </select>
              </label>
              <CommunitySelectionField
                label="Tags"
                values={form.generalTags}
                onChange={(value) => patch("generalTags", value)}
                options={communityTagOptions}
                optional
                buttonLabel="Adicionar tags"
                customLabel="Criar nova tag"
              />
            </div>
          </div>
        ) : null}

        {kind === "question" ? (
          <div className={styles.templatePanel}>
            <label>
              <span>Assunto da discussão</span>
              <input
                value={form.questionTopic}
                onChange={(e) => patch("questionTopic", e.target.value)}
                placeholder="Ex.: captação recorrente"
              />
            </label>
          </div>
        ) : null}

        {kind === "request" ? (
          <div className={styles.templatePanel}>
            <div className={styles.panelHeading}>
              <div>
                <strong>Que tipo de ajuda você precisa?</strong>
                <small>
                  O template muda para organizar só as informações relevantes.
                </small>
              </div>
            </div>
            <div className={styles.requestTabs}>
              {requestOptions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={
                    form.requestType === id
                      ? styles.requestTabActive
                      : styles.requestTab
                  }
                  onClick={() => selectRequestType(id)}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.dynamicGrid}>{renderRequestFields()}</div>
            <div className={styles.compactGridThree}>
              <label>
                <span>Modalidade</span>
                <select
                  value={form.engagementMode}
                  onChange={(e) =>
                    patch("engagementMode", e.target.value as EngagementMode)
                  }
                >
                  <option value="flexible">Flexível</option>
                  <option value="remote">Remoto</option>
                  <option value="in_person">Presencial</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </label>
              <label>
                <span>
                  Pessoas <em>Opcional</em>
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.peopleNeeded}
                  onChange={(e) => patch("peopleNeeded", e.target.value)}
                />
              </label>
              <label>
                <span>
                  Prazo <em>Opcional</em>
                </span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => patch("deadline", e.target.value)}
                />
              </label>
            </div>
            <CommunitySelectionField
              label="Habilidades úteis"
              values={form.skills}
              onChange={(value) => patch("skills", value)}
              options={communitySkillOptions}
              optional
              buttonLabel="Adicionar habilidades"
              customLabel="Criar outra habilidade"
            />
          </div>
        ) : null}

        {kind === "research" ? (
          <div className={styles.templatePanel}>
            <div className={styles.panelHeading}>
              <div>
                <strong>Como as pessoas vão responder?</strong>
                <small>
                  Use um formulário externo ou monte a pesquisa dentro da
                  própria CONG.
                </small>
              </div>
            </div>

            <div className={styles.researchModeSelector}>
              <button
                type="button"
                className={
                  form.researchParticipationMode === "internal"
                    ? styles.researchModeActive
                    : styles.researchMode
                }
                onClick={() => {
                  patch("researchParticipationMode", "internal");
                  if (form.surveyQuestions.length === 0) addSurveyQuestion();
                }}
              >
                <FiFileText />
                <span>
                  <strong>Criar na CONG</strong>
                  <small>Formulário integrado e resultados no painel</small>
                </span>
              </button>
              <button
                type="button"
                className={
                  form.researchParticipationMode === "external"
                    ? styles.researchModeActive
                    : styles.researchMode
                }
                onClick={() => patch("researchParticipationMode", "external")}
              >
                <FiGlobe />
                <span>
                  <strong>Link externo</strong>
                  <small>Google Forms, Microsoft Forms, Typeform...</small>
                </span>
              </button>
            </div>

            <div className={styles.compactGrid}>
              <label>
                <span>Formato</span>
                <select
                  value={form.researchType}
                  onChange={(e) =>
                    patch("researchType", e.target.value as ResearchType)
                  }
                >
                  {Object.entries(researchLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  Tempo estimado <em>Opcional</em>
                </span>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={form.estimatedMinutes}
                  onChange={(e) => patch("estimatedMinutes", e.target.value)}
                  placeholder="minutos"
                />
              </label>
              <label>
                <span>
                  Prazo <em>Opcional</em>
                </span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => patch("deadline", e.target.value)}
                />
              </label>
              {form.researchParticipationMode === "external" ? (
                <label>
                  <span>Link de participação</span>
                  <input
                    type="url"
                    value={form.researchResponseUrl}
                    onChange={(e) =>
                      patch("researchResponseUrl", e.target.value)
                    }
                    placeholder="https://"
                  />
                </label>
              ) : (
                <label className={styles.inlineCheckLabel}>
                  <span>Privacidade</span>
                  <button
                    type="button"
                    className={
                      form.researchAnonymous
                        ? styles.toggleActive
                        : styles.toggle
                    }
                    onClick={() =>
                      patch("researchAnonymous", !form.researchAnonymous)
                    }
                    aria-pressed={form.researchAnonymous}
                  >
                    <i />
                    {form.researchAnonymous
                      ? "Respostas anônimas"
                      : "Identificar participantes"}
                  </button>
                </label>
              )}
            </div>

            <label>
              <span>Quem pode participar?</span>
              <textarea
                rows={2}
                value={form.researchCriteria}
                onChange={(e) => patch("researchCriteria", e.target.value)}
                placeholder="Descreva o perfil de quem você quer ouvir."
              />
            </label>

            {form.researchParticipationMode === "internal" ? (
              <div className={styles.surveyBuilder}>
                <div className={styles.surveyBuilderHeader}>
                  <div>
                    <strong>Formulário da pesquisa</strong>
                    <small>
                      {form.surveyQuestions.length} pergunta
                      {form.surveyQuestions.length === 1 ? "" : "s"}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSurveyQuestion()}
                    disabled={form.surveyQuestions.length >= 30}
                  >
                    <FiPlus /> Adicionar pergunta
                  </button>
                </div>

                <div className={styles.surveyQuestionList}>
                  {form.surveyQuestions.map((question, questionIndex) => {
                    const choice =
                      question.type === "single_choice" ||
                      question.type === "multiple_choice";
                    return (
                      <article
                        className={styles.surveyQuestionCard}
                        key={question.clientId}
                      >
                        <header>
                          <span>{questionIndex + 1}</span>
                          <select
                            value={question.type}
                            onChange={(event) =>
                              changeSurveyQuestionType(
                                question.clientId,
                                event.target
                                  .value as CommunitySurveyQuestionType,
                              )
                            }
                          >
                            {Object.entries(surveyQuestionTypeLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <label className={styles.requiredToggle}>
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(event) =>
                                updateSurveyQuestion(question.clientId, {
                                  required: event.target.checked,
                                })
                              }
                            />{" "}
                            Obrigatória
                          </label>
                          <button
                            type="button"
                            className={styles.removeQuestionButton}
                            onClick={() =>
                              removeSurveyQuestion(question.clientId)
                            }
                            aria-label="Remover pergunta"
                          >
                            <FiTrash2 />
                          </button>
                        </header>

                        <input
                          className={styles.questionPromptInput}
                          value={question.prompt}
                          onChange={(event) =>
                            updateSurveyQuestion(question.clientId, {
                              prompt: event.target.value,
                            })
                          }
                          maxLength={500}
                          placeholder="Digite a pergunta"
                        />

                        {choice ? (
                          <div className={styles.surveyOptions}>
                            {question.options.map((option, optionIndex) => (
                              <div key={`${question.clientId}-${optionIndex}`}>
                                <i aria-hidden="true" />
                                <input
                                  value={option}
                                  onChange={(event) =>
                                    updateSurveyOption(
                                      question.clientId,
                                      optionIndex,
                                      event.target.value,
                                    )
                                  }
                                  maxLength={200}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSurveyOption(
                                      question.clientId,
                                      optionIndex,
                                    )
                                  }
                                  disabled={question.options.length <= 2}
                                  aria-label="Remover opção"
                                >
                                  <FiX />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className={styles.addOptionButton}
                              onClick={() => addSurveyOption(question.clientId)}
                              disabled={question.options.length >= 12}
                            >
                              <FiPlus /> Adicionar opção
                            </button>
                          </div>
                        ) : null}

                        {question.type === "scale" ? (
                          <div className={styles.scaleConfig}>
                            <label>
                              <span>De</span>
                              <input
                                type="number"
                                min={0}
                                max={9}
                                value={question.scaleMin ?? 1}
                                onChange={(event) =>
                                  updateSurveyQuestion(question.clientId, {
                                    scaleMin: Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label>
                              <span>Até</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={question.scaleMax ?? 5}
                                onChange={(event) =>
                                  updateSurveyQuestion(question.clientId, {
                                    scaleMax: Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <small>
                              A pessoa escolhe um valor dentro da escala.
                            </small>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                {form.surveyQuestions.length === 0 ? (
                  <button
                    type="button"
                    className={styles.emptySurveyBuilder}
                    onClick={() => addSurveyQuestion()}
                  >
                    <FiPlus /> Criar primeira pergunta
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {kind === "update" ? (
          <div className={styles.templatePanel}>
            <div className={styles.compactGrid}>
              <label>
                <span>O que está sendo atualizado?</span>
                <select
                  value={form.entityType}
                  onChange={(e) =>
                    patch("entityType", e.target.value as UpdateEntityType)
                  }
                >
                  <option value="project">Projeto</option>
                  <option value="module">Módulo</option>
                  <option value="organization">Organização</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                <span>Nome</span>
                <input
                  value={form.entityLabel}
                  onChange={(e) => patch("entityLabel", e.target.value)}
                />
              </label>
              <label>
                <span>
                  Versão <em>Opcional</em>
                </span>
                <input
                  value={form.updateVersion}
                  onChange={(e) => patch("updateVersion", e.target.value)}
                  placeholder="v0.8.0"
                />
              </label>
              <label>
                <span>
                  Progresso <em>Opcional</em>
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.updateProgress}
                  onChange={(e) => patch("updateProgress", e.target.value)}
                  placeholder="%"
                />
              </label>
            </div>
            <div className={styles.compactGrid}>
              <label>
                <span>Quantidade de etapas</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={form.updateTotalMilestones}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const nextTotal = Math.max(
                      0,
                      Math.min(12, Number(raw || 0)),
                    );
                    setForm((current) => ({
                      ...current,
                      updateTotalMilestones: raw,
                      updateCompletedMilestones: String(
                        Math.min(
                          Number(current.updateCompletedMilestones || 0),
                          nextTotal,
                        ),
                      ),
                    }));
                  }}
                />
              </label>
              <label>
                <span>Etapas concluídas</span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(
                    0,
                    Number(form.updateTotalMilestones || 0),
                    listFromText(form.updateMilestones).length,
                  )}
                  value={form.updateCompletedMilestones}
                  onChange={(e) =>
                    patch("updateCompletedMilestones", e.target.value)
                  }
                />
              </label>
              <label className={styles.fieldWide}>
                <span>
                  Nome das etapas <em>Opcional</em>
                </span>
                <input
                  value={form.updateMilestones}
                  onChange={(e) => {
                    const value = e.target.value;
                    const namedCount = listFromText(value).length;
                    setForm((current) => ({
                      ...current,
                      updateMilestones: value,
                      updateTotalMilestones: String(
                        Math.max(
                          Number(current.updateTotalMilestones || 0),
                          namedCount,
                        ),
                      ),
                    }));
                  }}
                  placeholder="Ex.: Cadastro, Testes com usuários, Ajustes finais"
                />
              </label>
              <label>
                <span>
                  Referência <em>Opcional</em>
                </span>
                <input
                  type="url"
                  value={form.updateReferenceUrl}
                  onChange={(e) => patch("updateReferenceUrl", e.target.value)}
                  placeholder="https://"
                />
              </label>
            </div>
          </div>
        ) : null}

        {kind === "resource" ? (
          <div className={styles.templatePanel}>
            <div className={styles.compactGrid}>
              <label>
                <span>Tipo de recurso</span>
                <select
                  value={form.resourceType}
                  onChange={(e) =>
                    patch("resourceType", e.target.value as ResourceType)
                  }
                >
                  {Object.entries(resourceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  Link <em>Opcional</em>
                </span>
                <input
                  type="url"
                  value={form.resourceUrl}
                  onChange={(e) => patch("resourceUrl", e.target.value)}
                  placeholder="https://"
                />
              </label>
              <label>
                <span>
                  Versão <em>Opcional</em>
                </span>
                <input
                  value={form.resourceVersion}
                  onChange={(e) => patch("resourceVersion", e.target.value)}
                />
              </label>
              <label>
                <span>
                  Licença <em>Opcional</em>
                </span>
                <input
                  value={form.resourceLicense}
                  onChange={(e) => patch("resourceLicense", e.target.value)}
                />
              </label>
            </div>
            <CommunitySelectionField
              label="Tags"
              values={form.resourceTags}
              onChange={(value) => patch("resourceTags", value)}
              options={communityTagOptions}
              optional
              buttonLabel="Adicionar tags"
              customLabel="Criar nova tag"
            />
          </div>
        ) : null}

        {kind === "announcement" ? (
          <div className={styles.templatePanel}>
            <label className={styles.priorityControl}>
              <span>Prioridade</span>
              <select
                value={form.announcementPriority}
                onChange={(e) =>
                  patch(
                    "announcementPriority",
                    e.target.value as ComposerState["announcementPriority"],
                  )
                }
              >
                <option value="normal">Comunicado normal</option>
                <option value="important">Importante</option>
              </select>
            </label>
          </div>
        ) : null}

        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setAdvancedOpen((current) => !current)}
          aria-expanded={advancedOpen}
        >
          <FiSliders />
          Autoria, área e público
          <span>{advancedOpen ? "Ocultar" : "Ajustar"}</span>
        </button>

        {advancedOpen ? (
          <div className={styles.advancedPanel}>
            <div className={styles.compactGrid}>
              <label>
                <span>Publicar como</span>
                <select
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value as IdentityValue)}
                >
                  <option value="personal">
                    {personalName}
                    {account?.username ? ` (@${account.username})` : ""}
                  </option>
                  {collaborationProfiles.length ? (
                    <optgroup label="Perfis de colaboração">
                      {collaborationProfiles.map((profile) => (
                        <option
                          key={profile.id}
                          value={`profile:${profile.id}`}
                        >
                          {collaborationRoleLabels[profile.role]}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {publishingOrganizations.length ? (
                    <optgroup label="Organizações">
                      {publishingOrganizations.map((representation) => (
                        <option
                          key={representation.id}
                          value={`organization:${representation.id}`}
                        >
                          {representation.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {collaborationProfilesLoading || organizationsLoading ? (
                  <small>Carregando identidades...</small>
                ) : null}
              </label>
              {organizationsError ? (
                <p role="status">{organizationsError}</p>
              ) : null}
              <label>
                <span>Área principal</span>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as CommunityArea)}
                >
                  {Object.entries(areaLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.audienceBlock}>
              <span>Priorizar para</span>
              <div className={styles.roleChips}>
                {(Object.keys(roleLabels) as CommunityTargetRole[]).map(
                  (role) => {
                    const selected = targetRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        className={
                          selected ? styles.roleChipActive : styles.roleChip
                        }
                        onClick={() => toggleTargetRole(role)}
                      >
                        {selected ? <FiCheck /> : null}
                        {roleLabels[role]}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.footerKind}>
            <selectedKind.icon />
            <span>{selectedKind.label}</span>
            {kind === "request" ? (
              <small>· {selectedRequest.label}</small>
            ) : null}
          </div>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={submitting || mediaBusy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.publishButton}
              disabled={submitting || mediaBusy}
            >
              <FiSend />
              {submitting
                ? "Salvando..."
                : editing
                  ? "Salvar alterações"
                  : "Publicar"}
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}
