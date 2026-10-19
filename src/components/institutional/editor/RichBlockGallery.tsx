import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FiArrowLeft, FiEye, FiPlus, FiSearch, FiX } from "react-icons/fi";
import type {
  InstitutionalBrand,
  InstitutionalElementType,
} from "../../../services/institutionalService";
import { buildBrandCssVariables } from "../../../utils/institutionalColors";
import {
  libraryRichBlockPresets,
  richCategoryOptions,
  createRichPresetNode,
  type RichCategory,
} from "../../../features/site-builder/compositions/richBlockPresets";
import ElementRenderer from "../renderer/ElementRenderer";
import LibraryHoverPreview from "./LibraryHoverPreview";
import styles from "./RichBlockGallery.module.css";

function RichPreview({ id, inheritBrand = true }: { id: string; inheritBrand?: boolean }) {
  const node = useMemo(() => createRichPresetNode(id, inheritBrand), [id, inheritBrand]);
  if (!node) return null;

  if (node.elementType === "image") {
    const example = id === "photo-editorial"
      ? "sereno"
      : id === "photo-round"
        ? "vozes"
        : "comunidade";

    return (
      <ElementRenderer
        node={{
          ...node,
          value: {
            assetId: "preview-only",
            url: `/institutional/examples/${example}.webp`,
            alt: "Fotografia ilustrativa para prévia",
          },
        }}
        editable={false}
        showGuidance={false}
      />
    );
  }

  return <ElementRenderer node={node} editable={false} showGuidance={false} />;
}

