import type { MouseEvent } from "react";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

import type { InstitutionalFieldDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalAction,
  InstitutionalElementStyle,
  InstitutionalImageValue,
} from "../../../services/institutionalService";
import InlineTextEditor from "../shared/InlineTextEditor";
import ImageMedia from "./ImageMedia";

import styles from "./InstitutionalRenderer.module.css";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asAction(value: unknown): InstitutionalAction | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as InstitutionalAction).label === "string" &&
    typeof (value as InstitutionalAction).href === "string"
  ) {
    return value as InstitutionalAction;
  }

  return null;
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

function contactHref(slot: string, value: string): string | undefined {
  if (!value) return undefined;
  if (slot === "email") return `mailto:${value}`;
  if (slot === "phone") return `tel:${value.replace(/\s+/g, "")}`;
  if (slot === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  return undefined;
}

function TextGuidance({
  value,
  field,
}: {
  value: string;
  field: InstitutionalFieldDefinition;
}) {
  const length = value.length;
  const tooShort = typeof field.recommendedMin === "number" && length < field.recommendedMin;
  const tooLong = typeof field.recommendedMax === "number" && length > field.recommendedMax;
  const outside = tooShort || tooLong;

  if (!field.recommendedMin && !field.recommendedMax && !field.help) return null;

  const recommendation = field.recommendedMin && field.recommendedMax
    ? `Recomendado: ${field.recommendedMin}–${field.recommendedMax}`
    : field.recommendedMax
      ? `Recomendado: até ${field.recommendedMax}`
      : field.recommendedMin
        ? `Recomendado: a partir de ${field.recommendedMin}`
        : "";

  return (
    <div className={styles.inlineGuidance} data-warning={outside}>
      <span className={styles.inlineGuidanceCount}>
        {outside ? <FiAlertCircle /> : <FiCheckCircle />}
        {field.recommendedMax ? `${length} / ${field.recommendedMax}` : `${length} caracteres`}
      </span>
      {recommendation ? <span>{recommendation}</span> : null}
      {field.help ? <small>{field.help}</small> : null}
    </div>
  );
}

export default function SlotRenderer({
  slot,
  presentation = "body",
  data,
  editable,
  path,
  fieldDefinition,
  showGuidance = false,
  selected = false,
  imageStyle,
  onValueChange,
  onImageRequest,
  onImageStyleChange,
  onInteractionStart,
  onInteractionCommit,
}: {
  slot: string;
  presentation?: string;
  data: Record<string, unknown>;
  editable: boolean;
  path: Array<string | number>;
  fieldDefinition?: InstitutionalFieldDefinition;
  showGuidance?: boolean;
  selected?: boolean;
  imageStyle?: InstitutionalElementStyle;
  onValueChange?: (path: Array<string | number>, value: unknown) => void;
  onImageRequest?: (path: Array<string | number>) => void;
  onImageStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onInteractionStart?: () => void;
  onInteractionCommit?: () => void;
}) {
  const value = data[slot];
  const valuePath = [...path, slot];

  if (["primaryAction", "secondaryAction"].includes(presentation)) {
    const action = asAction(value);
    if (!action) return null;

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (editable) event.preventDefault();
    };

    return (
      <a
        href={action.href}
        onClick={handleClick}
        className={presentation === "primaryAction" ? styles.primaryAction : styles.secondaryAction}
      >
        {action.label}
      </a>
    );
  }

  if (["image", "heroImage", "wideImage", "cardImage"].includes(presentation)) {
    const image = asImage(value);
    const guidance = editable && showGuidance && fieldDefinition
      ? {
          title: fieldDefinition.imageRatio
            ? `Formato recomendado: ${fieldDefinition.imageRatio}`
            : "Imagem da seção",
          text: fieldDefinition.help,
          note: "A CONG otimiza o arquivo antes de armazenar. Esta dica não faz parte do site publicado.",
        }
      : null;

    return (
      <ImageMedia
        image={image}
        presentation={presentation}
        editable={editable}
        selected={selected}
        style={imageStyle}
        guidance={guidance}
        onRequest={() => onImageRequest?.(valuePath)}
        onStyleChange={onImageStyleChange}
        onInteractionStart={onInteractionStart}
        onInteractionCommit={onInteractionCommit}
      />
    );
  }

  if (presentation === "documentLink") {
    const url = asString(value);
    return url ? <a className={styles.documentLink} href={url} target="_blank" rel="noreferrer">Abrir documento</a> : null;
  }

  if (presentation === "socialLink") {
    const url = asString(value);
    const label = asString(data.label) || "Rede social";
    return url ? <a className={styles.socialLink} href={url} target="_blank" rel="noreferrer">{label}</a> : null;
  }

  if (presentation === "contactLink") {
    const text = asString(value);
    const href = contactHref(slot, text);
    if (!text) return null;
    return href ? <a className={styles.contactLink} href={href}>{text}</a> : <span className={styles.contactLine}>{text}</span>;
  }

  const text = asString(value);
  const className = styles[presentation] ?? styles.body;
  const multiline = ["body", "lead", "itemBody", "contactLine"].includes(presentation);

  if (!text && !editable) return null;

  if (editable && onValueChange) {
    return (
      <div className={styles.editableText}>
        <InlineTextEditor
          value={text}
          multiline={multiline}
          className={className}
          placeholder={fieldDefinition?.placeholder}
          onChange={(nextValue) => onValueChange(valuePath, nextValue)}
          onCommit={(nextValue) => onValueChange(valuePath, nextValue)}
        />
        {showGuidance && fieldDefinition ? <TextGuidance value={text} field={fieldDefinition} /> : null}
      </div>
    );
  }

  if (presentation === "display") return <h1 className={className}>{text}</h1>;
  if (presentation === "heading") return <h2 className={className}>{text}</h2>;
  if (["itemTitle", "metricValue"].includes(presentation)) return <strong className={className}>{text}</strong>;
  return <span className={className}>{text}</span>;
}
