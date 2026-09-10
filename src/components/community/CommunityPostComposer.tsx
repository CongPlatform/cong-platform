import { useMemo, useState, type FormEvent } from "react";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
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
  FiSearch,
  FiSend,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../../contexts/auth-context";
import {
  createCommunityPost,
  type CommunityArea,
  type CommunityPost,
  type CommunityPostKind,
  type CommunityTargetRole,
  type EngagementMode,
  type RequestType,
  type ResourceType,
  type ResearchType,
  type UpdateEntityType,
} from "../../services/communityService";

import styles from "./CommunityPostComposer.module.css";

interface CommunityPostComposerProps {
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
}

type IdentityValue =
  | "personal"
  | `profile:${string}`
  | `organization:${string}`;

type IntentOption = {
  id: CommunityPostKind;
  label: string;
  description: string;
  helper: string;
  icon: IconType;
};

type RequestOption = {
  id: RequestType;
  label: string;
  description: string;
  icon: IconType;
  area: CommunityArea;
  targetRoles: CommunityTargetRole[];
};

const intents: IntentOption[] = [
  {
    id: "request",
    label: "Pedir ajuda",
    description: "Encontre pessoas para uma necessidade concreta.",
    helper: "Módulo, código, design, marketing, tradução e mais",
    icon: FiUsers,
  },
  {
    id: "research",
    label: "Lançar uma pesquisa",
    description: "Convide um público específico para responder ou participar.",
    helper: "Questionário, entrevista, teste ou validação",
    icon: FiSearch,
  },
  {
    id: "question",
    label: "Fazer uma pergunta",
    description: "Abra uma dúvida para pessoas que realmente podem ajudar.",
    helper: "Técnica, gestão, design, pesquisa ou comunidade",
    icon: FiHelpCircle,
  },
  {
    id: "update",
    label: "Atualizar algo",
    description: "Mostre a evolução de um projeto, módulo ou organização.",
    helper: "Progresso, versão, mudanças e referência",
    icon: FiActivity,
  },
  {
    id: "resource",
    label: "Compartilhar um recurso",
    description: "Publique algo reutilizável pela comunidade.",
    helper: "Template, guia, documento, código ou ferramenta",
    icon: FiBox,
  },
  {
    id: "announcement",
    label: "Fazer um comunicado",
    description: "Divulgue uma informação importante para um público definido.",
    helper: "Organização, projeto ou comunidade",
    icon: FiFlag,
  },
  {
    id: "general",
    label: "Compartilhar algo",
    description: "Publique uma ideia, comentário ou relato sem criar uma demanda.",
    helper: "Conversa leve, experiência e conhecimento",
    icon: FiMessageCircle,
  },
];

