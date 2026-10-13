import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiDroplet,
  FiEdit3,
  FiLayers,
  FiPlus,
  FiSend,
} from "react-icons/fi";

import ColorPickerControl from "../../../components/institutional/editor/ColorPickerControl";
import { ApiError } from "../../../services/api";
import {
  createInstitutionalDesignPalette,
  createInstitutionalImageFrame,
  getInstitutionalDesignPalettes,
  getInstitutionalImageFrames,
  publishInstitutionalDesignPalette,
  publishInstitutionalImageFrame,
  updateInstitutionalDesignPalette,
  updateInstitutionalImageFrame,
  type InstitutionalDesignPalette,
  type InstitutionalImageFrameResource,
} from "../../../services/institutionalService";

import styles from "./DesignerAssets.module.css";

type Tab = "palettes" | "frames";

type FrameCuts = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

const defaultColors = ["#1366C4", "#0B3C78", "#F7B534", "#F8FAFC", "#10243C"];
const defaultCuts: FrameCuts = {
  topLeft: 0,
  topRight: 14,
  bottomRight: 0,
  bottomLeft: 14,
};

function messageFromError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível salvar este recurso visual.";
}

function clipPathFromCuts(cuts: FrameCuts): string {
  return `polygon(${cuts.topLeft}% 0, ${100 - cuts.topRight}% 0, 100% ${cuts.topRight}%, 100% ${100 - cuts.bottomRight}%, ${100 - cuts.bottomRight}% 100%, ${cuts.bottomLeft}% 100%, 0 ${100 - cuts.bottomLeft}%, 0 ${cuts.topLeft}%)`;
}

function cutsFromClipPath(clipPath: string): FrameCuts {
  const values = [...clipPath.matchAll(/(-?\d+(?:\.\d+)?)%/g)].map((match) =>
    Number(match[1]),
  );
  if (values.length < 8) return defaultCuts;
  return {
    topLeft: Math.max(0, Math.min(45, values[0] ?? 0)),
    topRight: Math.max(0, Math.min(45, 100 - (values[2] ?? 100))),
    bottomRight: Math.max(0, Math.min(45, 100 - (values[8] ?? 100))),
    bottomLeft: Math.max(0, Math.min(45, values[10] ?? 0)),
  };
}

