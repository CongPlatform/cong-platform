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
              onChange={(value) => onValueChange?.({ value, label: String(metric.label ?? "Indicador") })}
              onCommit={(value) => onValueChange?.({ value, label: String(metric.label ?? "Indicador") })}
            />
            <InlineTextEditor
              value={String(metric.label ?? "Indicador")}
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
    <div className={styles.editableText}>
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
        <div className={styles.inlineGuidance} data-warning={Boolean(guide.max && text.length > guide.max)}>
          <span className={styles.inlineGuidanceCount}>
            {guide.max ? `${text.length} / ${guide.max}` : `${text.length} caracteres`}
          </span>
          <small>{guide.text}</small>
        </div>
      ) : null}
    </div>
  );
}
