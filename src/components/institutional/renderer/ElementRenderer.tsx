import { useRef } from "react";
import {
  FiCheck,
  FiHeart,
  FiMapPin,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import type {
  InstitutionalAction,
  InstitutionalElementStyle,
  InstitutionalImageValue,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import InlineTextEditor from "../shared/InlineTextEditor";
import FloatingCanvasHint from "./FloatingCanvasHint";
import ImageMedia from "./ImageMedia";

import styles from "./InstitutionalRenderer.module.css";

function asAction(value: unknown): InstitutionalAction {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as InstitutionalAction).label === "string" &&
    typeof (value as InstitutionalAction).href === "string"
  ) {
    return value as InstitutionalAction;
  }
  return { label: "Saiba mais", href: "#" };
}

function asImage(value: unknown): InstitutionalImageValue | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as InstitutionalImageValue).assetId === "string"
  ) {
    return value as InstitutionalImageValue;
  }
  return null;
}

function guidanceFor(type: string): { max?: number; text: string } | null {
  if (type === "heading") return { max: 90, text: "Prefira um título curto e fácil de entender." };
  if (type === "text") return { max: 600, text: "Quebre textos longos em blocos menores quando possível." };
  if (type === "quote") return { max: 240, text: "Use uma frase curta e representativa." };
  return null;
}

export default function ElementRenderer({
  node,
  editable,
  showGuidance,
  selected = false,
  onValueChange,
  onImageRequest,
  onStyleChange,
  onInteractionStart,
  onInteractionCommit,
}: {
  node: Extract<InstitutionalLayoutNode, { type: "element" }>;
  editable: boolean;
  showGuidance: boolean;
  selected?: boolean;
  onValueChange?: (value: unknown) => void;
  onImageRequest?: () => void;
  onStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onInteractionStart?: () => void;
  onInteractionCommit?: () => void;
}) {
  const type = node.elementType;
  const textAnchorRef = useRef<HTMLDivElement>(null);

  if (type === "divider") return <hr className={styles.customDivider} />;
  if (type === "spacer") return <div className={styles.customSpacer} aria-hidden="true" />;

  if (type === "image") {
    const image = asImage(node.value);
    return (
      <ImageMedia
        image={image}
        editable={editable}
        selected={selected}
        style={node.style}
        presentation="customImage"
        guidance={selected ? {
          title: "Recorte inteligente",
          text: "Arraste a foto para escolher o ponto de interesse. Zoom e moldura ficam na barra flutuante.",
          note: "O ponto focal é preservado quando a página se adapta ao celular.",
        } : null}
        onRequest={onImageRequest}
        onStyleChange={onStyleChange}
        onInteractionStart={onInteractionStart}
        onInteractionCommit={onInteractionCommit}
      />
    );
  }

  if (type === "button") {
    const action = asAction(node.value);
    if (!editable) {
      return <a href={action.href} className={styles.primaryAction}>{action.label}</a>;
    }
    return (
      <InlineTextEditor
        value={action.label}
        className={styles.primaryAction}
        onChange={(label) => onValueChange?.({ ...action, label })}
        onCommit={(label) => onValueChange?.({ ...action, label })}
      />
    );
  }

  if (type === "icon") {
    const value = typeof node.value === "string" ? node.value : "heart";
    const Icon = value === "users" ? FiUsers : value === "star" ? FiStar : value === "check" ? FiCheck : value === "map" ? FiMapPin : FiHeart;
    return <span className={styles.customIcon}><Icon aria-hidden="true" /></span>;
  }


  if (type === "shape") {
    const shape = typeof node.value === "string" ? node.value : "circle";
    const path =
      shape === "triangle"
        ? <polygon points="50,6 96,92 4,92" />
        : shape === "diamond"
          ? <polygon points="50,4 96,50 50,96 4,50" />
          : shape === "star"
            ? <polygon points="50,4 61,36 96,36 68,56 79,91 50,70 21,91 32,56 4,36 39,36" />
            : shape === "line"
              ? <line x1="8" y1="50" x2="92" y2="50" />
              : shape === "rectangle"
                ? <rect x="8" y="22" width="84" height="56" rx="6" />
                : shape === "square"
                  ? <rect x="10" y="10" width="80" height="80" rx="4" />
                  : <circle cx="50" cy="50" r="42" />;
    return (
      <span className={styles.customShape} data-shape={shape} aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">{path}</svg>
      </span>
    );
  }

  if (type === "metric") {
    const metric = node.value && typeof node.value === "object"
      ? node.value as { value?: string; label?: string }
      : {};
    return (
      <div className={styles.customMetric}>
        {editable ? (
          <>
            <InlineTextEditor
              value={String(metric.value ?? "0")}
              className={styles.metricValue}
              onChange={(value) => onValueChange?.({ value, label: String(metric.label ?? "Resultado") })}
              onCommit={(value) => onValueChange?.({ value, label: String(metric.label ?? "Resultado") })}
            />
            <InlineTextEditor
              value={String(metric.label ?? "Resultado")}
              className={styles.metricLabel}
              onChange={(label) => onValueChange?.({ value: String(metric.value ?? "0"), label })}
              onCommit={(label) => onValueChange?.({ value: String(metric.value ?? "0"), label })}
            />
          </>
        ) : (
          <><strong className={styles.metricValue}>{metric.value}</strong><span className={styles.metricLabel}>{metric.label}</span></>
        )}
      </div>
    );
  }

  const text = typeof node.value === "string" ? node.value : "";
  const guide = guidanceFor(type);
  const className = type === "heading" ? styles.heading : type === "quote" ? styles.customQuote : styles.body;
  const multiline = type !== "heading";

  return (
    <div ref={textAnchorRef} className={styles.editableText}>
      {editable ? (
        <InlineTextEditor
          value={text}
          multiline={multiline}
          className={className}
          onChange={(value) => onValueChange?.(value)}
          onCommit={(value) => onValueChange?.(value)}
        />
      ) : type === "heading" ? (
        <h2 className={className}>{text}</h2>
      ) : (
        <p className={className}>{text}</p>
      )}
      {editable && showGuidance && guide ? (
        <FloatingCanvasHint anchorRef={textAnchorRef} className={styles.inlineGuidance} preferredWidth={520} dataWarning={Boolean(guide.max && text.length > guide.max)}>
          <span className={styles.inlineGuidanceCount}>
            {guide.max ? `${text.length} / ${guide.max}` : `${text.length} caracteres`}
          </span>
          <small>{guide.text}</small>
        </FloatingCanvasHint>
      ) : null}
    </div>
  );
}