const requestOptions: RequestOption[] = [
  {
    id: "module",
    label: "Solicitar módulo",
    description: "Transformar um processo real em uma solução reutilizável.",
    icon: FiBox,
    area: "desenvolvimento",
    targetRoles: ["developer"],
  },
  {
    id: "development",
    label: "Desenvolvimento",
    description: "Pedir ajuda com código, integração, bug ou implementação.",
    icon: FiCode,
    area: "desenvolvimento",
    targetRoles: ["developer"],
  },
  {
    id: "design",
    label: "Design",
    description: "UX, interface, identidade, protótipo ou revisão visual.",
    icon: FiPenTool,
    area: "design",
    targetRoles: ["designer"],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Campanha, comunicação, conteúdo, captação ou divulgação.",
    icon: FiBriefcase,
    area: "ongs",
    targetRoles: ["all"],
  },
  {
    id: "translation",
    label: "Tradução",
    description: "Solicitar tradução ou adaptação de conteúdo.",
    icon: FiGlobe,
    area: "documentacao",
    targetRoles: ["translator"],
  },
  {
    id: "documentation",
    label: "Documentação",
    description: "Guias, manuais, processos e materiais de apoio.",
    icon: FiFileText,
    area: "documentacao",
    targetRoles: ["all"],
  },
  {
    id: "research_support",
    label: "Apoio em pesquisa",
    description: "Planejamento, coleta, análise ou validação de pesquisa.",
    icon: FiSearch,
    area: "pesquisa",
    targetRoles: ["all"],
  },
  {
    id: "volunteering",
    label: "Voluntariado",
    description: "Solicitar apoio presencial ou remoto para uma atividade.",
    icon: FiHeart,
    area: "voluntariado",
    targetRoles: ["volunteer"],
  },
  {
    id: "other",
    label: "Outro tipo de ajuda",
    description: "Uma necessidade que não cabe nas opções anteriores.",
    icon: FiUsers,
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
  organization: "ONGs e organizações",
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
  validation: "Validação de ideia",
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

function listFromText(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index);
}

function OptionalNumberInput({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function CommunityPostComposer({
  onClose,
  onCreated,
}: CommunityPostComposerProps) {
  const {
    account,
    collaborationProfiles,
    collaborationProfilesLoading,
    representations,
    representationsLoading,
  } = useAuth();

  const [kind, setKind] = useState<CommunityPostKind | null>(null);
  const [identity, setIdentity] = useState<IdentityValue>("personal");
  const [area, setArea] = useState<CommunityArea>("ongs");
  const [targetRoles, setTargetRoles] = useState<CommunityTargetRole[]>(["all"]);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");

  const [requestType, setRequestType] = useState<RequestType>("module");
  const [deadline, setDeadline] = useState("");
  const [engagementMode, setEngagementMode] =
    useState<EngagementMode>("flexible");
  const [peopleNeeded, setPeopleNeeded] = useState("");
  const [skills, setSkills] = useState("");

  const [moduleProblem, setModuleProblem] = useState("");
  const [moduleUsers, setModuleUsers] = useState("");
  const [moduleFeatures, setModuleFeatures] = useState("");
  const [moduleCurrentProcess, setModuleCurrentProcess] = useState("");

  const [developmentScope, setDevelopmentScope] = useState("");
  const [developmentStack, setDevelopmentStack] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");

  const [designNeed, setDesignNeed] = useState("");
  const [designDeliverables, setDesignDeliverables] = useState("");
  const [existingMaterialUrl, setExistingMaterialUrl] = useState("");

  const [marketingObjective, setMarketingObjective] = useState("");
  const [marketingChannels, setMarketingChannels] = useState("");
  const [marketingAudience, setMarketingAudience] = useState("");

  const [sourceLanguage, setSourceLanguage] = useState("Português");
  const [targetLanguages, setTargetLanguages] = useState("");
  const [translationContentType, setTranslationContentType] = useState("");
  const [translationVolume, setTranslationVolume] = useState("");

  const [documentationType, setDocumentationType] = useState("");
  const [documentationAudience, setDocumentationAudience] = useState("");

  const [researchSupportGoal, setResearchSupportGoal] = useState("");
  const [researchSupportMethod, setResearchSupportMethod] = useState("");
  const [researchSupportAudience, setResearchSupportAudience] = useState("");

  const [volunteeringActivity, setVolunteeringActivity] = useState("");
  const [volunteeringLocation, setVolunteeringLocation] = useState("");
  const [volunteeringSchedule, setVolunteeringSchedule] = useState("");
  const [otherRequestContext, setOtherRequestContext] = useState("");

  const [researchType, setResearchType] =
    useState<ResearchType>("questionnaire");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [researchResponseUrl, setResearchResponseUrl] = useState("");
  const [researchCriteria, setResearchCriteria] = useState("");

  const [questionTopic, setQuestionTopic] = useState("");

  const [entityType, setEntityType] = useState<UpdateEntityType>("project");
  const [entityLabel, setEntityLabel] = useState("");
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateProgress, setUpdateProgress] = useState("");
  const [updateReferenceUrl, setUpdateReferenceUrl] = useState("");

  const [resourceType, setResourceType] = useState<ResourceType>("template");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceVersion, setResourceVersion] = useState("");
  const [resourceLicense, setResourceLicense] = useState("");
  const [resourceTags, setResourceTags] = useState("");

  const [announcementPriority, setAnnouncementPriority] =
    useState<"normal" | "important">("normal");

  const [generalType, setGeneralType] =
    useState<"comment" | "idea" | "experience">("comment");
  const [generalTags, setGeneralTags] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRepresentations = useMemo(
    () => representations.filter((representation) => representation.status === "active"),
    [representations],
  );

  const selectedIntent = intents.find((item) => item.id === kind) ?? null;
  const selectedRequest =
    requestOptions.find((item) => item.id === requestType) ?? requestOptions[0];

  const personalName =
    account?.displayName?.trim() || account?.name || "Perfil pessoal";

  const selectedIdentityLabel = (() => {
    if (identity === "personal") {
      return personalName;
    }

    if (identity.startsWith("profile:")) {
      const profileId = identity.slice("profile:".length);
      const profile = collaborationProfiles.find((item) => item.id === profileId);

      return profile
        ? collaborationRoleLabels[profile.role]
        : personalName;
    }

    if (identity.startsWith("organization:")) {
      const organizationId = identity.slice("organization:".length);
      const representation = activeRepresentations.find(
        (item) => item.organizationId === organizationId,
      );

      return representation?.organizationName ?? personalName;
    }

    return personalName;
  })();

  const selectIntent = (nextKind: CommunityPostKind) => {
    setKind(nextKind);
    setError(null);

    if (nextKind === "request") {
      const request = requestOptions[0];
      setArea(request.area);
      setTargetRoles(request.targetRoles);
      return;
    }

    if (nextKind === "research") {
      setArea("pesquisa");
      setTargetRoles(["organization"]);
      return;
    }

    if (nextKind === "question") {
      setArea("ongs");
      setTargetRoles(["all"]);
      return;
    }

    if (nextKind === "update") {
      setArea("desenvolvimento");
      setTargetRoles(["all"]);
      return;
    }

    if (nextKind === "resource") {
      setArea("documentacao");
      setTargetRoles(["all"]);
      return;
    }

    setArea("ongs");
    setTargetRoles(["all"]);
  };

  const selectRequestType = (nextType: RequestType) => {
    const option = requestOptions.find((item) => item.id === nextType);
    if (!option) return;

    setRequestType(nextType);
    setArea(option.area);
    setTargetRoles(option.targetRoles);
    setError(null);
  };

  const toggleTargetRole = (role: CommunityTargetRole) => {
    if (role === "all") {
      setTargetRoles(["all"]);
      return;
    }

    setTargetRoles((current) => {
      const withoutAll = current.filter((item) => item !== "all");
      const exists = withoutAll.includes(role);
      const next = exists
        ? withoutAll.filter((item) => item !== role)
        : [...withoutAll, role];

      return next.length > 0 ? next : ["all"];
    });
  };

  const buildRequestDetails = () => {
    const common = {
      deadline: deadline || null,
      engagementMode,
      peopleNeeded: peopleNeeded ? Number(peopleNeeded) : null,
      skills: listFromText(skills),
    };

    switch (requestType) {
      case "module":
        return {
          requestType,
          ...common,
          problem: moduleProblem.trim(),
          users: moduleUsers.trim(),
          essentialFeatures: listFromText(moduleFeatures),
          currentProcess: moduleCurrentProcess.trim(),
        } as const;
      case "development":
        return {
          requestType,
          ...common,
          scope: developmentScope.trim(),
          stack: listFromText(developmentStack),
          repositoryUrl: repositoryUrl.trim() || null,
        } as const;
      case "design":
        return {
          requestType,
          ...common,
          designNeed: designNeed.trim(),
          deliverables: listFromText(designDeliverables),
          existingMaterialUrl: existingMaterialUrl.trim() || null,
        } as const;
      case "marketing":
        return {
          requestType,
          ...common,
          objective: marketingObjective.trim(),
          channels: listFromText(marketingChannels),
          audience: marketingAudience.trim(),
        } as const;
      case "translation":
        return {
          requestType,
          ...common,
          sourceLanguage: sourceLanguage.trim(),
          targetLanguages: listFromText(targetLanguages),
          contentType: translationContentType.trim(),
          approximateVolume: translationVolume.trim(),
        } as const;
      case "documentation":
        return {
          requestType,
          ...common,
          documentationType: documentationType.trim(),
          audience: documentationAudience.trim(),
          existingMaterialUrl: existingMaterialUrl.trim() || null,
        } as const;
      case "research_support":
        return {
          requestType,
          ...common,
          researchGoal: researchSupportGoal.trim(),
          method: researchSupportMethod.trim(),
          targetAudience: researchSupportAudience.trim(),
        } as const;
      case "volunteering":
        return {
          requestType,
          ...common,
          activity: volunteeringActivity.trim(),
          location: volunteeringLocation.trim(),
          schedule: volunteeringSchedule.trim(),
        } as const;
      case "other":
        return {
          requestType,
          ...common,
          context: otherRequestContext.trim(),
        } as const;
    }
  };

  const validateDynamicFields = (): string | null => {
    if (!kind) return "Escolha o que você quer fazer na comunidade.";
    if (!title.trim() || !summary.trim()) {
      return "Preencha o título e o resumo antes de publicar.";
    }

    if (kind === "general" && !content.trim()) {
      return "Conte um pouco mais sobre o que você quer compartilhar.";
    }

    if (targetRoles.length === 0) {
      return "Escolha quem deve receber esta publicação.";
    }

    if (kind === "request") {
      switch (requestType) {
        case "module":
          if (!moduleProblem.trim() || !moduleUsers.trim() || listFromText(moduleFeatures).length === 0) {
            return "Para solicitar um módulo, informe o problema, quem vai usar e pelo menos uma funcionalidade essencial.";
          }
          break;
        case "development":
          if (!developmentScope.trim()) return "Explique o escopo técnico da ajuda.";
          break;
        case "design":
          if (!designNeed.trim() || listFromText(designDeliverables).length === 0) {
            return "Explique a necessidade de design e pelo menos uma entrega esperada.";
          }
          break;
        case "marketing":
          if (!marketingObjective.trim() || listFromText(marketingChannels).length === 0) {
            return "Informe o objetivo e pelo menos um canal da ação de marketing.";
          }
          break;
        case "translation":
          if (
            !sourceLanguage.trim() ||
            listFromText(targetLanguages).length === 0 ||
            !translationContentType.trim() ||
            !translationVolume.trim()
          ) {
            return "Informe idioma de origem, destino, tipo e volume aproximado do conteúdo.";
          }
          break;
        case "documentation":
          if (!documentationType.trim() || !documentationAudience.trim()) {
            return "Informe o tipo de documentação e para quem ela será feita.";
          }
          break;
        case "research_support":
          if (!researchSupportGoal.trim()) return "Informe o objetivo da pesquisa.";
          break;
        case "volunteering":
          if (!volunteeringActivity.trim()) return "Descreva a atividade voluntária.";
          break;
        case "other":
          if (!otherRequestContext.trim()) return "Explique que tipo de ajuda você precisa.";
          break;
      }
    }

    if (kind === "research" && !researchCriteria.trim()) {
      return "Explique quem pode participar da pesquisa.";
    }

    if (kind === "question" && !questionTopic.trim()) {
      return "Informe o assunto da pergunta.";
    }

    if (kind === "update" && !entityLabel.trim()) {
      return "Informe qual projeto, módulo ou iniciativa está sendo atualizado.";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting || !kind) return;

    const validationError = validateDynamicFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    let authorCollaborationProfileId: string | null = null;
    let authorOrganizationId: string | null = null;

    if (identity.startsWith("profile:")) {
      authorCollaborationProfileId = identity.slice("profile:".length);
    }

    if (identity.startsWith("organization:")) {
      authorOrganizationId = identity.slice("organization:".length);
    }

    const base = {
      area,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim() || summary.trim(),
      targetRoles,
      authorCollaborationProfileId,
      authorOrganizationId,
    };

    try {
      setSubmitting(true);
      setError(null);

      let post: CommunityPost;

      switch (kind) {
        case "general":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              generalType,
              tags: listFromText(generalTags),
            },
          });
          break;
        case "question":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              topic: questionTopic.trim(),
            },
          });
          break;
        case "request":
          post = await createCommunityPost({
            ...base,
            kind,
            details: buildRequestDetails(),
          });
          break;
        case "research":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              researchType,
              estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
              deadline: deadline || null,
              responseUrl: researchResponseUrl.trim() || null,
              criteria: researchCriteria.trim(),
            },
          });
          break;
        case "update":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              entityType,
              entityLabel: entityLabel.trim(),
              version: updateVersion.trim(),
              progress: updateProgress ? Number(updateProgress) : null,
              referenceUrl: updateReferenceUrl.trim() || null,
            },
          });
          break;
        case "resource":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              resourceType,
              resourceUrl: resourceUrl.trim() || null,
              version: resourceVersion.trim(),
              license: resourceLicense.trim(),
              tags: listFromText(resourceTags),
            },
          });
          break;
        case "announcement":
          post = await createCommunityPost({
            ...base,
            kind,
            details: {
              priority: announcementPriority,
            },
          });
          break;
      }

      onCreated(post);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível publicar. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const commonCopy = useMemo(() => {
    if (kind === "question") {
      return {
        title: "Sua pergunta",
        titlePlaceholder: "Qual dúvida você quer colocar para a comunidade?",
        summary: "Contexto rápido",
        summaryPlaceholder: "Por que essa dúvida surgiu?",
        content: "Detalhes úteis",
      };
    }

    if (kind === "research") {
      return {
        title: "Título da pesquisa",
        titlePlaceholder: "Ex.: Como ONGs organizam voluntários hoje?",
        summary: "Objetivo em uma frase",
        summaryPlaceholder: "O que você pretende entender ou validar?",
        content: "Apresentação da pesquisa",
      };
    }

    if (kind === "request") {
      return {
        title: "Como essa necessidade deve aparecer no feed?",
        titlePlaceholder: `Ex.: ${selectedRequest.label} para organizar nosso atendimento`,
        summary: "Resumo para quem pode ajudar",
        summaryPlaceholder: "Em uma frase, o que precisa acontecer?",
        content: "Contexto adicional (opcional)",
      };
    }

    if (kind === "update") {
      return {
        title: "Título da atualização",
        titlePlaceholder: "O que mudou?",
        summary: "Resumo da mudança",
        summaryPlaceholder: "Qual é a principal novidade?",
        content: "Detalhes da atualização (opcional)",
      };
    }

    if (kind === "resource") {
      return {
        title: "Nome do recurso",
        titlePlaceholder: "Como a comunidade deve identificar esse recurso?",
        summary: "Para que ele serve?",
        summaryPlaceholder: "Explique rapidamente por que esse recurso é útil.",
        content: "Instruções ou contexto adicional (opcional)",
      };
    }

    if (kind === "announcement") {
      return {
        title: "Título do comunicado",
        titlePlaceholder: "Qual informação precisa chamar atenção?",
        summary: "Mensagem principal",
        summaryPlaceholder: "Resuma o comunicado em uma frase.",
        content: "Informações adicionais (opcional)",
      };
    }

    return {
      title: "Título",
      titlePlaceholder: "Dê um título claro para a publicação",
      summary: "Resumo",
      summaryPlaceholder: "Explique rapidamente o que as pessoas precisam saber",
      content: kind === "general" ? "O que você quer compartilhar?" : "Contexto adicional (opcional)",
    };
  }, [kind, selectedRequest.label]);

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.composer}
        data-kind={kind ?? "chooser"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-composer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            {kind ? (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => {
                  setKind(null);
                  setError(null);
                }}
              >
                <FiArrowLeft aria-hidden="true" />
                Trocar intenção
              </button>
            ) : (
              <span className={styles.eyebrow}>Comunidade CONG</span>
            )}

            <h2 id="community-composer-title">
              {kind && selectedIntent
                ? selectedIntent.label
                : "O que você quer fazer na comunidade?"}
            </h2>
            <p>
              {kind && selectedIntent
                ? selectedIntent.description
                : "A CONG adapta o formulário, o card e o público conforme sua intenção."}
            </p>

            {kind ? (
              <div className={styles.flowIndicator} aria-label="Etapas da publicação">
                <span className={styles.flowStepDone}>
                  <b>1</b> Intenção
                </span>
                <i aria-hidden="true" />
                <span className={styles.flowStepActive}>
                  <b>2</b> Detalhes
                </span>
                <i aria-hidden="true" />
                <span className={styles.flowStep}>
                  <b>3</b> Público e revisão
                </span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar criação de publicação"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>

        {!kind ? (
          <div className={styles.intentGrid}>
            {intents.map(({ id, label, description, helper, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={styles.intentCard}
                data-intent={id}
                onClick={() => selectIntent(id)}
              >
                <span className={styles.intentIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                  <small>{helper}</small>
                </div>
                <FiArrowRight className={styles.intentArrow} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.contextBar}>
              <div className={styles.contextControl}>
                <span className={styles.contextLabel}>Publicar como</span>
                <label className={styles.identitySelect}>
                  <FiUser aria-hidden="true" />
                  <select
                    value={identity}
                    onChange={(event) =>
                      setIdentity(event.target.value as IdentityValue)
                    }
                  >
                    <option value="personal">
                      {personalName}
                      {account?.username ? ` (@${account.username})` : ""}
                    </option>
                    {collaborationProfiles.length > 0 ? (
                      <optgroup label="Perfis de colaboração">
                        {collaborationProfiles.map((profile) => (
                          <option key={profile.id} value={`profile:${profile.id}`}>
                            {collaborationRoleLabels[profile.role]}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {activeRepresentations.length > 0 ? (
                      <optgroup label="Organizações que você representa">
                        {activeRepresentations.map((representation) => (
                          <option
                            key={representation.id}
                            value={`organization:${representation.organizationId}`}
                          >
                            {representation.organizationName}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                {collaborationProfilesLoading || representationsLoading ? (
                  <small className={styles.loadingIdentity}>
                    Carregando identidades disponíveis...
                  </small>
                ) : null}
              </div>

              <div className={styles.contextControl}>
                <span className={styles.contextLabel}>Área principal</span>
                <select
                  className={styles.areaSelect}
                  value={area}
                  onChange={(event) =>
                    setArea(event.target.value as CommunityArea)
                  }
                >
                  {Object.entries(areaLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.contextAudience}>
                <div className={styles.audienceHeading}>
                  <span className={styles.contextLabel}>Priorizar para</span>
                  <small>Isso orienta filtros e futuras notificações.</small>
                </div>

                <div className={styles.roleGrid}>
                  {(Object.keys(roleLabels) as CommunityTargetRole[]).map(
                    (role) => {
                      const selected = targetRoles.includes(role);

                      return (
                        <button
                          key={role}
                          type="button"
                          className={
                            selected ? styles.roleSelected : styles.roleButton
                          }
                          onClick={() => toggleTargetRole(role)}
                          aria-pressed={selected}
                        >
                          {selected ? <FiCheck aria-hidden="true" /> : <span />}
                          {roleLabels[role]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formLayout}>
              <div className={styles.mainFields}>
                {kind === "request" ? (
                  <fieldset className={styles.sectionBlock}>
                    <legend>Que tipo de ajuda você precisa?</legend>
                    <div className={styles.requestGrid}>
                      {requestOptions.map(({ id, label, description, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={
                            requestType === id
                              ? styles.requestCardActive
                              : styles.requestCard
                          }
                          onClick={() => selectRequestType(id)}
                          aria-pressed={requestType === id}
                        >
                          <Icon aria-hidden="true" />
                          <span>
                            <strong>{label}</strong>
                            <small>{description}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}


                {kind === "request" ? (
                  <section className={styles.sectionBlock}>
                    <div className={styles.sectionTitle}>
                      <span>{selectedRequest.label}</span>
                      <small>Responda apenas o que ajuda a CONG a entender a demanda e encontrar as pessoas certas.</small>
                    </div>

                    {requestType === "module" ? (
                      <>
                        <label className={styles.field}>
                          <span>Qual problema o módulo precisa resolver?</span>
                          <textarea rows={4} value={moduleProblem} onChange={(event) => setModuleProblem(event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <span>Quem vai usar essa solução?</span>
                          <textarea rows={2} value={moduleUsers} onChange={(event) => setModuleUsers(event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <span>Funcionalidades essenciais</span>
                          <textarea rows={3} value={moduleFeatures} onChange={(event) => setModuleFeatures(event.target.value)} placeholder="Uma por linha ou separadas por vírgula" />
                        </label>
                        <label className={styles.field}>
                          <span>Como isso é feito hoje? <em>Opcional</em></span>
                          <textarea rows={3} value={moduleCurrentProcess} onChange={(event) => setModuleCurrentProcess(event.target.value)} />
                        </label>
                      </>
                    ) : null}

                    {requestType === "development" ? (
                      <>
                        <label className={styles.field}>
                          <span>Escopo técnico</span>
                          <textarea rows={4} value={developmentScope} onChange={(event) => setDevelopmentScope(event.target.value)} placeholder="O que precisa ser implementado, corrigido ou integrado?" />
                        </label>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Stack / tecnologias <em>Opcional</em></span>
                            <input value={developmentStack} onChange={(event) => setDevelopmentStack(event.target.value)} placeholder="React, Node, PostgreSQL..." />
                          </label>
                          <label className={styles.field}>
                            <span>Repositório <em>Opcional</em></span>
                            <input type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://..." />
                          </label>
                        </div>
                      </>
                    ) : null}

                    {requestType === "design" ? (
                      <>
                        <label className={styles.field}>
                          <span>O que precisa ser desenhado ou revisado?</span>
                          <textarea rows={4} value={designNeed} onChange={(event) => setDesignNeed(event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <span>Entregas esperadas</span>
                          <input value={designDeliverables} onChange={(event) => setDesignDeliverables(event.target.value)} placeholder="Wireframe, protótipo, revisão de acessibilidade..." />
                        </label>
                        <label className={styles.field}>
                          <span>Material existente <em>Opcional</em></span>
                          <input type="url" value={existingMaterialUrl} onChange={(event) => setExistingMaterialUrl(event.target.value)} placeholder="https://..." />
                        </label>
                      </>
                    ) : null}

                    {requestType === "marketing" ? (
                      <>
                        <label className={styles.field}>
                          <span>Qual é o objetivo?</span>
                          <textarea rows={3} value={marketingObjective} onChange={(event) => setMarketingObjective(event.target.value)} placeholder="Atrair voluntários, melhorar presença digital, divulgar campanha..." />
                        </label>
                        <label className={styles.field}>
                          <span>Canais envolvidos</span>
                          <input value={marketingChannels} onChange={(event) => setMarketingChannels(event.target.value)} placeholder="Instagram, e-mail, site, imprensa..." />
                        </label>
                        <label className={styles.field}>
                          <span>Público que deseja alcançar <em>Opcional</em></span>
                          <input value={marketingAudience} onChange={(event) => setMarketingAudience(event.target.value)} />
                        </label>
                      </>
                    ) : null}

                    {requestType === "translation" ? (
                      <div className={styles.translationPanel}>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Idioma de origem</span>
                            <input value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} />
                          </label>
                          <label className={styles.field}>
                            <span>Traduzir para</span>
                            <input value={targetLanguages} onChange={(event) => setTargetLanguages(event.target.value)} placeholder="Espanhol, Inglês..." />
                          </label>
                        </div>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Tipo de conteúdo</span>
                            <input value={translationContentType} onChange={(event) => setTranslationContentType(event.target.value)} placeholder="Documento, site, vídeo, interface..." />
                          </label>
                          <label className={styles.field}>
                            <span>Volume aproximado</span>
                            <input value={translationVolume} onChange={(event) => setTranslationVolume(event.target.value)} placeholder="12 páginas, 800 palavras..." />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {requestType === "documentation" ? (
                      <>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Tipo de documentação</span>
                            <input value={documentationType} onChange={(event) => setDocumentationType(event.target.value)} placeholder="Manual, guia, API, processo..." />
                          </label>
                          <label className={styles.field}>
                            <span>Para quem será feita?</span>
                            <input value={documentationAudience} onChange={(event) => setDocumentationAudience(event.target.value)} />
                          </label>
                        </div>
                        <label className={styles.field}>
                          <span>Material existente <em>Opcional</em></span>
                          <input type="url" value={existingMaterialUrl} onChange={(event) => setExistingMaterialUrl(event.target.value)} />
                        </label>
                      </>
                    ) : null}

                    {requestType === "research_support" ? (
                      <>
                        <label className={styles.field}>
                          <span>Objetivo da pesquisa</span>
                          <textarea rows={3} value={researchSupportGoal} onChange={(event) => setResearchSupportGoal(event.target.value)} />
                        </label>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Método pensado <em>Opcional</em></span>
                            <input value={researchSupportMethod} onChange={(event) => setResearchSupportMethod(event.target.value)} />
                          </label>
                          <label className={styles.field}>
                            <span>Público-alvo <em>Opcional</em></span>
                            <input value={researchSupportAudience} onChange={(event) => setResearchSupportAudience(event.target.value)} />
                          </label>
                        </div>
                      </>
                    ) : null}

                    {requestType === "volunteering" ? (
                      <>
                        <label className={styles.field}>
                          <span>Qual atividade precisa de apoio?</span>
                          <textarea rows={3} value={volunteeringActivity} onChange={(event) => setVolunteeringActivity(event.target.value)} />
                        </label>
                        <div className={styles.twoColumns}>
                          <label className={styles.field}>
                            <span>Local <em>Opcional</em></span>
                            <input value={volunteeringLocation} onChange={(event) => setVolunteeringLocation(event.target.value)} />
                          </label>
                          <label className={styles.field}>
                            <span>Horário / frequência <em>Opcional</em></span>
                            <input value={volunteeringSchedule} onChange={(event) => setVolunteeringSchedule(event.target.value)} />
                          </label>
                        </div>
                      </>
                    ) : null}

                    {requestType === "other" ? (
                      <label className={styles.field}>
                        <span>Explique a necessidade</span>
                        <textarea rows={4} value={otherRequestContext} onChange={(event) => setOtherRequestContext(event.target.value)} />
                      </label>
                    ) : null}

                    <div className={styles.threeColumns}>
                      <label className={styles.field}>
                        <span>Formato</span>
                        <select value={engagementMode} onChange={(event) => setEngagementMode(event.target.value as EngagementMode)}>
                          <option value="flexible">Flexível</option>
                          <option value="remote">Remoto</option>
                          <option value="in_person">Presencial</option>
                          <option value="hybrid">Híbrido</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Pessoas necessárias <em>Opcional</em></span>
                        <OptionalNumberInput value={peopleNeeded} onChange={setPeopleNeeded} min={1} max={50} />
                      </label>
                      <label className={styles.field}>
                        <span>Prazo <em>Opcional</em></span>
                        <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span>Habilidades úteis <em>Opcional</em></span>
                      <input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Uma por vírgula" />
                    </label>
                  </section>
                ) : null}

                {kind === "research" ? (
                  <section className={styles.sectionBlock}>
                    <div className={styles.sectionTitle}>
                      <span>Configuração da pesquisa</span>
                      <small>A publicação saberá quem deve responder e como participar.</small>
                    </div>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Formato da pesquisa</span>
                        <select value={researchType} onChange={(event) => setResearchType(event.target.value as ResearchType)}>
                          {Object.entries(researchLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Tempo estimado <em>Opcional</em></span>
                        <OptionalNumberInput value={estimatedMinutes} onChange={setEstimatedMinutes} min={1} max={240} placeholder="minutos" />
                      </label>
                    </div>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Respostas até <em>Opcional</em></span>
                        <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                      </label>
                      <label className={styles.field}>
                        <span>Link para responder <em>Opcional</em></span>
                        <input type="url" value={researchResponseUrl} onChange={(event) => setResearchResponseUrl(event.target.value)} placeholder="Google Forms ou formulário externo" />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>Quem pode participar?</span>
                      <textarea rows={3} value={researchCriteria} onChange={(event) => setResearchCriteria(event.target.value)} placeholder="Ex.: representantes de OSCs que coordenam voluntários há pelo menos 6 meses." />
                    </label>
                  </section>
                ) : null}

                {kind === "question" ? (
                  <section className={styles.sectionBlock}>
                    <label className={styles.field}>
                      <span>Assunto da pergunta</span>
                      <input value={questionTopic} onChange={(event) => setQuestionTopic(event.target.value)} placeholder="Ex.: banco de dados, captação, UX, voluntariado..." />
                    </label>
                  </section>
                ) : null}

                {kind === "update" ? (
                  <section className={styles.sectionBlock}>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>O que está sendo atualizado?</span>
                        <select value={entityType} onChange={(event) => setEntityType(event.target.value as UpdateEntityType)}>
                          <option value="project">Projeto</option>
                          <option value="module">Módulo</option>
                          <option value="organization">Organização</option>
                          <option value="other">Outro</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Nome</span>
                        <input value={entityLabel} onChange={(event) => setEntityLabel(event.target.value)} />
                      </label>
                    </div>
                    <div className={styles.threeColumns}>
                      <label className={styles.field}>
                        <span>Versão <em>Opcional</em></span>
                        <input value={updateVersion} onChange={(event) => setUpdateVersion(event.target.value)} placeholder="1.4.0" />
                      </label>
                      <label className={styles.field}>
                        <span>Progresso <em>Opcional</em></span>
                        <OptionalNumberInput value={updateProgress} onChange={setUpdateProgress} min={0} max={100} placeholder="%" />
                      </label>
                      <label className={styles.field}>
                        <span>Referência <em>Opcional</em></span>
                        <input type="url" value={updateReferenceUrl} onChange={(event) => setUpdateReferenceUrl(event.target.value)} />
                      </label>
                    </div>
                  </section>
                ) : null}

                {kind === "resource" ? (
                  <section className={styles.sectionBlock}>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Tipo de recurso</span>
                        <select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)}>
                          {Object.entries(resourceLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Link <em>Opcional</em></span>
                        <input type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} />
                      </label>
                    </div>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Versão <em>Opcional</em></span>
                        <input value={resourceVersion} onChange={(event) => setResourceVersion(event.target.value)} />
                      </label>
                      <label className={styles.field}>
                        <span>Licença <em>Opcional</em></span>
                        <input value={resourceLicense} onChange={(event) => setResourceLicense(event.target.value)} placeholder="MIT, CC BY..." />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>Tags <em>Opcional</em></span>
                      <input value={resourceTags} onChange={(event) => setResourceTags(event.target.value)} placeholder="template, voluntários, planilha..." />
                    </label>
                  </section>
                ) : null}

                {kind === "announcement" ? (
                  <section className={styles.sectionBlock}>
                    <label className={styles.field}>
                      <span>Prioridade</span>
                      <select value={announcementPriority} onChange={(event) => setAnnouncementPriority(event.target.value as "normal" | "important")}>
                        <option value="normal">Comunicado normal</option>
                        <option value="important">Importante</option>
                      </select>
                    </label>
                  </section>
                ) : null}

                {kind === "general" ? (
                  <section className={styles.sectionBlock}>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Tipo</span>
                        <select value={generalType} onChange={(event) => setGeneralType(event.target.value as "comment" | "idea" | "experience")}>
                          <option value="comment">Comentário</option>
                          <option value="idea">Ideia</option>
                          <option value="experience">Relato / experiência</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Tags <em>Opcional</em></span>
                        <input value={generalTags} onChange={(event) => setGeneralTags(event.target.value)} />
                      </label>
                    </div>
                  </section>
                ) : null}

                <section className={styles.sectionBlock}>
                  <div className={styles.sectionTitle}>
                    <span>Como isso vai aparecer na comunidade</span>
                    <small>A CONG usa os dados acima para estruturar a publicação. Aqui você controla a forma como ela será apresentada.</small>
                  </div>

                  <label className={styles.field}>
                    <span>{commonCopy.title}</span>
                    <input
                      type="text"
                      maxLength={160}
                      value={title}
                      placeholder={commonCopy.titlePlaceholder}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                    />
                    <small>{title.length}/160</small>
                  </label>

                  <label className={styles.field}>
                    <span>{commonCopy.summary}</span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={summary}
                      placeholder={commonCopy.summaryPlaceholder}
                      onChange={(event) => setSummary(event.target.value)}
                      required
                    />
                    <small>{summary.length}/500</small>
                  </label>

                  <label className={styles.field}>
                    <span>{commonCopy.content}</span>
                    <textarea
                      rows={6}
                      maxLength={5000}
                      value={content}
                      placeholder={
                        kind === "general"
                          ? "Desenvolva o que você quer compartilhar com a comunidade."
                          : "Opcional: acrescente contexto, restrições, exemplos ou qualquer informação que ajude as pessoas a entender melhor."
                      }
                      onChange={(event) => setContent(event.target.value)}
                      required={kind === "general"}
                    />
                    <small>{content.length}/5000</small>
                  </label>
                </section>
              </div>

              <aside className={styles.previewPanel}>
                <div className={styles.previewSticky}>
                  <div className={styles.previewHeading}>
                    <span>Prévia no feed</span>
                    <small>Atualiza enquanto você preenche</small>
                  </div>

                  <article className={styles.livePreview} data-kind={kind}>
                    <header className={styles.previewAuthorRow}>
                      <span className={styles.previewAvatar}>
                        <FiUser aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{selectedIdentityLabel}</strong>
                        <small>{areaLabels[area]} · nova publicação</small>
                      </div>
                    </header>

                    <span className={styles.previewKind}>
                      {selectedIntent?.label}
                      {kind === "request" ? ` · ${selectedRequest.label}` : ""}
                    </span>

                    <h3>
                      {title.trim() || "Seu título vai aparecer aqui"}
                    </h3>

                    <p className={styles.previewSummary}>
                      {summary.trim() ||
                        "O resumo da publicação aparece aqui para mostrar rapidamente o que você precisa ou quer compartilhar."}
                    </p>

                    <div className={styles.previewMeta}>
                      <span>{areaLabels[area]}</span>
                      {targetRoles.slice(0, 2).map((role) => (
                        <span key={role}>{roleLabels[role]}</span>
                      ))}
                      {targetRoles.length > 2 ? (
                        <span>+{targetRoles.length - 2}</span>
                      ) : null}
                    </div>

                    <footer className={styles.previewFooter}>
                      <span>Aparência aproximada da publicação</span>
                      <FiArrowRight aria-hidden="true" />
                    </footer>
                  </article>

                  <div className={styles.previewExplanation}>
                    <strong>Por que esses campos existem?</strong>
                    <p>
                      A CONG transforma suas respostas em dados úteis para
                      direcionar a publicação, criar filtros e conectar a demanda
                      às pessoas certas.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            {error ? <p className={styles.error} role="alert">{error}</p> : null}

            <footer className={styles.footer}>
              <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className={styles.publishButton} disabled={submitting}>
                <FiSend aria-hidden="true" />
                {submitting ? "Publicando..." : "Publicar"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
