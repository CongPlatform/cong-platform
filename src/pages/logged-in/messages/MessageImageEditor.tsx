import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiCrop, FiMinus, FiPlus, FiRotateCw, FiX } from "react-icons/fi";
import { canvasAsFile } from "./MessageMediaTools";
import styles from "./MessageImageEditor.module.css";

type Ratio = "original" | "1:1" | "4:3" | "3:4" | "16:9";
const ratios: { label: string; value: Ratio }[] = [
  { label: "Original", value: "original" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
  { label: "16:9", value: "16:9" },
];

function render(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  ratio: Ratio,
  rotation: number,
  zoom: number,
  offset: { x: number; y: number },
) {
  const turned = rotation % 180 !== 0;
  const imageWidth = turned ? image.naturalHeight : image.naturalWidth;
  const imageHeight = turned ? image.naturalWidth : image.naturalHeight;
  const aspect = ratio === "original" ? imageWidth / imageHeight :
    ratio === "1:1" ? 1 : ratio === "4:3" ? 4 / 3 : ratio === "3:4" ? 3 / 4 : 16 / 9;
  const edge = 1200;
  canvas.width = Math.max(1, Math.round(aspect >= 1 ? edge : edge * aspect));
  canvas.height = Math.max(1, Math.round(aspect >= 1 ? edge / aspect : edge));
  const context = canvas.getContext("2d");
  if (!context) return offset;
  const scale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight) * zoom;
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  const maxX = Math.max(0, (drawnWidth - canvas.width) / 2);
  const maxY = Math.max(0, (drawnHeight - canvas.height) / 2);
  const actual = {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
  context.fillStyle = "#101a29";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2 + actual.x, canvas.height / 2 + actual.y);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
  return actual;
}

export default function MessageImageEditor({
  file,
  onClose,
  onReady,
}: {
  file: File | null;
  onClose: () => void;
  onReady: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState<Ratio>("original");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    let mounted = true;
    nextImage.onload = () => { if (mounted) setImage(nextImage); };
    nextImage.onerror = () => { if (mounted) setError("Não foi possível abrir esta imagem."); };
    nextImage.src = url;
    panRef.current = { x: 0, y: 0 };
    return () => { mounted = false; URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    if (image && canvasRef.current) panRef.current = render(canvasRef.current, image, ratio, rotation, zoom, panRef.current);
  }, [image, ratio, rotation, zoom]);

  useEffect(() => {
    if (!file) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); };
  }, [file, onClose]);

  function pointerStart(event: PointerEvent<HTMLCanvasElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const previous = dragRef.current;
    const canvas = canvasRef.current;
    if (!previous || !canvas || !image || previous.pointerId !== event.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    panRef.current = {
      x: panRef.current.x + (event.clientX - previous.x) * canvas.width / bounds.width,
      y: panRef.current.y + (event.clientY - previous.y) * canvas.height / bounds.height,
    };
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    panRef.current = render(canvas, image, ratio, rotation, zoom, panRef.current);
  }
  function pointerEnd() { dragRef.current = null; }

  async function finish() {
    if (!file || !canvasRef.current || !image) return;
    setSaving(true);
    setError("");
    try {
      const result = await canvasAsFile(canvasRef.current, file.name);
      onReady(result);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível preparar a imagem.");
    } finally {
      setSaving(false);
    }
  }

  if (!file) return null;
  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="msg-image-editor-title" className={styles.dialog}>
        <header className={styles.header}>
          <span className={styles.brand}><FiCrop /> Edição de imagem</span>
          <h2 id="msg-image-editor-title">Prepare sua foto</h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} disabled={saving} aria-label="Fechar editor"><FiX /></button>
        </header>
        <div className={styles.stage}>
          {image ? (
            <div className={styles.canvasBox}>
              <canvas ref={canvasRef} className={styles.canvas}
                onPointerDown={pointerStart} onPointerMove={pointerMove}
                onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
                aria-label="Imagem para recortar. Arraste para ajustar o enquadramento" />
              <div className={styles.grid} aria-hidden="true"><i/><i/><i/><i/></div>
            </div>
          ) : <p>Carregando foto...</p>}
          <span className={styles.dragHelp}>Arraste a imagem para ajustar o enquadramento</span>
        </div>
        <div className={styles.controls}>
          <div className={styles.ratios} role="group" aria-label="Proporção do recorte">
            {ratios.map((item) => <button key={item.value} type="button" className={ratio === item.value ? styles.active : ""} aria-pressed={ratio === item.value}
              onClick={() => { panRef.current = { x: 0, y: 0 }; setRatio(item.value); }}>
              {item.label}
            </button>)}
          </div>
          <div className={styles.adjustments}>
            <button type="button" className={styles.rotate} onClick={() => { panRef.current = { x: 0, y: 0 }; setRotation((old) => (old + 90) % 360); }}><FiRotateCw /> Girar 90°</button>
            <div className={styles.zoom}>
              <button type="button" aria-label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(1, +(value - .15).toFixed(2)))}><FiMinus /></button>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Zoom" />
              <button type="button" aria-label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(3, +(value + .15).toFixed(2)))}><FiPlus /></button>
              <small>{Math.round(zoom * 100)}%</small>
            </div>
          </div>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <footer className={styles.footer}>
          <p>Imagem otimizada automaticamente para envio seguro.</p>
          <div>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className={styles.confirm} onClick={() => void finish()} disabled={!image || saving}><FiCheck /> {saving ? "Preparando..." : "Usar foto"}</button>
          </div>
        </footer>
      </section>
    </div>, document.body,
  );
}
