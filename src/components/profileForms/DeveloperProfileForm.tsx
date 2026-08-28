import { useState, type SubmitEvent } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";

import { TECHNOLOGY_OPTIONS } from "../../data/profileCatalog";
import SelectionModal from "./shared/SelectionModal";
import styles from "./ProfileForm.module.css";

export type DeveloperExperienceLevel = "" | "beginner" | "intermediate" | "advanced";

export type DeveloperProfileFormData = {
  technologies: string[];
  experienceLevel: DeveloperExperienceLevel;
  portfolioUrl: string;
};

type Props = {
  technologies: string[];
  experienceLevel: DeveloperExperienceLevel;
  portfolioUrl: string;
  completed: boolean;
  saving: boolean;
  onTechnologiesChange: (value: string[]) => void;
  onExperienceLevelChange: (value: DeveloperExperienceLevel) => void;
  onPortfolioUrlChange: (value: string) => void;
  onSubmit: (data: DeveloperProfileFormData) => void | Promise<void>;
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

const EXPERIENCE_OPTIONS = [
  {
    value: "beginner",
    label: "Iniciante",
    description: "Você está aprendendo a base e quer contribuir com orientação.",
    strength: 1,
  },
  {
    value: "intermediate",
    label: "Intermediário",
    description: "Já desenvolve com autonomia e consegue assumir tarefas com algum apoio.",
    strength: 2,
  },
  {
    value: "advanced",
    label: "Avançado",
    description: "Consegue liderar soluções e apoiar decisões técnicas mais complexas.",
    strength: 3,
  },
] as const;

export default function DeveloperProfileForm(props: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const activeExperience =
    EXPERIENCE_OPTIONS.find((option) => option.value === props.experienceLevel) ?? null;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (props.technologies.length === 0) {
      setError("Escolha pelo menos uma tecnologia.");
      return;
    }

    if (!props.experienceLevel) {
      setError("Selecione seu nível de experiência.");
      return;
    }

    if (!isValidOptionalUrl(props.portfolioUrl)) {
      setError("Informe um link de portfólio válido.");
      return;
    }

    setError("");
    await props.onSubmit({
      technologies: props.technologies,
      experienceLevel: props.experienceLevel,
      portfolioUrl: normalizeOptionalUrl(props.portfolioUrl),
    });
  };

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Perfil pessoal</span>
          <h2>Desenvolvedor</h2>
          <p>Conte um pouco sobre sua experiência técnica.</p>
        </header>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>Tecnologias <span aria-hidden="true">*</span></h3>
          </div>

          {props.technologies.length > 0 && (
            <div className={styles.selectedList} aria-label="Tecnologias selecionadas">
              {props.technologies.map((technology) => (
                <span key={technology} className={styles.chip}>
                  <span>{technology}</span>
                  <button
                    type="button"
                    onClick={() =>
                      props.onTechnologiesChange(
                        props.technologies.filter((item) => item !== technology),
                      )
                    }
                    aria-label={`Remover ${technology}`}
                  >
                    <X aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <button type="button" className={styles.addButton} onClick={() => setModalOpen(true)}>
            <Plus aria-hidden="true" />
            Adicionar tecnologias
          </button>
        </section>

        <fieldset className={styles.fieldset}>
          <legend>Experiência <span aria-hidden="true">*</span></legend>
          <div className={styles.segmentedControl}>
            {EXPERIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={props.experienceLevel === option.value ? styles.segmentSelected : ""}
                aria-pressed={props.experienceLevel === option.value}
                onClick={() => {
                  props.onExperienceLevelChange(option.value);
                  setError("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.experiencePreview} aria-live="polite">
            <div className={styles.experienceMeter} aria-hidden="true">
              {EXPERIENCE_OPTIONS.map((option) => (
                <span
                  key={option.value}
                  className={
                    activeExperience && option.strength <= activeExperience.strength
                      ? styles.experienceMeterActive
                      : ""
                  }
                />
              ))}
            </div>

            <div className={styles.experienceCopy}>
              <strong>
                {activeExperience ? activeExperience.label : "Escolha o nível que mais combina com você"}
              </strong>
              <span>
                {activeExperience
                  ? activeExperience.description
                  : "Usamos isso para sugerir contribuições compatíveis com sua autonomia técnica."}
              </span>
            </div>
          </div>
        </fieldset>

        <section className={styles.section}>
          <div className={styles.field}>
            <label htmlFor="developer-portfolio">Portfólio <span>opcional</span></label>
            <input
              id="developer-portfolio"
              type="text"
              inputMode="url"
              value={props.portfolioUrl}
              onChange={(event) => {
                props.onPortfolioUrlChange(event.target.value);
                setError("");
              }}
              placeholder="github.com/seuusuario"
            />
          </div>
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.footer}>
          <button className={styles.submitButton} type="submit" disabled={props.saving}>
            {props.saving && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
            {props.saving ? "Salvando..." : props.completed ? "Salvar alterações" : "Salvar e continuar"}
          </button>
        </footer>
      </form>

      <SelectionModal
        open={modalOpen}
        title="Tecnologias"
        description="Busque e selecione o que você usa ou está aprendendo."
        options={TECHNOLOGY_OPTIONS}
        selected={props.technologies}
        maxSelected={20}
        allowCustom
        customLabel="Adicionar outra tecnologia"
        onChange={(next) => {
          props.onTechnologiesChange(next);
          setError("");
        }}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
