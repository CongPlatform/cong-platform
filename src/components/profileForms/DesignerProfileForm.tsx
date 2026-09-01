import { useState, type SubmitEvent } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";

import {
  DESIGN_SPECIALTY_OPTIONS,
  DESIGN_TOOL_OPTIONS,
} from "../../data/profileCatalog";
import SelectionModal from "./shared/SelectionModal";
import styles from "./ProfileForm.module.css";

export type DesignerProfileFormData = {
  specialties: string[];
  tools: string[];
  portfolioUrl: string;
};

type Props = DesignerProfileFormData & {
  completed: boolean;
  saving: boolean;
  submitLabel?: string;
  onSpecialtiesChange: (value: string[]) => void;
  onToolsChange: (value: string[]) => void;
  onPortfolioUrlChange: (value: string) => void;
  onSubmit: (data: DesignerProfileFormData) => void | Promise<void>;
};

function normalizeOptionalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(normalizeOptionalUrl(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function SelectedItems({
  values,
  onChange,
}: {
  values: string[];
  onChange: (value: string[]) => void;
}) {
  if (!values.length) return null;

  return (
    <div className={styles.selectedList}>
      {values.map((value) => (
        <span className={styles.chip} key={value}>
          <span>{value}</span>
          <button
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            aria-label={`Remover ${value}`}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function DesignerProfileForm(props: Props) {
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!props.specialties.length) {
      setError("Escolha pelo menos uma especialidade.");
      return;
    }

    if (!props.tools.length) {
      setError("Escolha pelo menos uma ferramenta que você utiliza.");
      return;
    }

    if (!isValidOptionalUrl(props.portfolioUrl)) {
      setError("Informe um link de portfólio válido.");
      return;
    }

    setError("");
    await props.onSubmit({
      specialties: props.specialties,
      tools: props.tools,
      portfolioUrl: normalizeOptionalUrl(props.portfolioUrl),
    });
  };

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Perfil pessoal</span>
          <h2>Designer</h2>
          <p>Conte onde você pode contribuir.</p>
        </header>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Especialidades <span aria-hidden="true">*</span>
            </h3>
          </div>
          <SelectedItems
            values={props.specialties}
            onChange={props.onSpecialtiesChange}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setSpecialtiesOpen(true)}
          >
            <Plus aria-hidden="true" />
            Adicionar especialidades
          </button>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Ferramentas <span aria-hidden="true">*</span>
            </h3>
          </div>
          <SelectedItems values={props.tools} onChange={props.onToolsChange} />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setToolsOpen(true)}
          >
            <Plus aria-hidden="true" />
            Adicionar ferramentas
          </button>
        </section>

        <section className={styles.section}>
          <div className={styles.field}>
            <label htmlFor="designer-portfolio">
              Portfólio <span>opcional</span>
            </label>
            <input
              id="designer-portfolio"
              type="text"
              inputMode="url"
              value={props.portfolioUrl}
              onChange={(event) => {
                props.onPortfolioUrlChange(event.target.value);
                setError("");
              }}
              placeholder="behance.net/seuusuario"
            />
          </div>
        </section>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.footer}>
          <button
            className={styles.submitButton}
            type="submit"
            disabled={props.saving}
          >
            {props.saving && (
              <LoaderCircle className={styles.spinner} aria-hidden="true" />
            )}
            {props.saving
              ? "Salvando..."
              : (props.submitLabel ??
                (props.completed ? "Salvar alterações" : "Salvar e continuar"))}
          </button>
        </footer>
      </form>

      <SelectionModal
        open={specialtiesOpen}
        title="Especialidades"
        options={DESIGN_SPECIALTY_OPTIONS}
        selected={props.specialties}
        maxSelected={20}
        allowCustom
        customLabel="Adicionar outra especialidade"
        onChange={(next) => {
          props.onSpecialtiesChange(next);
          setError("");
        }}
        onClose={() => setSpecialtiesOpen(false)}
      />

      <SelectionModal
        open={toolsOpen}
        title="Ferramentas"
        options={DESIGN_TOOL_OPTIONS}
        selected={props.tools}
        maxSelected={20}
        allowCustom
        customLabel="Adicionar outra ferramenta"
        onChange={(next) => {
          props.onToolsChange(next);
          setError("");
        }}
        onClose={() => setToolsOpen(false)}
      />
    </>
  );
}
