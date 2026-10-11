import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import styles from "./InstitutionalRenderer.module.css";

type HintPosition = {
  top: number;
  left: number;
  visible: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function FloatingCanvasHint({
  anchorRef,
  className,
  children,
  preferredWidth = 390,
  dataWarning,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  className: string;
  children: ReactNode;
  preferredWidth?: number;
  dataWarning?: boolean;
}) {
  const hintRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<HintPosition>({
    top: 0,
    left: 0,
    visible: false,
  });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") return;

    let frame = 0;
    const update = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = anchor.getBoundingClientRect();
        const margin = 12;
        const gap = 8;
        const maxWidth = Math.max(180, window.innerWidth - margin * 2);
        const width = Math.min(preferredWidth, maxWidth);
        const measured = hintRef.current?.getBoundingClientRect();
        const height = Math.max(measured?.height ?? 0, 54);

        const roomRight = window.innerWidth - rect.right - gap - margin;
        const roomLeft = rect.left - gap - margin;
        const roomBelow = window.innerHeight - rect.bottom - gap - margin;
        const roomAbove = rect.top - gap - margin;

        // Dicas são UI do editor, não conteúdo do site. Sempre que houver
        // espaço, elas ficam ao lado do elemento para não cobrir o design.
        if (roomRight >= width || roomLeft >= width) {
          const placeRight = roomRight >= width || roomRight >= roomLeft;
          const left = placeRight
            ? clamp(rect.right + gap, margin, Math.max(margin, window.innerWidth - width - margin))
            : clamp(rect.left - width - gap, margin, Math.max(margin, window.innerWidth - width - margin));
          const top = clamp(
            rect.top + rect.height / 2 - height / 2,
            margin,
            Math.max(margin, window.innerHeight - height - margin),
          );
          setPosition({ top, left, visible: true });
          return;
        }

        const placeBelow = roomBelow >= height || roomBelow >= roomAbove;
        const top = placeBelow
          ? clamp(rect.bottom + gap, margin, Math.max(margin, window.innerHeight - height - margin))
          : clamp(rect.top - height - gap, margin, Math.max(margin, window.innerHeight - height - margin));
        const idealLeft = rect.left + rect.width / 2 - width / 2;
        const left = clamp(idealLeft, margin, Math.max(margin, window.innerWidth - width - margin));
        setPosition({ top, left, visible: true });
      });
    };

    update();
    const anchorObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    const hintObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    anchorObserver?.observe(anchor);
    if (hintRef.current) hintObserver?.observe(hintRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      anchorObserver?.disconnect();
      hintObserver?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, preferredWidth, children]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={hintRef}
      className={`${className} ${styles.canvasHintPortal}`}
      data-warning={dataWarning || undefined}
      style={{
        top: position.top,
        left: position.left,
        width: `min(${preferredWidth}px, calc(100vw - 24px))`,
        visibility: position.visible ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
