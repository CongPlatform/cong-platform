import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Flame, Search, X } from "lucide-react";

import {
  CAUSE_OPTIONS,
  causeSelectionLabel,
  parseCauseSelection,
  serializeCauseSubtopic,
  type CauseOption,
} from "../../../data/profileCatalog";

import styles from "./CauseSelectionModal.module.css";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  selected: string[];
  maxParents?: number;
  onChange: (next: string[]) => void;
  onClose: () => void;
};

function selectedParents(selected: string[]): string[] {
  const result = new Set<string>();

  for (const value of selected) {
    const parsed = parseCauseSelection(value);
    if (!parsed.subtopic) result.add(parsed.parent);
  }

  return [...result];
}

function selectedSubtopics(selected: string[], parent: string): string[] {
  return selected
    .map(parseCauseSelection)
    .filter((item) => item.parent === parent && item.subtopic)
    .map((item) => item.subtopic as string);
}

export default function CauseSelectionModal({
  open,
  title,
  description,
  selected,
  maxParents = 3,
  onChange,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setQuery("");
    setExpandedParents([]);
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  const parents = useMemo(() => selectedParents(selected), [selected]);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    const filtered = normalizedQuery
      ? CAUSE_OPTIONS.filter((cause) => {
          const haystack = [
            cause.label,
            cause.category,
            ...cause.subtopics,
          ]
            .join(" ")
            .toLocaleLowerCase();

          return haystack.includes(normalizedQuery);
        })
      : [...CAUSE_OPTIONS];

    return [...filtered].sort((a, b) => {
      if (Boolean(a.featured) === Boolean(b.featured)) return 0;
      return a.featured ? -1 : 1;
    });
  }, [query]);

  if (!open) return null;

  const toggleExpanded = (parent: string) => {
    setExpandedParents((current) =>
      current.includes(parent)
        ? current.filter((item) => item !== parent)
        : [...current, parent],
    );
  };

  const removeParentAndChildren = (parent: string) => {
    onChange(
      selected.filter((value) => parseCauseSelection(value).parent !== parent),
    );
    setExpandedParents((current) => current.filter((item) => item !== parent));
    setError("");
  };

  const selectParent = (cause: CauseOption) => {
    const alreadySelected = parents.includes(cause.label);

    if (alreadySelected) {
      removeParentAndChildren(cause.label);
      return;
    }

    if (parents.length >= maxParents) {
      setError(`Escolha no máximo ${maxParents} causas principais.`);
      return;
    }

    onChange([...selected, cause.label]);
    setExpandedParents((current) =>
      current.includes(cause.label) ? current : [...current, cause.label],
    );
    setError("");
  };

  const toggleSubtopic = (parent: string, subtopic: string) => {
    const parentSelected = parents.includes(parent);

    if (!parentSelected) {
      setError("Selecione primeiro a causa principal para escolher seus subtópicos.");
      return;
    }

    const serialized = serializeCauseSubtopic(parent, subtopic);
    const alreadySelected = selected.includes(serialized);

    onChange(
      alreadySelected
        ? selected.filter((value) => value !== serialized)
        : [...selected, serialized],
    );
    setError("");
  };

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cause-selection-title"
      >
        <header className={styles.header}>
          <div>
            <h3 id="cause-selection-title">{title}</h3>
            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Fechar"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.searchBox}>
          <Search aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError("");
            }}
            placeholder="Buscar causa ou subtópico..."
          />
        </div>

        <div className={styles.metaRow}>
          <span>{parents.length} de {maxParents} causas principais</span>
          <span>Subtópicos são opcionais</span>
        </div>

        {selected.length > 0 && (
          <div className={styles.selectedSummary} aria-label="Seleções atuais">
            {selected.map((value) => (
              <span key={value}>{causeSelectionLabel(value)}</span>
            ))}
          </div>
        )}

        <div className={styles.list}>
          {visibleOptions.map((cause) => {
            const checked = parents.includes(cause.label);
            const subtopics = selectedSubtopics(selected, cause.label);
            const expanded = checked && expandedParents.includes(cause.label);

            return (
              <article
                key={cause.id}
                className={`${styles.causeCard} ${checked ? styles.causeCardSelected : ""}`}
              >
                <div className={styles.causeMainRow}>
                  <button
                    type="button"
                    className={styles.causeMainButton}
                    onClick={() => selectParent(cause)}
                    aria-pressed={checked}
                  >
                    <span className={styles.checkBox} aria-hidden="true">
                      {checked && <Check />}
                    </span>

                    <span className={styles.causeCopy}>
                      <strong>{cause.label}</strong>
                      <small>{cause.category}</small>
                    </span>

                    {cause.featured && (
                      <span className={styles.featuredBadge}>
                        <Flame aria-hidden="true" /> Em alta
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() => toggleExpanded(cause.label)}
                    disabled={!checked}
                    aria-label={checked ? `${expanded ? "Ocultar" : "Mostrar"} subtópicos de ${cause.label}` : `Selecione ${cause.label} para acessar os subtópicos`}
                  >
                    {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                  </button>
                </div>

                {expanded && (
                  <div className={styles.subtopics}>
                    {cause.subtopics.map((subtopic) => {
                      const selectedSubtopic = subtopics.includes(subtopic);

                      return (
                        <button
                          type="button"
                          key={subtopic}
                          className={`${styles.subtopic} ${selectedSubtopic ? styles.subtopicSelected : ""}`}
                          aria-pressed={selectedSubtopic}
                          onClick={() => toggleSubtopic(cause.label, subtopic)}
                        >
                          <span aria-hidden="true">#</span>
                          {subtopic}
                          {selectedSubtopic && <Check aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}

          {visibleOptions.length === 0 && (
            <p className={styles.empty}>Nenhuma causa ou subtópico encontrado.</p>
          )}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.footer}>
          <button type="button" onClick={handleClose}>Concluir seleção</button>
        </footer>
      </section>
    </div>
  );
}
