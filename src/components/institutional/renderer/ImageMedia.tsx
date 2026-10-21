import {
  useRef,
  type CSSProperties,
  type ClipboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FiImage, FiMove, FiUploadCloud } from "react-icons/fi";

import type {
  InstitutionalElementStyle,
  InstitutionalImageValue,
} from "../../../services/institutionalService";
import { institutionalColorCssVar } from "../../../utils/institutionalColors";

import { getNativeEditorialPhoto } from "../../../data/institutional/nativeEditorialPhotos";
import FloatingCanvasHint from "./FloatingCanvasHint";
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
  return institutionalColorCssVar(value) ?? "#000000";
}


export default function ImageMedia({
  image,
  presentation = "image",
  editable,
  selected,
  showEmptyMediaPreview = false,
  style = {},
  guidance,
  onRequest,
  onStyleChange,
  onInteractionStart,
  onInteractionCommit,
  onFile,
}: {
  image: InstitutionalImageValue | null;
  presentation?: string;
  editable: boolean;
  selected: boolean;
  showEmptyMediaPreview?: boolean;
  style?: InstitutionalElementStyle;
  guidance?: { title: string; text?: string; note?: string } | null;
  onRequest?: () => void;
  onStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onInteractionStart?: () => void;
  onInteractionCommit?: () => void;
  onFile?: (file: File) => void;
}) {
  const nativePhoto = getNativeEditorialPhoto(image?.assetId);
  const sourceUrl = image?.url || nativePhoto?.url;
  const dragRef = useRef<DragState | null>(null);
  const hintAnchorRef = useRef<HTMLDivElement>(null);
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
    if (!editable || !selected || !onStyleChange || !sourceUrl) return;
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

  function acceptDroppedImage(files: FileList | null): boolean {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return false;
    onFile?.(file);
    return true;
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>): void {
    if (!editable || !onFile) return;
    const files = event.clipboardData.files;
    if (acceptDroppedImage(files)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  if (!sourceUrl) {
    if (!editable && !showEmptyMediaPreview) return null;
    if (!editable && showEmptyMediaPreview) {
      return (
        <div className={`${styles.imageMediaFrame} ${styles[presentation] ?? ""} ${styles.mediaPreviewPlaceholder}`}
          style={frameStyle} data-frame={imageFrame} data-aspect={imageAspect} aria-label="Espaço reservado para imagem da organização" role="img">
          <FiImage aria-hidden="true" />
          <span>Sua imagem aqui</span>
        </div>
      );
    }
    return (
      <div
        ref={hintAnchorRef}
        className={styles.editableMedia}
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(event) => { if (editable && onFile) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
        onDrop={(event) => {
          if (!editable || !onFile) return;
          if (acceptDroppedImage(event.dataTransfer.files)) { event.preventDefault(); event.stopPropagation(); }
        }}
      >
        <button
          type="button"
          className={`${styles.imagePlaceholder} ${styles.imageMediaFrame} ${styles[presentation] ?? ""}`}
          data-frame={imageFrame}
          data-aspect={imageAspect}
          data-custom-height={style.heightPx !== undefined}
          data-media-empty="true"
          style={frameStyle}
          onClick={(event) => {
            event.stopPropagation();
            onRequest?.();
          }}
        >
          <FiUploadCloud aria-hidden="true" />
          <span>Adicionar imagem</span>
          <small>Clique, arraste uma imagem para cá ou cole com Ctrl+V.</small>
        </button>
        {selected && guidance ? (
          <FloatingCanvasHint anchorRef={hintAnchorRef} className={styles.imageFloatingHint} preferredWidth={420}>
            <span className={styles.canvasTipLabel}>Dica</span>
            <FiImage aria-hidden="true" />
            <div>
              <strong>{guidance.title}</strong>
              {guidance.text ? <span>{guidance.text}</span> : null}
              {guidance.note ? <small>{guidance.note}</small> : null}
            </div>
          </FloatingCanvasHint>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={hintAnchorRef}
      className={styles.imageMediaRoot}
      tabIndex={editable ? 0 : undefined}
      onPaste={handlePaste}
      onDragOver={(event) => { if (editable && onFile) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
      onDrop={(event) => {
        if (!editable || !onFile) return;
        if (acceptDroppedImage(event.dataTransfer.files)) { event.preventDefault(); event.stopPropagation(); }
      }}
    >
      <div
        className={`${styles.imageMediaFrame} ${styles[presentation] ?? ""}`}
        data-frame={imageFrame}
        data-fit={imageFit}
        data-aspect={imageAspect}
        data-custom-height={style.heightPx !== undefined}
        style={frameStyle}
        onPointerDown={beginFocalDrag}
        onPointerMove={moveFocal}
        onPointerUp={finishFocalDrag}
        onPointerCancel={finishFocalDrag}
      >
        <img key={sourceUrl} className={styles.imageMediaImage} src={sourceUrl} alt={image?.alt || "Fotografia ilustrativa"} draggable={false}
          onError={(event) => {
            const fallback = nativePhoto?.fallback;
            if (fallback && !event.currentTarget.dataset.nativeFallback) {
              event.currentTarget.dataset.nativeFallback = "true";
              event.currentTarget.src = fallback;
              return;
            }
            event.currentTarget.hidden = true;
            event.currentTarget.parentElement?.setAttribute("data-image-unavailable", "true");
          }} />
        <span className={styles.imageMediaOverlay} aria-hidden="true" />

        {editable && selected ? (
          <>
            <span className={styles.cropDragBadge} aria-hidden="true">
              <FiMove /> Arraste para enquadrar
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
        <FloatingCanvasHint anchorRef={hintAnchorRef} className={styles.imageFloatingHint} preferredWidth={420}>
          <span className={styles.canvasTipLabel}>Dica</span>
          <FiImage aria-hidden="true" />
          <div>
            <strong>{guidance.title}</strong>
            {guidance.text ? <span>{guidance.text}</span> : null}
            {guidance.note ? <small>{guidance.note}</small> : null}
          </div>
        </FloatingCanvasHint>
      ) : null}
    </div>
  );
}
