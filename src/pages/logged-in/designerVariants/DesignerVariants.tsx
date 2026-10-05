import { useEffect, useMemo, useState } from "react";
import { FiEdit3, FiPlus, FiSend } from "react-icons/fi";

import SectionRenderer from "../../../components/institutional/renderer/SectionRenderer";
import { useAuth } from "../../../contexts/auth-context";
import {
  buildVariantLayout,
  defaultVariantLayoutSettings,
  type VariantComposition,
  type VariantLayoutSettings,
} from "../../../data/institutional/variantBuilder";
import {
  createDefaultSectionContent,
  getSectionDefinition,
  sectionCatalog,
} from "../../../data/institutional/sectionCatalog";
import { ApiError } from "../../../services/api";
import {
  createInstitutionalVariant,
  getInstitutionalVariants,
  publishInstitutionalVariant,
  updateInstitutionalVariant,
  type InstitutionalLayoutNode,
  type InstitutionalSection,
  type InstitutionalSectionType,
  type InstitutionalVariant,
} from "../../../services/institutionalService";

import styles from "./DesignerVariants.module.css";

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível salvar esta variante.";
}

export default function DesignerVariants() {
  const { account } = useAuth();
  const [variants, setVariants] = useState<InstitutionalVariant[]>([]);
  const [sectionType, setSectionType] = useState<InstitutionalSectionType>(
    "organization_about",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Nova variante");
  const [description, setDescription] = useState("");
  const [settings, setSettings] = useState<VariantLayoutSettings>(
    defaultVariantLayoutSettings,
  );
  const [layoutOverride, setLayoutOverride] =
    useState<InstitutionalLayoutNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getInstitutionalVariants(undefined, true)
      .then(setVariants)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  const ownVariants = useMemo(
    () => variants.filter((variant) => variant.ownerUserId === account?.id),
    [account?.id, variants],
  );

  const layout = useMemo(
    () => layoutOverride ?? buildVariantLayout(sectionType, settings),
    [layoutOverride, sectionType, settings],
  );

  const previewSection: InstitutionalSection = {
    id: "preview",
    pageId: "preview",
    sectionType,
    variantVersionId: "preview",
    position: 0,
    visible: true,
    content: createDefaultSectionContent(sectionType),
    settings: {},
    variantId: "preview",
    variantName: name,
    variantVersion: 1,
    layout,
  };

  function resetForm(nextType: InstitutionalSectionType = sectionType): void {
    setEditingId(null);
    setSectionType(nextType);
    setName("Nova variante");
    setDescription("");
    setSettings(defaultVariantLayoutSettings);
    setLayoutOverride(null);
    setError("");
  }

  function updateSettings(
    updater: (current: VariantLayoutSettings) => VariantLayoutSettings,
  ): void {
    setLayoutOverride(null);
    setSettings(updater);
  }

  function beginEditing(variant: InstitutionalVariant): void {
    setEditingId(variant.id);
    setSectionType(variant.sectionType);
    setName(variant.name);
    setDescription(variant.description);
    setSettings(defaultVariantLayoutSettings);
    setLayoutOverride(variant.layout);
    setError("");
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError("");

    try {
      const saved = editingId
        ? await updateInstitutionalVariant(editingId, {
            name,
            description,
            layout,
          })
        : await createInstitutionalVariant({
            sectionType,
            name,
            description,
            layout,
          });

      setVariants((current) => {
        const exists = current.some((variant) => variant.id === saved.id);
        return exists
          ? current.map((variant) => (variant.id === saved.id ? saved : variant))
          : [...current, saved];
      });
      setEditingId(saved.id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function publish(variantId: string): Promise<void> {
    setError("");
    try {
      await publishInstitutionalVariant(variantId);
      const refreshed = await getInstitutionalVariants(undefined, true);
      setVariants(refreshed);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const definition = getSectionDefinition(sectionType);
  const supportsMedia =
    sectionType === "organization_intro" || sectionType === "organization_about";
  const isCollection = [
    "projects_showcase",
    "impact_metrics",
    "support_actions",
  ].includes(sectionType);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>Designer</span>
          <h1>Variantes institucionais</h1>
          <p>
            Crie novas formas de organizar os campos de uma seção. O conteúdo da
            ONG continua separado do layout.
          </p>
        </div>
        <button type="button" onClick={() => resetForm()}>
          <FiPlus /> Nova variante
        </button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.workspace}>
        <aside className={styles.library}>
          <strong>Minhas variantes</strong>
          <span>{ownVariants.length} criada(s)</span>
          <div className={styles.variantList}>
            {ownVariants.length === 0 ? (
              <p>Suas variantes aparecerão aqui.</p>
            ) : (
              ownVariants.map((variant) => (
                <article key={variant.id} className={styles.variantCard}>
                  <div>
                    <strong>{variant.name}</strong>
                    <span>{getSectionDefinition(variant.sectionType).name} · v{variant.version}</span>
                  </div>
                  <div className={styles.variantActions}>
                    <button type="button" onClick={() => beginEditing(variant)}>
                      <FiEdit3 /> Editar
                    </button>
                    {variant.status !== "published" ? (
                      <button type="button" onClick={() => void publish(variant.id)}>
                        <FiSend /> Publicar
                      </button>
                    ) : (
                      <span className={styles.published}>Pública</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>

        <section className={styles.builder}>
          <div className={styles.form}>
            <label>
              <span>Tipo de seção</span>
              <select
                value={sectionType}
                disabled={Boolean(editingId)}
                onChange={(event) => resetForm(event.target.value as InstitutionalSectionType)}
              >
                {sectionCatalog.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.name}
                  </option>
                ))}
              </select>
              <small>{definition.purpose}</small>
            </label>

            <label>
              <span>Nome da variante</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
            </label>

            <label>
              <span>Descrição</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
            </label>

            <fieldset>
              <legend>Composição</legend>
              <div className={styles.optionGrid}>
                {(
                  [
                    ["balanced", supportsMedia ? "Empilhada" : "Equilibrada"],
                    ["centered", "Centralizada"],
                    ...(supportsMedia
                      ? [
                          ["media-left", "Imagem à esquerda"],
                          ["media-right", "Imagem à direita"],
                        ]
                      : []),
                  ] as Array<[VariantComposition, string]>
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={settings.composition === value ? styles.optionActive : ""}
                    onClick={() =>
                      updateSettings((current) => ({ ...current, composition: value }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.twoColumns}>
              <label>
                <span>Espaçamento</span>
                <select
                  value={settings.gap}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      gap: event.target.value as VariantLayoutSettings["gap"],
                    }))
                  }
                >
                  <option value="small">Compacto</option>
                  <option value="medium">Médio</option>
                  <option value="large">Amplo</option>
                </select>
              </label>

              <label>
                <span>Alinhamento</span>
                <select
                  value={settings.align}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      align: event.target.value as VariantLayoutSettings["align"],
                    }))
                  }
                >
                  <option value="start">Início</option>
                  <option value="center">Centro</option>
                  <option value="end">Fim</option>
                </select>
              </label>
            </div>

            {isCollection ? (
              <label>
                <span>Itens por linha no desktop</span>
                <select
                  value={settings.collectionColumns}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      collectionColumns: Number(event.target.value) as 1 | 2 | 3 | 4,
                    }))
                  }
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
            ) : null}

            <div className={styles.availableFields}>
              <strong>Campos disponíveis neste tipo</strong>
              <div>
                {definition.fields.map((field) => (
                  <span key={field.key}>{field.label}</span>
                ))}
              </div>
              <small>
                O tipo da seção define os campos válidos; a variante decide como eles são apresentados.
              </small>
            </div>

            <button type="button" className={styles.saveButton} onClick={() => void save()} disabled={saving || name.trim().length < 2}>
              {saving ? "Salvando..." : editingId ? "Salvar nova versão" : "Criar variante"}
            </button>
          </div>

          <div className={styles.previewArea}>
            <div className={styles.previewHeading}>
              <strong>Pré-visualização</strong>
              <span>O Brand Kit da ONG será aplicado quando ela usar a variante.</span>
            </div>
            <div className={styles.preview}>
              <SectionRenderer section={previewSection} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
