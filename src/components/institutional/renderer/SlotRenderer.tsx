import { useRef, type MouseEvent, type RefObject } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiBox,
  FiCheckCircle,
  FiHeart,
  FiLink2,
  FiMapPin,
  FiPackage,
  FiShare2,
  FiStar,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

import type { InstitutionalFieldDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalAction,
  InstitutionalElementStyle,
  InstitutionalImageValue,
} from "../../../services/institutionalService";
import InlineTextEditor from "../shared/InlineTextEditor";
import FloatingCanvasHint from "./FloatingCanvasHint";
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


function placeholderForSlot(
  slot: string,
  presentation: string,
  configured?: string,
): string {
  if (configured?.trim()) return configured;
  const normalized = slot.toLocaleLowerCase("pt-BR");
  if (normalized.includes("email")) return "email@organizacao.org.br";
  if (normalized.includes("whatsapp")) return "(00) 00000-0000";
  if (normalized.includes("phone") || normalized.includes("telefone")) return "(00) 0000-0000";
  if (normalized.includes("address") || normalized.includes("endereco")) return "Endereço ou área de atuação";
  if (normalized.includes("hours") || normalized.includes("horario")) return "Horários de atendimento";
  if (presentation === "eyebrow") return "Categoria ou chamada curta";
  if (presentation === "display") return "Título principal";
  if (presentation === "heading") return "Título da seção";
  if (presentation === "caption") return "Informação complementar";
  return "Digite seu conteúdo";
}

