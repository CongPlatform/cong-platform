import { useCallback, useState } from "react";
import type { OperationalModalFeedbackState } from "./OperationalModalFeedback";

export function useOperationalModalFeedback() {
  const [feedback, setFeedback] = useState<OperationalModalFeedbackState | null>(null);
  const clearFeedback = useCallback(() => setFeedback(null), []);
  const showError = useCallback((message: string) => setFeedback({ kind: "error", message }), []);
  const showSuccess = useCallback((message: string) => setFeedback({ kind: "success", message }), []);
  const showInfo = useCallback((message: string) => setFeedback({ kind: "info", message }), []);

  return { feedback, clearFeedback, showError, showSuccess, showInfo };
}
