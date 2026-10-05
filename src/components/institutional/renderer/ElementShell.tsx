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
  InstitutionalElementStyle,
  InstitutionalImageFrame,
  InstitutionalImageFrameResource,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import { contrastRatio } from "../../../utils/institutionalPalette";

import styles from "./InstitutionalRenderer.module.css";

type ResizeEdge = "left" | "right" | "bottom" | "bottom-right";
type ToolbarPanel = "size" | "align" | "position" | "color" | "image" | "frame" | "overlay" | "more" | "readability" | null;

function colorValue(value: InstitutionalElementStyle["color"]): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#")) return value;
  if (value === "text") return "var(--org-text)";
  if (value === "primary") return "var(--org-primary)";
  if (value === "secondary") return "var(--org-secondary)";
  if (value === "accent") return "var(--org-accent)";
  return "var(--org-background)";
}

function resolvedColor(
  value: InstitutionalElementStyle["color"] | undefined,
  brand: InstitutionalBrand | undefined,
  fallback: string | undefined,
): string | undefined {
  if (!value) return fallback;
  if (value.startsWith("#")) return value;
  if (!brand) return fallback;
  if (value === "text") return brand.textColor;
  if (value === "primary") return brand.primaryColor;
  if (value === "secondary") return brand.secondaryColor;
  if (value === "accent") return brand.accentColor;
  return brand.backgroundColor;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


function isImageNode(node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>): boolean {
  if (node.type === "element") return node.elementType === "image";
  return ["image", "heroImage", "wideImage", "cardImage"].includes(node.presentation ?? "");
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
  node, selected, editable, removable, children, onSelect, onStyleChange, onRemove, brand, sectionBackground, frames = [],
}: {
  node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>;
  selected: boolean;
  editable: boolean;
  removable: boolean;
  children: ReactNode;
  onSelect?: () => void;
  onStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onRemove?: () => void;
  brand?: InstitutionalBrand;
  sectionBackground?: string;
  frames?: InstitutionalImageFrameResource[];
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [toolbarPlacement, setToolbarPlacement] = useState<"above" | "below">("above");
  const [outsideSafeArea, setOutsideSafeArea] = useState(false);
  const [openPanel, setOpenPanel] = useState<ToolbarPanel>(null);
  const style = node.style ?? {};
  const locked = Boolean(style.locked);
  const imageLike = isImageNode(node);
  const textLike = node.type === "slot" ? !imageLike : !["image", "divider", "spacer"].includes(node.elementType);
  const buttonLike = node.type === "element" && node.elementType === "button";
  const colorable = !imageLike && (node.type === "slot" || node.elementType !== "spacer");

  const css = {
    "--element-color": colorValue(style.color),
    "--element-background": colorValue(style.backgroundColor),
    "--element-font-size": fontSizeValue(style),
    width: widthValue(style),
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
    if (!selected || !editable) {
      setOpenPanel(null);
      return;
    }
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
        const preferAbove = rect.top > 360;
        const top = preferAbove ? Math.max(10, rect.top - 54) : Math.min(window.innerHeight - 54, rect.bottom + 10);
        const left = clamp(rect.left, 12, Math.max(12, window.innerWidth - 520));
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
  }, [editable, selected, style.fontSize, style.heightPx, style.offsetX, style.offsetY, style.widthPercent]);

  function safeAreaFor(element: HTMLElement): DOMRect | null {
    const frame = element.closest<HTMLElement>("[data-section-id]");
    if (!frame) return null;
    const candidates = [...frame.querySelectorAll<HTMLElement>("section > div, section")];
    return (candidates.find((candidate) => candidate.contains(element)) ?? frame).getBoundingClientRect();
  }

  function beginDirectCanvasMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!editable || !selected || !onStyleChange || locked || event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select, a, [data-no-canvas-drag='true']")) return;
    // While Enquadrar is open, dragging the photo adjusts its crop instead of moving the element.
    if (imageLike && openPanel === "image") return;

    const shell = shellRef.current;
    if (!shell) return;

    // ImageMedia also listens for pointer events. In normal mode the canvas owns the drag.
    if (imageLike) event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const baseX = style.offsetX ?? 0;
    const baseY = style.offsetY ?? 0;
    const initialRect = shell.getBoundingClientRect();
    const safe = safeAreaFor(shell);
    let nextX = baseX;
    let nextY = baseY;
    let active = false;
    let lastOutside = outsideSafeArea;

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
      nextX = clamp(Math.round(baseX + dx), -1200, 1200);
      nextY = clamp(Math.round(baseY + dy), -1200, 1200);
      shell.style.transform = `translate(${nextX}px, ${nextY}px) rotate(${style.rotation ?? 0}deg)`;

      if (safe) {
        const projected = {
          left: initialRect.left + dx,
          right: initialRect.right + dx,
          top: initialRect.top + dy,
          bottom: initialRect.bottom + dy,
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
      if (active) onStyleChange({ offsetX: nextX, offsetY: nextY });
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

    const parentRect = shell.parentElement?.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const parentWidth = Math.max(parentRect?.width ?? shellRect.width, 1);
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidthPx = shellRect.width;
    const startHeightPx = style.heightPx ?? shellRect.height;
    const baseOffsetX = style.offsetX ?? 0;
    const minWidthPx = Math.min(parentWidth, Math.max(48, parentWidth * 0.08));
    const maxWidthPx = Math.max(minWidthPx, parentWidth);
    let nextWidthPx = clamp(startWidthPx, minWidthPx, maxWidthPx);
    let nextHeight = startHeightPx;
    let nextOffsetX = baseOffsetX;
    const imageFrame = shell.querySelector<HTMLElement>("[data-frame]");

    shell.dataset.resizing = "true";
    setToolbarPosition(null);

    const onPointerMove = (pointerEvent: PointerEvent) => {
      pointerEvent.preventDefault();
      const deltaX = pointerEvent.clientX - startX;
      const deltaY = pointerEvent.clientY - startY;

      if (edge === "right" || edge === "bottom-right") {
        nextWidthPx = clamp(startWidthPx + deltaX, minWidthPx, maxWidthPx);
      }
      if (edge === "left") {
        const unclampedWidth = startWidthPx - deltaX;
        nextWidthPx = clamp(unclampedWidth, minWidthPx, maxWidthPx);
        const actualDelta = startWidthPx - nextWidthPx;
        nextOffsetX = Math.round(baseOffsetX + actualDelta);
      }
      if (imageLike && (edge === "bottom" || edge === "bottom-right")) {
        nextHeight = clamp(startHeightPx + deltaY, 80, 1400);
      }

      if (edge === "left" || edge === "right" || edge === "bottom-right") {
        shell.style.width = `${nextWidthPx}px`;
      }
      if (edge === "left") {
        shell.style.transform = `translate(${nextOffsetX}px, ${style.offsetY ?? 0}px) rotate(${style.rotation ?? 0}deg)`;
      }
      if (imageFrame && imageLike && (edge === "bottom" || edge === "bottom-right")) {
        imageFrame.style.setProperty("--image-height", `${Math.round(nextHeight)}px`);
      }
    };

    const stop = () => {
      const patch: Partial<InstitutionalElementStyle> = {};
      if (edge === "left" || edge === "right" || edge === "bottom-right") {
        patch.widthPercent = Math.round(clamp((nextWidthPx / parentWidth) * 100, 8, 100) * 10) / 10;
      }
      if (edge === "left") patch.offsetX = nextOffsetX;
      if (imageLike && (edge === "bottom" || edge === "bottom-right")) patch.heightPx = Math.round(nextHeight);
      delete shell.dataset.resizing;
      onStyleChange(patch);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
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

  const panelButton = (panel: Exclude<ToolbarPanel, null>, label: string, icon: ReactNode) => (
    <button type="button" className={styles.contextButton} data-active={openPanel === panel} onClick={() => setOpenPanel(openPanel === panel ? null : panel)}>
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

          {onStyleChange && colorable ? panelButton("color", "Cor", <FiDroplet />) : null}
          {imageLike && onStyleChange ? panelButton("overlay", "Efeito", <FiDroplet />) : null}
          {onStyleChange ? panelButton("position", "Posição", <FiMaximize2 />) : null}

          {ratio !== null && colorable && !readabilityPass ? (
            <button
              type="button"
              className={styles.readabilityDot}
              data-pass="false"
              onClick={() => setOpenPanel(openPanel === "readability" ? null : "readability")}
              title="A leitura pode melhorar"
              aria-label="Sugestão para melhorar a leitura"
            ><FiAlertTriangle /></button>
          ) : null}

          {(onStyleChange || removable) ? (
            <button type="button" className={styles.moreButton} data-active={openPanel === "more"} onClick={() => setOpenPanel(openPanel === "more" ? null : "more")} aria-label="Mais opções" title="Mais opções"><FiMoreHorizontal /></button>
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
                    <label className={styles.customColorChoice}><input type="color" value={(buttonLike ? style.backgroundColor : style.color)?.startsWith("#") ? (buttonLike ? style.backgroundColor : style.color) as string : "#1366c4"} onChange={(event) => onStyleChange(buttonLike ? { backgroundColor: event.target.value as `#${string}` } : { color: event.target.value as `#${string}` })} /><span>+</span><small>Outra cor</small></label>
                  </div>
                </>
              ) : null}

              {openPanel === "image" && onStyleChange ? (
                <>
                  <div className={styles.popoverHeading}><strong>Ajustar foto</strong><span>Arraste a própria foto para escolher o que fica em destaque. Dê dois cliques na imagem para voltar a este modo.</span></div>
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
                    {frameOptions.map((frame) => <button type="button" key={frame.id} data-active={(style.imageFrame ?? "rounded") === frame.id && !style.imageClipPath} onClick={() => onStyleChange({ imageFrame: frame.id, imageClipPath: undefined, imageFrameLabel: undefined })}><span data-frame={frame.id} /><small>{frame.label}</small></button>)}
                    {frames.filter((frame) => frame.status === "published").map((frame) => (
                      <button
                        type="button"
                        key={frame.id}
                        data-active={style.imageFrame === "custom" && style.imageClipPath === frame.clipPath}
                        onClick={() => onStyleChange({ imageFrame: "custom", imageClipPath: frame.clipPath, imageFrameLabel: frame.name })}
                      >
                        <span style={{ clipPath: frame.clipPath }} />
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
                      <button type="button" onClick={() => onStyleChange({ zIndex: Math.min(50, (style.zIndex ?? 0) + 10) })}><FiLayers /> Trazer para frente</button>
                      <button type="button" onClick={() => onStyleChange({ zIndex: Math.max(-20, (style.zIndex ?? 0) - 10) })}><FiLayers /> Enviar para trás</button>
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

  return (
    <div
      ref={shellRef}
      className={styles.elementShell}
      data-selected={selected}
      data-editable={editable}
      data-image-element={imageLike}
      data-locked={locked}
      data-hidden={Boolean(style.hidden)}
      data-crop-mode={openPanel === "image"}
      data-custom-font-size={style.fontSize !== undefined}
      style={css}
      onPointerDownCapture={beginDirectCanvasMove}
      onDoubleClick={(event) => {
        if (!editable || !imageLike || !onStyleChange) return;
        event.stopPropagation();
        setOpenPanel("image");
      }}
      onClick={(event) => { if (!editable) return; event.stopPropagation(); onSelect?.(); }}
    >
      {toolbar}
      {editable && selected && outsideSafeArea ? <div className={styles.safeAreaWarning}><FiAlertTriangle /><span><strong>Fora da área recomendada</strong><small>Pode ficar cortado em telas menores.</small></span><button type="button" onClick={(event) => { event.stopPropagation(); onStyleChange?.({ offsetX: 0, offsetY: 0 }); setOutsideSafeArea(false); }}>Corrigir</button></div> : null}
      {children}
      {editable && selected && onStyleChange && !locked ? (
        <>
          <button type="button" className={styles.resizeHandle} data-edge="left" onPointerDown={(event) => beginResize(event, "left")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pela esquerda" title="Arraste para redimensionar" />
          <button type="button" className={styles.resizeHandle} data-edge="right" onPointerDown={(event) => beginResize(event, "right")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar pela direita" title="Arraste para redimensionar" />
          {imageLike ? <><button type="button" className={styles.resizeHandle} data-edge="bottom" onPointerDown={(event) => beginResize(event, "bottom")} onClick={(event) => event.stopPropagation()} aria-label="Alterar altura" title="Arraste para alterar a altura" /><button type="button" className={styles.resizeHandle} data-edge="bottom-right" onPointerDown={(event) => beginResize(event, "bottom-right")} onClick={(event) => event.stopPropagation()} aria-label="Redimensionar imagem" title="Arraste para alterar largura e altura" /></> : null}
        </>
      ) : null}
    </div>
  );
}
