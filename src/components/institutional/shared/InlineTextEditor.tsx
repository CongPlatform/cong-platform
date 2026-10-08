import { useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";

import styles from "./InlineTextEditor.module.css";

function readEditorValue(element: HTMLElement, multiline: boolean): string {
  const raw = multiline ? element.innerText : (element.textContent ?? "");
  const normalized = raw.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n");
  return multiline ? normalized : normalized.replace(/\s*\n+\s*/g, " ");
}

function insertPlainText(
  event: ClipboardEvent<HTMLElement>,
  multiline: boolean,
): void {
  event.preventDefault();
  const raw = event.clipboardData.getData("text/plain");
  const text = multiline ? raw : raw.replace(/\s*\r?\n+\s*/g, " ");
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

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
  const [editing, setEditing] = useState(false);
  const latestExternalValueRef = useRef(value);

  useLayoutEffect(() => {
    latestExternalValueRef.current = value;
    const element = ref.current;

    if (!element || editing || document.activeElement === element) {
      return;
    }

    if ((element.textContent ?? "") !== value) {
      element.textContent = value;
    }
  }, [editing, value]);

  function beginEditing(): void {
    if (editing) return;
    setEditing(true);
    window.requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      element.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  return (
    <span
      ref={ref}
      className={`${styles.editor} ${className}`}
      contentEditable={editing}
      suppressContentEditableWarning
      data-placeholder={placeholder ?? "Clique duas vezes para editar"}
      data-multiline={multiline}
      data-editing={editing}
      role="textbox"
      aria-multiline={multiline}
      aria-label={
        editing
          ? "Editando texto"
          : "Texto. Clique duas vezes ou pressione Enter para editar"
      }
      tabIndex={0}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        beginEditing();
      }}
      onFocus={(event) => {
        if (!editing) return;
        if (
          (event.currentTarget.textContent ?? "") !==
          latestExternalValueRef.current
        ) {
          event.currentTarget.textContent = latestExternalValueRef.current;
        }
      }}
      onInput={(event) => {
        if (!editing) return;
        const nextValue = readEditorValue(event.currentTarget, multiline);
        onChange?.(nextValue);
      }}
      onPaste={(event) => {
        if (!editing) return;
        insertPlainText(event, multiline);
      }}
      onBlur={(event) => {
        if (!editing) return;
        const nextValue = readEditorValue(
          event.currentTarget,
          multiline,
        ).trim();
        latestExternalValueRef.current = nextValue;
        onCommit(nextValue);
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (!editing && (event.key === "Enter" || event.key === "F2")) {
          event.preventDefault();
          beginEditing();
          return;
        }

        if (!editing) return;

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
