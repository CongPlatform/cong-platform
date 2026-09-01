import { useState, type SubmitEvent } from "react";
import {
  BadgeInfo,
  CalendarClock,
  LoaderCircle,
  MapPin,
  Plus,
  X,
} from "lucide-react";

import {
  VOLUNTEER_ACTIVITY_OPTIONS,
  causeSelectionLabel,
  parseCauseSelection,
} from "../../data/profileCatalog";
import { BRAZIL_STATES, getCitiesByState } from "../../utils/brazil";
import AvailabilityModal, {
  type AvailabilityDetails,
} from "./shared/AvailabilityModal";
import CauseSelectionModal from "./shared/CauseSelectionModal";
import SelectionModal from "./shared/SelectionModal";
import styles from "./ProfileForm.module.css";

export type VolunteerOpportunityPreference = "recurring" | "punctual" | "both";
export type VolunteerFrequency = "punctual" | "monthly" | "weekly" | "flexible";

export type VolunteerProfileFormData = {
  causes: string[];
  interestAreas: string[];
  availability: string;
  location?: {
    city?: string;
    state?: string;
    radiusKm?: number;
    remote: boolean;
  };
  availabilityDetails?: {
    days: string[];
    periods: string[];
    frequency?: VolunteerFrequency;
  };
  opportunityPreference: VolunteerOpportunityPreference;
};

type Props = VolunteerProfileFormData & {
  completed: boolean;
  saving: boolean;
  submitLabel?: string;
  onChange: (data: VolunteerProfileFormData) => void;
  onOpenParticipationChoices?: () => void;
  onSubmit: (data: VolunteerProfileFormData) => void | Promise<void>;
};

const FREQUENCY_LABELS: Record<VolunteerFrequency, string> = {
  punctual: "Pontualmente",
  monthly: "Algumas vezes por mês",
  weekly: "Toda semana",
  flexible: "Disponibilidade variável",
};

const OPPORTUNITY_OPTIONS = [
  {
    value: "recurring",
    label: "Recorrentes",
    description:
      "Participações contínuas em rotinas, equipes ou projetos ativos.",
  },
  {
    value: "punctual",
    label: "Pontuais",
    description:
      "Ações com começo e fim definidos, como eventos, mutirões e campanhas.",
  },
  {
    value: "both",
    label: "Ambos",
    description: "Quero receber oportunidades recorrentes e também pontuais.",
  },
] as const;

function availabilityText(details: AvailabilityDetails): string {
  if (details.frequency === "flexible") return "Disponibilidade variável";

  const dayText = details.days.length ? details.days.join(", ") : "";
  const periodText = details.periods.length
    ? details.periods.join(" e ").toLowerCase()
    : "";
  const frequencyText = details.frequency
    ? FREQUENCY_LABELS[details.frequency]
    : "";

  return [dayText, periodText, frequencyText].filter(Boolean).join(" · ");
}

function availabilityPieces(details: AvailabilityDetails) {
  if (details.frequency === "flexible") {
    return {
      days: "Disponibilidade variável",
      periods: "Horários variáveis",
      frequency: FREQUENCY_LABELS.flexible,
    };
  }

  return {
    days: details.days.length ? details.days.join(", ") : "Dias não definidos",
    periods: details.periods.length
      ? details.periods.join(" e ")
      : "Períodos não definidos",
    frequency: details.frequency
      ? FREQUENCY_LABELS[details.frequency]
      : "Frequência não definida",
  };
}

