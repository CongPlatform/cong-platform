import type { CSSProperties } from "react";
import type {
  InstitutionalDesignFrame,
  InstitutionalElementStyle,
  InstitutionalImageFrame,
} from "../../../services/institutionalService";

import styles from "./ImageFramePicker.module.css";

type FrameOption = {
  id: InstitutionalImageFrame;
  label: string;
  clipPath?: string;
};

const builtInFrames: FrameOption[] = [
  { id: "rectangle", label: "Reta" },
  { id: "rounded", label: "Arredondada" },
  { id: "circle", label: "Círculo" },
  { id: "arch", label: "Arco" },
  { id: "blob", label: "Orgânica" },
  { id: "diagonal-left", label: "Diagonal A" },
  { id: "diagonal-right", label: "Diagonal B" },
];

function previewStyle(
  frame: InstitutionalImageFrame,
  clipPath?: string,
): CSSProperties {
  if (frame === "custom") return { clipPath };
  if (frame === "rectangle") return { borderRadius: 0 };
  if (frame === "rounded") return { borderRadius: 14 };
  if (frame === "circle") return { width: 34, height: 34, borderRadius: "50%" };
  if (frame === "arch")
    return { borderRadius: "48% 48% 12px 12px / 42% 42% 12px 12px" };
  if (frame === "blob")
    return { borderRadius: "38% 62% 58% 42% / 45% 38% 62% 55%" };
  if (frame === "diagonal-left")
    return { clipPath: "polygon(8% 0,100% 0,92% 100%,0 100%)" };
  return { clipPath: "polygon(0 0,92% 0,100% 100%,8% 100%)" };
}

export default function ImageFramePicker({
  style,
  frames = [],
  onChange,
  previewImageUrl,
}: {
  style: InstitutionalElementStyle;
  frames?: InstitutionalDesignFrame[];
  onChange: (style: Partial<InstitutionalElementStyle>) => void;
  previewImageUrl?: string;
}) {
  const current = style.imageFrame ?? "rounded";

  return (
    <div className={styles.wrap}>
      <div className={styles.grid} aria-label="Escolha a forma da foto">
        {builtInFrames.map((frame) => (
          <button
            type="button"
            key={frame.id}
            className={styles.option}
            data-active={current === frame.id}
            onClick={() =>
              onChange({
                imageFrame: frame.id,
                imageFrameLabel: undefined,
                imageClipPath: undefined,
              })
            }
          >
            <span
              className={styles.preview}
              data-has-image={Boolean(previewImageUrl)}
              style={{
                ...previewStyle(frame.id),
                ...(previewImageUrl
                  ? {
                      backgroundImage: `url(${JSON.stringify(previewImageUrl)})`,
                    }
                  : {}),
              }}
            />
            <small>{frame.label}</small>
          </button>
        ))}
      </div>

      {frames.length > 0 ? (
        <div className={styles.communityBlock}>
          <span>Criadas por designers</span>
          <div className={styles.grid}>
            {frames.map((frame) => {
              const active =
                current === "custom" &&
                style.imageFrameLabel === frame.name &&
                style.imageClipPath === frame.clipPath;
              return (
                <button
                  type="button"
                  key={frame.id}
                  className={styles.option}
                  data-active={active}
                  onClick={() =>
                    onChange({
                      imageFrame: "custom",
                      imageFrameLabel: frame.name,
                      imageClipPath: frame.clipPath,
                    })
                  }
                >
                  <span
                    className={styles.preview}
                    data-has-image={Boolean(previewImageUrl)}
                    style={{
                      ...previewStyle("custom", frame.clipPath),
                      ...(previewImageUrl
                        ? {
                            backgroundImage: `url(${JSON.stringify(previewImageUrl)})`,
                          }
                        : {}),
                    }}
                  />
                  <small>{frame.name}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
