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
  FiClipboard,
  FiCopy,
  FiDroplet,
  FiImage,
  FiLayers,
  FiMaximize2,
  FiMoreHorizontal,
  FiPlusSquare,
  FiRotateCcw,
  FiScissors,
  FiSquare,
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
import { contrastRatio, nearestAccessibleColor } from "../../../utils/institutionalPalette";
import { institutionalColorCssVar, resolveInstitutionalColor } from "../../../utils/institutionalColors";
import { exceedsEditorConstraints } from "../../../utils/institutionalConstraints";

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
type ToolbarPanel = "size" | "align" | "position" | "color" | "buttonShape" | "image" | "frame" | "overlay" | "more" | "readability" | null;

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

function containingBlockWidth(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return Math.max(element.getBoundingClientRect().width, 1);
  const rect = parent.getBoundingClientRect();
  const computed = window.getComputedStyle(parent);
  const padding = Number.parseFloat(computed.paddingLeft || "0") + Number.parseFloat(computed.paddingRight || "0");
  return Math.max(rect.width - padding, 1);
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

function bestReadableColor(
  background: string | undefined,
  foreground: string | undefined,
  minimumRatio = 4.5,
): `#${string}` | "text" {
  if (!background || !foreground) return "text";
  return nearestAccessibleColor(foreground, background, minimumRatio) as `#${string}`;
}

function cardMetadata(card: HTMLElement): { source: string; index: number } | null {
  const source = card.dataset.repeatSource;
  const rawIndex = card.dataset.repeatIndex;
  if (!source || rawIndex === undefined) return null;
  const index = Number(rawIndex);
  return Number.isInteger(index) && index >= 0 ? { source, index } : null;
}

function distanceFromRect(x: number, y: number, rect: DOMRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function updateCardAnchorCount(card: HTMLElement, delta: 1 | -1): void {
  const current = Number(card.dataset.anchorCount ?? 0);
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete card.dataset.anchorCount;
    delete card.dataset.hasAnchoredAction;
    return;
  }
  card.dataset.anchorCount = String(next);
  card.dataset.hasAnchoredAction = "true";
}

function nearestRepeatCard(
  shell: HTMLElement,
  sectionContent: HTMLElement,
): { card: HTMLElement; source: string; index: number; xPercent: number; yPercent: number; distance: number } | null {
  const shellRect = shell.getBoundingClientRect();
  const centerX = shellRect.left + shellRect.width / 2;
  const centerY = shellRect.top + shellRect.height / 2;
  let best: { card: HTMLElement; source: string; index: number; xPercent: number; yPercent: number; distance: number } | null = null;

  for (const card of Array.from(sectionContent.querySelectorAll<HTMLElement>('[data-surface="card"][data-repeat-source][data-repeat-index]'))) {
    const meta = cardMetadata(card);
    if (!meta) continue;
    const rect = card.getBoundingClientRect();
    const distance = distanceFromRect(centerX, centerY, rect);
    if (best && distance >= best.distance) continue;
    best = {
      card,
      ...meta,
      xPercent: clamp(((centerX - rect.left) / Math.max(rect.width, 1)) * 100, 0, 100),
      yPercent: clamp(((centerY - rect.top) / Math.max(rect.height, 1)) * 100, 0, 100),
      distance,
    };
  }

  return best;
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
  node, selectionId, selected, multiSelected = false, selectedIds = [], editable, removable, children, onSelect, onStyleChange, onMoveCommit, onRemove, onCopy, onCut, onPaste, onDuplicate, brand, sectionBackground, frames = [], editorConstraints,
}: {
  node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>;
  selectionId?: string;
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
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  brand?: InstitutionalBrand;
  sectionBackground?: string;
  frames?: InstitutionalImageFrameResource[];
  editorConstraints?: InstitutionalEditorConstraints;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [toolbarPlacement, setToolbarPlacement] = useState<"above" | "below">("above");
  const [outsideSafeArea, setOutsideSafeArea] = useState(false);
  const [openPanel, setOpenPanel] = useState<ToolbarPanel>(null);
  const [cropMode, setCropMode] = useState(false);
  const [framePreviewUrl, setFramePreviewUrl] = useState<string | null>(null);
  const [guides, setGuides] = useState<CanvasGuides>({});
  const [renderedMetrics, setRenderedMetrics] = useState<{
    fontSize: number | null;
    foreground: string | null;
    background: string | null;
    radiusPx: number | null;
  }>({ fontSize: null, foreground: null, background: null, radiusPx: null });
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
  const iconLike = node.type === "element" && node.elementType === "icon";
  const shapeKind = shapeLike && typeof node.value === "string" ? node.value : undefined;
  const heightResizable = imageLike || buttonLike || shapeLike || iconLike;
  const freeMode = editorConstraints?.mode !== "guided";
  const colorable = !imageLike && (node.type === "slot" || node.elementType !== "spacer");
  const elementConstraints = node.constraints;
  const hasAuthoredOffset = Math.abs(style.offsetX ?? 0) > 0.5 || Math.abs(style.offsetY ?? 0) > 0.5;
  const positionMode = style.positionMode ?? (hasAuthoredOffset ? "free" : "flow");

  // Copied/free actions that visually belong to a repeated card are rendered as
  // card actions, not as raw section-level pixel offsets. Existing persisted
  // anchors are honoured; legacy offset-only actions are inferred at render time
  // without mutating the saved design just by opening the editor.
  useLayoutEffect(() => {
    if (!buttonLike) return;
    const shell = shellRef.current;
    if (!shell) return;

    const ownCard = shell.closest<HTMLElement>('[data-surface="card"]');
    const sectionContent = shell.closest<HTMLElement>('[data-section-content="true"]');
    if (ownCard || !sectionContent) {
      shell.style.position = "";
      shell.style.left = "";
      shell.style.top = "";
      shell.style.marginTop = "";
      delete shell.dataset.cardAnchoredAction;
      return;
    }

    let source = style.anchorSource;
    let index = style.anchorIndex;
    let xPercent = style.anchorXPercent;

    const hasPersistedAnchor =
      style.positionMode === "anchored" &&
      source !== undefined &&
      index !== undefined;

    if (!hasPersistedAnchor) {
      if (!hasAuthoredOffset) return;
      const legacy = nearestRepeatCard(shell, sectionContent);
      if (!legacy || legacy.distance > 96) return;
      source = legacy.source;
      index = legacy.index;
      xPercent = legacy.xPercent;
    }

    if (source === undefined || index === undefined) return;
    const horizontalIntent: "left" | "center" | "right" =
      (xPercent ?? 16) < 34 ? "left" : (xPercent ?? 16) > 66 ? "right" : "center";

    let markedTarget: HTMLElement | null = null;
    const place = () => {
      if (shell.dataset.dragging === "true" || shell.dataset.resizing === "true") return;
      const target = sectionContent.querySelector<HTMLElement>(
        `[data-surface="card"][data-repeat-source="${CSS.escape(source!)}"][data-repeat-index="${index}"]`,
      );
      if (!target) {
        if (markedTarget) {
          updateCardAnchorCount(markedTarget, -1);
          markedTarget = null;
        }
        shell.style.position = "";
        shell.style.left = "";
        shell.style.top = "";
        shell.style.marginTop = "";
        delete shell.dataset.cardAnchoredAction;
        return;
      }

      if (markedTarget !== target) {
        if (markedTarget) updateCardAnchorCount(markedTarget, -1);
        markedTarget = target;
        updateCardAnchorCount(target, 1);
      }

      const contentRect = sectionContent.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const horizontalPad = Math.min(18, Math.max(10, targetRect.width * 0.06));
      const verticalPad = Math.min(18, Math.max(12, targetRect.height * 0.04));
      const available = Math.max(0, targetRect.width - shellRect.width - horizontalPad * 2);
      const localX = horizontalIntent === "left" ? 0 : horizontalIntent === "right" ? available : available / 2;
      const left = targetRect.left - contentRect.left + horizontalPad + localX;
      const top = targetRect.bottom - contentRect.top - shellRect.height - verticalPad;

      shell.style.position = "absolute";
      shell.style.left = `${Math.round(left)}px`;
      shell.style.top = `${Math.round(top)}px`;
      shell.style.marginTop = "0";
      shell.style.transform = `rotate(${style.rotation ?? 0}deg)`;
      shell.dataset.cardAnchoredAction = "true";
      shell.dataset.anchorSource = source!;
      shell.dataset.anchorIndex = String(index);
    };

    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(sectionContent);
    const target = sectionContent.querySelector<HTMLElement>(
      `[data-surface="card"][data-repeat-source="${CSS.escape(source)}"][data-repeat-index="${index}"]`,
    );
    if (target) observer.observe(target);
    return () => {
      observer.disconnect();
      if (markedTarget) updateCardAnchorCount(markedTarget, -1);
    };
  }, [
    buttonLike,
    hasAuthoredOffset,
    style.anchorIndex,
    style.anchorSource,
    style.anchorXPercent,
    style.offsetX,
    style.offsetY,
    style.positionMode,
    style.rotation,
  ]);

  // Text belongs to document flow. A vertical offset on a text box must move
  // the following content with it; using translateY would only move the pixels
  // and lets the next paragraph remain underneath, causing collisions.
  // Horizontal movement can stay transform-based because it does not affect
  // the vertical rhythm of the section. Free media/shapes keep full transform.
  const authoredOffsetX = style.offsetX ?? 0;
  const authoredOffsetY = style.offsetY ?? 0;
  const flowAwareOffsetY = textBoxLike ? authoredOffsetY : 0;
  const css = {
    "--element-color": colorValue(style.color),
    "--element-background": colorValue(style.backgroundColor),
    "--element-font-size": fontSizeValue(style),
    "--element-radius": radiusValue(style.radius),
    "--shape-stroke-width": String(style.strokeWidth ?? 0),
    "--image-height": style.heightPx !== undefined ? `${style.heightPx}px` : undefined,
    width: iconLike
      ? `${Math.max(12, Math.min(320, style.iconSizePx ?? 48))}px`
      : shapeLike && style.widthPercent === undefined && (!style.width || style.width === "auto")
        ? "120px"
        : widthValue(style),
    height: iconLike
      ? `${Math.max(12, Math.min(320, style.iconSizePx ?? 48))}px`
      : heightResizable && style.heightPx !== undefined ? `${style.heightPx}px` : undefined,
    textAlign: style.align,
    marginTop: textBoxLike && flowAwareOffsetY !== 0 ? `${flowAwareOffsetY}px` : undefined,
    transform: positionMode === "anchored"
      ? `rotate(${style.rotation ?? 0}deg)`
      : textBoxLike
        ? `translateX(${authoredOffsetX}px) rotate(${style.rotation ?? 0}deg)`
        : `translate(${authoredOffsetX}px, ${authoredOffsetY}px) rotate(${style.rotation ?? 0}deg)`,
    zIndex: style.zIndex,
    opacity: style.opacity,
    ...placementStyle(style.placement),
  } as CSSProperties;

  const semanticForeground = resolvedColor(style.color, brand, brand?.textColor);
  const semanticBackground = buttonLike
    ? resolvedColor(style.backgroundColor, brand, brand?.accentColor)
    : resolvedColor(style.backgroundColor, brand, sectionBackground ?? brand?.backgroundColor);
  const foreground = renderedMetrics.foreground ?? semanticForeground;
  const background = renderedMetrics.background ?? semanticBackground;
  const renderedFontSize = renderedMetrics.fontSize ?? numericFontSize(style);
  const renderedButtonRadius = style.radius ?? (
    renderedMetrics.radiusPx === null ? "pill" :
      renderedMetrics.radiusPx <= 1 ? "none" :
        renderedMetrics.radiusPx <= 8 ? "small" :
          renderedMetrics.radiusPx <= 15 ? "medium" :
            renderedMetrics.radiusPx <= 32 ? "large" : "pill"
  );
  const ratio = foreground && background ? contrastRatio(foreground, background) : null;
  const largeText = textLike && renderedFontSize >= 24;
  const goodThreshold = textLike ? (largeText ? 3 : 4.5) : 3;
  const excellentThreshold = textLike ? (largeText ? 4.5 : 7) : 4.5;
  const readabilityPass = ratio === null || ratio >= goodThreshold;
  const readabilityExcellent = ratio !== null && ratio >= excellentThreshold;
  const outsideRecommendation = Boolean(
    editorConstraints?.mode === "guided" &&
    exceedsEditorConstraints(style, {}, editorConstraints, elementConstraints),
  );

  useLayoutEffect(() => {
    if (!selected || !editable) return;
    const shell = shellRef.current;
    if (!shell) return;

    const parseRgb = (value: string): string | null => {
      const match = value.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i);
      if (!match) return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
      const hex = [match[1], match[2], match[3]]
        .map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, "0"))
        .join("");
      return `#${hex}`;
    };

    let frame = 0;
    const measure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const target = shell.querySelector<HTMLElement>("[data-font-target='true']") ?? shell;
        const targetStyle = window.getComputedStyle(target);
        const fontSize = Number.parseFloat(targetStyle.fontSize);
        const foregroundColor = parseRgb(targetStyle.color);
        const borderRadius = Number.parseFloat(targetStyle.borderTopLeftRadius);

        let backgroundColor: string | null = null;
        let current: HTMLElement | null = target;
        while (current) {
          const computed = window.getComputedStyle(current);
          const raw = computed.backgroundColor;
          if (raw && raw !== "transparent" && !/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(raw)) {
            backgroundColor = parseRgb(raw);
            if (backgroundColor) break;
          }
          if (current === shell.closest("[data-section-type]")) break;
          current = current.parentElement;
        }

        setRenderedMetrics((previous) => {
          const next = {
            fontSize: Number.isFinite(fontSize) ? Math.round(fontSize * 10) / 10 : null,
            foreground: foregroundColor,
            background: backgroundColor,
            radiusPx: Number.isFinite(borderRadius) ? Math.round(borderRadius * 10) / 10 : null,
          };
          return previous.fontSize === next.fontSize && previous.foreground === next.foreground && previous.background === next.background && previous.radiusPx === next.radiusPx
            ? previous
            : next;
        });
      });
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(shell);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [editable, selected, style.fontSize, style.size, style.color, style.backgroundColor, style.heightPx, style.widthPercent, brand, sectionBackground]);

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
        const viewportMargin = 12;
        const elementGap = 14;
        const toolbarRect = toolbarRef.current?.getBoundingClientRect();
        const toolbarWidth = toolbarRect?.width ?? (imageLike ? 520 : 470);
        const toolbarHeight = toolbarRect?.height ?? 44;
        const helperHeight = openPanel ? 0 : 38;
        const estimatedPanelHeight = openPanel === "frame" ? 360 : openPanel === "color" ? 300 : openPanel ? 250 : 0;
        const occupiedHeight = toolbarHeight + Math.max(helperHeight, estimatedPanelHeight);
        const roomAbove = rect.top - viewportMargin;
        const roomBelow = window.innerHeight - rect.bottom - viewportMargin;
        const preferAbove = roomAbove >= occupiedHeight + elementGap || (roomAbove > roomBelow && roomAbove >= toolbarHeight + elementGap);
        const rawTop = preferAbove
          ? rect.top - toolbarHeight - elementGap
          : rect.bottom + elementGap;
        const top = clamp(rawTop, viewportMargin, Math.max(viewportMargin, window.innerHeight - toolbarHeight - viewportMargin));
        const centeredLeft = rect.left + rect.width / 2 - toolbarWidth / 2;
        const left = clamp(centeredLeft, viewportMargin, Math.max(viewportMargin, window.innerWidth - toolbarWidth - viewportMargin));
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

  function contentBoxRect(target: HTMLElement): DOMRect {
    const rect = target.getBoundingClientRect();
    const computed = window.getComputedStyle(target);
    const left = rect.left + (Number.parseFloat(computed.paddingLeft) || 0);
    const right = rect.right - (Number.parseFloat(computed.paddingRight) || 0);
    const top = rect.top + (Number.parseFloat(computed.paddingTop) || 0);
    const bottom = rect.bottom - (Number.parseFloat(computed.paddingBottom) || 0);
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  }

  function safeAreaFor(element: HTMLElement): DOMRect | null {
    const frame = element.closest<HTMLElement>("[data-section-id]");
    if (!frame) return null;
    const semanticSection = frame.querySelector<HTMLElement>("section, footer");
    if (!semanticSection) return contentBoxRect(frame);

    const candidates = Array.from(semanticSection.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.contains(element));
    const closestContainer = candidates[0];
    if (closestContainer) return contentBoxRect(closestContainer);
    if (semanticSection.contains(element)) return contentBoxRect(semanticSection);
    return contentBoxRect(frame);
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

    const target = event.target as HTMLElement;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;

    // Texto inline continua arrastável com um clique. Só bloqueamos o drag
    // quando o usuário já entrou de fato no modo de edição por duplo clique.
    const inlineEditor = target.closest<HTMLElement>("[data-inline-text-editor='true']");
    if (inlineEditor?.dataset.editing === "true") {
      onSelect?.(additive);
      return;
    }
    if (target.closest("[data-no-canvas-drag='true']")) return;

    onSelect?.(additive);
    if (additive) return;

    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (!buttonLike && target.closest("button")) return;
    // While Enquadrar is open, dragging the photo adjusts its crop instead of moving the element.
    if (imageLike && cropMode) return;

    const shell = shellRef.current;
    if (!shell) return;

    // Do not capture the pointer on pointer-down. Capturing before the gesture
    // becomes a real drag steals the native click/double-click sequence from
    // inline text, which made text editing intermittent or impossible. Window
    // listeners already keep the drag alive; we only start moving after the
    // threshold below is crossed.

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
      ? groupShells.map((candidate) => candidate.dataset.selectionId ?? candidate.dataset.congNodeId).filter((id): id is string => Boolean(id))
      : selectedIds.length > 1
        ? selectedIds
        : node.id
          ? [node.id]
          : [];
    const multiShells = moveIds.length > 1
      ? moveIds
          .filter((id) => id !== node.id)
          .map((id) => document.querySelector<HTMLElement>(`[data-selection-id="${CSS.escape(id)}"]`))
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
      if (textBoxLike) {
        // Text participates in document flow vertically so following copy reflows.
        shell.style.marginTop = nextY === 0 ? "" : `${nextY}px`;
        shell.style.transform = `translateX(${nextX}px) rotate(${style.rotation ?? 0}deg)`;
      } else {
        // Buttons/media/shapes are visually positioned. Buttons are clamped to
        // their containing card/section below so they cannot escape or inflate
        // the section height in the published site.
        shell.style.transform = `translate(${nextX}px, ${nextY}px) rotate(${style.rotation ?? 0}deg)`;
      }
      if (multiShells.length > 0) {
        const moveX = nextX - baseX;
        const moveY = nextY - baseY;
        for (const item of multiShells) {
          const itemX = item.offsetX + moveX;
          const itemY = item.offsetY + moveY;
          if (item.element.dataset.textBox === "true") {
            item.element.style.marginTop = itemY === 0 ? "" : `${itemY}px`;
            item.element.style.transform = `translateX(${itemX}px) rotate(${item.rotation}deg)`;
          } else {
            item.element.style.transform = `translate(${itemX}px, ${itemY}px) rotate(${item.rotation}deg)`;
          }
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
        if (moveIds.length > 1 && onMoveCommit) {
          onMoveCommit(deltaX, deltaY, moveIds);
        } else {
          const sectionContent = shell.closest<HTMLElement>('[data-section-content="true"]');
          const ownCard = shell.closest<HTMLElement>('[data-surface="card"]');
          const anchor = buttonLike && !ownCard && sectionContent
            ? nearestRepeatCard(shell, sectionContent)
            : null;

          if (anchor && anchor.distance <= 96) {
            onStyleChange({
              positionMode: "anchored",
              anchorSource: anchor.source,
              anchorIndex: anchor.index,
              anchorXPercent: Math.round(anchor.xPercent * 10) / 10,
              anchorYPercent: Math.round(anchor.yPercent * 10) / 10,
              offsetX: 0,
              offsetY: 0,
              offsetReferenceWidth: undefined,
            });
          } else {
            const referenceWidth = sectionContent?.getBoundingClientRect().width;
            onStyleChange({
              offsetX: nextX,
              offsetY: nextY,
              positionMode: textBoxLike ? "flow" : "free",
              offsetReferenceWidth: referenceWidth ? Math.round(referenceWidth) : style.offsetReferenceWidth,
              anchorSource: undefined,
              anchorIndex: undefined,
              anchorXPercent: undefined,
              anchorYPercent: undefined,
            });
          }
        }
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
    const widthBasisPx = buttonLike || shapeLike ? containingBlockWidth(shell) : percentageWidthBasis(shell, style);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidthPx = shellRect.width;
    const startHeightPx = imageLike
      ? Math.max(style.heightPx ?? imageFrameRect?.height ?? shellRect.height, 1)
      : shellRect.height;
    const baseOffsetX = style.offsetX ?? 0;
    const baseOffsetY = style.offsetY ?? 0;

    const fallbackMinPercent = textBoxLike ? 8 : imageLike ? 8 : 4;
    // Guided mode is advisory: users can exceed the recommended geometry and
    // receive a warning instead of the resize gesture silently stopping.
    const absoluteMaxPercent = 240;
    const minPercent = fallbackMinPercent;
    const maxPercent = absoluteMaxPercent;

    const geometryMinWidth = textBoxLike
      ? Math.max(72, numericFontSize(style) * 2.5)
      : imageLike
        ? 96
        : iconLike
          ? 12
          : 48;
    const minWidthPx = Math.min(
      widthBasisPx * (maxPercent / 100),
      Math.max(geometryMinWidth, widthBasisPx * (minPercent / 100)),
    );
    const maxWidthPx = Math.max(minWidthPx, widthBasisPx * (maxPercent / 100));
    const defaultMinHeight = imageLike ? 80 : buttonLike ? 32 : shapeLike ? 24 : iconLike ? 12 : 1;
    const defaultMaxHeight = imageLike ? 1400 : buttonLike ? 420 : shapeLike ? 1200 : iconLike ? 320 : Math.max(startHeightPx, 1);
    const minHeightPx = heightResizable ? defaultMinHeight : 1;
    const maxHeightPx = heightResizable
      ? Math.max(minHeightPx, Math.max(defaultMaxHeight, 1600))
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

      if (iconLike) {
        const requestedSize = horizontalEdge && verticalEdge
          ? (Math.abs(requestedWidth - startWidthPx) >= Math.abs(requestedHeight - startHeightPx) ? requestedWidth : requestedHeight)
          : horizontalEdge ? requestedWidth : requestedHeight;
        const nextSize = clamp(requestedSize, 12, 320);
        nextWidthPx = nextSize;
        nextHeightPx = nextSize;
      } else if (imageLike && cornerEdge && !pointerEvent.shiftKey) {
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

      if (horizontalEdge || iconLike) {
        shell.style.width = `${Math.round(nextWidthPx)}px`;
      }
      if (leftEdge || (topEdge && heightResizable)) {
        shell.style.transform = `translate(${nextOffsetX}px, ${nextOffsetY}px) rotate(${style.rotation ?? 0}deg)`;
      }
      if (heightResizable && (verticalEdge || iconLike)) {
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

      if (iconLike && (horizontalEdge || verticalEdge)) {
        patch.iconSizePx = Math.round(Math.max(nextWidthPx, nextHeightPx));
        patch.widthPercent = undefined;
        patch.width = "auto";
        patch.heightPx = undefined;
        shell.style.width = `${Math.round(Math.max(nextWidthPx, nextHeightPx))}px`;
        shell.style.height = `${Math.round(Math.max(nextWidthPx, nextHeightPx))}px`;
      } else if (horizontalEdge) {
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
      } else if (heightResizable && verticalEdge && !iconLike) {
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
          ref={toolbarRef}
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
              {panelButton("size", `${Math.round(renderedFontSize)} px`, <FiType />)}
              {panelButton("align", "Alinhar", style.align === "center" ? <FiAlignCenter /> : style.align === "right" ? <FiAlignRight /> : style.align === "justify" ? <FiAlignJustify /> : <FiAlignLeft />)}
            </>
          ) : null}

          {buttonLike && onStyleChange ? panelButton("buttonShape", "Formato", <FiSquare />) : null}

          {imageLike && onStyleChange ? (
            <>
              {panelButton("image", "Ajustar foto", <FiImage />)}
              {panelButton("frame", "Moldura", <FiMaximize2 />)}
            </>
          ) : null}

          {onStyleChange && colorable ? panelButton("color", "Cor", <span className={styles.colorSpectrumIcon} aria-hidden="true" />) : null}
          {imageLike && onStyleChange ? panelButton("overlay", "Efeito", <FiDroplet />) : null}
          {onStyleChange ? panelButton("position", "Posição", <FiMaximize2 />) : null}

          {onCopy ? (
            <button type="button" className={styles.quickActionButton} onClick={onCopy} title="Copiar (Ctrl+C)" aria-label="Copiar elemento"><FiCopy /></button>
          ) : null}
          {onDuplicate ? (
            <button type="button" className={styles.quickActionButton} onClick={onDuplicate} title="Duplicar (Ctrl+D)" aria-label="Duplicar elemento"><FiPlusSquare /></button>
          ) : null}
          {selectedIds.length > 1 ? (
            <span className={styles.multiSelectBadge} title="Vários elementos selecionados"><FiLayers /> {selectedIds.length}</span>
          ) : null}

          {onStyleChange && (outsideSafeArea || outsideRecommendation) ? (
            <button
              type="button"
              className={styles.layoutWarningButton}
              title={outsideSafeArea ? "Fora da área segura — clique para voltar" : "Fora do recomendado — clique para ajustar"}
              aria-label={outsideSafeArea ? "Voltar para a área segura" : "Voltar ao recomendado do design"}
              onClick={(event) => {
                event.stopPropagation();
                if (outsideSafeArea) {
                  onStyleChange({ offsetX: 0, offsetY: 0 });
                  setOutsideSafeArea(false);
                  return;
                }
                const maxWidth = elementConstraints?.maxWidthPercent ?? editorConstraints?.maxWidthPercent ?? 100;
                const minWidth = elementConstraints?.minWidthPercent ?? editorConstraints?.minWidthPercent ?? 8;
                const maxFont = elementConstraints?.maxFontSize ?? editorConstraints?.maxFontSize ?? 84;
                const minFont = elementConstraints?.minFontSize ?? editorConstraints?.minFontSize ?? 10;
                const patch: Partial<InstitutionalElementStyle> = {};
                if (style.widthPercent !== undefined) patch.widthPercent = clamp(style.widthPercent, minWidth, maxWidth);
                if (style.fontSize !== undefined) patch.fontSize = clamp(style.fontSize, minFont, maxFont);
                if (style.heightPx !== undefined) {
                  const minHeight = elementConstraints?.minHeightPx ?? 1;
                  const maxHeight = elementConstraints?.maxHeightPx ?? 1600;
                  patch.heightPx = clamp(style.heightPx, minHeight, maxHeight);
                }
                onStyleChange(patch);
              }}
            ><FiAlertTriangle /><span>Ajustar</span></button>
          ) : null}

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

          {(onStyleChange || removable || onCopy || onCut || onPaste || onDuplicate) ? (
            <button type="button" className={styles.moreButton} data-active={openPanel === "more"} onClick={() => { setCropMode(false); setOpenPanel(openPanel === "more" ? null : "more"); }} aria-label="Mais opções" title="Mais opções"><FiMoreHorizontal /></button>
          ) : null}

          {openPanel ? (
            <div className={styles.contextPopover} data-panel={openPanel}>
              {openPanel === "size" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Tamanho do texto</strong><span>Escolha um tamanho ou ajuste livremente.</span></div>
                  <div className={styles.sizePresets}>{[14, 18, 24, 32, 48, 64].map((size) => <button type="button" key={size} data-active={Math.round(renderedFontSize) === size} onClick={() => onStyleChange({ fontSize: size })}>{size}</button>)}</div>
                  <label className={styles.visualRange}><span>Menor</span><input type="range" min="10" max="160" step="1" value={Math.round(renderedFontSize)} onChange={(event) => onStyleChange({ fontSize: Number(event.target.value) })} /><span>Maior</span></label>
                </>
              ) : null}

              {openPanel === "buttonShape" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Formato do botão</strong><span>Troque a silhueta sem alterar o texto ou a ação.</span></div>
                  <div className={styles.buttonShapeQuickGrid}>
                    {([
                      ["none", "Reto"],
                      ["small", "Suave"],
                      ["medium", "Arredondado"],
                      ["large", "Curvo"],
                      ["pill", "Pílula"],
                    ] as const).map(([radius, label]) => (
                      <button type="button" key={radius} data-active={renderedButtonRadius === radius} onClick={() => onStyleChange({ radius })}>
                        <span data-radius={radius}><i /></span><small>{label}</small>
                      </button>
                    ))}
                  </div>
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
                  {!readabilityPass && background ? <button type="button" onClick={() => onStyleChange({ color: bestReadableColor(background, foreground, goodThreshold) })}>Melhorar automaticamente</button> : null}
                </div>
              ) : null}

              {openPanel === "more" ? (
                <div className={styles.moreMenu}>
                  <div className={styles.clipboardMenuGroup}>
                    {onCopy ? <button type="button" onClick={onCopy}><FiCopy /> Copiar <kbd>Ctrl+C</kbd></button> : null}
                    {onCut ? <button type="button" onClick={onCut}><FiScissors /> Recortar <kbd>Ctrl+X</kbd></button> : null}
                    {onPaste ? <button type="button" onClick={onPaste}><FiClipboard /> Colar <kbd>Ctrl+V</kbd></button> : null}
                    {onDuplicate ? <button type="button" onClick={onDuplicate}><FiCopy /> Duplicar <kbd>Ctrl+D</kbd></button> : null}
                  </div>
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
      data-selection-id={selectionId ?? node.id ?? undefined}
      data-offset-x={style.offsetX ?? 0}
      data-offset-y={style.offsetY ?? 0}
      data-position-mode={positionMode}
      data-anchor-source={style.anchorSource ?? undefined}
      data-anchor-index={style.anchorIndex ?? undefined}
      data-presentation={node.presentation ?? undefined}
      data-element-type={node.type === "element" ? node.elementType : undefined}
      data-rotation={style.rotation ?? 0}
      data-group-id={style.groupId ?? undefined}
      data-editable={editable}
      data-image-element={imageLike}
      data-button-element={buttonLike}
      data-icon-element={iconLike}
      data-shape-element={shapeLike}
      data-shape-kind={shapeKind}
      data-custom-color={style.color !== undefined}
      data-custom-background={style.backgroundColor !== undefined}
      data-free-mode={freeMode}
      data-custom-height={!iconLike && heightResizable && style.heightPx !== undefined}
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
