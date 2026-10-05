import { useRef, type ChangeEvent } from "react";
import {
  FiAlignCenter,
  FiAlignJustify,
  FiAlignLeft,
  FiAlignRight,
  FiCheck,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiImage,
  FiLock,
  FiPlus,
  FiTrash2,
  FiUnlock,
  FiUpload,
} from "react-icons/fi";

import {
  getSectionDefinition,
  type InstitutionalFieldDefinition,
} from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalAction,
  InstitutionalBrand,
  InstitutionalImageValue,
  InstitutionalLayoutNode,
  InstitutionalElementStyle,
  InstitutionalDesignFrame,
  InstitutionalSection,
  InstitutionalSectionStyle,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import { contrastRatio } from "../../../utils/institutionalPalette";
import { createInstitutionalCollectionItem } from "../../../utils/institutionalCollections";

import ImageFramePicker from "./ImageFramePicker";
import styles from "./PropertiesPanel.module.css";

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

function FieldCounter({
  value,
  field,
}: {
  value: string;
  field: InstitutionalFieldDefinition;
}) {
  if (!field.recommendedMax && !field.recommendedMin) {
    return null;
  }

  const recommended =
    field.recommendedMin && field.recommendedMax
      ? `${field.recommendedMin}–${field.recommendedMax}`
      : field.recommendedMax
        ? `até ${field.recommendedMax}`
        : `a partir de ${field.recommendedMin}`;

  return (
    <div className={styles.counterRow}>
      <span>{value.length} caracteres</span>
      <span>Recomendado: {recommended}</span>
    </div>
  );
}

function ImageField({
  value,
  field,
  path,
  onChange,
  onUploadImage,
  allowUpload = true,
}: {
  value: unknown;
  field: InstitutionalFieldDefinition;
  path: Array<string | number>;
  onChange: (path: Array<string | number>, value: unknown) => void;
  onUploadImage: (path: Array<string | number>, file: File) => void;
  allowUpload?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const image = asImage(value);

  return (
    <div className={styles.imageField}>
      {image?.url ? (
        <img src={image.url} alt={image.alt} className={styles.imagePreview} />
      ) : (
        <div className={styles.imageEmpty}>
          <FiImage aria-hidden="true" />
          <span>Nenhuma imagem</span>
        </div>
      )}

      <div className={styles.imageActions}>
        {allowUpload ? (
          <button type="button" onClick={() => inputRef.current?.click()}>
            <FiUpload /> {image ? "Trocar imagem" : "Enviar imagem"}
          </button>
        ) : null}
        {image ? (
          <button type="button" onClick={() => onChange(path, null)}>
            <FiTrash2 /> Remover
          </button>
        ) : null}
      </div>

      {allowUpload ? (
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            onUploadImage(path, file);
          }
          event.target.value = "";
        }}
      />
      ) : null}

      <small>
        {field.help}
        {field.imageRatio ? ` Formato recomendado: ${field.imageRatio}.` : ""}
      </small>

      {image ? (
        <label className={styles.field}>
          <span>Texto alternativo</span>
          <input
            value={image.alt}
            onChange={(event) =>
              onChange(path, {
                ...image,
                alt: event.target.value,
              })
            }
            placeholder="Descreva o que aparece na imagem"
          />
        </label>
      ) : null}
    </div>
  );
}

function ActionField({
  value,
  path,
  onChange,
}: {
  value: unknown;
  path: Array<string | number>;
  onChange: (path: Array<string | number>, value: unknown) => void;
}) {
  const action = asAction(value);

  if (!action) {
    return (
      <button
        type="button"
        className={styles.addInlineButton}
        onClick={() =>
          onChange(path, {
            label: "Saiba mais",
            href: "#",
          })
        }
      >
        <FiPlus /> Adicionar ação
      </button>
    );
  }

  return (
    <div className={styles.actionFields}>
      <label className={styles.field}>
        <span>Texto do botão</span>
        <input
          value={action.label}
          onChange={(event) =>
            onChange(path, {
              ...action,
              label: event.target.value,
            })
          }
        />
      </label>
      <label className={styles.field}>
        <span>Destino</span>
        <input
          value={action.href}
          onChange={(event) =>
            onChange(path, {
              ...action,
              href: event.target.value,
            })
          }
          placeholder="#contato ou https://..."
        />
      </label>
      <button type="button" className={styles.removeInlineButton} onClick={() => onChange(path, null)}>
        Remover ação
      </button>
    </div>
  );
}

