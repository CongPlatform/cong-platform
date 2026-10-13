import { useEffect, useRef, useState } from "react";
import { FiMic, FiSend, FiSquare, FiTrash2 } from "react-icons/fi";
import { MAX_MESSAGE_ATTACHMENT_BYTES } from "../../../services/messageAttachments";
import styles from "./InlineVoiceRecorder.module.css";

type Props = {
  onCancel: () => void;
  onSend: (file: File) => Promise<boolean>;
  onError: (reason: string) => void;
};

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/** The microphone is active only while this inline composer is mounted. */
export default function InlineVoiceRecorder({
  onCancel,
  onSend,
  onError,
}: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);
  const [stage, setStage] = useState<
    "starting" | "recording" | "preview" | "sending"
  >("starting");
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;
    async function startRecording() {
      try {
        if (
          !navigator.mediaDevices?.getUserMedia ||
          typeof MediaRecorder === "undefined"
        ) {
          throw new Error(
            "A gravação de áudio não é compatível com este navegador.",
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
          (type) => MediaRecorder.isTypeSupported(type),
        );
        const recorder = new MediaRecorder(stream, {
          ...(mime ? { mimeType: mime } : {}),
          audioBitsPerSecond: 32000,
        });
        const parts: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size) parts.push(event.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (!aliveRef.current) return;
          const type = recorder.mimeType || "audio/webm";
          const blob = new Blob(parts, { type });
          if (!blob.size) {
            onError("Não foi possível registrar o áudio. Tente novamente.");
            onCancel();
            return;
          }
          if (blob.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
            onError(
              "O áudio ultrapassou o limite de 1 MB. Grave uma mensagem mais curta.",
            );
            onCancel();
            return;
          }
          const recording = new File(
            [blob],
            `audio-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`,
            { type },
          );
          previewUrlRef.current = URL.createObjectURL(recording);
          setPreviewUrl(previewUrlRef.current);
          setFile(recording);
          setStage("preview");
        };
        recorderRef.current = recorder;
        recorder.start(250);
        setStage("recording");
        timerRef.current = setInterval(() => {
          setSeconds((value) => {
            if (value >= 119) {
              // Keeps recording sizes conservative while supporting meaningful voice notes.
              if (recorder.state === "recording") recorder.stop();
              if (timerRef.current) clearInterval(timerRef.current);
              return 120;
            }
            return value + 1;
          });
        }, 1000);
      } catch (reason) {
        onError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível usar o microfone.",
        );
        onCancel();
      }
    }
    void startRecording();
    return () => {
      cancelled = true;
      aliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
    // Start/stop lifecycle is tied to mounting the recorder, not to parent callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function send() {
    if (!file) return;
    setStage("sending");
    const succeeded = await onSend(file);
    if (succeeded) onCancel();
    else setStage("preview");
  }

  return (
    <div
      className={styles.recorder}
      role="group"
      aria-label="Gravação de mensagem de voz"
    >
      <button
        type="button"
        className={styles.cancel}
        onClick={onCancel}
        disabled={stage === "sending"}
        aria-label="Descartar áudio"
        title="Descartar"
      >
        <FiTrash2 />
      </button>
      <div className={styles.track}>
        {stage === "recording" || stage === "starting" ? (
          <>
            <span
              className={`${styles.liveDot} ${stage === "starting" ? styles.starting : ""}`}
            />
            <strong>{timeLabel(seconds)}</strong>
            <span className={styles.wave} aria-label="Gravando">
              {Array.from({ length: 17 }, (_, index) => (
                <i
                  key={index}
                  style={{ height: `${8 + ((index * 17) % 19)}px` }}
                />
              ))}
            </span>
            <small>
              {stage === "starting"
                ? "Iniciando microfone..."
                : "Gravando áudio"}
            </small>
          </>
        ) : (
          <>
            <FiMic className={styles.previewIcon} aria-hidden="true" />
            <strong>{timeLabel(seconds)}</strong>
            {previewUrl ? (
              <audio
                src={previewUrl}
                controls
                preload="metadata"
                aria-label="Ouvir gravação"
              />
            ) : null}
          </>
        )}
      </div>
      {stage === "recording" ? (
        <button
          type="button"
          className={styles.primary}
          onClick={stop}
          title="Parar e ouvir"
          aria-label="Parar e ouvir gravação"
        >
          <FiSquare />
        </button>
      ) : stage === "preview" || stage === "sending" ? (
        <button
          type="button"
          className={styles.primary}
          disabled={stage === "sending"}
          onClick={() => void send()}
          title="Enviar áudio"
          aria-label="Enviar áudio"
        >
          <FiSend />
        </button>
      ) : (
        <span className={styles.waiting} />
      )}
    </div>
  );
}
