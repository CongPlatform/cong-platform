import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import {
  FONT_CATALOG,
  ensureFontsLoaded,
  fontCssStack,
} from "../../../features/site-builder/design-system/fontCatalog";
import styles from "./FontFamilyPicker.module.css";

/** Searchable, keyboard-accessible curated font selector; never accepts CSS text. */
const olderFonts = [
  { value: "legacy", label: "Fonte do modelo" },
  { value: "sans", label: "Sans tradicional" },
  { value: "editorial", label: "Editorial tradicional" },
  { value: "humanist", label: "Humanista tradicional" },
  { value: "rounded", label: "Arredondada tradicional" },
] as const;
function fontLabel(value: string, fallback: string): string {
  return value === "legacy"
    ? fallback
    : (olderFonts.find((item) => item.value === value)?.label ?? value);
}

function FontOption({
  name,
  group,
  active,
  onClick,
}: {
  name: string;
  group: string;
  active: boolean;
  onClick: () => void;
}) {
  const elementRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      ensureFontsLoaded([name]);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          ensureFontsLoaded([name]);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [name]);
  return (
    <button
      ref={elementRef}
      type="button"
      className={styles.option}
      data-active={active}
      onMouseEnter={() => ensureFontsLoaded([name])}
      onFocus={() => ensureFontsLoaded([name])}
      onClick={onClick}
    >
      <span
        className={styles.fontExample}
        style={{ fontFamily: fontCssStack(name) }}
      >
        Ag <strong>{name}</strong>
      </span>
      <small>{group}</small>
      {active ? <FiCheck aria-label="Selecionada" /> : null}
    </button>
  );
}

export default function FontFamilyPicker({
  value,
  onChange,
  includeDefault = true,
  defaultLabel = "Usar fonte do design",
  label = "Família tipográfica",
}: {
  value: string;
  onChange: (family: string) => void;
  includeDefault?: boolean;
  defaultLabel?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      FONT_CATALOG.filter(({ name, group }) =>
        `${name} ${group}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.trim().toLocaleLowerCase("pt-BR")),
      ),
    [query],
  );
  useEffect(() => {
    if (open)
      ensureFontsLoaded([
        ...results.slice(0, 12).map((font) => font.name),
        value,
      ]);
  }, [open, results, value]);
  return (
    <div className={styles.picker}>
      <span className={styles.label}>{label}</span>
      <button
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-label={`${label}: ${fontLabel(value, defaultLabel)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          style={
            value !== "legacy" ? { fontFamily: fontCssStack(value) } : undefined
          }
        >
          {fontLabel(value, defaultLabel)}
        </span>
        <FiChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.menu}>
          <label className={styles.search}>
            <FiSearch aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busque por nome ou categoria..."
              aria-label="Pesquisar fonte"
            />
          </label>
          <div
            className={styles.options}
            role="group"
            aria-label="Fontes disponíveis"
          >
            {!query &&
              includeDefault &&
              olderFonts.map(({ value: id, label: presetLabel }) => (
                <button
                  type="button"
                  key={id}
                  className={styles.option}
                  data-active={value === id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                >
                  <span>{id === "legacy" ? defaultLabel : presetLabel}</span>
                  {value === id ? <FiCheck /> : null}
                </button>
              ))}
            {results.map(({ name, group }) => (
              <FontOption
                key={name}
                name={name}
                group={group}
                active={value === name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setQuery("");
                }}
              />
            ))}
            {!results.length && (
              <span className={styles.empty}>Nenhuma fonte encontrada.</span>
            )}
          </div>
          <button
            className={styles.close}
            type="button"
            onClick={() => setOpen(false)}
          >
            Fechar lista
          </button>
        </div>
      ) : null}
    </div>
  );
}
