import {
  useLayoutEffect,
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
        const margin = 10;
        const gap = 8;
        const width = Math.min(preferredWidth, Math.max(180, window.innerWidth - margin * 2));
        const estimatedHeight = 76;
        const hasRoomBelow = rect.bottom + gap + estimatedHeight <= window.innerHeight - margin;
        const top = hasRoomBelow
          ? rect.bottom + gap
          : Math.max(margin, rect.top - estimatedHeight - gap);
        const left = clamp(rect.left, margin, Math.max(margin, window.innerWidth - width - margin));
        setPosition({ top, left, visible: true });
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("pointermove", update);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("pointermove", update);
    };
  }, [anchorRef, preferredWidth]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`${className} ${styles.canvasHintPortal}`}
      data-warning={dataWarning || undefined}
      style={{
        top: position.top,
        left: position.left,
        width: `min(${preferredWidth}px, calc(100vw - 20px))`,
        visibility: position.visible ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
