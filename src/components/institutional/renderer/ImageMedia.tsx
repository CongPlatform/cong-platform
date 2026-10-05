import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FiImage, FiMove } from "react-icons/fi";

import type {
  InstitutionalElementStyle,
  InstitutionalImageValue,
} from "../../../services/institutionalService";

import styles from "./InstitutionalRenderer.module.css";

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startFocalX: number;
  startFocalY: number;
  width: number;
  height: number;
  nextFocalX: number;
  nextFocalY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cssColor(value: InstitutionalElementStyle["overlayColor"]): string {
  if (!value) return "#000000";
  if (value.startsWith("#")) return value;
  if (value === "text") return "var(--org-text)";
  if (value === "primary") return "var(--org-primary)";
  if (value === "secondary") return "var(--org-secondary)";
  if (value === "accent") return "var(--org-accent)";
  return "var(--org-background)";
}

export default function ImageMedia({
  image,
  presentation = "image",
  editable,
  selected,
  style = {},
  guidance,
  onRequest,
  onStyleChange,
  onInteractionStart,
  onInteractionCommit,
}: {
  image: InstitutionalImageValue | null;
  presentation?: string;
  editable: boolean;
  selected: boolean;
  style?: InstitutionalElementStyle;
  guidance?: { title: string; text?: string; note?: string } | null;
  onRequest?: () => void;
  onStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onInteractionStart?: () => void;
  onInteractionCommit?: () => void;
}) {
  const dragRef = useRef<DragState | null>(null);
  const focalX = style.focalX ?? 50;
  const focalY = style.focalY ?? 50;
  const imageZoom = style.imageZoom ?? 1;
  const imageFit = style.imageFit ?? "cover";
  const imageFrame = style.imageFrame ?? "rounded";
  const imageAspect = style.imageAspect ?? "auto";

  const frameStyle = {
    "--image-focal-x": `${focalX}%`,
    "--image-focal-y": `${focalY}%`,
    "--image-zoom": String(imageZoom),
    "--image-overlay-color": cssColor(style.overlayColor),
    "--image-overlay-opacity": String(style.overlayOpacity ?? 0),
    "--image-custom-clip": style.imageClipPath ?? "none",
    ...(style.heightPx ? { "--image-height": `${style.heightPx}px` } : {}),
  } as CSSProperties;

  function beginFocalDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!editable || !selected || !onStyleChange || !image?.url) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (!event.currentTarget.closest('[data-crop-mode="true"]')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocalX: focalX,
      startFocalY: focalY,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
      nextFocalX: focalX,
      nextFocalY: focalY,
    };
    onInteractionStart?.();
  }

  function moveFocal(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !onStyleChange) return;

    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    const zoomFactor = Math.max(style.imageZoom ?? 1, 1);
    drag.nextFocalX = Math.round(clamp(drag.startFocalX - (deltaX / drag.width) * (100 / zoomFactor), 0, 100) * 10) / 10;
    drag.nextFocalY = Math.round(clamp(drag.startFocalY - (deltaY / drag.height) * (100 / zoomFactor), 0, 100) * 10) / 10;

    // Keep crop movement local while dragging. This avoids rerender lag and makes
    // the photo stay attached to the pointer. Persist only when the drag ends.
    event.currentTarget.style.setProperty("--image-focal-x", `${drag.nextFocalX}%`);
    event.currentTarget.style.setProperty("--image-focal-y", `${drag.nextFocalY}%`);
  }

  function finishFocalDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    onStyleChange?.({ focalX: drag.nextFocalX, focalY: drag.nextFocalY });
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer can already be released by the browser.
    }
    onInteractionCommit?.();
  }

  if (!image?.url) {
    if (!editable) return null;
    return (
      <div className={styles.editableMedia}>
        <button
          type="button"
          className={`${styles.imagePlaceholder} ${styles[presentation] ?? ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onRequest?.();
          }}
        >
          <FiImage aria-hidden="true" />
          <span>Adicionar imagem</span>
        </button>
        {selected && guidance ? (
          <div className={styles.imageFloatingHint} role="note">
            <FiImage aria-hidden="true" />
            <div>
              <strong>{guidance.title}</strong>
              {guidance.text ? <span>{guidance.text}</span> : null}
              {guidance.note ? <small>{guidance.note}</small> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.imageMediaRoot}>
      <div
        className={`${styles.imageMediaFrame} ${styles[presentation] ?? ""}`}
        data-frame={imageFrame}
        data-fit={imageFit}
        data-aspect={imageAspect}
        style={frameStyle}
        onPointerDown={beginFocalDrag}
        onPointerMove={moveFocal}
        onPointerUp={finishFocalDrag}
        onPointerCancel={finishFocalDrag}
      >
        <img className={styles.imageMediaImage} src={image.url} alt={image.alt} draggable={false} />
        <span className={styles.imageMediaOverlay} aria-hidden="true" />

        {editable && selected ? (
          <>
            <span className={styles.cropDragBadge} aria-hidden="true">
              <FiMove /> Arraste a foto para escolher o enquadramento
            </span>
            <button
              type="button"
              className={styles.imageReplaceButton}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRequest?.();
              }}
            >
              <FiImage aria-hidden="true" /> Trocar
            </button>
          </>
        ) : null}
      </div>

      {editable && selected && guidance ? (
        <div className={styles.imageFloatingHint} role="note">
          <FiImage aria-hidden="true" />
          <div>
            <strong>{guidance.title}</strong>
            {guidance.text ? <span>{guidance.text}</span> : null}
            {guidance.note ? <small>{guidance.note}</small> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