function SelectedItems({
  values,
  onRemove,
  getLabel = (value) => value,
}: {
  values: string[];
  onRemove: (value: string) => void;
  getLabel?: (value: string) => string;
}) {
  if (!values.length) return null;

  return (
    <div className={styles.selectedList}>
      {values.map((value) => (
        <span className={styles.chip} key={value}>
          <span>{getLabel(value)}</span>
          <button
            type="button"
            onClick={() => onRemove(value)}
            aria-label={`Remover ${value}`}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function VolunteerProfileForm(props: Props) {
  const [causeModalOpen, setCauseModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [error, setError] = useState("");

  const location = props.location ?? {
    city: "",
    state: "",
    radiusKm: 10,
    remote: false,
  };

  const details: AvailabilityDetails = props.availabilityDetails ?? {
    days: [],
    periods: [],
    frequency: undefined,
  };

  const availabilitySummary = availabilityPieces(details);

  const update = (patch: Partial<VolunteerProfileFormData>) => {
    props.onChange({
      causes: patch.causes ?? props.causes,
      interestAreas: patch.interestAreas ?? props.interestAreas,
      availability: patch.availability ?? props.availability,
      location: patch.location ?? props.location,
      availabilityDetails:
        patch.availabilityDetails ?? props.availabilityDetails,
      opportunityPreference:
        patch.opportunityPreference ?? props.opportunityPreference,
    });
  };

  const setAvailability = (nextDetails: AvailabilityDetails) => {
    update({
      availabilityDetails: nextDetails,
      availability: availabilityText(nextDetails),
    });
    setError("");
  };

  const loadCities = async (state: string) => {
    if (!state) {
      setCities([]);
      return;
    }

    setCitiesLoading(true);
    setCitiesError("");

    try {
      setCities(await getCitiesByState(state));
    } catch {
      setCities([]);
      setCitiesError("Não foi possível carregar as cidades. Tente novamente.");
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleStateChange = (state: string) => {
    update({
      location: {
        ...location,
        state,
        city: "",
      },
    });
    setCities([]);
    setCitiesError("");
    setError("");
    if (state) void loadCities(state);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedMainCauses = props.causes.filter(
      (value) => !parseCauseSelection(value).subtopic,
    );

    if (selectedMainCauses.length === 0) {
      setError("Escolha pelo menos uma causa principal.");
      return;
    }

    if (selectedMainCauses.length > 3) {
      setError("Escolha no máximo 3 causas principais.");
      return;
    }

    if (props.interestAreas.length === 0) {
      setError("Escolha pelo menos uma forma de ajudar.");
      return;
    }

    if (!location.state || !location.city) {
      setError("Selecione a UF e a cidade onde pretende atuar.");
      return;
    }

    const availabilityComplete =
      details.frequency === "flexible" ||
      (details.days.length > 0 &&
        details.periods.length > 0 &&
        Boolean(details.frequency));

    if (!availabilityComplete) {
      setError("Defina sua disponibilidade geral.");
      return;
    }

    setError("");

    await props.onSubmit({
      causes: props.causes,
      interestAreas: props.interestAreas,
      availability: availabilityText(details),
      location: {
        city: location.city,
        state: location.state,
        radiusKm: location.radiusKm ?? 10,
        remote: location.remote,
      },
      availabilityDetails: details,
      opportunityPreference: props.opportunityPreference,
    });
  };

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Perfil pessoal</span>
          <h2>Voluntário</h2>
          <p>
            Vamos usar suas preferências para encontrar oportunidades melhores.
          </p>
        </header>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Causas que gostaria de apoiar <span aria-hidden="true">*</span>
            </h3>
          </div>
          <SelectedItems
            values={props.causes}
            getLabel={causeSelectionLabel}
            onRemove={(value) => {
              const parsed = parseCauseSelection(value);
              update({
                causes: parsed.subtopic
                  ? props.causes.filter((item) => item !== value)
                  : props.causes.filter(
                      (item) =>
                        parseCauseSelection(item).parent !== parsed.parent,
                    ),
              });
            }}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setCauseModalOpen(true)}
          >
            <Plus aria-hidden="true" />
            Escolher causas
          </button>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Como gostaria de ajudar <span aria-hidden="true">*</span>
            </h3>
          </div>
          <SelectedItems
            values={props.interestAreas}
            onRemove={(value) =>
              update({
                interestAreas: props.interestAreas.filter(
                  (item) => item !== value,
                ),
              })
            }
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setActivityModalOpen(true)}
          >
            <Plus aria-hidden="true" />
            Escolher atividades
          </button>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Onde pretende atuar <span aria-hidden="true">*</span>
            </h3>
          </div>

          <div className={styles.locationGrid}>
            <div className={styles.inlineField}>
              <label htmlFor="volunteer-state">UF</label>
              <select
                id="volunteer-state"
                value={location.state ?? ""}
                onChange={(event) => handleStateChange(event.target.value)}
              >
                <option value="">Selecione</option>
                {BRAZIL_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inlineField}>
              <label htmlFor="volunteer-city">Cidade</label>
              <select
                id="volunteer-city"
                value={location.city ?? ""}
                disabled={!location.state || citiesLoading}
                onFocus={() => {
                  if (location.state && cities.length === 0 && !citiesLoading) {
                    void loadCities(location.state);
                  }
                }}
                onChange={(event) => {
                  update({
                    location: { ...location, city: event.target.value },
                  });
                  setError("");
                }}
              >
                <option value="">
                  {citiesLoading
                    ? "Carregando cidades..."
                    : location.state
                      ? "Selecione"
                      : "Escolha a UF primeiro"}
                </option>
                {location.city && !cities.includes(location.city) && (
                  <option value={location.city}>{location.city}</option>
                )}
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inlineField}>
              <label htmlFor="volunteer-radius">Distância</label>
              <select
                id="volunteer-radius"
                value={location.radiusKm ?? 10}
                onChange={(event) =>
                  update({
                    location: {
                      ...location,
                      radiusKm: Number(event.target.value),
                    },
                  })
                }
              >
                <option value={5}>Até 5 km</option>
                <option value={10}>Até 10 km</option>
                <option value={25}>Até 25 km</option>
                <option value={50}>Até 50 km</option>
                <option value={100}>Região ampliada</option>
              </select>
            </div>
          </div>

          {citiesError && (
            <button
              type="button"
              className={styles.textAction}
              onClick={() => void loadCities(location.state ?? "")}
            >
              {citiesError}
            </button>
          )}

          <label className={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={location.remote}
              onChange={(event) =>
                update({
                  location: { ...location, remote: event.target.checked },
                })
              }
            />
            Também tenho interesse em oportunidades remotas.
          </label>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>Tipo de oportunidade</h3>
          </div>
          <div className={styles.choiceCards}>
            {OPPORTUNITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.choiceCard} ${
                  props.opportunityPreference === option.value
                    ? styles.choiceCardSelected
                    : ""
                }`}
                aria-pressed={props.opportunityPreference === option.value}
                onClick={() => update({ opportunityPreference: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Disponibilidade <span aria-hidden="true">*</span>
            </h3>
          </div>
          {availabilityText(details) ? (
            <div className={styles.availabilityCard}>
              <div className={styles.availabilityHeader}>
                <div>
                  <strong>Disponibilidade configurada</strong>
                  <span>Essas preferências podem ser ajustadas depois.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailabilityModalOpen(true)}
                >
                  Alterar
                </button>
              </div>

              <div className={styles.availabilityMeta}>
                <div>
                  <span className={styles.summaryLabel}>
                    <CalendarClock aria-hidden="true" /> Dias
                  </span>
                  <strong>{availabilitySummary.days}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>
                    <BadgeInfo aria-hidden="true" /> Períodos
                  </span>
                  <strong>{availabilitySummary.periods}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>
                    <MapPin aria-hidden="true" /> Frequência
                  </span>
                  <strong>{availabilitySummary.frequency}</strong>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setAvailabilityModalOpen(true)}
            >
              <Plus aria-hidden="true" />
              Definir disponibilidade
            </button>
          )}
        </section>

        {props.onOpenParticipationChoices && (
          <button
            type="button"
            className={styles.inlineLink}
            onClick={props.onOpenParticipationChoices}
          >
            Quero criar ou representar uma iniciativa própria
          </button>
        )}

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

      <CauseSelectionModal
        open={causeModalOpen}
        title="Causas"
        description="Escolha até 3 causas principais e, dentro delas, marque os subtópicos que mais combinam com você."
        selected={props.causes}
        maxParents={3}
        onChange={(next) => {
          update({ causes: next });
          setError("");
        }}
        onClose={() => setCauseModalOpen(false)}
      />

      <SelectionModal
        open={activityModalOpen}
        title="Formas de ajudar"
        options={VOLUNTEER_ACTIVITY_OPTIONS}
        selected={props.interestAreas}
        maxSelected={10}
        allowCustom
        customLabel="Adicionar outra forma de ajudar"
        onChange={(next) => {
          update({ interestAreas: next });
          setError("");
        }}
        onClose={() => setActivityModalOpen(false)}
      />

      <AvailabilityModal
        open={availabilityModalOpen}
        value={details}
        onChange={setAvailability}
        onClose={() => setAvailabilityModalOpen(false)}
      />
    </>
  );
}
