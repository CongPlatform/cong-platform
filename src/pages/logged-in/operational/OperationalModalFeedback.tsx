import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import styles from "./OperationalModalFeedback.module.css";

export type OperationalModalFeedbackState = {
  kind: "error" | "success" | "info";
  message: string;
};

interface OperationalModalFeedbackProps {
  feedback: OperationalModalFeedbackState | null;
  className?: string;
}

export default function OperationalModalFeedback({ feedback, className }: OperationalModalFeedbackProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedback?.message) return;
    const element = ref.current;
    if (!element) return;
    element.scrollIntoView({ behavior: "auto", block: "nearest" });
    if (feedback.kind === "error") element.focus({ preventScroll: true });
  }, [feedback]);

  if (!feedback?.message) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={feedback.kind === "error" ? "alert" : "status"}
      aria-live={feedback.kind === "error" ? "assertive" : "polite"}
      className={[styles.feedback, styles[feedback.kind], className].filter(Boolean).join(" ")}
    >
      {feedback.kind === "error" ? <AlertCircle size={17} aria-hidden="true" /> : feedback.kind === "success" ? <CheckCircle2 size={17} aria-hidden="true" /> : <Info size={17} aria-hidden="true" />}
      <span>{feedback.message}</span>
    </div>
  );
}
