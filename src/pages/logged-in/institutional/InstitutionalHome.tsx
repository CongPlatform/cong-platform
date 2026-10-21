import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiGlobe,
  FiMaximize2,
  FiMoreHorizontal,
  FiPauseCircle,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";

import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import SiteCreationModal, {
  type GuidedSiteAnswers,
  type SiteCreationRequest,
} from "../../../components/institutional/editor/SiteCreationModal";
import LiveSiteThumbnail from "../../../components/institutional/preview/LiveSiteThumbnail";
import SitePreviewModal from "../../../components/institutional/preview/SitePreviewModal";
import { findNativeDesignFamilyById, findNativeDesignFamilyByName } from "../../../data/institutional/nativeDesignFamilies";
import { useWorkspace } from "../../../contexts/workspace-context";
import { ApiError } from "../../../services/api";
import {
  createInstitutionalSite,
  deleteInstitutionalSite,
  getInstitutionalSite,
  getInstitutionalTemplates,
  getInstitutionalVariants,
  listInstitutionalSites,
  unpublishInstitutionalSite,
  updateInstitutionalSection,
  type InstitutionalSection,
  type InstitutionalSite,
  type InstitutionalSiteSummary,
  type InstitutionalTemplate,
  type InstitutionalVariant,
} from "../../../services/institutionalService";
import { institutionalPublicUrl, institutionalRootDomain } from "../../../utils/institutionalDomain";
import { buildTemplatePreviewSite } from "../../../utils/institutionalPreview";

import styles from "./InstitutionalHome.module.css";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Não foi possível concluir esta ação.";
}

type PendingAction = {
  kind: "delete" | "unpublish";
  site: InstitutionalSiteSummary;
} | null;

function shortTitle(text: string): string {
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? text.trim();
  if (firstSentence.length <= 86) return firstSentence;
  return `${firstSentence.slice(0, 83).trimEnd()}…`;
}

function guidedAction(
  answers: GuidedSiteAnswers,
  sections: InstitutionalSection[],
): { label: string; href: string } {
  const targetType = answers.priority === "donations" || answers.priority === "volunteers"
    ? "support_actions"
    : answers.priority === "transparency"
      ? "impact_metrics"
      : "organization_about";
  const target = sections.find((section) => section.sectionType === targetType);
  const href = target ? `#section-${target.id}` : "#";
  if (answers.priority === "donations") return { label: "Quero apoiar", href };
  if (answers.priority === "volunteers") return { label: "Quero participar", href };
  if (answers.priority === "transparency") return { label: "Ver resultados", href };
  return { label: "Conheça nosso trabalho", href };
}

function guidedSupportItem(answers: GuidedSiteAnswers): Record<string, unknown> | null {
  if (answers.priority === "donations") {
    return { id: crypto.randomUUID(), kind: "donate", title: "Apoie nosso trabalho", description: "Explique aqui como a pessoa pode contribuir e para onde o apoio é destinado.", action: { label: "Quero apoiar", href: "#" } };
  }
  if (answers.priority === "volunteers") {
    return { id: crypto.randomUUID(), kind: "volunteer", title: "Faça parte como voluntário", description: "Explique quais formas de participação estão abertas e como começar.", action: { label: "Quero participar", href: "#" } };
  }
  return null;
}

async function applyGuidedAnswers(
  site: InstitutionalSite,
  answers: GuidedSiteAnswers,
  organizationName: string,
): Promise<void> {
  const page = site.pages.find((item) => item.isHome) ?? site.pages[0];
  if (!page) return;

  const updates = page.sections.flatMap((section): Array<Promise<unknown>> => {
    let content: Record<string, unknown> | null = null;

    if (section.sectionType === "organization_intro") {
      content = {
        ...section.content,
        eyebrow: answers.audience ? `Para ${answers.audience}` : "Nossa atuação",
        title: shortTitle(answers.mission),
        description: answers.mission,
        primaryAction: guidedAction(answers, page.sections),
      };
    }

    if (section.sectionType === "organization_about") {
      const context = [
        answers.audience ? `Atendemos ${answers.audience}.` : "",
        answers.location ? `Nossa atuação acontece em ${answers.location}.` : "",
      ].filter(Boolean).join(" ");
      content = {
        ...section.content,
        eyebrow: "Quem somos",
        title: "Conheça nossa atuação",
        description: `${answers.mission}${context ? ` ${context}` : ""}`,
      };
    }

    if (section.sectionType === "support_actions") {
      const support = guidedSupportItem(answers);
      if (support) {
        content = {
          ...section.content,
          title: answers.priority === "donations" ? "Ajude este trabalho a continuar" : "Há espaço para você fazer parte",
          description: answers.priority === "donations"
            ? "Mostre de forma simples como o apoio chega à organização."
            : "Explique como alguém pode participar com tempo, conhecimento ou presença.",
          items: [support],
        };
      }
    }

    if (section.sectionType === "organization_contact" && answers.location) {
      content = { ...section.content, address: answers.location };
    }

    if (section.sectionType === "site_footer") {
      content = {
        ...section.content,
        title: organizationName,
        description: shortTitle(answers.mission),
      };
    }

    if (!content) return [];
    const guidance = section.settings.contentGuidance && typeof section.settings.contentGuidance === "object"
      ? section.settings.contentGuidance as Record<string, unknown>
      : {};
    return [updateInstitutionalSection(section.id, {
      content,
      settings: {
        ...section.settings,
        contentGuidance: { ...guidance, source: "guided-answers", needsReview: false },
      },
    })];
  });

  await Promise.all(updates);
}

