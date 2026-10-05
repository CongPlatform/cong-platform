import { useLayoutEffect, useRef } from "react";

import styles from "./InlineTextEditor.module.css";

export default function InlineTextEditor({
  value,
  multiline = false,
  className = "",
  placeholder,
  onCommit,
  onChange,
}: {
  value: string;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  onChange?: (value: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const editingRef = useRef(false);
  const latestExternalValueRef = useRef(value);

  useLayoutEffect(() => {
    latestExternalValueRef.current = value;
    const element = ref.current;

    if (!element || editingRef.current || document.activeElement === element) {
      return;
    }

    if ((element.textContent ?? "") !== value) {
      element.textContent = value;
    }
  }, [value]);

  return (
    <span
      ref={ref}
      className={`${styles.editor} ${className}`}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? "Clique para editar"}
      role="textbox"
      aria-multiline={multiline}
      tabIndex={0}
      onFocus={(event) => {
        editingRef.current = true;
        if ((event.currentTarget.textContent ?? "") !== latestExternalValueRef.current) {
          event.currentTarget.textContent = latestExternalValueRef.current;
        }
      }}
      onInput={(event) => {
        const nextValue = event.currentTarget.textContent ?? "";
        onChange?.(nextValue);
      }}
      onBlur={(event) => {
        editingRef.current = false;
        const nextValue = event.currentTarget.textContent?.trim() ?? "";
        latestExternalValueRef.current = nextValue;
        onCommit(nextValue);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.textContent = latestExternalValueRef.current;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
