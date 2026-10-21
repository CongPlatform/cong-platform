import { useMemo, useState, type CSSProperties } from "react";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import { getSectionDefinition } from "../../../data/institutional/sectionCatalog";
import {
  createEditorialPieceNode,
  editorialCategories,
  editorialPieces,
  type EditorialCategory,
  type EditorialPiece,
} from "../../../features/site-builder/compositions/editorialPieces";
import type { InstitutionalBrand } from "../../../services/institutionalService";
import { buildBrandCssVariables } from "../../../utils/institutionalColors";
import LayoutRenderer from "../renderer/LayoutRenderer";
import LibraryHoverPreview from "./LibraryHoverPreview";
import styles from "./EditorialPieceGallery.module.css";

function PieceCanvas({ piece, inheritBrand, brand }: {
  piece: EditorialPiece;
  inheritBrand: boolean;
  brand?: InstitutionalBrand;
}) {
  const layout = useMemo(() => createEditorialPieceNode(piece.id, inheritBrand), [piece.id, inheritBrand]);
  if (!layout) return null;
  return (
    <div className={styles.render} style={brand ? buildBrandCssVariables(brand) as CSSProperties : undefined}>
      <LayoutRenderer
        node={layout}
        data={{}}
        editable={false}
        sectionDefinition={getSectionDefinition("custom_content")}
      />
    </div>
  );
}

export default function EditorialPieceGallery({ brand, disabled, canInsert, onInsert, initialCategory = "all", categoryOnly = false }: {
  brand?: InstitutionalBrand;
  disabled?: boolean;
  canInsert: boolean;
  onInsert: (id: string, inheritBrand: boolean) => void;
  initialCategory?: EditorialCategory | "all";
  categoryOnly?: boolean;
}) {
  const [category, setCategory] = useState<EditorialCategory | "all">(initialCategory);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inheritBrand, setInheritBrand] = useState(true);
  const selected = editorialPieces.find((item) => item.id === selectedId);
  const hovered = editorialPieces.find((item) => item.id === hoverId);
  const entries = editorialPieces.filter((item) => category === "all" || category === item.category);

  return (
    <div className={styles.gallery}>
      {!categoryOnly && <div className={styles.filters} role="group" aria-label="Famílias de composições textuais">
        {editorialCategories.map((item) => (
          <button key={item.id} type="button" aria-pressed={category === item.id}
            data-active={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>
        ))}
      </div>}
      <div className={styles.cards}>
        {entries.map((piece) => (
          <button key={piece.id} type="button" className={styles.card} data-theme={piece.theme}
            disabled={disabled || !canInsert}
            onMouseEnter={(event) => { setAnchor(event.currentTarget.getBoundingClientRect()); setHoverId(piece.id); }}
            onMouseLeave={() => { setAnchor(null); setHoverId(null); }}
            onFocus={(event) => { setAnchor(event.currentTarget.getBoundingClientRect()); setHoverId(piece.id); }}
            onBlur={() => { setAnchor(null); setHoverId(null); }}
            onClick={() => { setSelectedId(piece.id); setInheritBrand(true); setAnchor(null); setHoverId(null); }}
          >
            <span className={styles.artwork}>
              <span>{piece.eyebrow}</span>
              <strong>{piece.heading}</strong>
              <i aria-hidden="true" />
              <small>{piece.body}</small>
            </span>
            <span className={styles.meta}><strong>{piece.name}</strong><FiPlus aria-hidden="true" /></span>
          </button>
        ))}
      </div>
      {hovered && <LibraryHoverPreview anchor={anchor} title={hovered.name} description={hovered.summary}>
        <PieceCanvas piece={hovered} inheritBrand={false} brand={brand} />
      </LibraryHoverPreview>}
      {selected && (
        <div className={styles.overlay} onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedId(null); }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="editorial-piece-title">
            <header className={styles.dialogHead}>
              <div><span>Adicionar composição</span><h2 id="editorial-piece-title">{selected.name}</h2></div>
              <button type="button" aria-label="Fechar" onClick={() => setSelectedId(null)}><FiX /></button>
            </header>
            <div className={styles.dialogBody}>
              <div className={styles.fullPreview}><PieceCanvas piece={selected} inheritBrand={inheritBrand} brand={brand} /></div>
              <fieldset className={styles.identityChoice}>
                <legend>Qual identidade visual utilizar?</legend>
                <label data-active={inheritBrand}>
                  <input type="radio" name="editorial-brand" checked={inheritBrand} onChange={() => setInheritBrand(true)} />
                  <span><strong>Cores do meu projeto</strong><small>Integra a composição à identidade da ONG.</small></span>
                  {inheritBrand && <FiCheck />}
                </label>
                <label data-active={!inheritBrand}>
                  <input type="radio" name="editorial-brand" checked={!inheritBrand} onChange={() => setInheritBrand(false)} />
                  <span><strong>Cores originais</strong><small>Mantém a direção de arte da composição.</small></span>
                  {!inheritBrand && <FiCheck />}
                </label>
              </fieldset>
            </div>
            <footer className={styles.dialogFooter}>
              <span>Textos, cores e elementos podem ser alterados depois.</span>
              <button type="button" onClick={() => { onInsert(selected.id, inheritBrand); setSelectedId(null); }}>
                <FiPlus /> Inserir composição
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