export default function InstitutionalHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspace } = useWorkspace();
  const templateSectionRef = useRef<HTMLElement>(null);
  const organizationName = workspace.kind === "organization" ? workspace.organization.name : "Organização";

  const [sites, setSites] = useState<InstitutionalSiteSummary[]>([]);
  const [sitePreviews, setSitePreviews] = useState<Record<string, InstitutionalSite>>({});
  const [templates, setTemplates] = useState<InstitutionalTemplate[]>([]);
  const [variants, setVariants] = useState<InstitutionalVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");
  const [selectedTemplate, setSelectedTemplate] = useState<InstitutionalTemplate | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [previewSite, setPreviewSite] = useState<InstitutionalSite | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<InstitutionalTemplate | null>(null);
  const [visibleTemplateCount, setVisibleTemplateCount] = useState(6);

  useEffect(() => {
    let active = true;

    void Promise.all([listInstitutionalSites(), getInstitutionalTemplates(), getInstitutionalVariants()])
      .then(async ([currentSites, availableTemplates, availableVariants]) => {
        if (!active) return;
        setSites(currentSites);
        setTemplates(availableTemplates);
        setVariants(availableVariants);

        const detailed = await Promise.allSettled(
          currentSites.map((site) => getInstitutionalSite(site.id)),
        );
        if (!active) return;
        const next: Record<string, InstitutionalSite> = {};
        detailed.forEach((result) => {
          if (result.status === "fulfilled") next[result.value.id] = result.value;
        });
        setSitePreviews(next);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const orderedSites = useMemo(
    () => [...sites].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    [sites],
  );

  const standardTemplates = useMemo(() => templates.filter((template) => !template.isExample), [templates]);
  const examples = useMemo(() => templates.filter((template) => template.isExample), [templates]);
  const allTemplates = useMemo(() => [...standardTemplates, ...examples], [examples, standardTemplates]);
  const visibleTemplates = useMemo(
    () => allTemplates.slice(0, visibleTemplateCount),
    [allTemplates, visibleTemplateCount],
  );
  const hiddenTemplateCount = Math.max(0, allTemplates.length - visibleTemplates.length);

  function openCreate(template: InstitutionalTemplate | null): void {
    setSelectedTemplate(template);
    setCreateOpen(true);
  }

  function closeCreate(): void {
    if (creating) return;
    setCreateOpen(false);
    setSelectedTemplate(null);
    if (searchParams.has("create")) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }

  function browseTemplates(): void {
    setCreateOpen(false);
    setSelectedTemplate(null);
    window.setTimeout(() => templateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  async function createSite(request: SiteCreationRequest): Promise<void> {
    setCreating(true);
    setError("");

    try {
      const created = await createInstitutionalSite({
        name: request.name,
        templateId: request.template?.id ?? null,
        identityMode: request.identityMode,
      });
      if (request.guided) {
        await applyGuidedAnswers(created, request.guided, organizationName);
      }
      navigate(`/app/site-institucional/${created.id}/editor`);
    } catch (caught) {
      setError(errorMessage(caught));
      setCreating(false);
    }
  }

  async function confirmPendingAction(): Promise<void> {
    if (!pendingAction) return;
    setActionBusy(true);
    setError("");

    try {
      if (pendingAction.kind === "unpublish") {
        await unpublishInstitutionalSite(pendingAction.site.id);
        setSites((current) => current.map((site) => site.id === pendingAction.site.id ? { ...site, publishedAt: null, isPrimary: false } : site));
        setSitePreviews((current) => {
          const preview = current[pendingAction.site.id];
          if (!preview) return current;
          return {
            ...current,
            [pendingAction.site.id]: { ...preview, publishedAt: null, isPrimary: false },
          };
        });
      } else {
        await deleteInstitutionalSite(pendingAction.site.id);
        setSites((current) => current.filter((site) => site.id !== pendingAction.site.id));
        setSitePreviews((current) => {
          const next = { ...current };
          delete next[pendingAction.site.id];
          return next;
        });
      }
      setPendingAction(null);
      setOpenMenuId(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return <div className={styles.loading}>Carregando seus sites...</div>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Sites · {organizationName}</span>
          <h1>Sites da organização</h1>
          <p>Crie, visualize e publique sua presença institucional sem sair da CONG.</p>
        </div>
        <button type="button" className={styles.createButton} onClick={() => openCreate(null)}><FiPlus /> Criar site</button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.siteSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>{sites.length ? "Seus sites" : "Comece seu primeiro site"}</h2>
            <p>Continue um rascunho, revise o que está no ar ou comece uma nova ideia.</p>
          </div>
        </div>

        <div className={styles.siteGrid}>
          <button type="button" className={styles.newSiteCard} onClick={() => openCreate(null)}>
            <span><FiPlus /></span>
            <strong>Novo site</strong>
            <small>Receba orientação ou pule direto para o palco.</small>
          </button>

          {orderedSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              previewSite={sitePreviews[site.id] ?? null}
              menuOpen={openMenuId === site.id}
              onToggleMenu={() => setOpenMenuId((current) => current === site.id ? null : site.id)}
              onPreview={() => {
                const detailed = sitePreviews[site.id];
                if (detailed) setPreviewSite(detailed);
              }}
              onEdit={() => navigate(`/app/site-institucional/${site.id}/editor`)}
              onDelete={() => setPendingAction({ kind: "delete", site })}
              onUnpublish={() => setPendingAction({ kind: "unpublish", site })}
            />
          ))}
        </div>
      </section>

      {allTemplates.length > 0 ? (
        <section className={styles.templateSection} ref={templateSectionRef}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>Modelos para começar</span>
              <h2>Compare o resultado real antes de escolher</h2>
              <p>Abra a prévia, escolha uma direção e adapte tudo com o conteúdo da sua organização.</p>
            </div>
          </div>

          <div className={styles.templateGrid}>
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                variants={variants}
                example={template.isExample}
                onPreview={() => setPreviewTemplate(template)}
                onUse={() => openCreate(template)}
              />
            ))}
          </div>

          {hiddenTemplateCount > 0 ? (
            <div className={styles.templateLoadMore}>
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={() => setVisibleTemplateCount((current) => Math.min(current + 6, allTemplates.length))}
              >
                Ver mais modelos
                <span>+{Math.min(6, hiddenTemplateCount)}</span>
              </button>
              <button
                type="button"
                className={styles.viewAllButton}
                onClick={() => setVisibleTemplateCount(allTemplates.length)}
              >
                Ver todos ({allTemplates.length})
                <FiArrowRight />
              </button>
            </div>
          ) : allTemplates.length > 6 ? (
            <div className={styles.templateLoadMore}>
              <button type="button" className={styles.viewAllButton} onClick={() => setVisibleTemplateCount(6)}>
                Mostrar menos
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {createOpen ? (
        <SiteCreationModal
          open
          organizationName={organizationName}
          templates={standardTemplates}
          initialTemplate={selectedTemplate}
          busy={creating}
          onClose={closeCreate}
          onBrowseTemplates={browseTemplates}
          onCreate={(request) => void createSite(request)}
        />
      ) : null}


      {previewSite ? (
        <SitePreviewModal
          site={previewSite}
          title={previewSite.name}
          actionLabel="Editar site"
          publicUrl={previewSite.publishedAt && previewSite.isPrimary ? institutionalPublicUrl(previewSite.publicSlug) : null}
          onClose={() => setPreviewSite(null)}
          onAction={() => navigate(`/app/site-institucional/${previewSite.id}/editor`)}
        />
      ) : null}

      {previewTemplate ? (() => {
        const preview = buildTemplatePreviewSite(previewTemplate, variants);
        return preview ? (
          <SitePreviewModal
            site={preview}
            title={previewTemplate.name}
            eyebrow={previewTemplate.isExample ? "Exemplo fictício" : "Prévia do modelo"}
            actionLabel="Usar este modelo"
            details={(() => {
              const family = findNativeDesignFamilyById(previewTemplate.familyKey) ?? findNativeDesignFamilyByName(previewTemplate.name);
              return {
                category: previewTemplate.category,
                description: previewTemplate.description,
                bestFor: family?.bestFor,
                composition: family?.composition,
                traits: family?.traits ? [...family.traits] : [],
              };
            })()}
            onClose={() => setPreviewTemplate(null)}
            onAction={() => {
              setPreviewTemplate(null);
              openCreate(previewTemplate);
            }}
          />
        ) : null;
      })() : null}

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === "delete" ? "Apagar este site?" : "Despublicar este site?"}
        description={pendingAction?.kind === "delete"
          ? "O rascunho e o histórico deste site serão removidos. Esta ação não pode ser desfeita."
          : "O site deixará de ficar disponível publicamente. O rascunho continuará salvo para você editar e publicar novamente."}
        confirmLabel={pendingAction?.kind === "delete" ? "Apagar site" : "Despublicar"}
        tone={pendingAction?.kind === "delete" ? "danger" : "primary"}
        busy={actionBusy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
      />
    </main>
  );
}

function SiteCard({
  site,
  previewSite,
  menuOpen,
  onToggleMenu,
  onPreview,
  onEdit,
  onDelete,
  onUnpublish,
}: {
  site: InstitutionalSiteSummary;
  previewSite: InstitutionalSite | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUnpublish: () => void;
}) {
  const published = Boolean(site.publishedAt && site.isPrimary);
  const publicUrl = institutionalPublicUrl(site.publicSlug);

  return (
    <article className={styles.siteCard}>
      <div className={styles.sitePreview}>
        <div inert>
          {previewSite ? <LiveSiteThumbnail site={previewSite} height={220} sourceWidth={1180} /> : <div className={styles.previewLoading}>Preparando prévia real…</div>}
        </div>
        {published ? <div className={styles.livePreviewTag}><FiGlobe /> No ar</div> : null}
        <button
          type="button"
          className={styles.previewTrigger}
          onClick={onPreview}
          aria-label={`Visualizar ${site.name}`}
          disabled={!previewSite}
        >
          {previewSite ? <span className={styles.previewOverlay}><FiMaximize2 /> Visualizar site</span> : null}
        </button>
      </div>

      <div className={styles.siteCardBody}>
        <div className={styles.siteCardTitleRow}>
          <div>
            <div className={styles.siteStatus} data-published={published}>
              {published ? <FiCheckCircle /> : <FiClock />}
              {published ? "Publicado" : "Rascunho"}
            </div>
            <h3>{site.name}</h3>
          </div>
          <div className={styles.cardMenuWrap}>
            <button type="button" className={styles.moreButton} onClick={onToggleMenu} aria-label="Mais ações"><FiMoreHorizontal /></button>
            {menuOpen ? (
              <div className={styles.cardMenu}>
                {published ? <a href={publicUrl} target="_blank" rel="noreferrer"><FiExternalLink /> Abrir site</a> : null}
                {published ? <button type="button" onClick={onUnpublish}><FiPauseCircle /> Despublicar</button> : null}
                <button type="button" className={styles.dangerMenuItem} onClick={onDelete}><FiTrash2 /> Apagar</button>
              </div>
            ) : null}
          </div>
        </div>
        <small>Atualizado em {new Date(site.updatedAt).toLocaleDateString("pt-BR")}</small>
        <div className={styles.siteCardActions}>
          <button type="button" className={styles.editSiteButton} onClick={onEdit}><FiEdit3 /> Editar site</button>
          {published ? <a className={styles.publicAddress} href={publicUrl} target="_blank" rel="noreferrer">{site.publicSlug}.{institutionalRootDomain()} <FiExternalLink /></a> : null}
        </div>
      </div>
    </article>
  );
}

function TemplateCard({
  template,
  variants,
  example,
  onPreview,
  onUse,
}: {
  template: InstitutionalTemplate;
  variants: InstitutionalVariant[];
  example?: boolean;
  onPreview: () => void;
  onUse: () => void;
}) {
  const preview = buildTemplatePreviewSite(template, variants);

  return (
    <article className={styles.templateCard}>
      <div className={styles.templatePreview}>
        <div inert>
          {preview ? <LiveSiteThumbnail site={preview} height={218} sourceWidth={1180} /> : <div className={styles.previewLoading}>Prévia disponível ao abrir</div>}
        </div>
        {example ? <span className={styles.exampleTag}>Exemplo fictício</span> : null}
        <button
          type="button"
          className={styles.previewTrigger}
          onClick={onPreview}
          aria-label={`Visualizar modelo ${template.name}`}
        >
          {preview ? <span className={styles.previewOverlay}><FiMaximize2 /> Ver site completo</span> : null}
        </button>
      </div>
      <div className={styles.templateBody}>
        <div className={styles.templateIdentity}>
          <span className={styles.templateCategory}>{template.category}</span>
          <h3>{template.name}</h3>
          <small>{template.definition?.pages.length ?? 1} páginas prontas para editar</small>
        </div>
        <div className={styles.templateActions}>
          <button type="button" className={styles.previewTemplateButton} onClick={onPreview}><FiMaximize2 /> Visualizar</button>
          <button type="button" className={styles.useTemplateButton} onClick={onUse}>Usar modelo <FiArrowRight /></button>
        </div>
      </div>
    </article>
  );
}