function AdaptiveThumbnail({ presetId }: { presetId: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(370);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(180, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(0.84, Math.max(0.24, (width - 22) / 660));

  return (
    <span className={styles.previewWindow} ref={containerRef} aria-hidden="true">
      <span
        className={styles.previewStage}
        style={{ transform: `scale(${scale})` }}
      >
        <RichPreview id={presetId} />
      </span>
    </span>
  );
}

interface RichBlockGalleryProps {
  brand?: InstitutionalBrand;
  query: string;
  disabled?: boolean;
  canInsert: boolean;
  onInsert: (presetId: string, inheritBrand?: boolean) => void;
  initialCategory?: RichCategory;
  categoryOnly?: boolean;
  allowedTypes?: readonly InstitutionalElementType[];
}

export default function RichBlockGallery({
  brand,
  query,
  disabled,
  canInsert,
  onInsert,
  initialCategory = "all",
  categoryOnly = false,
  allowedTypes,
}: RichBlockGalleryProps) {
  const [category, setCategory] = useState<RichCategory>(initialCategory);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [inheritBrand, setInheritBrand] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const search = query.trim().toLocaleLowerCase("pt-BR");

  const entries = libraryRichBlockPresets.filter((preset) => {
    if (category !== "all" && category !== preset.category) return false;
    if (allowedTypes && !allowedTypes.includes(preset.type)) return false;
    if (!search) return true;

    const categoryLabel = richCategoryOptions.find((item) => item.id === preset.category)?.label;
    return `${preset.name} ${preset.summary} ${preset.tag} ${categoryLabel}`
      .toLocaleLowerCase("pt-BR")
      .includes(search);
  });

  const selected = libraryRichBlockPresets.find((preset) => preset.id === previewId);
  const hovered = libraryRichBlockPresets.find((preset) => preset.id === hoverId);
  const brandVars = brand ? (buildBrandCssVariables(brand) as CSSProperties) : undefined;

  const close = () => {
    setPreviewId(null);
    lastTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreviewId(null);
        lastTriggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)"),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  return (
    <div className={styles.gallery} style={brandVars}>
      {!categoryOnly ? (
        <div className={styles.filterBar} aria-label="Categorias de componentes interativos">
          {richCategoryOptions.map((item) => (
            <button
              type="button"
              key={item.id}
              data-active={category === item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.count}>
        <strong>{entries.length} composições</strong>
        <small>Passe o mouse para ampliar</small>
      </div>

      {!canInsert ? (
        <p className={styles.hint}>
          Selecione uma seção para inserir o modelo. As prévias continuam disponíveis.
        </p>
      ) : null}

      <div className={styles.cards}>
        {entries.map((item) => (
          <article
            className={styles.card}
            key={item.id}
            onMouseEnter={(event) => { setHoverId(item.id); setHoverAnchor(event.currentTarget.getBoundingClientRect()); }}
            onMouseLeave={() => { setHoverId(null); setHoverAnchor(null); }}
            onFocus={(event) => { setHoverId(item.id); setHoverAnchor(event.currentTarget.getBoundingClientRect()); }}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setHoverId(null); setHoverAnchor(null); } }}
          >
            <button
              type="button"
              className={styles.previewButton}
              onClick={(event) => {
                lastTriggerRef.current = event.currentTarget;
                setPreviewDevice("desktop");
                setInheritBrand(true);
                setPreviewId(item.id);
              }}
              aria-label={`Visualizar ${item.name}`}
            >
              <AdaptiveThumbnail presetId={item.id} />
              <span className={styles.viewLabel}>
                <FiEye aria-hidden="true" /> Ampliar
              </span>
            </button>
            <div className={styles.cardDetails}>
              <strong>{item.name}</strong>
              <button
                type="button"
                className={styles.insertButton}
                disabled={disabled || !canInsert}
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setInheritBrand(true);
                  setPreviewId(item.id);
                  setHoverId(null);
                  setHoverAnchor(null);
                }}
              >
                <FiPlus aria-hidden="true" /> Adicionar
              </button>
            </div>
          </article>
        ))}
      </div>

      {hovered && !selected ? (
        <LibraryHoverPreview anchor={hoverAnchor} title={hovered.name} description={hovered.summary} theme={brandVars}>
          <RichPreview id={hovered.id} />
        </LibraryHoverPreview>
      ) : null}

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <FiSearch aria-hidden="true" />
          <strong>Nenhum modelo encontrado</strong>
          <span>Experimente outra busca ou categoria.</span>
          <button type="button" onClick={() => setCategory("all")}>
            Ver todos
          </button>
        </div>
      ) : null}

      {selected ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rich-model-title"
            ref={dialogRef}
            style={brandVars}
          >
            <header className={styles.dialogHeader}>
              <button
                type="button"
                className={styles.back}
                aria-label="Voltar à biblioteca"
                onClick={close}
              >
                <FiArrowLeft />
              </button>
              <div>
                <span>{selected.tag}</span>
                <h2 id="rich-model-title">{selected.name}</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="Fechar prévia"
                onClick={close}
              >
                <FiX />
              </button>
            </header>

            <div className={styles.deviceToolbar} role="group" aria-label="Largura da prévia">
              <span>Visualização do modelo</span>
              <div>
                <button
                  type="button"
                  aria-pressed={previewDevice === "desktop"}
                  data-active={previewDevice === "desktop"}
                  onClick={() => setPreviewDevice("desktop")}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  aria-pressed={previewDevice === "mobile"}
                  data-active={previewDevice === "mobile"}
                  onClick={() => setPreviewDevice("mobile")}
                >
                  Celular
                </button>
              </div>
            </div>

            <div className={styles.dialogStage} data-device={previewDevice}>
              <div className={styles.dialogPreview}>
                <RichPreview id={selected.id} inheritBrand={inheritBrand} />
              </div>
            </div>

            <div className={styles.paletteSwitch} role="group" aria-label="Cores do modelo">
              <span>Identidade visual</span>
              <button type="button" data-active={inheritBrand} aria-pressed={inheritBrand} onClick={() => setInheritBrand(true)}>Cores da ONG</button>
              <button type="button" data-active={!inheritBrand} aria-pressed={!inheritBrand} onClick={() => setInheritBrand(false)}>Cores originais</button>
            </div>
            <footer className={styles.dialogFooter}>
              <p>Edite conteúdo, mídias e cores após inserir.</p>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={disabled || !canInsert}
                onClick={() => {
                  onInsert(selected.id, inheritBrand);
                  close();
                }}
              >
                <FiPlus /> Adicionar à seção
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
