import { useState, type SubmitEvent } from "react";
import {
  AudioLines,
  BookOpenText,
  Captions,
  Grid2X2,
  Hand,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";

import {
  ACCESSIBILITY_SKILL_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../../data/profileCatalog";
import SelectionModal from "./shared/SelectionModal";
import styles from "./ProfileForm.module.css";

export type TranslatorProfileFormData = {
  languages: string[];
  accessibilitySkills: string[];
  notes: string;
};

type Props = TranslatorProfileFormData & {
  completed: boolean;
  saving: boolean;
  onLanguagesChange: (value: string[]) => void;
  onAccessibilitySkillsChange: (value: string[]) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (data: TranslatorProfileFormData) => void | Promise<void>;
};

const ACCESSIBILITY_ICONS = {
  libras: Hand,
  braille: Grid2X2,
  "audio-description": AudioLines,
  "accessible-captions": Captions,
  "plain-language": BookOpenText,
} as const;

function languageCode(language: string): string {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === language)?.code ??
    language.slice(0, 2).toUpperCase()
  );
}

export default function TranslatorProfileForm(props: Props) {
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      props.languages.length === 0 &&
      props.accessibilitySkills.length === 0
    ) {
      setError("Escolha ao menos um idioma ou recurso de acessibilidade.");
      return;
    }

    setError("");
    await props.onSubmit({
      languages: props.languages,
      accessibilitySkills: props.accessibilitySkills,
      notes: props.notes,
    });
  };

  const toggleSkill = (skill: string) => {
    props.onAccessibilitySkillsChange(
      props.accessibilitySkills.includes(skill)
        ? props.accessibilitySkills.filter((item) => item !== skill)
        : [...props.accessibilitySkills, skill],
    );
    setError("");
  };

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Perfil pessoal</span>
          <h2>Tradução e acessibilidade</h2>
          <p>Informe os idiomas e recursos com que você consegue colaborar.</p>
        </header>

        <fieldset className={styles.fieldset}>
          <legend>Recursos de acessibilidade</legend>
          <div className={styles.accessibilityList}>
            {ACCESSIBILITY_SKILL_OPTIONS.map((option) => {
              const Icon = ACCESSIBILITY_ICONS[option.id];
              const selected = props.accessibilitySkills.includes(option.label);

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.accessibilityOption} ${selected ? styles.selected : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleSkill(option.label)}
                >
                  <span className={styles.monoIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>Idiomas</h3>
          </div>

          {props.languages.length > 0 && (
            <div className={styles.languageList}>
              {props.languages.map((language) => (
                <div className={styles.languageItem} key={language}>
                  <span className={styles.languageCode}>
                    {languageCode(language)}
                  </span>
                  <span className={styles.languageName}>{language}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${language}`}
                    onClick={() =>
                      props.onLanguagesChange(
                        props.languages.filter((item) => item !== language),
                      )
                    }
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className={styles.addButton}
            onClick={() => setLanguagesOpen(true)}
          >
            <Plus aria-hidden="true" />
            Adicionar idiomas
          </button>
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
              : props.completed
                ? "Salvar alterações"
                : "Salvar e continuar"}
          </button>
        </footer>
      </form>

      <SelectionModal
        open={languagesOpen}
        title="Idiomas"
        description="Escolha os idiomas em que você pode traduzir, revisar ou adaptar conteúdo."
        options={LANGUAGE_OPTIONS}
        selected={props.languages}
        maxSelected={10}
        allowCustom
        customLabel="Adicionar outro idioma"
        onChange={(next) => {
          props.onLanguagesChange(next);
          setError("");
        }}
        onClose={() => setLanguagesOpen(false)}
      />
    </>
  );
}
