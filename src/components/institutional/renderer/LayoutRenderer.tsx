import type { InstitutionalSectionDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalBrand,
  InstitutionalElementStyle,
  InstitutionalImageFrameResource,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import { FiPlus } from "react-icons/fi";

import { collectionItemLabel, createInstitutionalCollectionItem } from "../../../utils/institutionalCollections";
import ElementRenderer from "./ElementRenderer";
import ElementShell from "./ElementShell";
import SlotRenderer from "./SlotRenderer";

import styles from "./InstitutionalRenderer.module.css";

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export default function LayoutRenderer({
  node,
  data,
  editable,
  path = [],
  sectionDefinition,
  showGuidance = false,
  selectedElementId,
  onSelectElement,
  onValueChange,
  onImageRequest,
  onElementValueChange,
  onElementImageRequest,
  onElementStyleChange,
  onMoveElement,
  onRemoveElement,
  brand,
  sectionBackground,
  frames = [],
}: {
  node: InstitutionalLayoutNode;
  data: Record<string, unknown>;
  editable: boolean;
  path?: Array<string | number>;
  sectionDefinition: InstitutionalSectionDefinition;
  showGuidance?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onValueChange?: (path: Array<string | number>, value: unknown) => void;
  onImageRequest?: (path: Array<string | number>) => void;
  onElementValueChange?: (elementId: string, value: unknown) => void;
  onElementImageRequest?: (elementId: string) => void;
  onElementStyleChange?: (elementId: string, style: Partial<InstitutionalElementStyle>) => void;
  onMoveElement?: (elementId: string, direction: -1 | 1) => void;
  onRemoveElement?: (elementId: string) => void;
  brand?: InstitutionalBrand;
  sectionBackground?: string;
  frames?: InstitutionalImageFrameResource[];
}) {
  if (node.type === "slot") {
    const fieldDefinition = path.length === 0
      ? sectionDefinition.fields.find((field) => field.key === node.slot)
      : undefined;
    const rendered = (
      <SlotRenderer
        slot={node.slot}
        presentation={node.presentation}
        data={data}
        editable={editable}
        path={path}
        fieldDefinition={fieldDefinition}
        showGuidance={showGuidance && selectedElementId === node.id}
        selected={Boolean(node.id && selectedElementId === node.id)}
        imageStyle={node.style}
        onValueChange={onValueChange}
        onImageRequest={onImageRequest}
        onImageStyleChange={node.id ? (style) => onElementStyleChange?.(node.id!, style) : undefined}
      />
    );

    if (!node.id) return rendered;

    return (
      <ElementShell
        node={node}
        editable={editable}
        selected={selectedElementId === node.id}
        removable
        onSelect={() => onSelectElement?.(node.id!)}
        onStyleChange={(style) => onElementStyleChange?.(node.id!, style)}
        onRemove={() => onRemoveElement?.(node.id!)}
        brand={brand}
        sectionBackground={sectionBackground}
        frames={frames}
      >
        {rendered}
      </ElementShell>
    );
  }

  if (node.type === "element") {
    return (
      <ElementShell
        node={node}
        editable={editable}
        selected={selectedElementId === node.id}
        removable
        onSelect={() => onSelectElement?.(node.id)}
        onStyleChange={(style) => onElementStyleChange?.(node.id, style)}
        onRemove={() => onRemoveElement?.(node.id)}
        brand={brand}
        sectionBackground={sectionBackground}
        frames={frames}
      >
        <ElementRenderer
          node={node}
          editable={editable}
          selected={selectedElementId === node.id}
          showGuidance={showGuidance && selectedElementId === node.id}
          onValueChange={(value) => onElementValueChange?.(node.id, value)}
          onImageRequest={() => onElementImageRequest?.(node.id)}
          onStyleChange={(style) => onElementStyleChange?.(node.id, style)}
        />
      </ElementShell>
    );
  }

  if (node.type === "repeat") {
    const source = data[node.source];
    const items = Array.isArray(source) ? source : [];
    const field = sectionDefinition.fields.find((candidate) => candidate.key === node.source);
    const itemType = field?.itemType;

    const addItem = editable && itemType && onValueChange
      ? () => onValueChange([...path, node.source], [...items, createInstitutionalCollectionItem(itemType)])
      : null;

    if (items.length === 0) {
      return editable ? (
        <div className={styles.emptyCollection}>
          <strong>Esta área ainda está vazia.</strong>
          <span>Adicione o primeiro item aqui mesmo no site.</span>
          {addItem ? (
            <button type="button" className={styles.canvasAddItem} onClick={addItem}>
              <FiPlus aria-hidden="true" /> Adicionar {collectionItemLabel(itemType!)}
            </button>
          ) : null}
        </div>
      ) : null;
    }

    return (
      <div className={styles.collectionCanvasGroup}>
        <div
          className={joinClassNames(styles.repeat, styles[`columns${node.columns}`])}
          data-gap={node.gap}
        >
          {items.map((item, index) => (
            <LayoutRenderer
              key={
                item && typeof item === "object" && "id" in item
                  ? String((item as Record<string, unknown>).id)
                  : index
              }
              node={node.item}
              data={
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {}
              }
              editable={editable}
              path={[...path, node.source, index]}
              sectionDefinition={sectionDefinition}
              showGuidance={false}
              selectedElementId={selectedElementId}
              onSelectElement={onSelectElement}
              onValueChange={onValueChange}
              onImageRequest={onImageRequest}
              onElementValueChange={onElementValueChange}
              onElementImageRequest={onElementImageRequest}
              onElementStyleChange={onElementStyleChange}
              onMoveElement={onMoveElement}
              onRemoveElement={onRemoveElement}
              brand={brand}
              sectionBackground={sectionBackground}
              frames={frames}
            />
          ))}
        </div>
        {addItem ? (
          <button type="button" className={styles.canvasAddItemSecondary} onClick={addItem}>
            <FiPlus aria-hidden="true" /> Adicionar {collectionItemLabel(itemType!)}
          </button>
        ) : null}
      </div>
    );
  }

  const common = {
    data,
    editable,
    path,
    sectionDefinition,
    showGuidance,
    selectedElementId,
    onSelectElement,
    onValueChange,
    onImageRequest,
    onElementValueChange,
    onElementImageRequest,
    onElementStyleChange,
    onMoveElement,
    onRemoveElement,
    brand,
    sectionBackground,
    frames,
  };

  if (node.type === "columns") {
    return (
      <div
        className={joinClassNames(
          styles.columns,
          styles[`ratio${node.ratio.replace(":", "to")}`],
          node.surface && node.surface !== "none" ? styles[`surface${node.surface}`] : undefined,
        )}
        data-gap={node.gap}
      >
        {node.children.map((child, index) => (
          <LayoutRenderer key={child.id ?? index} node={child} {...common} />
        ))}
      </div>
    );
  }

  if (node.type === "grid") {
    return (
      <div
        className={joinClassNames(
          styles.grid,
          styles[`columns${node.columns}`],
          node.surface && node.surface !== "none" ? styles[`surface${node.surface}`] : undefined,
        )}
        data-gap={node.gap}
      >
        {node.children.map((child, index) => (
          <LayoutRenderer key={child.id ?? index} node={child} {...common} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={joinClassNames(
        styles.stack,
        node.direction === "row" ? styles.stackRow : undefined,
        node.align ? styles[`align${node.align}`] : undefined,
        node.surface && node.surface !== "none" ? styles[`surface${node.surface}`] : undefined,
      )}
      data-gap={node.gap}
    >
      {node.children.map((child, index) => (
        <LayoutRenderer key={child.id ?? index} node={child} {...common} />
      ))}
    </div>
  );
}
