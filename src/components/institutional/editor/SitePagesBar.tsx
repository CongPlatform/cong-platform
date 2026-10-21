import { useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import type { InstitutionalPage } from "../../../services/institutionalService";
import styles from "./SitePagesBar.module.css";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export default function SitePagesBar({
  pages,
  selectedId,
  disabled,
  publicSlug,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onSyncNavigation,
  hasHeader,
}: {
  pages: InstitutionalPage[];
  selectedId: string | null;
  disabled: boolean;
  publicSlug: string;
  onSelect: (id: string) => void;
  onCreate: (title: string, slug: string) => Promise<void>;
  onUpdate: (
    id: string,
    patch: { title?: string; slug?: string; isHome?: boolean },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  hasHeader: boolean;
  onSyncNavigation: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState("");

  function begin(id: string | "new") {
    const page = pages.find((item) => item.id === id);
    setTitle(page?.title ?? "");
    setSlug(page?.slug ?? "");
    setEditing(id);
    setLocalError("");
  }

  async function save() {
    if (!editing) return;
    const normalizedSlug = slugify(slug || title);
    if (title.trim().length < 2 || !normalizedSlug) {
      setLocalError("Informe um título e endereço válidos.");
      return;
    }
    setWorking(true);
    setLocalError("");
    try {
      if (editing === "new") await onCreate(title.trim(), normalizedSlug);
      else
        await onUpdate(editing, { title: title.trim(), slug: normalizedSlug });
      setEditing(null);
    } catch {
      setLocalError(
        "Não foi possível salvar a página. Verifique os dados e tente novamente.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.bar} aria-label="Páginas do site">
      <div
        className={styles.pages}
        role="group"
        aria-label="Selecionar página para editar"
      >
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={page.id === selectedId ? styles.active : styles.page}
            onClick={() => onSelect(page.id)}
            disabled={disabled || working}
            aria-current={page.id === selectedId ? "page" : undefined}
          >
            {page.isHome ? <FiHome aria-hidden="true" /> : null}
            <span>{page.title}</span>
          </button>
        ))}
      </div>
      {hasHeader ? (
        <button
          type="button"
          className={styles.add}
          onClick={async () => {
            setWorking(true);
            setLocalError("");
            try {
              await onSyncNavigation();
            } catch {
              setLocalError("Não foi possível conectar as páginas do menu.");
            } finally {
              setWorking(false);
            }
          }}
          disabled={disabled || working}
          title="Criar páginas para os links internos que ainda não existem"
        >
          <FiRefreshCw aria-hidden="true" /> Conectar menu
        </button>
      ) : null}
      <button
        type="button"
        className={styles.add}
        onClick={() => begin("new")}
        disabled={disabled}
      >
        <FiPlus aria-hidden="true" /> Nova página
      </button>
      {selectedId && (
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => begin(selectedId)}
          disabled={disabled}
          title="Editar página"
          aria-label="Editar página"
        >
          <FiEdit2 aria-hidden="true" />
        </button>
      )}
      {localError && !editing ? (
        <span role="alert" className={styles.error}>
          {localError}
        </span>
      ) : null}
      {editing && (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working)
              setEditing(null);
          }}
        >
          <form
            className={styles.modal}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            aria-label={editing === "new" ? "Criar página" : "Editar página"}
          >
            <div className={styles.modalTitle}>
              <strong>
                {editing === "new" ? "Nova página" : "Configurar página"}
              </strong>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={working}
                aria-label="Fechar"
              >
                <FiX />
              </button>
            </div>
            <label>
              Título da página
              <input
                autoFocus
                value={title}
                maxLength={100}
                onChange={(event) => {
                  const oldAuto = slug === slugify(title);
                  setTitle(event.target.value);
                  if (oldAuto) setSlug(slugify(event.target.value));
                }}
                placeholder="Ex.: Ações"
                required
              />
            </label>
            <label>
              Endereço da página
              <div className={styles.slugRow}>
                <span>/</span>
                <input
                  value={slug}
                  maxLength={70}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  placeholder="acoes"
                  required
                />
              </div>
            </label>
            <p className={styles.hint}>
              Cada página é publicada junto com o site. No editor você pode
              adicionar seções diferentes a cada uma.
            </p>
            {localError && (
              <p className={styles.error} role="alert">
                {localError}
              </p>
            )}
            <div className={styles.actions}>
              {editing !== "new" &&
                (() => {
                  const current = pages.find((page) => page.id === editing);
                  if (!current) return null;
                  return (
                    <>
                      {!current.isHome && (
                        <button
                          type="button"
                          disabled={working}
                          onClick={async () => {
                            setWorking(true);
                            try {
                              await onUpdate(current.id, { isHome: true });
                              setEditing(null);
                            } catch {
                              setLocalError(
                                "Não foi possível definir a página inicial.",
                              );
                            } finally {
                              setWorking(false);
                            }
                          }}
                        >
                          <FiHome /> Definir como inicial
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => {
                          const path = current.isHome
                            ? `/o/${publicSlug}`
                            : `/o/${publicSlug}/${current.slug}`;
                          void navigator.clipboard?.writeText(
                            `${window.location.origin}${path}`,
                          );
                        }}
                      >
                        <FiCopy /> Copiar link
                      </button>
                      {!current.isHome && (
                        <button
                          type="button"
                          className={styles.delete}
                          disabled={working}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Excluir “${current.title}” e todas as suas seções do rascunho?`,
                              )
                            )
                              return;
                            setWorking(true);
                            try {
                              await onDelete(current.id);
                              setEditing(null);
                            } catch {
                              setLocalError(
                                "Não foi possível excluir a página.",
                              );
                            } finally {
                              setWorking(false);
                            }
                          }}
                        >
                          <FiTrash2 /> Excluir
                        </button>
                      )}
                    </>
                  );
                })()}
              <div className={styles.spacer} />
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={working}
              >
                Cancelar
              </button>
              <button className={styles.save} type="submit" disabled={working}>
                <FiCheck /> {working ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
