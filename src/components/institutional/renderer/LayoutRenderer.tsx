import type { InstitutionalSectionDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalBrand,
  InstitutionalEditorConstraints,
  InstitutionalElementStyle,
  InstitutionalImageFrameResource,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import { FiPlus } from "react-icons/fi";

import {
  collectionItemLabel,
  createInstitutionalCollectionItem,
} from "../../../utils/institutionalCollections";
import { institutionalSelectionId } from "../../../utils/institutionalSelection";
import ElementRenderer from "./ElementRenderer";
import ElementShell from "./ElementShell";
import SlotRenderer from "./SlotRenderer";

import styles from "./InstitutionalRenderer.module.css";

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function repeatContext(path: Array<string | number>): { source?: string; index?: number } {
  if (path.length < 2) return {};
  const index = path[path.length - 1];
  const source = path[path.length - 2];
  return typeof index === "number" && typeof source === "string"
    ? { source, index }
    : {};
}

export default function LayoutRenderer({
  node,
  data,
  editable,
  path = [],
  sectionDefinition,
  showGuidance = false,
  selectedElementId,
  selectedElementIds = [],
  onSelectElement,
  onValueChange,
  onImageRequest,
  onImageFile,
  onElementValueChange,
  onElementImageRequest,
  onElementImageFile,
  onElementStyleChange,
  onMoveSelection,
  onMoveElement,
  onRemoveElement,
  onCopyElement,
  onCutElement,
  onPasteElement,
  onDuplicateElement,
  brand,
  sectionBackground,
  frames = [],
  editorConstraints,
  instanceStyles = {},
  instanceValues = {},
}: {
  node: InstitutionalLayoutNode;
  data: Record<string, unknown>;
  editable: boolean;
  path?: Array<string | number>;
  sectionDefinition: InstitutionalSectionDefinition;
  showGuidance?: boolean;
  selectedElementId?: string | null;
  selectedElementIds?: string[];
  onSelectElement?: (elementId: string, additive?: boolean) => void;
  onValueChange?: (path: Array<string | number>, value: unknown) => void;
  onImageRequest?: (path: Array<string | number>) => void;
  onImageFile?: (path: Array<string | number>, file: File) => void;
  onElementValueChange?: (elementId: string, value: unknown) => void;
  onElementImageRequest?: (elementId: string) => void;
  onElementImageFile?: (elementId: string, file: File) => void;
  onElementStyleChange?: (
    elementId: string,
    style: Partial<InstitutionalElementStyle>,
  ) => void;
  onMoveSelection?: (deltaX: number, deltaY: number, elementIds?: string[]) => void;
  onMoveElement?: (elementId: string, direction: -1 | 1) => void;
  onRemoveElement?: (elementId: string) => void;
  onCopyElement?: () => void;
  onCutElement?: () => void;
  onPasteElement?: () => void;
  onDuplicateElement?: () => void;
  brand?: InstitutionalBrand;
  sectionBackground?: string;
  frames?: InstitutionalImageFrameResource[];
  editorConstraints?: InstitutionalEditorConstraints;
  instanceStyles?: Record<string, InstitutionalElementStyle>;
  instanceValues?: Record<string, unknown>;
}) {
  const repeatMeta = repeatContext(path);

  if (node.type === "slot") {
    const selectionId = node.id ? institutionalSelectionId(node.id, path) : null;
    const effectiveNode = selectionId && instanceStyles[selectionId]
      ? { ...node, style: { ...(node.style ?? {}), ...instanceStyles[selectionId] } }
      : node;
    const fieldDefinition =
      path.length === 0
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
        showGuidance={Boolean(selectionId && showGuidance && selectedElementId === selectionId)}
        selected={Boolean(selectionId && selectedElementId === selectionId)}
        imageStyle={effectiveNode.style}
        onValueChange={onValueChange}
        onImageRequest={onImageRequest}
        onImageFile={onImageFile}
        onImageStyleChange={
          node.id
            ? (style) => onElementStyleChange?.(selectionId ?? node.id!, style)
            : undefined
        }
      />
    );

    if (!node.id) return rendered;

    return (
      <ElementShell
        node={effectiveNode}
        editable={editable}
        selectionId={selectionId ?? node.id}
        selected={selectedElementId === selectionId}
        multiSelected={Boolean(selectionId && selectedElementIds.includes(selectionId))}
        selectedIds={selectedElementIds}
        removable={path.length === 0}
        onSelect={(additive) => selectionId && onSelectElement?.(selectionId, additive)}
        onStyleChange={(style) => onElementStyleChange?.(selectionId ?? node.id!, style)}
        onMoveCommit={onMoveSelection}
        onRemove={() => selectionId && onRemoveElement?.(selectionId)}
        onCopy={onCopyElement}
        onCut={onCutElement}
        onPaste={onPasteElement}
        onDuplicate={onDuplicateElement}
        brand={brand}
        sectionBackground={sectionBackground}
        frames={frames}
        editorConstraints={editorConstraints}
      >
        {rendered}
      </ElementShell>
    );
  }

  if (node.type === "element") {
    const selectionId = institutionalSelectionId(node.id, path);
    const effectiveNode = (instanceStyles[selectionId] || Object.prototype.hasOwnProperty.call(instanceValues, selectionId))
      ? {
          ...node,
          ...(Object.prototype.hasOwnProperty.call(instanceValues, selectionId) ? { value: instanceValues[selectionId] as typeof node.value } : {}),
          style: { ...(node.style ?? {}), ...(instanceStyles[selectionId] ?? {}) },
        }
      : node;
    return (
      <ElementShell
        node={effectiveNode}
        selectionId={selectionId}
        editable={editable}
        selected={selectedElementId === selectionId}
        multiSelected={selectedElementIds.includes(selectionId)}
        selectedIds={selectedElementIds}
        removable={path.length === 0}
        onSelect={(additive) => onSelectElement?.(selectionId, additive)}
        onStyleChange={(style) => onElementStyleChange?.(selectionId, style)}
        onMoveCommit={onMoveSelection}
        onRemove={() => onRemoveElement?.(selectionId)}
        onCopy={onCopyElement}
        onCut={onCutElement}
        onPaste={onPasteElement}
        onDuplicate={onDuplicateElement}
        brand={brand}
        sectionBackground={sectionBackground}
        frames={frames}
        editorConstraints={editorConstraints}
      >
        <ElementRenderer
          node={effectiveNode}
          editable={editable}
          selected={selectedElementId === selectionId}
          showGuidance={showGuidance && selectedElementId === selectionId}
          onValueChange={(value) => onElementValueChange?.(selectionId, value)}
          onImageRequest={() => onElementImageRequest?.(selectionId)}
          onImageFile={(file) => onElementImageFile?.(selectionId, file)}
          onStyleChange={(style) => onElementStyleChange?.(selectionId, style)}
        />
      </ElementShell>
    );
  }

  if (node.type === "repeat") {
    const source = data[node.source];
    const items = Array.isArray(source) ? source : [];
    const field = sectionDefinition.fields.find(
      (candidate) => candidate.key === node.source,
    );
    const itemType = field?.itemType;

    const addItem =
      editable && itemType && onValueChange
        ? () =>
            onValueChange(
              [...path, node.source],
              [...items, createInstitutionalCollectionItem(itemType)],
            )
        : null;

    if (items.length === 0) {
      return editable ? (
        <div className={styles.emptyCollection}>
          <strong>Esta área ainda está vazia.</strong>
          <span>Adicione o primeiro item aqui mesmo no site.</span>
          {addItem ? (
            <button
              type="button"
              className={styles.canvasAddItem}
              onClick={addItem}
            >
              <FiPlus aria-hidden="true" /> Adicionar{" "}
              {collectionItemLabel(itemType!)}
            </button>
          ) : null}
        </div>
      ) : null;
    }

    return (
      <div className={styles.collectionCanvasGroup}>
        <div
          className={joinClassNames(
            styles.repeat,
            styles[`columns${node.columns}`],
          )}
          data-gap={node.gap}
          data-layout-container="true"
          data-layout-kind="repeat"
          data-layout-columns={node.columns}
          data-repeat-source={node.source}
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
              selectedElementIds={selectedElementIds}
              onSelectElement={onSelectElement}
              onValueChange={onValueChange}
              onImageRequest={onImageRequest}
              onImageFile={onImageFile}
              onElementValueChange={onElementValueChange}
              onElementImageRequest={onElementImageRequest}
              onElementImageFile={onElementImageFile}
              onElementStyleChange={onElementStyleChange}
              onMoveSelection={onMoveSelection}
              onMoveElement={onMoveElement}
              onRemoveElement={onRemoveElement}
              onCopyElement={onCopyElement}
              onCutElement={onCutElement}
              onPasteElement={onPasteElement}
              onDuplicateElement={onDuplicateElement}
              brand={brand}
              sectionBackground={sectionBackground}
              frames={frames}
              editorConstraints={editorConstraints}
              instanceStyles={instanceStyles}
              instanceValues={instanceValues}
            />
          ))}
        </div>
        {addItem ? (
          <button
            type="button"
            className={styles.canvasAddItemSecondary}
            onClick={addItem}
          >
            <FiPlus aria-hidden="true" /> Adicionar{" "}
            {collectionItemLabel(itemType!)}
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
    selectedElementIds,
    onSelectElement,
    onValueChange,
    onImageRequest,
    onImageFile,
    onElementValueChange,
    onElementImageRequest,
    onElementImageFile,
    onElementStyleChange,
    onMoveSelection,
    onMoveElement,
    onRemoveElement,
    onCopyElement,
    onCutElement,
    onPasteElement,
    onDuplicateElement,
    brand,
    sectionBackground,
    frames,
    editorConstraints,
    instanceStyles,
    instanceValues,
  };

  if (node.type === "columns") {
    return (
      <div
        className={joinClassNames(
          styles.columns,
          styles[`ratio${node.ratio.replace(":", "to")}`],
          node.surface && node.surface !== "none"
            ? styles[`surface${node.surface}`]
            : undefined,
        )}
        data-gap={node.gap}
        data-surface={node.surface && node.surface !== "none" ? node.surface : undefined}
        data-layout-container="true"
        data-layout-kind="columns"
        data-layout-ratio={node.ratio}
        data-repeat-source={repeatMeta.source}
        data-repeat-index={repeatMeta.index}
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
          node.surface && node.surface !== "none"
            ? styles[`surface${node.surface}`]
            : undefined,
        )}
        data-gap={node.gap}
        data-surface={node.surface && node.surface !== "none" ? node.surface : undefined}
        data-layout-container="true"
        data-layout-kind="grid"
        data-layout-columns={node.columns}
        data-repeat-source={repeatMeta.source}
        data-repeat-index={repeatMeta.index}
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
        node.surface && node.surface !== "none"
          ? styles[`surface${node.surface}`]
          : undefined,
      )}
      data-gap={node.gap}
      data-surface={node.surface && node.surface !== "none" ? node.surface : undefined}
      data-layout-container="true"
      data-layout-kind="stack"
      data-layout-direction={node.direction ?? "column"}
      data-repeat-source={repeatMeta.source}
      data-repeat-index={repeatMeta.index}
    >
      {node.children.map((child, index) => (
        <LayoutRenderer key={child.id ?? index} node={child} {...common} />
      ))}
    </div>
  );
}
