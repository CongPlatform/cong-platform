import type { SubmitEvent } from "react";

import {
  CAUSE_GROUPS,
  SUPPORT_TYPES,
  type SupportType,
} from "./profileOptions";

import styles from "./CollaborationProfileForm.module.css";

export type SupporterProfileFormData = {
  supportTypes: SupportType[];
  causeInterests: string[];
};

type SupporterProfileFormProps = {
  supportTypes: SupportType[];
  causeInterests: string[];
  completed: boolean;
  saving: boolean;
  onSupportTypesChange: (supportTypes: SupportType[]) => void;
  onCauseInterestsChange: (causeInterests: string[]) => void;
  onSubmit: (data: SupporterProfileFormData) => void | Promise<void>;
};

function toggleString(items: string[], item: string) {
  return items.includes(item)
    ? items.filter((current) => current !== item)
    : [...items, item];
}

function toggleSupportType(items: SupportType[], item: SupportType) {
  return items.includes(item)
    ? items.filter((current) => current !== item)
    : [...items, item];
}

export default function SupporterProfileForm({
  supportTypes,
  causeInterests,
  completed,
  saving,
  onSupportTypesChange,
  onCauseInterestsChange,
  onSubmit,
}: SupporterProfileFormProps) {
  const canSubmit = supportTypes.length > 0 && causeInterests.length > 0;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit({
      supportTypes,
      causeInterests,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Como você quer apoiar?</legend>
        <p className={styles.sectionDescription}>
          Você não precisa já conhecer uma organização. Pode começar procurando
          uma causa, fazer doações ou oferecer outros recursos.
        </p>

        <div className={styles.choiceGrid}>
          {SUPPORT_TYPES.map((option) => {
            const selected = supportTypes.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.choiceButton} ${
                  selected ? styles.choiceButtonSelected : ""
                }`}
                aria-pressed={selected}
                disabled={saving}
                onClick={() =>
                  onSupportTypesChange(
                    toggleSupportType(supportTypes, option.id),
                  )
                }
              >
                <span className={styles.choiceText}>
                  <strong>{option.label}</strong>
                </span>
              </button>
            );
          })}
        </div>

        {supportTypes.length === 0 && (
          <small className={styles.requirementHint}>
            Escolha pelo menos uma forma de apoio.
          </small>
        )}
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          Quais causas você quer apoiar?
        </legend>
        <p className={styles.sectionDescription}>
          Escolha pelo menos uma. Isso ajuda a CONG a encontrar organizações,
          campanhas e oportunidades mais próximas do que importa para você.
        </p>

        <div className={styles.accordionList}>
          {CAUSE_GROUPS.map((group) => {
            const selectedInGroup = group.options.filter((option) =>
              causeInterests.includes(option),
            ).length;

            return (
              <details key={group.id} className={styles.accordion}>
                <summary className={styles.accordionSummary}>
                  <span className={styles.accordionSummaryText}>
                    {group.label}
                  </span>
                  <span className={styles.accordionCount}>
                    {selectedInGroup > 0
                      ? `${selectedInGroup} escolhida(s)`
                      : "abrir"}
                  </span>
                </summary>

                <div className={styles.optionGrid}>
                  {group.options.map((cause) => {
                    const selected = causeInterests.includes(cause);

                    return (
                      <button
                        key={cause}
                        type="button"
                        className={`${styles.optionButton} ${
                          selected ? styles.optionButtonSelected : ""
                        }`}
                        aria-pressed={selected}
                        disabled={saving}
                        onClick={() =>
                          onCauseInterestsChange(
                            toggleString(causeInterests, cause),
                          )
                        }
                      >
                        {cause}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>

        {causeInterests.length === 0 && (
          <small className={styles.requirementHint}>
            Escolha pelo menos uma causa para continuar.
          </small>
        )}
      </fieldset>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={saving || !canSubmit}
      >
        {saving
          ? "Salvando..."
          : completed
            ? "Salvar alterações"
            : "Salvar e continuar"}
      </button>
    </form>
  );
}
