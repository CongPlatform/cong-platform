import { useState, type FormEvent } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Navigate, useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../../../contexts/auth-context";

import {
  collaborationRoles,
  type CollaborationProfileData,
  type CollaborationRole,
} from "../../../services/collaborationProfileService";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import styles from "./ProfileCreation.module.css";

interface FormValues {
  organizationName: string;
  causeAreas: string;
  city: string;
  state: string;

  technologies: string;
  experienceLevel: string;
  portfolioUrl: string;

  specialties: string;
  tools: string;

  languages: string;
  notes: string;

  interestAreas: string;
  availability: string;

  supportAreas: string;
  websiteUrl: string;
}

const initialValues: FormValues = {
  organizationName: "",
  causeAreas: "",
  city: "",
  state: "",

  technologies: "",
  experienceLevel: "",
  portfolioUrl: "",

  specialties: "",
  tools: "",

  languages: "",
  notes: "",

  interestAreas: "",
  availability: "",

  supportAreas: "",
  websiteUrl: "",
};

const roleLabels: Record<CollaborationRole, string> = {
  organization: "ONG",
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradutor",
  volunteer: "Voluntário",
  supporter: "Empresa",
};

function isCollaborationRole(value: unknown): value is CollaborationRole {
  return (
    typeof value === "string" &&
    collaborationRoles.includes(value as CollaborationRole)
  );
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();

  return normalized || undefined;
}

function buildProfileData(
  role: CollaborationRole,
  values: FormValues,
): CollaborationProfileData {
  switch (role) {
    case "organization":
      return {
        organizationName: values.organizationName.trim(),
        causeAreas: toList(values.causeAreas),
        city: optionalText(values.city),
        state: optionalText(values.state),
      };

    case "developer":
      return {
        technologies: toList(values.technologies),

        experienceLevel:
          values.experienceLevel === "beginner" ||
          values.experienceLevel === "intermediate" ||
          values.experienceLevel === "advanced"
            ? values.experienceLevel
            : undefined,

        portfolioUrl: optionalText(values.portfolioUrl),
      };

    case "designer":
      return {
        specialties: toList(values.specialties),

        tools: toList(values.tools),

        portfolioUrl: optionalText(values.portfolioUrl),
      };

    case "translator":
      return {
        languages: toList(values.languages),

        notes: optionalText(values.notes),
      };

    case "volunteer":
      return {
        interestAreas: toList(values.interestAreas),

        availability: optionalText(values.availability),
      };

    case "supporter":
      return {
        organizationName: values.organizationName.trim(),

        supportAreas: toList(values.supportAreas),

        websiteUrl: optionalText(values.websiteUrl),
      };
  }
}

