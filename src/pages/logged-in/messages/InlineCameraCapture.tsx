import { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheck, FiSquare, FiTrash2, FiVideo } from "react-icons/fi";
import { MAX_MESSAGE_ATTACHMENT_BYTES } from "../../../services/messageAttachments";
import { prepareMessageFile } from "./MessageMediaTools";
import styles from "./InlineCameraCapture.module.css";

export default function InlineCameraCapture({
  mode,
  onCancel,
  onReady,
  onError,
}: {
  mode: "photo" | "video";
  onCancel: () => void;
  onReady: (file: File) => void;
  onError: (message: string) => void;
}) {
  const liveVideo = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const previewUrlRef = useRef<string | null>(null);
  const [stage, setStage] = useState<
    "starting" | "ready" | "recording" | "preview" | "processing"
  >("starting");
  const [seconds, setSeconds] = useState(0);
  const [recorded, setRecorded] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function connect() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Câmera indisponível neste navegador.");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: mode === "video",
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (liveVideo.current) liveVideo.current.srcObject = stream;
        setStage("ready");
      } catch (reason) {
        onError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir a câmera.",
        );
        onCancel();
      }
    }
    void connect();
    return () => {
      cancelled = true;
      mounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
    // Camera lifecycle is per mounting; callback changes don't restart permission prompts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function takePhoto() {
    const video = liveVideo.current;
    if (!video?.videoWidth) return;
    setStage("processing");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas
        .getContext("2d")
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.83),
      );
      if (!blob) throw new Error("Falha ao preparar foto.");
      const file = await prepareMessageFile(
        new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }),
      );
      if (mounted.current) onReady(file);
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível capturar a imagem.",
      );
      setStage("ready");
    }
  }

  function startVideo() {
    if (!streamRef.current || typeof MediaRecorder === "undefined") {
      onError("A gravação de vídeo não é compatível com este navegador.");
      return;
    }
    const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
      (type) => MediaRecorder.isTypeSupported(type),
    );
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 220000,
        audioBitsPerSecond: 24000,
      });
      const parts: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) parts.push(event.data);
      };
      recorder.onstop = () => {
        if (!mounted.current) return;
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(parts, { type });
        if (!blob.size || blob.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
          onError(
            "O vídeo ultrapassou 1 MB ou ficou vazio. Grave um vídeo menor.",
          );
          setStage("ready");
          return;
        }
        // Turn off the camera once the clip is ready for review.
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const videoFile = new File(
          [blob],
          `video-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`,
          { type },
        );
        previewUrlRef.current = URL.createObjectURL(videoFile);
        setPreviewUrl(previewUrlRef.current);
        setRecorded(videoFile);
        setStage("preview");
      };
      recorderRef.current = recorder;
      recorder.start(300);
      setSeconds(0);
      setStage("recording");
      timerRef.current = setInterval(
        () =>
          setSeconds((old) => {
            if (old >= 24) {
              if (recorder.state === "recording") recorder.stop();
              if (timerRef.current) clearInterval(timerRef.current);
              return 25;
            }
            return old + 1;
          }),
        1000,
      );
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível iniciar gravação de vídeo.",
      );
    }
  }

  function stopVideo() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div
      className={styles.camera}
      role="group"
      aria-label={mode === "photo" ? "Fotografar" : "Gravar vídeo"}
    >
      <div className={styles.screen}>
        <video
          ref={liveVideo}
          autoPlay
          muted
          playsInline
          className={stage === "preview" ? styles.hidden : styles.live}
          aria-label="Câmera ao vivo"
        />
        {stage === "preview" && previewUrl ? (
          <video
            src={previewUrl}
            controls
            playsInline
            className={styles.live}
            aria-label="Prévia de vídeo"
          />
        ) : null}
        {stage === "recording" ? (
          <span className={styles.timer}>● {seconds}s</span>
        ) : null}
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={onCancel} aria-label="Cancelar captura">
          <FiTrash2 /> Cancelar
        </button>
        {mode === "photo" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={stage !== "ready"}
            onClick={() => void takePhoto()}
          >
            <FiCamera /> Fotografar
          </button>
        ) : stage === "preview" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={!recorded}
            onClick={() => {
              if (recorded) onReady(recorded);
            }}
          >
            <FiCheck /> Usar vídeo
          </button>
        ) : stage === "recording" ? (
          <button type="button" className={styles.primary} onClick={stopVideo}>
            <FiSquare /> Parar
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={stage !== "ready"}
            onClick={startVideo}
          >
            <FiVideo /> Gravar
          </button>
        )}
      </div>
    </div>
  );
}
