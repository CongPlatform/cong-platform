import { useEffect, useState } from "react";
import { FiArrowRight, FiEdit3, FiLayout, FiPenTool, FiPlus, FiSend } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";

import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { ApiError } from "../../../services/api";
import { GUIDED_EDITOR_CONSTRAINTS } from "../../../utils/institutionalConstraints";
import {
  createDesignerTemplate,
  listDesignerTemplates,
  publishDesignerTemplate,
  type DesignerInstitutionalTemplate,
  type InstitutionalTemplateDefinition,
} from "../../../services/institutionalService";

import styles from "./DesignerTemplates.module.css";

const emptyDefinition: InstitutionalTemplateDefinition = {
  editorConstraints: GUIDED_EDITOR_CONSTRAINTS,
  pages: [{ title: "Home", slug: "home", isHome: true, sections: [] }],
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Não foi possível concluir esta ação.";
}

export default function DesignerTemplates() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState<DesignerInstitutionalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");
  const [name, setName] = useState("Novo template");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [publishTarget, setPublishTarget] = useState<DesignerInstitutionalTemplate | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    void listDesignerTemplates()
      .then((items) => { if (active) setTemplates(items); })
      .catch((caught) => { if (active) setError(errorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function closeCreate(): void {
    if (creating) return;
    setCreateOpen(false);
    if (searchParams.has("create")) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }

  async function createTemplate(): Promise<void> {
    if (name.trim().length < 2) {
      setError("Dê um nome ao template para continuar.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const created = await createDesignerTemplate({
        name: name.trim(),
        description: description.trim(),
        category: "generic",
        definition: emptyDefinition,
      });
      navigate(`/app/design/templates/${created.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setCreating(false);
    }
  }

  async function publish(): Promise<void> {
    if (!publishTarget) return;
    setPublishing(true);
    setError("");
    try {
      const published = await publishDesignerTemplate(publishTarget.id);
      setTemplates((current) => current.map((item) => item.id === published.id ? published : item));
      setPublishTarget(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div className={styles.loading}>Carregando seus templates...</div>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Designer · Templates</span>
          <h1>Transforme boas estruturas em pontos de partida para ONGs</h1>
          <p>
            Crie sites reutilizáveis com o mesmo editor visual. O conteúdo, as imagens e a
            identidade final continuam pertencendo a cada organização.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryCreateButton}
            onClick={() => navigate("/app/design/variantes")}
          >
            <FiPenTool /> Criar variação
          </button>
          <button type="button" className={styles.createButton} onClick={() => setCreateOpen(true)}>
            <FiPlus /> Criar template
          </button>
        </div>
      </header>

      <section className={styles.encouragement}>
        <FiLayout />
        <div>
          <strong>Design que vira infraestrutura compartilhada</strong>
          <span>Uma boa estrutura pode poupar trabalho de várias organizações e continuar acessível, responsiva e adaptável.</span>
        </div>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Meus templates</h2>
            <p>{templates.length} criação(ões)</p>
          </div>
        </div>

        <div className={styles.grid}>
          <button type="button" className={styles.blankCard} onClick={() => setCreateOpen(true)}>
            <span><FiPlus /></span>
            <strong>Novo template</strong>
            <small>Monte a estrutura do zero usando seções e variantes da CONG.</small>
          </button>

          {templates.map((template) => (
            <article key={template.id} className={styles.card}>
              <button type="button" className={styles.preview} onClick={() => navigate(`/app/design/templates/${template.id}`)}>
                <div className={styles.previewTop}><span /><span /><span /></div>
                <div className={styles.previewBody}><b /><i /><i /><em /></div>
              </button>
              <div className={styles.cardBody}>
                <div>
                  <span className={template.status === "published" ? styles.published : styles.draft}>
                    {template.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                  <h3>{template.name}</h3>
                  <p>{template.description || "Sem descrição."}</p>
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => navigate(`/app/design/templates/${template.id}`)}>
                    <FiEdit3 /> Editar
                  </button>
                  {template.status !== "published" ? (
                    <button type="button" className={styles.publishButton} onClick={() => setPublishTarget(template)}>
                      <FiSend /> Publicar
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ModalMensagem
        aberto={createOpen}
        titulo="Criar template de site"
        tamanho="pequeno"
        mostrarBotaoOk={false}
        fecharAoClicarFora={!creating}
        onFechar={closeCreate}
        mensagem={
          <div className={styles.createModal}>
            <label><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus /></label>
            <label><span>Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Explique para que tipo de necessidade este template funciona bem." /></label>
            <div className={styles.modalNote}>
              A responsividade é tratada pelo motor da CONG. Você organiza a composição; a plataforma preserva comportamentos seguros em telas menores.
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={closeCreate} disabled={creating}>Cancelar</button>
              <button type="button" className={styles.primary} onClick={() => void createTemplate()} disabled={creating}>
                {creating ? "Criando..." : "Criar e editar"} <FiArrowRight />
              </button>
            </div>
          </div>
        }
      />

      <ConfirmActionModal
        open={Boolean(publishTarget)}
        title="Publicar este template?"
        description="Ele ficará disponível para organizações iniciarem novos sites. Sites já criados continuam independentes do template."
        confirmLabel="Publicar template"
        busy={publishing}
        onCancel={() => setPublishTarget(null)}
        onConfirm={() => void publish()}
      />
    </main>
  );
}
