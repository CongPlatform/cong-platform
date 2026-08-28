import { useCallback, useEffect } from "react";
import { Check, X } from "lucide-react";

import type { VolunteerFrequency } from "../VolunteerProfileForm";
import styles from "./AvailabilityModal.module.css";

export type AvailabilityDetails = {
  days: string[];
  periods: string[];
  frequency?: VolunteerFrequency;
};

type Props = {
  open: boolean;
  value: AvailabilityDetails;
  onChange: (value: AvailabilityDetails) => void;
  onClose: () => void;
};

const DAYS = [
  ["Segunda", "Seg"],
  ["Terça", "Ter"],
  ["Quarta", "Qua"],
  ["Quinta", "Qui"],
  ["Sexta", "Sex"],
  ["Sábado", "Sáb"],
  ["Domingo", "Dom"],
] as const;

const PERIODS = ["Manhã", "Tarde", "Noite"] as const;

const FREQUENCIES: { value: Exclude<VolunteerFrequency, "flexible">; label: string }[] = [
  { value: "punctual", label: "Pontualmente" },
  { value: "monthly", label: "Algumas vezes por mês" },
  { value: "weekly", label: "Toda semana" },
];

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function AvailabilityModal({ open, value, onChange, onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  if (!open) return null;

  const flexible = value.frequency === "flexible";

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="availability-title">
        <header className={styles.header}>
          <div>
            <h3 id="availability-title">Disponibilidade</h3>
            <p>Uma visão geral já basta. A escala exata pode ser combinada depois.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Fechar">
            <X aria-hidden="true" />
          </button>
        </header>

        <label className={styles.flexibleLine}>
          <input
            type="checkbox"
            checked={flexible}
            onChange={(event) => {
              if (event.target.checked) {
                onChange({ days: [], periods: [], frequency: "flexible" });
              } else {
                onChange({ days: [], periods: [], frequency: undefined });
              }
            }}
          />
          <span>
            <strong>Minha disponibilidade varia</strong>
            <small>Use esta opção se dias e horários mudam bastante.</small>
          </span>
        </label>

        {!flexible && (
          <div className={styles.content}>
            <fieldset>
              <legend>Dias</legend>
              <div className={styles.weekRow}>
                {DAYS.map(([valueName, shortLabel]) => {
                  const selected = value.days.includes(valueName);
                  return (
                    <button
                      key={valueName}
                      type="button"
                      className={selected ? styles.selected : ""}
                      aria-pressed={selected}
                      onClick={() => onChange({ ...value, days: toggle(value.days, valueName) })}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend>Períodos</legend>
              <div className={styles.periodRow}>
                {PERIODS.map((period) => {
                  const selected = value.periods.includes(period);
                  return (
                    <button
                      key={period}
                      type="button"
                      className={selected ? styles.selected : ""}
                      aria-pressed={selected}
                      onClick={() => onChange({ ...value, periods: toggle(value.periods, period) })}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className={styles.frequencyField}>
              <label htmlFor="availability-frequency">Frequência</label>
              <select
                id="availability-frequency"
                value={value.frequency ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    frequency: (event.target.value || undefined) as VolunteerFrequency | undefined,
                  })
                }
              >
                <option value="">Selecione</option>
                {FREQUENCIES.map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" onClick={handleClose}>
            <Check aria-hidden="true" /> Concluir
          </button>
        </footer>
      </section>
    </div>
  );
}
