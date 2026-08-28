import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Flame, Plus, Search, X } from "lucide-react";

import styles from "./SelectionModal.module.css";

export interface SelectionOption {
  value: string;
  label?: string;
  meta?: string;
  code?: string;
  featured?: boolean;
}

type SelectionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  options: readonly (string | SelectionOption)[];
  selected: string[];
  maxSelected?: number;
  allowCustom?: boolean;
  customLabel?: string;
  onChange: (next: string[]) => void;
  onClose: () => void;
};

function normalizeOption(option: string | SelectionOption): SelectionOption {
  return typeof option === "string" ? { value: option, label: option } : option;
}

function sameValue(first: string, second: string): boolean {
  return first.localeCompare(second, undefined, { sensitivity: "accent" }) === 0;
}

export default function SelectionModal({
  open,
  title,
  description,
  searchPlaceholder = "Buscar...",
  options,
  selected,
  maxSelected,
  allowCustom = false,
  customLabel = "Adicionar outra opção",
  onChange,
  onClose,
}: SelectionModalProps) {
  const [query, setQuery] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setQuery("");
    setCustomValue("");
    setShowCustom(false);
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  const normalizedOptions = useMemo(
    () => options.map(normalizeOption),
    [options],
  );

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = normalizedQuery
      ? normalizedOptions.filter((option) => {
          const haystack = `${option.label ?? option.value} ${option.meta ?? ""} ${option.code ?? ""}`.toLocaleLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : normalizedOptions;

    return [...filtered].sort((first, second) => {
      if (first.featured === second.featured) return 0;
      return first.featured ? -1 : 1;
    });
  }, [normalizedOptions, query]);

  if (!open) return null;

  const toggleOption = (value: string) => {
    const alreadySelected = selected.some((item) => sameValue(item, value));

    if (alreadySelected) {
      onChange(selected.filter((item) => !sameValue(item, value)));
      setError("");
      return;
    }

    if (maxSelected && selected.length >= maxSelected) {
      setError(`Você pode selecionar até ${maxSelected}.`);
      return;
    }

    onChange([...selected, value]);
    setError("");
  };

  const addCustom = () => {
    const value = customValue.trim();

    if (!value) {
      setError("Digite uma opção antes de adicionar.");
      return;
    }

    if (value.length > 60) {
      setError("Use no máximo 60 caracteres.");
      return;
    }

    if (selected.some((item) => sameValue(item, value))) {
      setError("Essa opção já foi adicionada.");
      return;
    }

    if (maxSelected && selected.length >= maxSelected) {
      setError(`Você pode selecionar até ${maxSelected}.`);
      return;
    }

    onChange([...selected, value]);
    setCustomValue("");
    setShowCustom(false);
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
        aria-labelledby="selection-modal-title"
      >
        <header className={styles.header}>
          <div>
            <h3 id="selection-modal-title">{title}</h3>
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
            placeholder={searchPlaceholder}
          />
        </div>

        <div className={styles.metaRow}>
          <span>{selected.length} selecionada{selected.length === 1 ? "" : "s"}</span>
          {maxSelected && <span>máximo {maxSelected}</span>}
        </div>

        <div className={styles.optionList}>
          {visibleOptions.map((option) => {
            const value = option.value;
            const checked = selected.some((item) => sameValue(item, value));

            return (
              <button
                type="button"
                key={value}
                className={`${styles.option} ${checked ? styles.optionSelected : ""}`}
                onClick={() => toggleOption(value)}
                aria-pressed={checked}
              >
                <span className={styles.optionCopy}>
                  {option.code && <span className={styles.codeBadge}>{option.code}</span>}
                  <span>
                    <strong>{option.label ?? value}</strong>
                    {option.meta && <small>{option.meta}</small>}
                  </span>
                  {option.featured && (
                    <span className={styles.featuredBadge}>
                      <Flame aria-hidden="true" /> Em alta
                    </span>
                  )}
                </span>
                <span className={styles.check} aria-hidden="true">
                  {checked && <Check />}
                </span>
              </button>
            );
          })}

          {visibleOptions.length === 0 && (
            <p className={styles.empty}>Nenhuma opção encontrada.</p>
          )}
        </div>

        {allowCustom && (
          <div className={styles.customArea}>
            {!showCustom ? (
              <button
                type="button"
                className={styles.customTrigger}
                onClick={() => {
                  setShowCustom(true);
                  setError("");
                }}
              >
                <Plus aria-hidden="true" />
                {customLabel}
              </button>
            ) : (
              <div className={styles.customRow}>
                <input
                  value={customValue}
                  onChange={(event) => {
                    setCustomValue(event.target.value);
                    setError("");
                  }}
                  maxLength={60}
                  placeholder="Digite e adicione"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustom();
                    }
                  }}
                />
                <button type="button" onClick={addCustom}>Adicionar</button>
              </div>
            )}
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.footer}>
          <button type="button" onClick={handleClose}>Concluir seleção</button>
        </footer>
      </section>
    </div>
  );
}
