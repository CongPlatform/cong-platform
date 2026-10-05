import { useState, type DragEvent, type ReactNode } from "react";
import {
  FiCopy,
  FiEye,
  FiEyeOff,
  FiLayout,
  FiMoreHorizontal,
  FiMove,
  FiTrash2,
} from "react-icons/fi";

import styles from "./SectionFrame.module.css";

export default function SectionFrame({
  children,
  sectionId,
  selected,
  visible,
  label,
  draggable,
  designPicker,
  designOpen = false,
  onToggleDesign,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisible,
  allowVisibilityToggle = true,
  allowDuplicate = true,
  onDragStart,
  onDragOver,
  onDrop,
  onElementDrop,
}: {
  children: ReactNode;
  sectionId: string;
  selected: boolean;
  visible: boolean;
  label: string;
  draggable: boolean;
  designPicker?: ReactNode;
  designOpen?: boolean;
  onToggleDesign?: () => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  allowVisibilityToggle?: boolean;
  allowDuplicate?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onElementDrop?: (elementType: string) => void;
}) {
  const [elementDragOver, setElementDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`${styles.frame} ${selected ? styles.selected : ""} ${
        visible ? "" : styles.hiddenSection
      }`}
      data-section-id={sectionId}
      onClick={onSelect}
      data-element-drag-over={elementDragOver}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-cong-element")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setElementDragOver(true);
          return;
        }
        onDragOver?.(event);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setElementDragOver(false);
        }
      }}
      onDrop={(event) => {
        const elementType = event.dataTransfer.getData("application/x-cong-element");
        if (elementType && onElementDrop) {
          event.preventDefault();
          event.stopPropagation();
          setElementDragOver(false);
          onElementDrop(elementType);
          return;
        }
        setElementDragOver(false);
        onDrop?.(event);
      }}
    >
      <div
        className={styles.sectionIdentity}
        draggable={draggable}
        onDragStart={onDragStart}
        title={draggable ? "Arraste esta etiqueta para reorganizar a seção" : undefined}
      >
        {draggable ? <FiMove aria-hidden="true" /> : null}
        <span>{label}</span>
        {selected ? <small>Seção selecionada</small> : null}
      </div>

      {elementDragOver ? <div className={styles.dropHint}>Solte para adicionar nesta seção</div> : null}

      <div className={styles.controls} onClick={(event) => event.stopPropagation()}>
        {onToggleDesign && designPicker ? (
          <button
            type="button"
            className={styles.designButton}
            data-active={designOpen}
            onClick={() => { setMenuOpen(false); onToggleDesign(); }}
            aria-expanded={designOpen}
          >
            <FiLayout aria-hidden="true" />
            <span>Design</span>
          </button>
        ) : null}
        <button type="button" className={styles.moreButton} data-active={menuOpen} onClick={() => setMenuOpen((value) => !value)} aria-label="Mais opções" title="Mais opções"><FiMoreHorizontal /></button>
        {menuOpen ? (
          <div className={styles.sectionMenu}>
            {allowDuplicate ? <button type="button" onClick={() => { setMenuOpen(false); onDuplicate(); }}><FiCopy /> Duplicar seção</button> : null}
            {allowVisibilityToggle ? <button type="button" onClick={() => { setMenuOpen(false); onToggleVisible(); }}>{visible ? <FiEyeOff /> : <FiEye />}{visible ? "Ocultar seção" : "Mostrar seção"}</button> : null}
            <button type="button" className={styles.dangerAction} onClick={() => { setMenuOpen(false); onDelete(); }}><FiTrash2 /> Excluir seção</button>
          </div>
        ) : null}
      </div>

      {designOpen && designPicker ? (
        <div className={styles.designPopover} onClick={(event) => event.stopPropagation()}>
          {designPicker}
        </div>
      ) : null}

      {children}
    </div>
  );
}