function CollectionEditor({
  field,
  value,
  onChange,
  onUploadImage,
  allowImageUpload,
}: {
  field: InstitutionalFieldDefinition;
  value: unknown;
  onChange: (path: Array<string | number>, value: unknown) => void;
  onUploadImage: (path: Array<string | number>, file: File) => void;
  allowImageUpload: boolean;
}) {
  const items = Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object") as Record<
        string,
        unknown
      >[])
    : [];
  const itemType = field.itemType;

  if (!itemType) {
    return null;
  }

  function updateItem(index: number, key: string, nextValue: unknown): void {
    const nextItems = structuredClone(items);
    nextItems[index] = {
      ...nextItems[index],
      [key]: nextValue,
    };
    onChange([field.key], nextItems);
  }

  function removeItem(index: number): void {
    onChange(
      [field.key],
      items.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <div className={styles.collection}>
      {items.map((item, index) => (
        <div className={styles.collectionItem} key={String(item.id ?? index)}>
          <div className={styles.collectionHeader}>
            <strong>Item {index + 1}</strong>
            <button type="button" onClick={() => removeItem(index)} aria-label={`Remover item ${index + 1}`}>
              <FiTrash2 />
            </button>
          </div>

          {itemType === "project" ? (
            <>
              <label className={styles.field}>
                <span>Nome do projeto</span>
                <input value={String(item.title ?? "")} onChange={(event) => updateItem(index, "title", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Categoria</span>
                <input value={String(item.category ?? "")} onChange={(event) => updateItem(index, "category", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Descrição</span>
                <textarea value={String(item.description ?? "")} onChange={(event) => updateItem(index, "description", event.target.value)} />
              </label>
              <ImageField
                value={item.image}
                field={{ key: "image", label: "Imagem", kind: "image", imageRatio: "16:10" }}
                path={[field.key, index, "image"]}
                onChange={onChange}
                onUploadImage={onUploadImage}
                allowUpload={allowImageUpload}
              />
              <div className={styles.fieldGroup}>
                <span className={styles.groupTitle}>Ação do projeto</span>
                <ActionField
                  value={item.action}
                  path={[field.key, index, "action"]}
                  onChange={onChange}
                />
              </div>
            </>
          ) : null}

          {itemType === "impact" ? (
            <>
              <label className={styles.field}>
                <span>Valor</span>
                <input value={String(item.value ?? "")} onChange={(event) => updateItem(index, "value", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>O que o número representa</span>
                <input value={String(item.label ?? "")} onChange={(event) => updateItem(index, "label", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Período</span>
                <input value={String(item.period ?? "")} onChange={(event) => updateItem(index, "period", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Fonte ou observação</span>
                <input value={String(item.source ?? "")} onChange={(event) => updateItem(index, "source", event.target.value)} />
              </label>
            </>
          ) : null}

          {itemType === "support" ? (
            <>
              <label className={styles.field}>
                <span>Tipo</span>
                <select value={String(item.kind ?? "other")} onChange={(event) => updateItem(index, "kind", event.target.value)}>
                  <option value="donate">Doação</option>
                  <option value="volunteer">Voluntariado</option>
                  <option value="partner">Parceria</option>
                  <option value="materials">Doação de materiais</option>
                  <option value="share">Divulgação</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Título</span>
                <input value={String(item.title ?? "")} onChange={(event) => updateItem(index, "title", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Descrição</span>
                <textarea value={String(item.description ?? "")} onChange={(event) => updateItem(index, "description", event.target.value)} />
              </label>
              <div className={styles.fieldGroup}>
                <span className={styles.groupTitle}>Ação</span>
                <ActionField
                  value={item.action}
                  path={[field.key, index, "action"]}
                  onChange={onChange}
                />
              </div>
            </>
          ) : null}

          {itemType === "transparency" ? (
            <>
              <label className={styles.field}>
                <span>Categoria</span>
                <select value={String(item.category ?? "other")} onChange={(event) => updateItem(index, "category", event.target.value)}>
                  <option value="report">Relatório</option>
                  <option value="accountability">Prestação de contas</option>
                  <option value="financial">Financeiro</option>
                  <option value="statute">Estatuto</option>
                  <option value="partnership">Parceria</option>
                  <option value="governance">Governança</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Título</span>
                <input value={String(item.title ?? "")} onChange={(event) => updateItem(index, "title", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Descrição</span>
                <textarea value={String(item.description ?? "")} onChange={(event) => updateItem(index, "description", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Período</span>
                <input value={String(item.period ?? "")} onChange={(event) => updateItem(index, "period", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Link do documento</span>
                <input value={String(item.url ?? "")} onChange={(event) => updateItem(index, "url", event.target.value)} placeholder="https://..." />
              </label>
            </>
          ) : null}

          {itemType === "social" ? (
            <>
              <label className={styles.field}>
                <span>Nome</span>
                <input value={String(item.label ?? "")} onChange={(event) => updateItem(index, "label", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Link</span>
                <input value={String(item.url ?? "")} onChange={(event) => updateItem(index, "url", event.target.value)} placeholder="https://..." />
              </label>
            </>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className={styles.addItemButton}
        onClick={() => onChange([field.key], [...items, createInstitutionalCollectionItem(itemType)])}
      >
        <FiPlus /> Adicionar item
      </button>
    </div>
  );
}


function resolveElementColor(
  value: InstitutionalElementStyle["color"] | InstitutionalElementStyle["backgroundColor"],
  brand: InstitutionalBrand | undefined,
): string | null {
  if (!value) return null;
  if (value.startsWith("#")) return value;
  if (!brand) return null;
  if (value === "text") return brand.textColor;
  if (value === "primary") return brand.primaryColor;
  if (value === "secondary") return brand.secondaryColor;
  if (value === "accent") return brand.accentColor;
  return brand.backgroundColor;
}

function bestReadableElementColor(
  background: string,
  brand: InstitutionalBrand | undefined,
): InstitutionalElementStyle["color"] {
  const candidates: Array<{ value: NonNullable<InstitutionalElementStyle["color"]>; hex: string | undefined }> = [
    { value: "text", hex: brand?.textColor },
    { value: "primary", hex: brand?.primaryColor },
    { value: "secondary", hex: brand?.secondaryColor },
    { value: "accent", hex: brand?.accentColor },
    { value: "#ffffff", hex: "#ffffff" },
    { value: "#091c30", hex: "#091c30" },
  ];
  return candidates
    .filter((item): item is { value: NonNullable<InstitutionalElementStyle["color"]>; hex: string } => Boolean(item.hex))
    .sort((a, b) => contrastRatio(b.hex, background) - contrastRatio(a.hex, background))[0]?.value ?? "text";
}

function ElementOptions({
  node,
  brand,
  sectionBackground,
  designFrames,
  onStyleChange,
  onValueChange,
  onRemove,
}: {
  node: InstitutionalLayoutNode;
  brand?: InstitutionalBrand;
  sectionBackground?: InstitutionalSectionStyle["backgroundColor"];
  designFrames?: InstitutionalDesignFrame[];
  onStyleChange: (style: Partial<InstitutionalElementStyle>) => void;
  onValueChange: (value: unknown) => void;
  onRemove: () => void;
}) {
  if (node.type !== "slot" && node.type !== "element") return null;

  const style = node.style ?? {};
  const custom = node.type === "element";
  const imageNode =
    (node.type === "element" && node.elementType === "image") ||
    (node.type === "slot" && ["image", "heroImage", "wideImage", "cardImage"].includes(node.presentation ?? ""));
  const effectiveBackground =
    resolveElementColor(style.backgroundColor, brand) ??
    resolveElementColor(sectionBackground, brand) ??
    brand?.backgroundColor ??
    null;
  const effectiveText = resolveElementColor(style.color ?? "text", brand);
  const contrast =
    effectiveText && effectiveBackground
      ? contrastRatio(effectiveText, effectiveBackground)
      : null;
  const contrastPass = contrast === null || contrast >= 4.5;

  return (
    <div className={styles.elementOptions}>
      <div className={styles.elementOptionsHeader}>
        <div>
          <strong>Elemento selecionado</strong>
          <span>{custom ? node.elementType : `Campo · ${node.slot}`}</span>
        </div>
        <button type="button" onClick={onRemove}>
          <FiTrash2 />
          Remover
        </button>
      </div>

      {custom && ["heading", "text", "quote"].includes(node.elementType) ? (
        <label className={styles.field}>
          <span>Conteúdo</span>
          <textarea
            value={typeof node.value === "string" ? node.value : ""}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </label>
      ) : null}

      {custom && node.elementType === "button" ? (
        <>
          <label className={styles.field}>
            <span>Texto do botão</span>
            <input
              value={asAction(node.value)?.label ?? ""}
              onChange={(event) => onValueChange({
                label: event.target.value,
                href: asAction(node.value)?.href ?? "#",
              })}
            />
          </label>
          <label className={styles.field}>
            <span>Destino</span>
            <input
              value={asAction(node.value)?.href ?? "#"}
              onChange={(event) => onValueChange({
                label: asAction(node.value)?.label ?? "Saiba mais",
                href: event.target.value,
              })}
            />
          </label>
        </>
      ) : null}

      {custom && node.elementType === "metric" ? (
        <>
          <label className={styles.field}>
            <span>Valor</span>
            <input
              value={node.value && typeof node.value === "object" ? String((node.value as { value?: string }).value ?? "") : ""}
              onChange={(event) => onValueChange({
                value: event.target.value,
                label: node.value && typeof node.value === "object" ? String((node.value as { label?: string }).label ?? "Indicador") : "Indicador",
              })}
            />
          </label>
          <label className={styles.field}>
            <span>Legenda</span>
            <input
              value={node.value && typeof node.value === "object" ? String((node.value as { label?: string }).label ?? "") : ""}
              onChange={(event) => onValueChange({
                value: node.value && typeof node.value === "object" ? String((node.value as { value?: string }).value ?? "0") : "0",
                label: event.target.value,
              })}
            />
          </label>
        </>
      ) : null}

      {custom && node.elementType === "icon" ? (
        <label className={styles.field}>
          <span>Ícone</span>
          <select value={typeof node.value === "string" ? node.value : "heart"} onChange={(event) => onValueChange(event.target.value)}>
            <option value="heart">Coração</option>
            <option value="users">Pessoas</option>
            <option value="star">Estrela</option>
            <option value="check">Confirmação</option>
            <option value="map">Localização</option>
          </select>
        </label>
      ) : null}

      <div className={styles.compactGrid}>
        {!imageNode ? (
          <label className={styles.field}>
            <span>Tamanho</span>
            <select
              value={style.size ?? "md"}
              onChange={(event) => onStyleChange({ size: event.target.value as InstitutionalElementStyle["size"] })}
            >
              <option value="xs">Muito pequeno</option>
              <option value="sm">Pequeno</option>
              <option value="md">Médio</option>
              <option value="lg">Grande</option>
              <option value="xl">Muito grande</option>
              <option value="2xl">Destaque</option>
              <option value="3xl">Máximo</option>
            </select>
          </label>
        ) : null}

        <label className={styles.field}>
          <span>Largura</span>
          <select
            value={style.width ?? "100"}
            onChange={(event) => onStyleChange({ width: event.target.value as InstitutionalElementStyle["width"] })}
          >
            <option value="auto">Automática</option>
            <option value="25">25%</option>
            <option value="33">33%</option>
            <option value="50">50%</option>
            <option value="66">66%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </select>
        </label>
      </div>

      {imageNode ? (
        <details className={styles.sectionAppearance} open>
          <summary>Foto</summary>
          <div className={styles.sectionAppearanceBody}>
            <div className={styles.visualOptionGroup}>
              <span className={styles.visualOptionTitle}>Forma da foto</span>
              <ImageFramePicker style={style} frames={designFrames} onChange={onStyleChange} />
            </div>

            <div className={styles.visualOptionGroup}>
              <span className={styles.visualOptionTitle}>Formato</span>
              <div className={styles.aspectPicker}>
                {[
                  ["auto", "Livre", "▱"],
                  ["square", "Quadrada", "□"],
                  ["4:3", "Paisagem", "▭"],
                  ["16:9", "Panorâmica", "▬"],
                  ["portrait", "Retrato", "▯"],
                ].map(([value, label, icon]) => (
                  <button type="button" key={value} data-active={(style.imageAspect ?? "auto") === value} onClick={() => onStyleChange({ imageAspect: value as NonNullable<InstitutionalElementStyle["imageAspect"]> })}>
                    <b>{icon}</b><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fitPicker}>
              <button type="button" data-active={(style.imageFit ?? "cover") === "cover"} onClick={() => onStyleChange({ imageFit: "cover" })}>
                <span className={styles.fitPreview} data-mode="cover" /><strong>Preencher espaço</strong><small>A foto ocupa toda a moldura.</small>
              </button>
              <button type="button" data-active={(style.imageFit ?? "cover") === "contain"} onClick={() => onStyleChange({ imageFit: "contain" })}>
                <span className={styles.fitPreview} data-mode="contain" /><strong>Mostrar inteira</strong><small>Evita cortar partes da foto.</small>
              </button>
            </div>

            <label className={styles.field}>
              <span>Aproximar foto · {Math.round((style.imageZoom ?? 1) * 100)}%</span>
              <input type="range" min="1" max="3" step="0.05" value={style.imageZoom ?? 1} onChange={(event) => onStyleChange({ imageZoom: Number(event.target.value) })} />
            </label>

            <div className={styles.visualOptionGroup}>
              <span className={styles.visualOptionTitle}>Enquadramento rápido</span>
              <div className={styles.focalGrid} aria-label="Posição principal da foto">
                {[25, 50, 75].flatMap((y) => [25, 50, 75].map((x) => (
                  <button type="button" key={`${x}-${y}`} data-active={Math.abs((style.focalX ?? 50) - x) < 13 && Math.abs((style.focalY ?? 50) - y) < 13} onClick={() => onStyleChange({ focalX: x, focalY: y })} aria-label={`Focar em ${x === 25 ? "esquerda" : x === 75 ? "direita" : "centro"}, ${y === 25 ? "topo" : y === 75 ? "base" : "meio"}`} />
                )))}
              </div>
              <small className={styles.humanHint}>Você também pode arrastar a própria foto no canvas.</small>
            </div>

            <div className={styles.visualOptionGroup}>
              <span className={styles.visualOptionTitle}>Cor sobre a foto</span>
              <div className={styles.overlayRow}>
                <div className={styles.colorChoices}>
                  {(["primary", "secondary", "accent", "text"] as const).map((color) => (
                    <button type="button" key={color} data-color={color} data-active={style.overlayColor === color} onClick={() => onStyleChange({ overlayColor: color })} aria-label={`Usar cor recomendada ${color}`} />
                  ))}
                  <input type="color" value={style.overlayColor?.startsWith("#") ? style.overlayColor : "#000000"} onChange={(event) => onStyleChange({ overlayColor: event.target.value as `#${string}` })} aria-label="Escolher qualquer cor sobre a foto" />
                </div>
                <label className={styles.field}>
                  <span>Intensidade · {Math.round((style.overlayOpacity ?? 0) * 100)}%</span>
                  <input type="range" min="0" max="0.8" step="0.05" value={style.overlayOpacity ?? 0} onChange={(event) => onStyleChange({ overlayOpacity: Number(event.target.value) })} />
                </label>
              </div>
            </div>
          </div>
        </details>
      ) : null}

      {!imageNode ? (
        <div className={styles.visualOptionGroup}>
          <span className={styles.visualOptionTitle}>Alinhar texto</span>
          <div className={styles.alignmentPicker}>
            {([
              ["left", "Esquerda", <FiAlignLeft key="left" />],
              ["center", "Centro", <FiAlignCenter key="center" />],
              ["right", "Direita", <FiAlignRight key="right" />],
              ["justify", "Justificar", <FiAlignJustify key="justify" />],
            ] as const).map(([value, label, icon]) => (
              <button type="button" key={value} data-active={(style.align ?? "left") === value} onClick={() => onStyleChange({ align: value })} title={label}><b>{icon}</b><span>{label}</span></button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.visualOptionGroup}>
        <span className={styles.visualOptionTitle}>Posição do elemento</span>
        <div className={styles.placementPicker}>
          <button type="button" data-active={style.placement === "left"} onClick={() => onStyleChange({ placement: "left", offsetX: 0 })}>À esquerda</button>
          <button type="button" data-active={style.placement === "center"} onClick={() => onStyleChange({ placement: "center", offsetX: 0 })}>Centralizar</button>
          <button type="button" data-active={style.placement === "right"} onClick={() => onStyleChange({ placement: "right", offsetX: 0 })}>À direita</button>
        </div>
        <button type="button" className={styles.resetPosition} onClick={() => onStyleChange({ offsetX: 0, offsetY: 0 })}>Voltar para a posição original</button>
      </div>

      <div className={styles.layerQuickControls}>
        <button type="button" onClick={() => onStyleChange({ zIndex: Math.max(-20, (style.zIndex ?? 0) - 1) })}>Enviar para trás</button>
        <button type="button" onClick={() => onStyleChange({ zIndex: Math.min(20, (style.zIndex ?? 0) + 1) })}>Trazer para frente</button>
        <button type="button" data-active={Boolean(style.locked)} onClick={() => onStyleChange({ locked: !style.locked })}>{style.locked ? <FiUnlock /> : <FiLock />}{style.locked ? "Destravar" : "Travar"}</button>
        <button type="button" data-active={Boolean(style.hidden)} onClick={() => onStyleChange({ hidden: !style.hidden })}>{style.hidden ? <FiEye /> : <FiEyeOff />}{style.hidden ? "Mostrar" : "Ocultar"}</button>
      </div>

      {!imageNode ? (
      <div className={styles.colorOptions}>
        <span>Cor</span>
        <div>
          {(["text", "primary", "secondary", "accent"] as const).map((color) => (
            <button
              type="button"
              key={color}
              data-color={color}
              data-active={style.color === color}
              onClick={() => onStyleChange({ color })}
              aria-label={`Usar cor ${color}`}
            />
          ))}
          <input
            type="color"
            value={style.color?.startsWith("#") ? style.color : "#1366c4"}
            onChange={(event) => onStyleChange({ color: event.target.value as `#${string}` })}
            aria-label="Cor personalizada"
          />
        </div>
      </div>
      ) : null}

      {custom && node.elementType === "button" ? (
        <div className={styles.colorOptions}>
          <span>Fundo do botão</span>
          <div>
            {(["primary", "secondary", "accent", "background"] as const).map((color) => (
              <button
                type="button"
                key={color}
                data-color={color}
                data-active={style.backgroundColor === color}
                onClick={() => onStyleChange({ backgroundColor: color })}
                aria-label={`Usar fundo ${color}`}
              />
            ))}
            <input
              type="color"
              value={style.backgroundColor?.startsWith("#") ? style.backgroundColor : "#f7b534"}
              onChange={(event) => onStyleChange({ backgroundColor: event.target.value as `#${string}` })}
              aria-label="Fundo personalizado"
            />
          </div>
        </div>
      ) : null}

      {!imageNode && contrast !== null ? (
        contrastPass ? (
          <div className={styles.readingOk}><FiCheck /><span>Boa leitura</span></div>
        ) : (
          <div className={styles.contrastNotice} data-pass="false">
            <strong>Esse texto pode ficar difícil de ler</strong>
            <span>A cor está muito próxima do fundo. Você pode continuar assim ou usar uma combinação mais segura.</span>
            {effectiveBackground ? <button type="button" onClick={() => onStyleChange({ color: bestReadableElementColor(effectiveBackground, brand) })}>Melhorar automaticamente</button> : null}
          </div>
        )
      ) : null}
    </div>
  );
}

export default function PropertiesPanel({
  section,
  variants,
  onCollapse,
  onContentChange,
  onVariantChange,
  onUploadImage,
  selectedElement,
  brand,
  onElementStyleChange,
  onElementValueChange,
  onRemoveElement,
  onSectionStyleChange,
  onUploadSectionBackground,
  allowImageUpload = true,
  designFrames = [],
}: {
  section: InstitutionalSection | null;
  variants: InstitutionalVariant[];
  onCollapse: () => void;
  onContentChange: (path: Array<string | number>, value: unknown) => void;
  onVariantChange: (variantVersionId: string) => void;
  onUploadImage: (path: Array<string | number>, file: File) => void;
  selectedElement?: InstitutionalLayoutNode | null;
  brand?: InstitutionalBrand;
  onElementStyleChange?: (style: Partial<InstitutionalElementStyle>) => void;
  onElementValueChange?: (value: unknown) => void;
  onRemoveElement?: () => void;
  onSectionStyleChange?: (style: Partial<InstitutionalSectionStyle>) => void;
  onUploadSectionBackground?: (file: File) => void;
  allowImageUpload?: boolean;
  designFrames?: InstitutionalDesignFrame[];
}) {
  if (!section) {
    return (
      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <strong>Propriedades</strong>
            <span>Selecione uma seção para editar.</span>
          </div>
          <button type="button" onClick={onCollapse} aria-label="Recolher painel">
            <FiChevronRight />
          </button>
        </div>
        <div className={styles.emptyState}>
          Clique em qualquer seção da página para ver suas opções.
        </div>
      </aside>
    );
  }

  const definition = getSectionDefinition(section.sectionType);
  const sectionVariants = variants.filter(
    (variant) => variant.sectionType === section.sectionType,
  );
  const sectionStyle =
    section.settings.sectionStyle && typeof section.settings.sectionStyle === "object"
      ? (section.settings.sectionStyle as InstitutionalSectionStyle)
      : {};

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <strong>{definition.name}</strong>
          <span>{definition.purpose}</span>
        </div>
        <button type="button" onClick={onCollapse} aria-label="Recolher painel">
          <FiChevronRight />
        </button>
      </div>

      <div className={styles.panelBody}>
        {selectedElement && onElementStyleChange && onElementValueChange && onRemoveElement ? (
          <ElementOptions
            node={selectedElement}
            brand={brand}
            sectionBackground={sectionStyle.backgroundColor}
            designFrames={designFrames}
            onStyleChange={onElementStyleChange}
            onValueChange={onElementValueChange}
            onRemove={onRemoveElement}
          />
        ) : null}

        <div className={styles.variantQuickArea}>
          <div className={styles.variantQuickHeading}>
            <div><span>Composição</span><strong>{sectionVariants.find((variant) => variant.versionId === section.variantVersionId)?.name ?? "Design atual"}</strong></div>
            <small>Seu conteúdo é preservado.</small>
          </div>
          <div className={styles.variantQuickChoices}>
            {sectionVariants.slice(0, 4).map((variant) => (
              <button type="button" key={variant.versionId} data-active={variant.versionId === section.variantVersionId} onClick={() => onVariantChange(variant.versionId)}>{variant.name}</button>
            ))}
          </div>
          {sectionVariants.length > 4 ? <span className={styles.variantMoreHint}>Use <strong>Design</strong> no canvas para comparar todas as opções com prévia.</span> : null}
        </div>

        {onSectionStyleChange ? (
          <details className={styles.sectionAppearance} open>
            <summary>Design da seção</summary>
            <div className={styles.sectionAppearanceBody}>
              <div className={styles.visualOptionGroup}>
                <span className={styles.visualOptionTitle}>Respiro</span>
                <div className={styles.segmentedChoices}>
                  {([
                    ["compact", "Mais junto"],
                    ["normal", "Equilibrado"],
                    ["comfortable", "Mais leve"],
                    ["generous", "Bem amplo"],
                  ] as const).map(([value, label]) => (
                    <button type="button" key={value} data-active={(sectionStyle.spacing ?? "normal") === value} onClick={() => onSectionStyleChange({ spacing: value })}>{label}</button>
                  ))}
                </div>
              </div>

              <div className={styles.visualOptionGroup}>
                <span className={styles.visualOptionTitle}>O conteúdo ocupa</span>
                <div className={styles.widthChoices}>
                  {([
                    ["normal", "Confortável", "normal"],
                    ["wide", "Mais largo", "wide"],
                    ["full", "Tela inteira", "full"],
                  ] as const).map(([value, label, preview]) => (
                    <button type="button" key={value} data-active={(sectionStyle.contentWidth ?? "normal") === value} onClick={() => onSectionStyleChange({ contentWidth: value })}><span data-width={preview} /><small>{label}</small></button>
                  ))}
                </div>
              </div>

              <div className={styles.visualOptionGroup}>
                <span className={styles.visualOptionTitle}>Fundo</span>
                <div className={styles.backgroundModeCards}>
                  <div className={styles.backgroundCard}>
                    <div className={styles.colorOptions}>
                      <span>Cor</span>
                      <div>
                        {(["background", "primary", "secondary", "accent"] as const).map((color) => (
                          <button type="button" key={color} data-color={color} data-active={!sectionStyle.backgroundImage && sectionStyle.backgroundColor === color} onClick={() => onSectionStyleChange({ backgroundColor: color, backgroundImage: null })} aria-label={`Usar cor ${color}`} />
                        ))}
                        <input type="color" value={sectionStyle.backgroundColor?.startsWith("#") ? sectionStyle.backgroundColor : brand?.backgroundColor ?? "#ffffff"} onChange={(event) => onSectionStyleChange({ backgroundColor: event.target.value as `#${string}`, backgroundImage: null })} aria-label="Escolher outra cor" />
                      </div>
                    </div>
                  </div>

                  <div className={styles.backgroundImageCard} data-has-image={Boolean(sectionStyle.backgroundImage?.url)}>
                    {sectionStyle.backgroundImage?.url ? <img src={sectionStyle.backgroundImage.url} alt="Prévia do fundo" /> : <div><FiImage /><span>Use uma foto como fundo</span></div>}
                    {onUploadSectionBackground ? <label className={styles.backgroundUpload}><FiUpload /> {sectionStyle.backgroundImage ? "Trocar foto" : "Escolher foto"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadSectionBackground(file); event.currentTarget.value = ""; }} /></label> : null}
                    {sectionStyle.backgroundImage ? <button type="button" className={styles.removeBackground} onClick={() => onSectionStyleChange({ backgroundImage: null, backgroundTreatment: "original" })}>Remover</button> : null}
                  </div>
                </div>
              </div>

              {sectionStyle.backgroundImage ? (
                <>
                  <div className={styles.visualOptionGroup}>
                    <span className={styles.visualOptionTitle}>Tratamento da foto</span>
                    <span className={styles.humanHint}>Escolha pelo resultado. A CONG mantém o conteúdo editável.</span>
                    <div className={styles.backgroundTreatmentGrid}>
                      {([
                        ["original", "Original"],
                        ["soft", "Suave"],
                        ["dark", "Texto claro"],
                        ["light", "Texto escuro"],
                        ["brand", "Cor da marca"],
                        ["gradient", "Destaque lateral"],
                      ] as const).map(([value, label]) => (
                        <button type="button" key={value} data-treatment={value} data-active={(sectionStyle.backgroundTreatment ?? "original") === value} onClick={() => onSectionStyleChange({ backgroundTreatment: value })}><span style={{ backgroundImage: `url(${sectionStyle.backgroundImage?.url})` }} /><small>{label}</small></button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.visualOptionGroup}>
                    <span className={styles.visualOptionTitle}>Ponto principal da foto</span>
                    <span className={styles.humanHint}>Marque onde está o assunto importante para preservar melhor o enquadramento.</span>
                    <div className={styles.sectionFocalGrid}>
                      {[0, 50, 100].flatMap((y) => [0, 50, 100].map((x) => (
                        <button type="button" key={`${x}-${y}`} data-active={(sectionStyle.backgroundPositionX ?? 50) === x && (sectionStyle.backgroundPositionY ?? 50) === y} onClick={() => onSectionStyleChange({ backgroundPositionX: x, backgroundPositionY: y })} aria-label={`Foco ${x}-${y}`} />
                      )))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </details>
        ) : null}

        {definition.fields.map((field) => {
          const value = section.content[field.key];

          if (field.kind === "text" || field.kind === "textarea") {
            const text = typeof value === "string" ? value : "";
            const Input = field.kind === "textarea" ? "textarea" : "input";

            return (
              <label className={styles.field} key={field.key}>
                <span>{field.label}</span>
                <Input
                  value={text}
                  placeholder={field.placeholder}
                  onChange={(event) => onContentChange([field.key], event.target.value)}
                />
                {field.help ? <small>{field.help}</small> : null}
                <FieldCounter value={text} field={field} />
              </label>
            );
          }

          if (field.kind === "image") {
            return (
              <div className={styles.fieldGroup} key={field.key}>
                <span className={styles.groupTitle}>{field.label}</span>
                <ImageField
                  value={value}
                  field={field}
                  path={[field.key]}
                  onChange={onContentChange}
                  onUploadImage={onUploadImage}
                  allowUpload={allowImageUpload}
                />
              </div>
            );
          }

          if (field.kind === "action") {
            return (
              <div className={styles.fieldGroup} key={field.key}>
                <span className={styles.groupTitle}>{field.label}</span>
                <ActionField
                  value={value}
                  path={[field.key]}
                  onChange={onContentChange}
                />
              </div>
            );
          }

          if (field.kind === "collection") {
            return (
              <div className={styles.fieldGroup} key={field.key}>
                <span className={styles.groupTitle}>{field.label}</span>
                <CollectionEditor
                  field={field}
                  value={value}
                  onChange={onContentChange}
                  onUploadImage={onUploadImage}
                  allowImageUpload={allowImageUpload}
                />
              </div>
            );
          }

          return null;
        })}

        <details className={styles.tips} open>
          <summary>Dicas rápidas</summary>
          <ul>
            {definition.quickTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>

        <details className={styles.tutorial}>
          <summary>Ver tutorial desta seção</summary>
          <div>
            <p>1. Preencha primeiro as informações essenciais.</p>
            <p>2. Confira o resultado diretamente na página.</p>
            <p>3. Teste outra variante se quiser mudar a apresentação.</p>
          </div>
        </details>
      </div>
    </aside>
  );
}
