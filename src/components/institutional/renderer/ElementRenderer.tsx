import { useRef } from "react";
import { getInstitutionalIconDefinition } from "../../../data/institutional/iconLibrary";

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
  onImageFile,
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
  onImageFile?: (file: File) => void;
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
        onFile={onImageFile}
        onStyleChange={onStyleChange}
        onInteractionStart={onInteractionStart}
        onInteractionCommit={onInteractionCommit}
      />
    );
  }

  if (type === "button") {
    const action = asAction(node.value);
    if (!editable) {
      return <a href={action.href} className={styles.primaryAction} data-font-target="true">{action.label}</a>;
    }
    return (
      <InlineTextEditor
        value={action.label}
        className={styles.primaryAction}
        placeholder="Texto do botão"
        onChange={(label) => onValueChange?.({ ...action, label })}
        onCommit={(label) => onValueChange?.({ ...action, label })}
      />
    );
  }

  if (type === "icon") {
    const definition = getInstitutionalIconDefinition(node.value);
    const Icon = definition.icon;
    const strokeWidth = Math.max(0.5, Math.min(4, node.style?.iconStrokeWidth ?? 2));
    return (
      <span
        className={styles.customIcon}
        data-icon-id={definition.id}
        title={editable ? definition.label : undefined}
      >
        <Icon aria-hidden="true" strokeWidth={strokeWidth} />
      </span>
    );
  }


  if (type === "shape") {
    const shape = typeof node.value === "string" ? node.value : "square";
    const shapeRadius = Math.max(0, Math.min(50, node.style?.shapeRadius ?? 8));
    const path =
      shape === "triangle"
        ? <polygon points="50,5 97,94 3,94" />
        : shape === "diamond"
          ? <polygon points="50,3 97,50 50,97 3,50" />
          : shape === "pentagon"
            ? <polygon points="50,4 96,38 78,94 22,94 4,38" />
            : shape === "hexagon"
              ? <polygon points="25,5 75,5 98,50 75,95 25,95 2,50" />
              : shape === "star"
                ? <polygon points="50,3 61,36 96,36 68,56 79,92 50,71 21,92 32,56 4,36 39,36" />
                : shape === "arrow"
                  ? <polygon points="4,36 62,36 62,17 97,50 62,83 62,64 4,64" />
                  : shape === "blob"
                    ? <path d="M83.7,18.8C94.2,30.7,97,49.4,90.3,65.4C83.5,81.4,67.2,94.8,49.9,94.7C32.6,94.6,14.3,81,7.8,64.1C1.3,47.2,6.6,27,20.2,15.7C33.8,4.4,55.7,2,70.2,8.7C75.4,11.1,79.9,14.5,83.7,18.8Z" />
                    : shape === "line"
                      ? <line x1="4" y1="50" x2="96" y2="50" />
                      : shape === "circle"
                        ? <circle cx="50" cy="50" r="46" />
                        : <rect x="4" y="4" width="92" height="92" rx={shapeRadius} ry={shapeRadius} />;
    return (
      <span className={styles.customShape} data-shape={shape} aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">{path}</svg>
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
          placeholder={type === "heading" ? "Título do elemento" : type === "quote" ? "Escreva um depoimento" : "Digite seu texto"}
          onChange={(value) => onValueChange?.(value)}
          onCommit={(value) => onValueChange?.(value)}
        />
      ) : type === "heading" ? (
        <h2 className={className} data-font-target="true">{text}</h2>
      ) : (
        <p className={className} data-font-target="true">{text}</p>
      )}
      {editable && showGuidance && guide ? (
        <FloatingCanvasHint anchorRef={textAnchorRef} className={styles.inlineGuidance} preferredWidth={380} dataWarning={Boolean(guide.max && text.length > guide.max)}>
          <span className={styles.inlineGuidanceCount}>
            {guide.max ? `${text.length} / ${guide.max}` : `${text.length} caracteres`}
          </span>
          <small>{guide.text}</small>
        </FloatingCanvasHint>
      ) : null}
    </div>
  );
}
