import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiCrosshair, FiX } from "react-icons/fi";

import styles from "./ColorPickerControl.module.css";

type HSV = { h: number; s: number; v: number };

type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return "#000000";
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex).slice(1);
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  const part = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${part(red)}${part(green)}${part(blue)}`.toUpperCase();
}

function rgbToHsv(red: number, green: number, blue: number): HSV {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex({ h, s, v }: HSV): string {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  const [r, g, b]: [number, number, number] =
    h < 60 ? [chroma, x, 0]
      : h < 120 ? [x, chroma, 0]
        : h < 180 ? [0, chroma, x]
          : h < 240 ? [0, x, chroma]
            : h < 300 ? [x, 0, chroma]
              : [chroma, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function canUseEyeDropper(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper);
}

export default function ColorPickerControl({
  value,
  onChange,
  label = "Cor personalizada",
  compact = false,
}: {
  value: string;
  onChange: (hex: `#${string}`) => void;
  label?: string;
  compact?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const normalized = normalizeHex(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(normalized);
  const [editingHex, setEditingHex] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const hsv = hexToHsv(normalized);
  const eyeDropperAvailable = canUseEyeDropper();

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popupWidth = 264;
      const popupHeight = 350;
      const margin = 10;
      const left = clamp(rect.right - popupWidth, margin, Math.max(margin, window.innerWidth - popupWidth - margin));
      const fitsBelow = rect.bottom + margin + popupHeight <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + 7
        : Math.max(margin, rect.top - popupHeight - 7);
      setPopoverPosition({ top, left });
    };

    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    reposition();
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  function commit(nextHsv: HSV): void {
    const normalizedHsv = {
      h: ((nextHsv.h % 360) + 360) % 360,
      s: clamp(nextHsv.s, 0, 1),
      v: clamp(nextHsv.v, 0, 1),
    };
    const hex = hsvToHex(normalizedHsv) as `#${string}`;
    if (editingHex) setDraft(hex);
    onChange(hex);
  }

  function setSvFromPointer(event: ReactPointerEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const s = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    const v = 1 - clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
    commit({ ...hsv, s, v });
  }

  function beginSv(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setSvFromPointer(event);
  }

  async function pickFromScreen(): Promise<void> {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropper) return;
    try {
      const result = await new EyeDropper().open();
      const hex = normalizeHex(result.sRGBHex) as `#${string}`;
      if (editingHex) setDraft(hex);
      onChange(hex);
    } catch {
      // Cancelar o conta-gotas não é erro para o usuário.
    }
  }

  function commitHex(): void {
    if (!/^#[0-9a-f]{6}$/i.test(draft.trim()) && !/^#[0-9a-f]{3}$/i.test(draft.trim())) {
      setDraft(normalized);
      return;
    }
    const hex = normalizeHex(draft) as `#${string}`;
    setDraft(hex);
    onChange(hex);
  }

  return (
    <div ref={rootRef} className={styles.root} data-compact={compact}>
      <button
        type="button"
        className={styles.trigger}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-label={`${label}: ${normalized}`}
      >
        <span className={styles.spectrumMark} aria-hidden="true" />
        {!compact ? (
          <>
            <span className={styles.triggerSwatch} style={{ background: normalized }} aria-hidden="true" />
            <span className={styles.triggerText}>{normalized}</span>
          </>
        ) : null}
        <FiChevronDown aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className={styles.header}>
            <div><span className={styles.spectrumMark} aria-hidden="true" /><strong>{label}</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar seletor de cor"><FiX /></button>
          </div>

          <div
            className={styles.sv}
            style={{ "--picker-hue": `hsl(${hsv.h} 100% 50%)` } as CSSProperties}
            onPointerDown={beginSv}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) setSvFromPointer(event);
            }}
          >
            <span className={styles.svThumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: normalized }} />
          </div>

          <label className={styles.hueRow}>
            <span>Matiz</span>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={Math.round(hsv.h)}
              onChange={(event) => commit({ ...hsv, h: Number(event.target.value) })}
              aria-label="Matiz da cor"
            />
          </label>

          <div className={styles.valueRow}>
            <span className={styles.largeSwatch} style={{ background: normalized }} aria-hidden="true" />
            <label>
              <span>HEX</span>
              <input
                value={editingHex ? draft : normalized}
                onFocus={() => {
                  setDraft(normalized);
                  setEditingHex(true);
                }}
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
                onBlur={() => {
                  commitHex();
                  setEditingHex(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                maxLength={7}
                spellCheck={false}
              />
            </label>
            {eyeDropperAvailable ? (
              <button type="button" className={styles.eyeDropper} onClick={() => void pickFromScreen()} title="Conta-gotas" aria-label="Escolher cor da tela com conta-gotas">
                <FiCrosshair />
              </button>
            ) : null}
          </div>
          <small className={styles.hint}>{eyeDropperAvailable ? "Arraste o ponto ou use o conta-gotas para capturar uma cor da tela." : "Arraste o ponto para escolher saturação e luminosidade."}</small>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