export default function DesignerAssets() {
  const [tab, setTab] = useState<Tab>("palettes");
  const [palettes, setPalettes] = useState<InstitutionalDesignPalette[]>([]);
  const [frames, setFrames] = useState<InstitutionalImageFrameResource[]>([]);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [frameId, setFrameId] = useState<string | null>(null);
  const [paletteName, setPaletteName] = useState("Nova paleta");
  const [paletteDescription, setPaletteDescription] = useState("");
  const [colors, setColors] = useState<string[]>(defaultColors);
  const [frameName, setFrameName] = useState("Nova moldura");
  const [frameDescription, setFrameDescription] = useState("");
  const [cuts, setCuts] = useState<FrameCuts>(defaultCuts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const clipPath = useMemo(() => clipPathFromCuts(cuts), [cuts]);

  async function reload(): Promise<void> {
    const [nextPalettes, nextFrames] = await Promise.all([
      getInstitutionalDesignPalettes(true),
      getInstitutionalImageFrames(true),
    ]);
    setPalettes(nextPalettes);
    setFrames(nextFrames);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getInstitutionalDesignPalettes(true),
      getInstitutionalImageFrames(true),
    ])
      .then(([nextPalettes, nextFrames]) => {
        if (cancelled) return;
        setPalettes(nextPalettes);
        setFrames(nextFrames);
      })
      .catch((caught) => {
        if (!cancelled) setError(messageFromError(caught));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function newPalette(): void {
    setPaletteId(null);
    setPaletteName("Nova paleta");
    setPaletteDescription("");
    setColors(defaultColors);
    setError("");
  }

  function editPalette(palette: InstitutionalDesignPalette): void {
    setPaletteId(palette.id);
    setPaletteName(palette.name);
    setPaletteDescription(palette.description);
    setColors(palette.colors.length >= 3 ? palette.colors : defaultColors);
    setTab("palettes");
    setError("");
  }

  function newFrame(): void {
    setFrameId(null);
    setFrameName("Nova moldura");
    setFrameDescription("");
    setCuts(defaultCuts);
    setError("");
  }

  function editFrame(frame: InstitutionalImageFrameResource): void {
    setFrameId(frame.id);
    setFrameName(frame.name);
    setFrameDescription(frame.description);
    setCuts(cutsFromClipPath(frame.clipPath));
    setTab("frames");
    setError("");
  }

  async function savePalette(): Promise<InstitutionalDesignPalette | null> {
    setSaving(true);
    setError("");
    try {
      const saved = paletteId
        ? await updateInstitutionalDesignPalette(paletteId, {
            name: paletteName,
            description: paletteDescription,
            colors,
          })
        : await createInstitutionalDesignPalette({
            name: paletteName,
            description: paletteDescription,
            colors,
          });
      setPaletteId(saved.id);
      await reload();
      return saved;
    } catch (caught) {
      setError(messageFromError(caught));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveFrame(): Promise<InstitutionalImageFrameResource | null> {
    setSaving(true);
    setError("");
    try {
      const saved = frameId
        ? await updateInstitutionalImageFrame(frameId, {
            name: frameName,
            description: frameDescription,
            clipPath,
          })
        : await createInstitutionalImageFrame({
            name: frameName,
            description: frameDescription,
            clipPath,
          });
      setFrameId(saved.id);
      await reload();
      return saved;
    } catch (caught) {
      setError(messageFromError(caught));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function launchPalette(): Promise<void> {
    const saved = await savePalette();
    if (!saved) return;
    setSaving(true);
    try {
      await publishInstitutionalDesignPalette(saved.id);
      await reload();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function launchFrame(): Promise<void> {
    const saved = await saveFrame();
    if (!saved) return;
    setSaving(true);
    try {
      await publishInstitutionalImageFrame(saved.id);
      await reload();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Designer</span>
          <h1>Recursos visuais</h1>
          <p>
            Crie paletas e molduras reutilizáveis. Quando você lançar um
            recurso, ele passa a aparecer como opção visual para as ONGs.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Tipos de recurso">
        <button
          type="button"
          data-active={tab === "palettes"}
          onClick={() => setTab("palettes")}
        >
          <FiDroplet /> Paletas
        </button>
        <button
          type="button"
          data-active={tab === "frames"}
          onClick={() => setTab("frames")}
        >
          <FiLayers /> Molduras
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {tab === "palettes" ? (
        <div className={styles.workspace}>
          <aside className={styles.library}>
            <div className={styles.libraryTitle}>
              <div>
                <strong>Minhas paletas</strong>
                <span>{palettes.length} recurso(s)</span>
              </div>
              <button type="button" onClick={newPalette}>
                <FiPlus /> Nova
              </button>
            </div>
            <div className={styles.resourceList}>
              {palettes.map((palette) => (
                <button
                  type="button"
                  key={palette.id}
                  className={styles.resourceCard}
                  data-selected={palette.id === paletteId}
                  onClick={() => editPalette(palette)}
                >
                  <div className={styles.palettePreview}>
                    {palette.colors.slice(0, 6).map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                  <span>
                    <strong>{palette.name}</strong>
                    <small>
                      {palette.status === "published"
                        ? "Disponível para as ONGs"
                        : "Rascunho"}
                    </small>
                  </span>
                  <FiEdit3 />
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editor}>
            <div className={styles.formHeader}>
              <div>
                <strong>{paletteId ? "Editar paleta" : "Criar paleta"}</strong>
                <span>
                  As cores são sugestões. A ONG continua podendo escolher
                  qualquer cor.
                </span>
              </div>
            </div>
            <label>
              <span>Nome</span>
              <input
                value={paletteName}
                onChange={(event) => setPaletteName(event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              <span>Descrição</span>
              <textarea
                value={paletteDescription}
                onChange={(event) => setPaletteDescription(event.target.value)}
                maxLength={400}
              />
            </label>
            <div className={styles.colorEditor}>
              {colors.map((color, index) => (
                <label key={index}>
                  <span>Cor {index + 1}</span>
                  <ColorPickerControl
                    value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
                    onChange={(hex) =>
                      setColors((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? hex : item,
                        ),
                      )
                    }
                    label={`Cor ${index + 1} da paleta`}
                  />
                </label>
              ))}
            </div>
            <div className={styles.paletteLargePreview}>
              {colors.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={saving}
                onClick={() => void savePalette()}
              >
                <FiCheck /> Salvar rascunho
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={saving}
                onClick={() => void launchPalette()}
              >
                <FiSend /> Lançar paleta
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.library}>
            <div className={styles.libraryTitle}>
              <div>
                <strong>Minhas molduras</strong>
                <span>{frames.length} recurso(s)</span>
              </div>
              <button type="button" onClick={newFrame}>
                <FiPlus /> Nova
              </button>
            </div>
            <div className={styles.frameGrid}>
              {frames.map((frame) => (
                <button
                  type="button"
                  key={frame.id}
                  className={styles.frameCard}
                  data-selected={frame.id === frameId}
                  onClick={() => editFrame(frame)}
                >
                  <span
                    className={styles.frameShape}
                    style={{ clipPath: frame.clipPath }}
                  />
                  <strong>{frame.name}</strong>
                  <small>
                    {frame.status === "published" ? "Disponível" : "Rascunho"}
                  </small>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editor}>
            <div className={styles.formHeader}>
              <div>
                <strong>{frameId ? "Editar moldura" : "Criar moldura"}</strong>
                <span>
                  Modele os quatro cantos e acompanhe o resultado em tempo real.
                </span>
              </div>
            </div>
            <label>
              <span>Nome</span>
              <input
                value={frameName}
                onChange={(event) => setFrameName(event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              <span>Descrição</span>
              <textarea
                value={frameDescription}
                onChange={(event) => setFrameDescription(event.target.value)}
                maxLength={400}
              />
            </label>
            <div className={styles.frameLab}>
              <div className={styles.frameLive} style={{ clipPath }}>
                <div />
              </div>
              <div className={styles.sliders}>
                {(
                  [
                    ["topLeft", "Canto superior esquerdo"],
                    ["topRight", "Canto superior direito"],
                    ["bottomRight", "Canto inferior direito"],
                    ["bottomLeft", "Canto inferior esquerdo"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="1"
                      value={cuts[key]}
                      onChange={(event) =>
                        setCuts((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                    <small>{cuts[key]}%</small>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={saving}
                onClick={() => void saveFrame()}
              >
                <FiCheck /> Salvar rascunho
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={saving}
                onClick={() => void launchFrame()}
              >
                <FiSend /> Lançar moldura
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