export default function ProfileCreation() {
  const navigate = useNavigate();

  const { createCollaborationProfile, collaborationProfilesLoading } =
    useAuth();

  const { role: roleParam } = useParams<{ role: string }>();

  const role = isCollaborationRole(roleParam) ? roleParam : null;

  const [values, setValues] = useState<FormValues>(initialValues);

  const [errorMessage, setErrorMessage] = useState("");

  if (!role) {
    return <Navigate to="/app/escolher-funcao" replace />;
  }

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (collaborationProfilesLoading) {
      return;
    }

    setErrorMessage("");

    try {
      const profileData = buildProfileData(role, values);

      await createCollaborationProfile(role, profileData);

      navigate("/app/comunidade", {
        replace: true,
      });
    } catch (error) {
      console.error("Não foi possível criar o perfil:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o perfil. Verifique os dados e tente novamente.",
      );
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <img src={logo} alt="CONG" className={styles.logo} />

        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/app/escolher-funcao")}
          disabled={collaborationProfilesLoading}
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </button>
      </header>

      <section className={styles.content}>
        <div className={styles.heading}>
          <span className={styles.roleBadge}>{roleLabels[role]}</span>

          <h1>Complete seu perfil</h1>

          <p>
            Essas informações ajudam a comunidade a entender como você deseja
            colaborar.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {role === "organization" && (
            <>
              <div className={styles.field}>
                <label htmlFor="organizationName">Nome da ONG</label>

                <input
                  id="organizationName"
                  value={values.organizationName}
                  onChange={(event) =>
                    updateValue("organizationName", event.target.value)
                  }
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="causeAreas">Áreas de atuação</label>

                <input
                  id="causeAreas"
                  value={values.causeAreas}
                  onChange={(event) =>
                    updateValue("causeAreas", event.target.value)
                  }
                  placeholder="Assistência social, educação, saúde"
                />

                <span className={styles.fieldHint}>
                  Separe as áreas por vírgulas.
                </span>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="city">Cidade</label>

                  <input
                    id="city"
                    value={values.city}
                    onChange={(event) =>
                      updateValue("city", event.target.value)
                    }
                    maxLength={80}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="state">UF</label>

                  <input
                    id="state"
                    value={values.state}
                    onChange={(event) =>
                      updateValue("state", event.target.value)
                    }
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
            </>
          )}

          {role === "developer" && (
            <>
              <div className={styles.field}>
                <label htmlFor="technologies">Tecnologias</label>

                <input
                  id="technologies"
                  value={values.technologies}
                  onChange={(event) =>
                    updateValue("technologies", event.target.value)
                  }
                  placeholder="React, TypeScript, Node.js"
                  required
                />

                <span className={styles.fieldHint}>
                  Separe as tecnologias por vírgulas.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="experienceLevel">Nível de experiência</label>

                <select
                  id="experienceLevel"
                  value={values.experienceLevel}
                  onChange={(event) =>
                    updateValue("experienceLevel", event.target.value)
                  }
                >
                  <option value="">Prefiro não informar</option>

                  <option value="beginner">Iniciante</option>

                  <option value="intermediate">Intermediário</option>

                  <option value="advanced">Avançado</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="portfolioUrl">Portfólio ou GitHub</label>

                <input
                  id="portfolioUrl"
                  type="url"
                  value={values.portfolioUrl}
                  onChange={(event) =>
                    updateValue("portfolioUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {role === "designer" && (
            <>
              <div className={styles.field}>
                <label htmlFor="specialties">Especialidades</label>

                <input
                  id="specialties"
                  value={values.specialties}
                  onChange={(event) =>
                    updateValue("specialties", event.target.value)
                  }
                  placeholder="UI, UX, identidade visual"
                  required
                />

                <span className={styles.fieldHint}>Separe por vírgulas.</span>
              </div>

              <div className={styles.field}>
                <label htmlFor="tools">Ferramentas</label>

                <input
                  id="tools"
                  value={values.tools}
                  onChange={(event) => updateValue("tools", event.target.value)}
                  placeholder="Figma, Illustrator, Canva"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="portfolioUrl">Portfólio</label>

                <input
                  id="portfolioUrl"
                  type="url"
                  value={values.portfolioUrl}
                  onChange={(event) =>
                    updateValue("portfolioUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {role === "translator" && (
            <>
              <div className={styles.field}>
                <label htmlFor="languages">Idiomas</label>

                <input
                  id="languages"
                  value={values.languages}
                  onChange={(event) =>
                    updateValue("languages", event.target.value)
                  }
                  placeholder="Português, Inglês, Espanhol"
                  required
                />

                <span className={styles.fieldHint}>
                  Separe os idiomas por vírgulas.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="notes">Observações</label>

                <textarea
                  id="notes"
                  value={values.notes}
                  onChange={(event) => updateValue("notes", event.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Conte um pouco sobre sua experiência com tradução."
                />
              </div>
            </>
          )}

          {role === "volunteer" && (
            <>
              <div className={styles.field}>
                <label htmlFor="interestAreas">
                  Áreas em que deseja ajudar
                </label>

                <input
                  id="interestAreas"
                  value={values.interestAreas}
                  onChange={(event) =>
                    updateValue("interestAreas", event.target.value)
                  }
                  placeholder="Eventos, logística, atendimento"
                  required
                />

                <span className={styles.fieldHint}>
                  Separe as áreas por vírgulas.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="availability">Disponibilidade</label>

                <input
                  id="availability"
                  value={values.availability}
                  onChange={(event) =>
                    updateValue("availability", event.target.value)
                  }
                  maxLength={120}
                  placeholder="Finais de semana, período da tarde..."
                />
              </div>
            </>
          )}

          {role === "supporter" && (
            <>
              <div className={styles.field}>
                <label htmlFor="organizationName">Nome da empresa</label>

                <input
                  id="organizationName"
                  value={values.organizationName}
                  onChange={(event) =>
                    updateValue("organizationName", event.target.value)
                  }
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="supportAreas">Formas de apoio</label>

                <input
                  id="supportAreas"
                  value={values.supportAreas}
                  onChange={(event) =>
                    updateValue("supportAreas", event.target.value)
                  }
                  placeholder="Financeiro, materiais, tecnologia"
                />

                <span className={styles.fieldHint}>
                  Separe as formas de apoio por vírgulas.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="websiteUrl">Site</label>

                <input
                  id="websiteUrl"
                  type="url"
                  value={values.websiteUrl}
                  onChange={(event) =>
                    updateValue("websiteUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {errorMessage && (
            <div className={styles.error} role="alert">
              {errorMessage}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate("/app/escolher-funcao")}
              disabled={collaborationProfilesLoading}
            >
              Voltar
            </button>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={collaborationProfilesLoading}
            >
              {collaborationProfilesLoading ? (
                <>
                  <LoaderCircle className={styles.spinner} aria-hidden="true" />
                  Criando...
                </>
              ) : (
                "Criar perfil"
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