function contactHref(slot: string, value: string): string | undefined {
  if (!value) return undefined;
  if (slot === "email") return `mailto:${value}`;
  if (slot === "phone") return `tel:${value.replace(/\s+/g, "")}`;
  if (slot === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  return undefined;
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatBrazilPhone(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  if (digits.length === 11) {
    const first = local.slice(0, 5);
    const last = local.slice(5);
    return last ? `(${area}) ${first}-${last}` : `(${area}) ${first}`;
  }
  const first = local.slice(0, 4);
  const last = local.slice(4);
  return last ? `(${area}) ${first}-${last}` : `(${area}) ${first}`;
}

function contactValidation(slot: string, value: string): string | null {
  const normalized = slot.toLocaleLowerCase("pt-BR");
  if (!value.trim()) return null;
  if (normalized.includes("email")) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
    return valid ? null : "Digite um e-mail válido, como contato@organizacao.org.br.";
  }
  if (normalized.includes("phone") || normalized.includes("telefone") || normalized.includes("whatsapp")) {
    const count = phoneDigits(value).length;
    return count === 10 || count === 11 ? null : "Informe DDD + número. Ex.: (19) 99999-9999.";
  }
  return null;
}

function normalizeContactValue(slot: string, value: string): string {
  const normalized = slot.toLocaleLowerCase("pt-BR");
  if (normalized.includes("email")) return value.replace(/\s+/g, "").toLowerCase();
  if (normalized.includes("phone") || normalized.includes("telefone") || normalized.includes("whatsapp")) return formatBrazilPhone(value);
  return value;
}


const semanticSectionByAnchor: Record<string, string> = {
  "#inicio": "organization_intro",
  "#sobre": "organization_about",
  "#impacto": "impact_metrics",
  "#projetos": "projects_showcase",
  "#como-ajudar": "support_actions",
  "#contato": "organization_contact",
};

function handleSemanticNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  editable: boolean,
): void {
  if (editable) {
    event.preventDefault();
    return;
  }

  const sectionType = semanticSectionByAnchor[href];
  if (!sectionType) return;

  const target = document.querySelector<HTMLElement>(
    `[data-section-type="${sectionType}"]`,
  );
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function normalizedLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function MetricContextIcon({ label }: { label: string }) {
  const normalized = normalizedLabel(label);
  const Icon =
    /bairro|cidade|territorio|regiao|local/.test(normalized)
      ? FiMapPin
      : /pessoa|famil|estud|alun|voluntar|profissional|crianca|adolesc/.test(normalized)
        ? FiUsers
        : /alimento|cesta|refeic|material|muda|quilo|tonelada/.test(normalized)
          ? FiBox
          : /%|percent|permanencia|crescimento|evolucao/.test(normalized)
            ? FiTrendingUp
            : FiActivity;

  return (
    <span className={styles.metricIconBadge} aria-hidden="true">
      <Icon />
    </span>
  );
}

function SupportContextIcon({ kind }: { kind: string }) {
  const Icon =
    kind === "donate"
      ? FiHeart
      : kind === "volunteer"
        ? FiUsers
        : kind === "partner"
          ? FiLink2
          : kind === "materials"
            ? FiPackage
            : kind === "share"
              ? FiShare2
              : FiStar;

  return (
    <span className={styles.supportIconBadge} aria-hidden="true">
      <Icon />
    </span>
  );
}

function TextGuidance({
  value,
  field,
  anchorRef,
}: {
  value: string;
  field: InstitutionalFieldDefinition;
  anchorRef: RefObject<HTMLElement | null>;
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
    <FloatingCanvasHint anchorRef={anchorRef} className={styles.inlineGuidance} preferredWidth={260} dataWarning={outside}>
      <span className={styles.canvasTipLabel}>Dica do editor</span>
      <span className={styles.inlineGuidanceCount}>
        {outside ? <FiAlertCircle /> : <FiCheckCircle />}
        {field.recommendedMax ? `${length} / ${field.recommendedMax}` : `${length} caracteres`}
      </span>
      {recommendation ? <span>{recommendation}</span> : null}
      {outside && field.help ? <small>{field.help}</small> : null}
    </FloatingCanvasHint>
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
  onImageFile,
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
  onImageFile?: (path: Array<string | number>, file: File) => void;
}) {
  const value = data[slot];
  const valuePath = [...path, slot];
  const textAnchorRef = useRef<HTMLDivElement>(null);

  if (presentation === "brandLogo") {
    const image = asImage(value);
    if (!image?.url) return null;
    return <img className={styles.brandLogo} src={image.url} alt="" />;
  }

  if (presentation === "metricIcon") {
    return <MetricContextIcon label={asString(value)} />;
  }

  if (presentation === "supportIcon") {
    return <SupportContextIcon kind={asString(value)} />;
  }

  if (["primaryAction", "secondaryAction"].includes(presentation)) {
    const action = asAction(value);
    if (!action) return null;
    const actionClass = presentation === "primaryAction" ? styles.primaryAction : styles.secondaryAction;

    if (editable && onValueChange) {
      return (
        <InlineTextEditor
          value={action.label}
          className={actionClass}
          placeholder="Texto do botão"
          onChange={(label) => onValueChange(valuePath, { ...action, label })}
          onCommit={(label) => onValueChange(valuePath, { ...action, label })}
        />
      );
    }

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      handleSemanticNavigation(event, action.href, editable);
    };

    return <a href={action.href} onClick={handleClick} className={actionClass} data-font-target="true">{action.label}</a>;
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
        onFile={(file) => onImageFile?.(valuePath, file)}
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
    if (editable && onValueChange) {
      return (
        <InlineTextEditor
          value={label}
          className={styles.socialLink}
          placeholder="Nome da rede"
          onChange={(nextLabel) => onValueChange([...path, "label"], nextLabel)}
          onCommit={(nextLabel) => onValueChange([...path, "label"], nextLabel)}
        />
      );
    }
    return url ? <a className={styles.socialLink} href={url} target="_blank" rel="noreferrer">{label}</a> : null;
  }

  if (presentation === "navLink") {
    const href = asString(value);
    const label = asString(data.label) || "Link";

    if (editable && onValueChange) {
      return (
        <InlineTextEditor
          value={label}
          className={styles.navLink}
          placeholder="Link do menu"
          onChange={(nextLabel) => onValueChange([...path, "label"], nextLabel)}
          onCommit={(nextLabel) => onValueChange([...path, "label"], nextLabel)}
        />
      );
    }

    if (!href) return null;
    const handleNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
      handleSemanticNavigation(event, href, editable);
    };
    return <a className={styles.navLink} href={href} onClick={handleNavigation}>{label}</a>;
  }

  if (presentation === "contactLink") {
    const text = asString(value);
    const href = contactHref(slot, text);
    if (editable && onValueChange) {
      const validation = contactValidation(slot, text);
      return (
        <span className={styles.contactEditorField} data-invalid={Boolean(validation) || undefined}>
          <InlineTextEditor
            value={text}
            className={styles.contactLine}
            placeholder={placeholderForSlot(slot, presentation, fieldDefinition?.placeholder)}
            onChange={(nextValue) => onValueChange(valuePath, normalizeContactValue(slot, nextValue))}
            onCommit={(nextValue) => onValueChange(valuePath, normalizeContactValue(slot, nextValue.trim()))}
          />
          {validation ? <small className={styles.contactValidationMessage}><FiAlertCircle /> {validation}</small> : null}
        </span>
      );
    }
    if (!text) return null;
    return href ? <a className={styles.contactLink} href={href}>{text}</a> : <span className={styles.contactLine}>{text}</span>;
  }

  const text = asString(value);
  const className = styles[presentation] ?? styles.body;
  const multiline = ["body", "lead", "itemBody", "contactLine"].includes(presentation);

  if (!text && !editable) return null;

  if (editable && onValueChange) {
    return (
      <div ref={textAnchorRef} className={styles.editableText}>
        <InlineTextEditor
          value={text}
          multiline={multiline}
          className={className}
          placeholder={placeholderForSlot(slot, presentation, fieldDefinition?.placeholder)}
          onChange={(nextValue) => onValueChange(valuePath, presentation === "contactLine" ? normalizeContactValue(slot, nextValue) : nextValue)}
          onCommit={(nextValue) => onValueChange(valuePath, presentation === "contactLine" ? normalizeContactValue(slot, nextValue.trim()) : nextValue)}
        />
        {presentation === "contactLine" && contactValidation(slot, text) ? (
          <small className={styles.contactValidationMessage}><FiAlertCircle /> {contactValidation(slot, text)}</small>
        ) : null}
        {showGuidance && selected && fieldDefinition ? <TextGuidance value={text} field={fieldDefinition} anchorRef={textAnchorRef} /> : null}
      </div>
    );
  }

  if (presentation === "display") return <h1 className={className} data-font-target="true">{text}</h1>;
  if (presentation === "heading") return <h2 className={className} data-font-target="true">{text}</h2>;
  if (["itemTitle", "metricValue"].includes(presentation)) return <strong className={className} data-font-target="true">{text}</strong>;
  return <span className={className} data-font-target="true">{text}</span>;
}
