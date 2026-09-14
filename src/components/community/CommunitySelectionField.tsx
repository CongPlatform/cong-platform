import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import SelectionModal, {
  type SelectionOption,
} from "../profileForms/shared/SelectionModal";
import { communityTagOptions } from "./communitySelectionOptions";

import styles from "./CommunitySelectionField.module.css";

interface Props {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  options?: readonly (string | SelectionOption)[];
  description?: string;
  buttonLabel?: string;
  customLabel?: string;
  maxSelected?: number;
  optional?: boolean;
  compact?: boolean;
}

export default function CommunitySelectionField({
  label,
  values,
  onChange,
  options = communityTagOptions,
  description,
  buttonLabel = "Adicionar",
  customLabel = "Criar outra opção",
  maxSelected = 12,
  optional = false,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(() => {
    const known = options.map((option) =>
      typeof option === "string" ? option : option.value,
    );
    return [
      ...options,
      ...values
        .filter((value) => !known.includes(value))
        .map((value) => ({ value, label: value }) satisfies SelectionOption),
    ];
  }, [options, values]);

  return (
    <div className={`${styles.field} ${compact ? styles.compact : ""}`}>
      <div className={styles.heading}>
        <div>
          <strong>
            {label} {optional ? <em>Opcional</em> : null}
          </strong>
          {description ? <small>{description}</small> : null}
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" />
          {buttonLabel}
        </button>
      </div>

      {values.length ? (
        <div className={styles.chips}>
          {values.map((value) => (
            <span key={value} className={styles.chip}>
              {value}
              <button
                type="button"
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
                aria-label={`Remover ${value}`}
              >
                <X aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className={styles.emptyState}
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden="true" />
          Selecione opções ou crie uma nova
        </button>
      )}

      <SelectionModal
        open={open}
        title={label}
        description={
          description ??
          "Selecione opções existentes ou crie uma nova quando necessário."
        }
        searchPlaceholder="Buscar opções..."
        options={normalizedOptions}
        selected={values}
        maxSelected={maxSelected}
        allowCustom
        customLabel={customLabel}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
