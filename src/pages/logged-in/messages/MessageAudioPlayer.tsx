import { useRef, useState } from "react";
import { FiPause, FiPlay, FiVolume2 } from "react-icons/fi";
import styles from "./MessageAudioPlayer.module.css";

function stamp(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

/** Browser-native decoding and playback with a compact, accessible CONG transport. */
export default function MessageAudioPlayer({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  async function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    try {
      await element.play();
    } catch {
      setPlaying(false);
    }
  }
  function changeSpeed() {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  }
  return (
    <div className={styles.player} onClick={(event) => event.stopPropagation()}>
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        aria-label={name}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        className={styles.play}
        onClick={() => void toggle()}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {playing ? <FiPause /> : <FiPlay />}
      </button>
      <div className={styles.track}>
        <div className={styles.wave} aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i
              key={index}
              style={{ height: `${6 + ((index * 13 + 7) % 19)}px` }}
            />
          ))}
        </div>
        <input
          type="range"
          aria-label="Posição do áudio"
          min={0}
          max={Number.isFinite(duration) && duration > 0 ? duration : 1}
          step={0.1}
          value={Math.min(time, duration || 1)}
          onChange={(event) => {
            if (audio.current) {
              audio.current.currentTime = Number(event.target.value);
              setTime(audio.current.currentTime);
            }
          }}
        />
        <small>
          {stamp(time)} / {stamp(duration)}
        </small>
      </div>
      <button
        type="button"
        className={styles.speed}
        onClick={changeSpeed}
        title="Velocidade de reprodução"
        aria-label={`Velocidade ${speed} vezes`}
      >
        {speed}×
      </button>
      <FiVolume2 className={styles.volume} aria-hidden="true" />
    </div>
  );
}
