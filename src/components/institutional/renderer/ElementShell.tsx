import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  FiAlertTriangle,
  FiAlignCenter,
  FiAlignJustify,
  FiAlignLeft,
  FiAlignRight,
  FiCheck,
  FiChevronDown,
  FiDroplet,
  FiImage,
  FiLayers,
  FiMaximize2,
  FiMoreHorizontal,
  FiRotateCcw,
  FiTrash2,
  FiType,
} from "react-icons/fi";

import type {
  InstitutionalBrand,
  InstitutionalEditorConstraints,
  InstitutionalElementStyle,
  InstitutionalImageFrame,
  InstitutionalImageFrameResource,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import { contrastRatio } from "../../../utils/institutionalPalette";
import { institutionalColorCssVar, resolveInstitutionalColor } from "../../../utils/institutionalColors";

import ColorPickerControl from "../editor/ColorPickerControl";
import styles from "./InstitutionalRenderer.module.css";

type ResizeEdge =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
type ToolbarPanel = "size" | "align" | "position" | "color" | "image" | "frame" | "overlay" | "more" | "readability" | null;

type CanvasGuides = { vertical?: number; horizontal?: number };

function colorValue(value: InstitutionalElementStyle["color"]): string | undefined {
  return institutionalColorCssVar(value);
}

function resolvedColor(
  value: InstitutionalElementStyle["color"] | undefined,
  brand: InstitutionalBrand | undefined,
  fallback: string | undefined,
): string | undefined {
  return resolveInstitutionalColor(value, brand) ?? fallback;
}


function widthValue(style: InstitutionalElementStyle): string | undefined {
  if (style.widthPercent !== undefined) return `${style.widthPercent}%`;
  if (!style.width || style.width === "auto") return "fit-content";
  return `${style.width}%`;
}

function fontSizeValue(style: InstitutionalElementStyle): string | undefined {
  if (style.fontSize !== undefined) return `${style.fontSize}px`;
  if (!style.size) return undefined;
  const values: Record<NonNullable<InstitutionalElementStyle["size"]>, string> = {
    xs: "var(--font-xs)", sm: "var(--font-sm)", md: "var(--font-md)", lg: "var(--font-lg)",
    xl: "var(--font-xl)", "2xl": "clamp(1.8rem, 4vw, 3rem)", "3xl": "clamp(2.4rem, 6vw, 5rem)",
  };
  return values[style.size];
}

function numericFontSize(style: InstitutionalElementStyle): number {
  if (style.fontSize !== undefined) return style.fontSize;
  const fallback: Record<NonNullable<InstitutionalElementStyle["size"]>, number> = {
    xs: 12, sm: 14, md: 16, lg: 20, xl: 26, "2xl": 38, "3xl": 56,
  };
  return style.size ? fallback[style.size] : 16;
}

function radiusValue(radius: InstitutionalElementStyle["radius"]): string | undefined {
  if (!radius) return undefined;
  const values: Record<NonNullable<InstitutionalElementStyle["radius"]>, string> = {
    none: "0px",
    small: "6px",
    medium: "12px",
    large: "22px",
    pill: "999px",
  };
  return values[radius];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentageWidthBasis(
  element: HTMLElement,
  style: InstitutionalElementStyle,
): number {
  const rect = element.getBoundingClientRect();
  const explicitPercent = style.widthPercent ??
    (style.width && style.width !== "auto" ? Number(style.width) : undefined);

  if (explicitPercent && Number.isFinite(explicitPercent) && explicitPercent > 0) {
    return Math.max(rect.width / (explicitPercent / 100), 1);
  }

  // For grid items, parentElement.width is the whole grid, while percentage
  // widths resolve against the item's grid area. Let the browser resolve 100%
  // once and measure that actual containing block instead of guessing it.
  const previousWidth = element.style.getPropertyValue("width");
  const previousPriority = element.style.getPropertyPriority("width");
  element.style.setProperty("width", "100%", "important");
  const measured = element.getBoundingClientRect().width;
  if (previousWidth) {
    element.style.setProperty("width", previousWidth, previousPriority);
  } else {
    element.style.removeProperty("width");
  }

  return Math.max(measured || rect.width, 1);
}


function isImageNode(node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>): boolean {
  if (node.type === "element") return node.elementType === "image";
  return ["image", "heroImage", "wideImage", "cardImage", "brandLogo"].includes(node.presentation ?? "");
}

function isTextBoxNode(node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>): boolean {
  if (node.type === "element") {
    return ["heading", "text", "quote"].includes(node.elementType);
  }

  const presentation = node.presentation ?? "body";
  return [
    "display",
    "heading",
    "lead",
    "body",
    "caption",
    "itemTitle",
    "itemBody",
    "contactLine",
    "eyebrow",
    "metricValue",
    "metricLabel",
  ].includes(presentation);
}

function placementStyle(placement: InstitutionalElementStyle["placement"]): Pick<CSSProperties, "marginLeft" | "marginRight"> {
  if (placement === "center") return { marginLeft: "auto", marginRight: "auto" };
  if (placement === "right") return { marginLeft: "auto", marginRight: 0 };
  if (placement === "left") return { marginLeft: 0, marginRight: "auto" };
  return {};
}

function bestReadableColor(background: string | undefined, brand: InstitutionalBrand | undefined): `#${string}` | "text" | "primary" | "secondary" | "accent" {
  if (!background) return "text";
  const candidates: Array<{ value: `#${string}` | "text" | "primary" | "secondary" | "accent"; hex: string | undefined }> = [
    { value: "text", hex: brand?.textColor },
    { value: "primary", hex: brand?.primaryColor },
    { value: "secondary", hex: brand?.secondaryColor },
    { value: "accent", hex: brand?.accentColor },
    { value: "#ffffff", hex: "#ffffff" },
    { value: "#091c30", hex: "#091c30" },
  ];
  return candidates
    .filter((item): item is { value: `#${string}` | "text" | "primary" | "secondary" | "accent"; hex: string } => Boolean(item.hex))
    .sort((a, b) => contrastRatio(b.hex, background) - contrastRatio(a.hex, background))[0]?.value ?? "text";
}

const frameOptions: Array<{ id: InstitutionalImageFrame; label: string }> = [
  { id: "rectangle", label: "Reta" },
  { id: "rounded", label: "Suave" },
  { id: "circle", label: "Circular" },
  { id: "arch", label: "Arco" },
  { id: "blob", label: "Orgânica" },
  { id: "diagonal-left", label: "Diagonal" },
  { id: "diagonal-right", label: "Diagonal invertida" },
];

export default function ElementShell({
  node, selected, multiSelected = false, selectedIds = [], editable, removable, children, onSelect, onStyleChange, onMoveCommit, onRemove, brand, sectionBackground, frames = [], editorConstraints,
}: {
  node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>;
  selected: boolean;
  multiSelected?: boolean;
  selectedIds?: string[];
  editable: boolean;
  removable: boolean;
  children: ReactNode;
  onSelect?: (additive?: boolean) => void;
  onStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onMoveCommit?: (deltaX: number, deltaY: number, elementIds?: string[]) => void;
  onRemove?: () => void;
  brand?: InstitutionalBrand;
  sectionBackground?: string;
  frames?: InstitutionalImageFrameResource[];
  editorConstraints?: InstitutionalEditorConstraints;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [toolbarPlacement, setToolbarPlacement] = useState<"above" | "below">("above");
  const [outsideSafeArea, setOutsideSafeArea] = useState(false);
  const [openPanel, setOpenPanel] = useState<ToolbarPanel>(null);
  const [cropMode, setCropMode] = useState(false);
  const [framePreviewUrl, setFramePreviewUrl] = useState<string | null>(null);
  const [guides, setGuides] = useState<CanvasGuides>({});
  const style = node.style ?? {};
  const locked = Boolean(style.locked);
  const imageLike = isImageNode(node);
  const textBoxLike = isTextBoxNode(node);
  const textLike = node.type === "slot" ? !imageLike : ["heading", "text", "quote", "button", "metric"].includes(node.elementType);
  const explicitWidth = style.widthPercent !== undefined || Boolean(style.width && style.width !== "auto");
  const buttonLike =
    (node.type === "element" && node.elementType === "button") ||
    (node.type === "slot" &&
      ["primaryAction", "secondaryAction"].includes(node.presentation ?? ""));
  const shapeLike = node.type === "element" && node.elementType === "shape";
  const heightResizable = imageLike || buttonLike || shapeLike;
  const freeMode = editorConstraints?.mode !== "guided";
  const colorable = !imageLike && (node.type === "slot" || node.elementType !== "spacer");
  const elementConstraints = editorConstraints?.mode === "guided" ? node.constraints : undefined;

  const css = {
    "--element-color": colorValue(style.color),
    "--element-background": colorValue(style.backgroundColor),
    "--element-font-size": fontSizeValue(style),
    "--element-radius": radiusValue(style.radius),
    "--shape-stroke-width": String(style.strokeWidth ?? 0),
    "--image-height": style.heightPx !== undefined ? `${style.heightPx}px` : undefined,
    width: widthValue(style),
    height: heightResizable && style.heightPx !== undefined ? `${style.heightPx}px` : undefined,
    textAlign: style.align,
    transform: `translate(${style.offsetX ?? 0}px, ${style.offsetY ?? 0}px) rotate(${style.rotation ?? 0}deg)`,
    zIndex: style.zIndex,
    ...placementStyle(style.placement),
  } as CSSProperties;

  const foreground = resolvedColor(style.color, brand, brand?.textColor);
  const background = buttonLike
    ? resolvedColor(style.backgroundColor, brand, brand?.accentColor)
    : resolvedColor(style.backgroundColor, brand, sectionBackground ?? brand?.backgroundColor);
  const ratio = foreground && background ? contrastRatio(foreground, background) : null;
  const largeText = textLike && numericFontSize(style) >= 24;
  const goodThreshold = textLike ? (largeText ? 3 : 4.5) : 3;
  const excellentThreshold = textLike ? (largeText ? 4.5 : 7) : 4.5;
  const readabilityPass = ratio === null || ratio >= goodThreshold;
  const readabilityExcellent = ratio !== null && ratio >= excellentThreshold;

  useLayoutEffect(() => {
    const shell = shellRef.current;
    let frame = 0;

    const updatePreview = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!imageLike) {
          setFramePreviewUrl(null);
          return;
        }
        const image = shell?.querySelector<HTMLImageElement>("img");
        setFramePreviewUrl(image?.currentSrc || image?.src || null);
      });
    };

    updatePreview();
    if (!shell || !imageLike) {
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const observer = new MutationObserver(updatePreview);
    observer.observe(shell, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [imageLike]);

  useLayoutEffect(() => {
    if (!selected || !editable) return;
    const element = shellRef.current;
    if (!element) return;
    let frame = 0;
    const position = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (element.dataset.resizing === "true" || element.dataset.dragging === "true") {
          setToolbarPosition(null);
          return;
        }
        const rect = element.getBoundingClientRect();
        const estimatedPanelHeight = openPanel === "frame" ? 360 : openPanel === "color" ? 300 : openPanel ? 250 : 0;
        const toolbarWidth = imageLike ? 520 : 470;
        const roomAbove = rect.top - 16;
        const roomBelow = window.innerHeight - rect.bottom - 16;
        const preferAbove = roomAbove >= 58 + estimatedPanelHeight || roomAbove > roomBelow;
        const top = preferAbove ? Math.max(10, rect.top - 54) : Math.min(window.innerHeight - 54, rect.bottom + 10);
        const centeredLeft = rect.left + rect.width / 2 - toolbarWidth / 2;
        const left = clamp(centeredLeft, 12, Math.max(12, window.innerWidth - toolbarWidth - 12));
        setToolbarPlacement(preferAbove ? "above" : "below");
        setToolbarPosition({ top, left });
      });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(element);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [editable, imageLike, openPanel, selected, style.fontSize, style.heightPx, style.offsetX, style.offsetY, style.widthPercent]);

  function safeAreaFor(element: HTMLElement): DOMRect | null {
    const frame = element.closest<HTMLElement>("[data-section-id]");
    if (!frame) return null;
    const semanticSection = frame.querySelector<HTMLElement>("section, footer");
    const inner = semanticSection?.firstElementChild;
    if (inner instanceof HTMLElement && inner.contains(element)) return inner.getBoundingClientRect();
    if (semanticSection?.contains(element)) return semanticSection.getBoundingClientRect();
    return frame.getBoundingClientRect();
  }

  function snapMove(element: HTMLElement, rect: DOMRect, dx: number, dy: number, disabled: boolean): { dx: number; dy: number; guides: CanvasGuides } {
    if (disabled) return { dx, dy, guides: {} };
    const safe = safeAreaFor(element);
    if (!safe) return { dx, dy, guides: {} };

    const threshold = 7;
    const verticalTargets = [safe.left, safe.left + safe.width / 2, safe.right];
    const horizontalTargets = [safe.top, safe.top + safe.height / 2, safe.bottom];
    const section = element.closest<HTMLElement>("[data-section-id]");
    section?.querySelectorAll<HTMLElement>("[data-element-shell='true']").forEach((candidate) => {
      if (candidate === element || candidate.dataset.hidden === "true") return;
      const candidateRect = candidate.getBoundingClientRect();
      verticalTargets.push(candidateRect.left, candidateRect.left + candidateRect.width / 2, candidateRect.right);
      horizontalTargets.push(candidateRect.top, candidateRect.top + candidateRect.height / 2, candidateRect.bottom);
    });

    const projectedX = [rect.left + dx, rect.left + rect.width / 2 + dx, rect.right + dx];
    const projectedY = [rect.top + dy, rect.top + rect.height / 2 + dy, rect.bottom + dy];
    let bestX: { distance: number; adjustment: number; line: number } | null = null;
    let bestY: { distance: number; adjustment: number; line: number } | null = null;

    for (const line of verticalTargets) {
      for (const point of projectedX) {
        const adjustment = line - point;
        const distance = Math.abs(adjustment);
        if (distance <= threshold && (!bestX || distance < bestX.distance)) bestX = { distance, adjustment, line };
      }
    }
    for (const line of horizontalTargets) {
      for (const point of projectedY) {
        const adjustment = line - point;
        const distance = Math.abs(adjustment);
        if (distance <= threshold && (!bestY || distance < bestY.distance)) bestY = { distance, adjustment, line };
      }
    }

    return {
      dx: dx + (bestX?.adjustment ?? 0),
      dy: dy + (bestY?.adjustment ?? 0),
      guides: { vertical: bestX?.line, horizontal: bestY?.line },
    };
  }

  function togglePanel(panel: Exclude<ToolbarPanel, null>): void {
    const next = openPanel === panel ? null : panel;
    setOpenPanel(next);
    setCropMode(panel === "image" && next === "image");
  }

  function beginDirectCanvasMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!editable || !onStyleChange || locked || event.button !== 0) return;

    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    onSelect?.(additive);
    if (additive) return;

    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true'], [data-no-canvas-drag='true']")) return;
    if (!buttonLike && target.closest("button")) return;
    // While Enquadrar is open, dragging the photo adjusts its crop instead of moving the element.
    if (imageLike && cropMode) return;

    const shell = shellRef.current;
    if (!shell) return;
    try {
      shell.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners below keep the drag alive if pointer capture is unavailable.
    }

    // ImageMedia also listens for pointer events. In normal mode the canvas owns the drag.
    if (imageLike) event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const baseX = style.offsetX ?? 0;
    const baseY = style.offsetY ?? 0;
    const initialRect = shell.getBoundingClientRect();
    const safe = safeAreaFor(shell);
    const groupShells = style.groupId
      ? Array.from(document.querySelectorAll<HTMLElement>(`[data-group-id="${CSS.escape(style.groupId)}"]`))
      : [];
    const moveIds = groupShells.length > 1
      ? groupShells.map((candidate) => candidate.dataset.congNodeId).filter((id): id is string => Boolean(id))
      : selectedIds.length > 1
        ? selectedIds
        : node.id
          ? [node.id]
          : [];
    const multiShells = moveIds.length > 1
      ? moveIds
          .filter((id) => id !== node.id)
          .map((id) => document.querySelector<HTMLElement>(`[data-cong-node-id="${CSS.escape(id)}"]`))
          .filter((candidate): candidate is HTMLElement => Boolean(candidate))
          .map((candidate) => ({
            element: candidate,
            offsetX: Number(candidate.dataset.offsetX ?? 0),
            offsetY: Number(candidate.dataset.offsetY ?? 0),
            rotation: Number(candidate.dataset.rotation ?? 0),
          }))
      : [];
    let nextX = baseX;
    let nextY = baseY;
    let active = false;
    let lastOutside = outsideSafeArea;
    let lastGuideX: number | undefined;
    let lastGuideY: number | undefined;

    const onPointerMove = (pointerEvent: PointerEvent) => {
      const dx = pointerEvent.clientX - startX;
      const dy = pointerEvent.clientY - startY;

      if (!active) {
        if (Math.hypot(dx, dy) < 4) return;
        active = true;
        document.getSelection()?.removeAllRanges();
        if (document.activeElement instanceof HTMLElement && shell.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        shell.dataset.dragging = "true";
        setToolbarPosition(null);
      }

      pointerEvent.preventDefault();
      const snapped = snapMove(shell, initialRect, dx, dy, pointerEvent.altKey);
      nextX = clamp(Math.round(baseX + snapped.dx), -1200, 1200);
      nextY = clamp(Math.round(baseY + snapped.dy), -1200, 1200);
      shell.style.transform = `translate(${nextX}px, ${nextY}px) rotate(${style.rotation ?? 0}deg)`;
      if (multiShells.length > 0) {
        const moveX = nextX - baseX;
        const moveY = nextY - baseY;
        for (const item of multiShells) {
          item.element.style.transform = `translate(${item.offsetX + moveX}px, ${item.offsetY + moveY}px) rotate(${item.rotation}deg)`;
        }
      }
      if (snapped.guides.vertical !== lastGuideX || snapped.guides.horizontal !== lastGuideY) {
        lastGuideX = snapped.guides.vertical;
        lastGuideY = snapped.guides.horizontal;
        setGuides(snapped.guides);
      }

      if (safe) {
        const projected = {
          left: initialRect.left + snapped.dx,
          right: initialRect.right + snapped.dx,
          top: initialRect.top + snapped.dy,
          bottom: initialRect.bottom + snapped.dy,
        };
        const pad = 8;
        const isOutside = projected.left < safe.left - pad || projected.right > safe.right + pad || projected.top < safe.top - pad || projected.bottom > safe.bottom + pad;
        if (isOutside !== lastOutside) {
          lastOutside = isOutside;
          setOutsideSafeArea(isOutside);
        }
      }
    };

    const stop = () => {
      if (active) {
        const deltaX = nextX - baseX;
        const deltaY = nextY - baseY;
        if (moveIds.length > 1 && onMoveCommit) onMoveCommit(deltaX, deltaY, moveIds);
        else onStyleChange({ offsetX: nextX, offsetY: nextY });
      }
      setGuides({});
      delete shell.dataset.dragging;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, edge: ResizeEdge): void {
    if (!onStyleChange || locked) return;
    event.preventDefault();
    event.stopPropagation();

    const shell = shellRef.current;
    if (!shell) return;

    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    try {
      handle.setPointerCapture(pointerId);
    } catch {
      // Window listeners below still keep the interaction alive when capture is unavailable.
    }

    const shellRect = shell.getBoundingClientRect();
    const imageFrame = imageLike
      ? shell.querySelector<HTMLElement>("[data-frame]")
      : null;
    const imageFrameRect = imageFrame?.getBoundingClientRect();

    // The percentage basis is not necessarily parentElement.width. Grid items
    // resolve percentages against their grid area, not against the full grid.
    // Measuring/deriving that basis prevents the frame from snapping back when
    // the gesture is committed.
    const widthBasisPx = percentageWidthBasis(shell, style);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidthPx = shellRect.width;
    const startHeightPx = imageLike
      ? Math.max(style.heightPx ?? imageFrameRect?.height ?? shellRect.height, 1)
      : shellRect.height;
    const baseOffsetX = style.offsetX ?? 0;
    const baseOffsetY = style.offsetY ?? 0;

    const constraintMinPercent = elementConstraints?.minWidthPercent ?? editorConstraints?.minWidthPercent;
    const constraintMaxPercent = elementConstraints?.maxWidthPercent ?? editorConstraints?.maxWidthPercent;
    const fallbackMinPercent = textBoxLike ? 8 : imageLike ? 8 : 4;
    const absoluteMaxPercent = freeMode ? 240 : 100;
    const minPercent = clamp(constraintMinPercent ?? fallbackMinPercent, 1, absoluteMaxPercent);
    const maxPercent = clamp(constraintMaxPercent ?? absoluteMaxPercent, minPercent, absoluteMaxPercent);

    const geometryMinWidth = textBoxLike
      ? Math.max(72, numericFontSize(style) * 2.5)
      : imageLike
        ? 96
        : 48;
    const minWidthPx = Math.min(
      widthBasisPx * (maxPercent / 100),
      Math.max(geometryMinWidth, widthBasisPx * (minPercent / 100)),
    );
    const maxWidthPx = Math.max(minWidthPx, widthBasisPx * (maxPercent / 100));
    const defaultMinHeight = imageLike ? 80 : buttonLike ? 32 : shapeLike ? 24 : 1;
    const defaultMaxHeight = imageLike ? 1400 : buttonLike ? 420 : shapeLike ? 1200 : Math.max(startHeightPx, 1);
    const minHeightPx = heightResizable ? (elementConstraints?.minHeightPx ?? defaultMinHeight) : 1;
    const maxHeightPx = heightResizable
      ? Math.max(minHeightPx, elementConstraints?.maxHeightPx ?? defaultMaxHeight)
      : Math.max(startHeightPx, 1);

    let nextWidthPx = clamp(startWidthPx, minWidthPx, maxWidthPx);
    let nextHeightPx = clamp(startHeightPx, minHeightPx, maxHeightPx);
    let nextOffsetX = baseOffsetX;
    let nextOffsetY = baseOffsetY;

    const horizontalEdge = edge.includes("left") || edge.includes("right");
    const verticalEdge = edge.includes("top") || edge.includes("bottom");
    const cornerEdge = horizontalEdge && verticalEdge;
    const leftEdge = edge.includes("left");
    const topEdge = edge.includes("top");

    shell.dataset.resizing = "true";
    shell.dataset.resizeMode = cornerEdge ? "corner" : horizontalEdge ? "width" : "height";
    if (imageLike && verticalEdge) shell.dataset.customHeight = "true";
    setToolbarPosition(null);

    const onPointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      pointerEvent.preventDefault();
      const deltaX = pointerEvent.clientX - startX;
      const deltaY = pointerEvent.clientY - startY;

      let requestedWidth = startWidthPx;
      let requestedHeight = startHeightPx;

      if (horizontalEdge) {
        requestedWidth = leftEdge
          ? startWidthPx - deltaX
          : startWidthPx + deltaX;
      }
      if (verticalEdge && heightResizable) {
        requestedHeight = topEdge
          ? startHeightPx - deltaY
          : startHeightPx + deltaY;
      }

      if (imageLike && cornerEdge && !pointerEvent.shiftKey) {
        // Corner handles scale the frame proportionally, like a free image in Canva.
        const scaleFromWidth = requestedWidth / Math.max(startWidthPx, 1);
        const scaleFromHeight = requestedHeight / Math.max(startHeightPx, 1);
        const requestedScale = Math.abs(scaleFromWidth - 1) >= Math.abs(scaleFromHeight - 1)
          ? scaleFromWidth
          : scaleFromHeight;
        const minScale = Math.max(
          minWidthPx / Math.max(startWidthPx, 1),
          minHeightPx / Math.max(startHeightPx, 1),
        );
        const maxScale = Math.min(
          maxWidthPx / Math.max(startWidthPx, 1),
          maxHeightPx / Math.max(startHeightPx, 1),
        );
        const scale = clamp(requestedScale, minScale, maxScale);
        nextWidthPx = startWidthPx * scale;
        nextHeightPx = startHeightPx * scale;
      } else {
        if (horizontalEdge) {
          nextWidthPx = clamp(requestedWidth, minWidthPx, maxWidthPx);
        }
        if (verticalEdge && heightResizable) {
          nextHeightPx = clamp(requestedHeight, minHeightPx, maxHeightPx);
        }
      }

      // Side handles reshape the frame rather than scaling the whole photo.
      // Freeze the opposite edge while the frame grows/shrinks.
      nextOffsetX = leftEdge
        ? Math.round(baseOffsetX + (startWidthPx - nextWidthPx))
        : baseOffsetX;
      // Top/bottom frame handles reshape the crop box without moving the media
      // element itself. Corner handles may still preserve the opposite corner.
      nextOffsetY = heightResizable && topEdge
        ? Math.round(baseOffsetY + (startHeightPx - nextHeightPx))
        : baseOffsetY;

      if (horizontalEdge) {
        shell.style.width = `${Math.round(nextWidthPx)}px`;
      }
      if (leftEdge || (topEdge && heightResizable)) {
        shell.style.transform = `translate(${nextOffsetX}px, ${nextOffsetY}px) rotate(${style.rotation ?? 0}deg)`;
      }
      if (heightResizable && verticalEdge) {
        shell.style.height = `${Math.round(nextHeightPx)}px`;
      }
      if (imageFrame && imageLike) {
        // Drive the actual media frame directly during the gesture. Some visual
        // presets declare their own min-height/aspect ratio, so changing only a
        // parent variable can look like the section is resizing instead of the photo.
        const liveHeight = cornerEdge ? nextHeightPx : verticalEdge ? nextHeightPx : startHeightPx;
        imageFrame.style.setProperty("--image-height", `${Math.round(liveHeight)}px`);
        if (verticalEdge) imageFrame.style.setProperty("height", `${Math.round(liveHeight)}px`, "important");
      }
    };

    const stop = (pointerEvent?: PointerEvent) => {
      if (pointerEvent && pointerEvent.pointerId !== pointerId) return;

      const patch: Partial<InstitutionalElementStyle> = {};

      if (horizontalEdge) {
        const widthPercent = Math.round(
          clamp((nextWidthPx / widthBasisPx) * 100, minPercent, maxPercent) * 100,
        ) / 100;
        patch.widthPercent = widthPercent;
        patch.width = undefined;
        // Keep the final visual state stable until React receives the committed
        // style. This also makes the gesture deterministic in grid columns.
        shell.style.width = `${widthPercent}%`;
      }
      if (leftEdge) patch.offsetX = nextOffsetX;

      if (imageLike) {
        if (cornerEdge) {
          patch.heightPx = Math.round(nextHeightPx);
        } else if (horizontalEdge) {
          // Side handles are frame-only: preserve height and allow a custom ratio.
          patch.heightPx = Math.round(startHeightPx);
          patch.imageAspect = "auto";
        } else if (verticalEdge) {
          patch.heightPx = Math.round(nextHeightPx);
          patch.imageAspect = "auto";
        }
      } else if (heightResizable && verticalEdge) {
        patch.heightPx = Math.round(nextHeightPx);
      }
      if (topEdge && heightResizable) patch.offsetY = nextOffsetY;

      onStyleChange(patch);
      if (imageFrame && verticalEdge) {
        // Keep the final frame stable until React commits heightPx, then release
        // the temporary hard height so aspect presets can work again later.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => imageFrame.style.removeProperty("height"));
        });
      }
      if (heightResizable && verticalEdge) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => shell.style.removeProperty("height"));
        });
      }
      delete shell.dataset.resizing;
      delete shell.dataset.resizeMode;

      try {
        if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      } catch {
        // Pointer capture may already have ended naturally.
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function alignInsideSection(horizontal: "left" | "center" | "right", vertical: "top" | "center" | "bottom"): void {
    if (!onStyleChange) return;
    const shell = shellRef.current;
    if (!shell) return;
    const safe = safeAreaFor(shell);
    if (!safe) return;
    const rect = shell.getBoundingClientRect();
    const inset = 18;
    const targetLeft = horizontal === "left"
      ? safe.left + inset
      : horizontal === "right"
        ? safe.right - inset - rect.width
        : safe.left + (safe.width - rect.width) / 2;
    const targetTop = vertical === "top"
      ? safe.top + inset
      : vertical === "bottom"
        ? safe.bottom - inset - rect.height
        : safe.top + (safe.height - rect.height) / 2;
    const nextX = Math.round((style.offsetX ?? 0) + (targetLeft - rect.left));
    const nextY = Math.round((style.offsetY ?? 0) + (targetTop - rect.top));
    onStyleChange({ offsetX: clamp(nextX, -1200, 1200), offsetY: clamp(nextY, -1200, 1200) });
  }

  function selectLayerBelow(): void {
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const section = shell.closest<HTMLElement>("[data-section-id]");
    const shells = document.elementsFromPoint(centerX, centerY)
      .map((element) => element.closest<HTMLElement>("[data-element-shell='true']"))
      .filter((candidate): candidate is HTMLElement => Boolean(candidate && candidate !== shell && (!section || candidate.closest("[data-section-id]") === section)));
    const unique = [...new Set(shells)];
    const next = unique[0];
    if (!next) return;
    next.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: centerX, clientY: centerY }));
    setOpenPanel(null);
    setCropMode(false);
  }

  const panelButton = (panel: Exclude<ToolbarPanel, null>, label: string, icon: ReactNode) => (
    <button type="button" className={styles.contextButton} data-active={openPanel === panel} onClick={() => togglePanel(panel)}>
      {icon}<span>{label}</span><FiChevronDown className={styles.chevron} />
    </button>
  );

  const toolbar = editable && selected && toolbarPosition && typeof document !== "undefined"
    ? createPortal(
        <div
          className={`${styles.elementToolbarPortal} ${imageLike ? styles.elementToolbarMedia : ""}`}
          style={{
            top: toolbarPosition.top, left: toolbarPosition.left,
            "--org-text": brand?.textColor, "--org-primary": brand?.primaryColor,
            "--org-secondary": brand?.secondaryColor, "--org-accent": brand?.accentColor,
            "--org-background": brand?.backgroundColor,
          } as CSSProperties}
          data-popover-direction={toolbarPlacement}
          onClick={(event) => event.stopPropagation()}
        >
          {textLike && onStyleChange ? (
            <>
              {panelButton("size", `${numericFontSize(style)} px`, <FiType />)}
              {panelButton("align", "Alinhar", style.align === "center" ? <FiAlignCenter /> : style.align === "right" ? <FiAlignRight /> : style.align === "justify" ? <FiAlignJustify /> : <FiAlignLeft />)}
            </>
          ) : null}

          {imageLike && onStyleChange ? (
            <>
              {panelButton("image", "Ajustar foto", <FiImage />)}
              {panelButton("frame", "Moldura", <FiMaximize2 />)}
            </>
          ) : null}

          {onStyleChange && colorable ? panelButton("color", "Cor", <span className={styles.colorSpectrumIcon} aria-hidden="true" />) : null}
          {imageLike && onStyleChange ? panelButton("overlay", "Efeito", <FiDroplet />) : null}
          {onStyleChange ? panelButton("position", "Posição", <FiMaximize2 />) : null}

          {ratio !== null && colorable && !readabilityPass ? (
            <button
              type="button"
              className={styles.readabilityDot}
              data-pass="false"
              onClick={() => { setCropMode(false); setOpenPanel(openPanel === "readability" ? null : "readability"); }}
              title="A leitura pode melhorar"
              aria-label="Sugestão para melhorar a leitura"
            ><FiAlertTriangle /></button>
          ) : null}

          {(onStyleChange || removable) ? (
            <button type="button" className={styles.moreButton} data-active={openPanel === "more"} onClick={() => { setCropMode(false); setOpenPanel(openPanel === "more" ? null : "more"); }} aria-label="Mais opções" title="Mais opções"><FiMoreHorizontal /></button>
          ) : null}

          {openPanel ? (
            <div className={styles.contextPopover} data-panel={openPanel}>
              {openPanel === "size" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Tamanho do texto</strong><span>Escolha um tamanho ou ajuste livremente.</span></div>
                  <div className={styles.sizePresets}>{[14, 18, 24, 32, 48, 64].map((size) => <button type="button" key={size} data-active={numericFontSize(style) === size} onClick={() => onStyleChange({ fontSize: size })}>{size}</button>)}</div>
                  <label className={styles.visualRange}><span>Menor</span><input type="range" min="10" max="96" step="1" value={numericFontSize(style)} onChange={(event) => onStyleChange({ fontSize: Number(event.target.value) })} /><span>Maior</span></label>
                </>
              ) : null}

              {openPanel === "align" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Alinhamento do texto</strong><span>Use o padrão que combina com a composição.</span></div>
                  <div className={styles.iconChoiceGrid}>
                    {([
                      ["left", "Esquerda", <FiAlignLeft key="left" />],
                      ["center", "Centro", <FiAlignCenter key="center" />],
                      ["right", "Direita", <FiAlignRight key="right" />],
                      ["justify", "Justificar", <FiAlignJustify key="justify" />],
                    ] as const).map(([value, label, icon]) => <button type="button" key={value} data-active={(style.align ?? "left") === value} onClick={() => onStyleChange({ align: value })}>{icon}<span>{label}</span></button>)}
                  </div>
                </>
              ) : null}

              {openPanel === "position" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Posição</strong><span>Alinhe sem precisar acertar no olho.</span></div>
                  <div className={styles.positionAnchorGrid} aria-label="Alinhar elemento na seção">
                    {([
                      ["left", "top", "Canto superior esquerdo"], ["center", "top", "Centro superior"], ["right", "top", "Canto superior direito"],
                      ["left", "center", "Centro esquerdo"], ["center", "center", "Centro da seção"], ["right", "center", "Centro direito"],
                      ["left", "bottom", "Canto inferior esquerdo"], ["center", "bottom", "Centro inferior"], ["right", "bottom", "Canto inferior direito"],
                    ] as const).map(([horizontal, vertical, label]) => (
                      <button type="button" key={`${horizontal}-${vertical}`} onClick={() => alignInsideSection(horizontal, vertical)} title={label} aria-label={label}>
                        <span className={styles.anchorGlyph} data-x={horizontal} data-y={vertical}><i /></span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className={styles.resetPosition} onClick={() => onStyleChange({ offsetX: 0, offsetY: 0, rotation: 0 })}><FiRotateCcw /> Voltar para a posição original</button>
                </>
              ) : null}

              {openPanel === "color" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Cor</strong><span>As primeiras são sugestões da identidade visual.</span></div>
                  <div className={styles.paletteGrid}>
                    {(["text", "primary", "secondary", "accent", "background"] as const).map((color) => <button type="button" key={color} className={styles.paletteColor} data-color={color} data-active={(buttonLike ? style.backgroundColor : style.color) === color} onClick={() => onStyleChange(buttonLike ? { backgroundColor: color } : { color })}><span /><small>{color === "text" ? "Texto" : color === "primary" ? "Principal" : color === "secondary" ? "Secundária" : color === "accent" ? "Destaque" : "Fundo"}</small></button>)}
                    {["#091c30", "#1366c4", "#6f35c5", "#f6c445", "#f06b61", "#2f9d78", "#ffffff", "#f4f6fa"].map((hex) => (
                      <button type="button" key={hex} className={styles.paletteColor} data-active={(buttonLike ? style.backgroundColor : style.color) === hex} onClick={() => onStyleChange(buttonLike ? { backgroundColor: hex as `#${string}` } : { color: hex as `#${string}` })}><span style={{ background: hex }} /><small>{hex.toUpperCase()}</small></button>
                    ))}
                  </div>
                  <div className={styles.advancedColorRow}>
                    <span>Outra cor</span>
                    <ColorPickerControl
                      value={
                        resolvedColor(
                          buttonLike ? style.backgroundColor : style.color,
                          brand,
                          buttonLike ? brand?.accentColor : brand?.textColor,
                        ) ?? "#1366C4"
                      }
                      onChange={(hex) => onStyleChange(buttonLike ? { backgroundColor: hex } : { color: hex })}
                      label={buttonLike ? "Fundo do botão" : "Cor do elemento"}
                    />
                  </div>
                </>
              ) : null}

              {openPanel === "image" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Ajustar foto</strong><span>Arraste somente a foto dentro da moldura. O tamanho e a posição do elemento ficam parados.</span></div>
                  <button type="button" className={styles.cropDoneButton} onClick={() => { setCropMode(false); setOpenPanel(null); }}><FiCheck /> Concluir ajuste</button>
                  <div className={styles.fitChoices}>
                    <button type="button" data-active={(style.imageFit ?? "cover") === "cover"} onClick={() => onStyleChange({ imageFit: "cover" })}><span data-fit="cover"><i /></span><strong>Preencher moldura</strong><small>Ocupa todo o espaço</small></button>
                    <button type="button" data-active={style.imageFit === "contain"} onClick={() => onStyleChange({ imageFit: "contain" })}><span data-fit="contain"><i /></span><strong>Mostrar inteira</strong><small>Sem cortar a foto</small></button>
                  </div>
                  <label className={styles.visualRange}><span>Mais longe</span><input type="range" min="1" max="3" step="0.02" value={style.imageZoom ?? 1} onChange={(event) => onStyleChange({ imageZoom: Number(event.target.value) })} /><span>Mais perto</span></label>
                  <button type="button" className={styles.resetPosition} onClick={() => onStyleChange({ imageZoom: 1, focalX: 50, focalY: 50, rotation: 0 })}><FiRotateCcw /> Centralizar foto</button>
                </>
              ) : null}

              {openPanel === "frame" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Moldura</strong><span>Escolha pela aparência, não pelo nome técnico.</span></div>
                  <div className={styles.frameChoiceGrid}>
                    {frameOptions.map((frame) => (
                      <button type="button" key={frame.id} data-active={(style.imageFrame ?? "rounded") === frame.id && !style.imageClipPath} onClick={() => onStyleChange({ imageFrame: frame.id, imageClipPath: undefined, imageFrameLabel: undefined })}>
                        <span
                          data-frame={frame.id}
                          data-has-image={Boolean(framePreviewUrl)}
                          style={framePreviewUrl ? { backgroundImage: `url(${JSON.stringify(framePreviewUrl)})` } : undefined}
                        />
                        <small>{frame.label}</small>
                      </button>
                    ))}
                    {frames.filter((frame) => frame.status === "published").map((frame) => (
                      <button
                        type="button"
                        key={frame.id}
                        data-active={style.imageFrame === "custom" && style.imageClipPath === frame.clipPath}
                        onClick={() => onStyleChange({ imageFrame: "custom", imageClipPath: frame.clipPath, imageFrameLabel: frame.name })}
                      >
                        <span
                          data-has-image={Boolean(framePreviewUrl)}
                          style={{
                            clipPath: frame.clipPath,
                            ...(framePreviewUrl ? { backgroundImage: `url(${JSON.stringify(framePreviewUrl)})` } : {}),
                          }}
                        />
                        <small>{frame.name}</small>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {openPanel === "overlay" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Tratamento da imagem</strong><span>Ajuda o conteúdo a aparecer melhor sobre a foto.</span></div>
                  <div className={styles.treatmentChoices}>
                    {[
                      [0, "Original"],
                      [0.18, "Suave"],
                      [0.36, "Destacar conteúdo"],
                      [0.55, "Mais contraste"],
                    ].map(([opacity, label]) => <button type="button" key={label} data-active={Math.abs((style.overlayOpacity ?? 0) - Number(opacity)) < 0.02} onClick={() => onStyleChange({ overlayOpacity: Number(opacity), overlayColor: "text" })}><span style={{ "--treatment-opacity": opacity } as CSSProperties} /><small>{label}</small></button>)}
                  </div>
                </>
              ) : null}

              {openPanel === "readability" && ratio !== null && onStyleChange ? (
                <div className={styles.readabilityPanel} data-pass={readabilityPass}>
                  <div className={styles.readabilityIcon}>{readabilityPass ? <FiCheck /> : <FiAlertTriangle />}</div>
                  <div><strong>{readabilityExcellent ? "Leitura muito boa" : readabilityPass ? "Boa leitura" : "Pode ficar difícil de ler"}</strong><span>{readabilityPass ? "O contraste está confortável para a maioria das pessoas." : "A cor atual se mistura com o fundo. Podemos melhorar sem mudar o conteúdo."}</span></div>
                  {!readabilityPass && background ? <button type="button" onClick={() => onStyleChange({ color: bestReadableColor(background, brand) })}>Melhorar automaticamente</button> : null}
                </div>
              ) : null}

              {openPanel === "more" ? (
                <div className={styles.moreMenu}>
                  {onStyleChange ? (
                    <>
                      <button type="button" onClick={selectLayerBelow}><FiLayers /> Selecionar camada abaixo</button>
                      <button type="button" onClick={() => onStyleChange({ zIndex: 50 })}><FiLayers /> Trazer para frente</button>
                      <button type="button" onClick={() => onStyleChange({ zIndex: -20 })}><FiLayers /> Enviar para trás</button>
                      {(style.zIndex ?? 0) !== 0 ? <button type="button" onClick={() => onStyleChange({ zIndex: 0 })}><FiRotateCcw /> Restaurar camada</button> : null}
                    </>
                  ) : null}
                  {removable && onRemove ? <button type="button" className={styles.dangerMenuItem} onClick={onRemove}><FiTrash2 /> Excluir elemento</button> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;


  const guideOverlay = editable && selected && (guides.vertical !== undefined || guides.horizontal !== undefined) && typeof document !== "undefined"
    ? createPortal(
        <>
          {guides.vertical !== undefined ? <span className={styles.smartGuideVertical} style={{ left: guides.vertical }} aria-hidden="true" /> : null}
          {guides.horizontal !== undefined ? <span className={styles.smartGuideHorizontal} style={{ top: guides.horizontal }} aria-hidden="true" /> : null}
        </>,
        document.body,
      )
    : null;

  return (
    <div
      ref={shellRef}
      className={styles.elementShell}
      data-selected={selected || multiSelected}
      data-primary-selected={selected}
      data-element-shell="true"
      data-cong-node-id={node.id ?? undefined}
      data-offset-x={style.offsetX ?? 0}
      data-offset-y={style.offsetY ?? 0}
      data-rotation={style.rotation ?? 0}
      data-group-id={style.groupId ?? undefined}
      data-editable={editable}
      data-image-element={imageLike}
      data-button-element={buttonLike}
      data-shape-element={shapeLike}
      data-free-mode={freeMode}
      data-custom-height={heightResizable && style.heightPx !== undefined}
      data-text-box={textBoxLike}
      data-explicit-width={explicitWidth}
      data-locked={locked}
      data-hidden={Boolean(style.hidden)}
      data-crop-mode={selected && cropMode}
      data-custom-font-size={style.fontSize !== undefined}
      style={css}
      onPointerDownCapture={beginDirectCanvasMove}
      onDoubleClick={(event) => {
        if (!editable || !imageLike || !onStyleChange) return;
        event.stopPropagation();
        setCropMode(true);
        setOpenPanel("image");
      }}
      onClick={(event) => {
        if (!editable) return;
        event.stopPropagation();
        if (!selected) {
          setOpenPanel(null);
          setCropMode(false);
        }
        onSelect?.(event.shiftKey || event.ctrlKey || event.metaKey);
      }}
    >
      {toolbar}
      {guideOverlay}
      {editable && selected && outsideSafeArea ? <div className={styles.safeAreaWarning}><FiAlertTriangle /><span><strong>Fora da área recomendada</strong><small>Pode ficar cortado em telas menores.</small></span><button type="button" onClick={(event) => { event.stopPropagation(); onStyleChange?.({ offsetX: 0, offsetY: 0 }); setOutsideSafeArea(false); }}>Corrigir</button></div> : null}
      {children}
      {editable && selected && onStyleChange && !locked ? (
        <>
          <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="left" onPointerDown={(event) => beginResize(event, "left")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pela esquerda" title={imageLike ? "Altere a largura da moldura" : "Arraste para redimensionar"} />
          <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="right" onPointerDown={(event) => beginResize(event, "right")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pela direita" title={imageLike ? "Altere a largura da moldura" : "Arraste para redimensionar"} />
          {heightResizable ? (
            <>
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="top" onPointerDown={(event) => beginResize(event, "top")} onClick={(event) => event.stopPropagation()} aria-label="Alterar altura pelo topo" title={imageLike ? "Altere a altura da moldura" : "Alterar altura"} />
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="bottom" onPointerDown={(event) => beginResize(event, "bottom")} onClick={(event) => event.stopPropagation()} aria-label="Alterar altura pela base" title={imageLike ? "Altere a altura da moldura" : "Alterar altura"} />
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="top-left" onPointerDown={(event) => beginResize(event, "top-left")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pelo canto superior esquerdo" title={imageLike ? "Redimensione proporcionalmente. Segure Shift para liberar a proporção." : "Redimensionar largura e altura"} />
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="top-right" onPointerDown={(event) => beginResize(event, "top-right")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pelo canto superior direito" title={imageLike ? "Redimensione proporcionalmente. Segure Shift para liberar a proporção." : "Redimensionar largura e altura"} />
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="bottom-left" onPointerDown={(event) => beginResize(event, "bottom-left")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pelo canto inferior esquerdo" title={imageLike ? "Redimensione proporcionalmente. Segure Shift para liberar a proporção." : "Redimensionar largura e altura"} />
              <button type="button" className={styles.resizeHandle} data-no-canvas-drag="true" data-edge="bottom-right" onPointerDown={(event) => beginResize(event, "bottom-right")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pelo canto inferior direito" title={imageLike ? "Redimensione proporcionalmente. Segure Shift para liberar a proporção." : "Redimensionar largura e altura"} />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
