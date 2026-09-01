import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";

import {
  COMPANY_SUPPORT_OPTIONS,
  causeSelectionLabel,
  parseCauseSelection,
} from "../../data/profileCatalog";
import type { OnboardingRepresentation } from "../../services/onboardingService";
import { checkRepresentationCnpj } from "../../services/representationService";
import {
  BRAZIL_STATES,
  formatCep,
  formatCnpj,
  formatPhone,
  isValidCnpj,
  lookupCep,
  onlyDigits,
} from "../../utils/brazil";
import CauseSelectionModal from "./shared/CauseSelectionModal";
import SelectionModal from "./shared/SelectionModal";
import styles from "./InstitutionRepresentationForm.module.css";

export type InitiativeKind = "formal" | "independent" | "punctual";

export type RepresentationDraft = {
  name: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  description: string;
  cep: string;
  street: string;
  district: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  initiativeKind: InitiativeKind;
  areas: string[];
  supportTypes: string[];
};

type Props = {
  type: OnboardingRepresentation;
  draft: RepresentationDraft;
  saving: boolean;
  submitLabel?: string;
  onBack: () => void;
  onChange: <K extends keyof RepresentationDraft>(
    field: K,
    value: RepresentationDraft[K],
  ) => void;
  onSubmit: () => void | Promise<void>;
};

type TouchKey =
  | "name"
  | "legalName"
  | "cnpj"
  | "email"
  | "phone"
  | "description"
  | "cep"
  | "number";

type CnpjCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "duplicate"; organizationName: string }
  | { status: "error" };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
            aria-label={`Remover ${getLabel(value)}`}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

function FieldFeedback({
  tone,
  children,
}: {
  tone: "neutral" | "valid" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={`${styles.fieldFeedback} ${
        tone === "valid"
          ? styles.fieldFeedbackValid
          : tone === "error"
            ? styles.fieldFeedbackError
            : ""
      }`}
    >
      {tone === "valid" && <CheckCircle2 aria-hidden="true" />}
      {tone === "error" && <CircleAlert aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

export default function InstitutionRepresentationForm({
  type,
  draft,
  saving,
  submitLabel,
  onBack,
  onChange,
  onSubmit,
}: Props) {
  const [areasOpen, setAreasOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "valid" | "error">(
    "idle",
  );
  const [cnpjCheck, setCnpjCheck] = useState<CnpjCheckState>({
    status: "idle",
  });
  const [touched, setTouched] = useState<Partial<Record<TouchKey, boolean>>>(
    {},
  );
  const [validationAttempted, setValidationAttempted] = useState(false);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const currentCepRef = useRef(onlyDigits(draft.cep));
  const lastResolvedCepRef = useRef("");
  const cepRequestRef = useRef(0);

  const currentCnpjRef = useRef(onlyDigits(draft.cnpj));
  const cnpjRequestRef = useRef(0);

  const kind: InitiativeKind =
    type === "company" ? "formal" : draft.initiativeKind;
  const requiresCnpj = type === "company" || kind === "formal";
  const cnpjDigits = onlyDigits(draft.cnpj);
  const cnpjComplete = cnpjDigits.length === 14;
  const cnpjValid = cnpjComplete && isValidCnpj(draft.cnpj);
  const phoneDigits = onlyDigits(draft.phone);
  const cepDigits = onlyDigits(draft.cep);

  const markTouched = (field: TouchKey) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const shouldShow = (field: TouchKey, hasValue: boolean) =>
    Boolean(touched[field] || hasValue || validationAttempted);

  const clearAddressFromPreviousCep = () => {
    onChangeRef.current("street", "");
    onChangeRef.current("district", "");
    onChangeRef.current("city", "");
    onChangeRef.current("state", "");
  };

  const handleCepChange = (rawValue: string) => {
    const formatted = formatCep(rawValue);
    const digits = onlyDigits(formatted);

    currentCepRef.current = digits;
    onChange("cep", formatted);

    if (lastResolvedCepRef.current && digits !== lastResolvedCepRef.current) {
      lastResolvedCepRef.current = "";
      clearAddressFromPreviousCep();
    }

    setCepMessage("");
    setCepStatus("idle");

    if (digits.length !== 8) {
      setCepLoading(false);
    }
  };

  useEffect(() => {
    const digits = onlyDigits(draft.cep);
    currentCepRef.current = digits;

    if (digits.length !== 8 || digits === lastResolvedCepRef.current) return;

    const requestId = ++cepRequestRef.current;
    const timer = window.setTimeout(() => {
      setCepLoading(true);
      setCepMessage("Buscando endereço...");
      setCepStatus("idle");

      void lookupCep(draft.cep)
        .then((address) => {
          if (
            requestId !== cepRequestRef.current ||
            currentCepRef.current !== digits
          )
            return;

          onChangeRef.current("street", address.street);
          onChangeRef.current("district", address.district);
          onChangeRef.current("city", address.city);
          onChangeRef.current("state", address.state);
          lastResolvedCepRef.current = digits;
          setCepStatus("valid");
          setCepMessage(
            `Endereço encontrado: ${address.street || "logradouro não informado"}, ${address.district || "bairro não informado"} - ${address.city}/${address.state}`,
          );
        })
        .catch(() => {
          if (
            requestId !== cepRequestRef.current ||
            currentCepRef.current !== digits
          )
            return;
          setCepStatus("error");
          setCepMessage(
            "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
          );
        })
        .finally(() => {
          if (requestId === cepRequestRef.current) setCepLoading(false);
        });
    }, 320);

    return () => {
      window.clearTimeout(timer);
      if (cepRequestRef.current === requestId) cepRequestRef.current += 1;
    };
  }, [draft.cep]);

  useEffect(() => {
    const digits = onlyDigits(draft.cnpj);
    currentCnpjRef.current = digits;

    if (!requiresCnpj || digits.length !== 14 || !isValidCnpj(draft.cnpj))
      return;

    const requestId = ++cnpjRequestRef.current;
    const timer = window.setTimeout(() => {
      setCnpjCheck({ status: "checking" });

      void checkRepresentationCnpj(draft.cnpj)
        .then((result) => {
          if (
            requestId !== cnpjRequestRef.current ||
            currentCnpjRef.current !== digits
          )
            return;

          if (result.available) {
            setCnpjCheck({ status: "available" });
          } else {
            setCnpjCheck({
              status: "duplicate",
              organizationName:
                result.organization?.name ?? "uma instituição já cadastrada",
            });
          }
        })
        .catch(() => {
          if (
            requestId !== cnpjRequestRef.current ||
            currentCnpjRef.current !== digits
          )
            return;
          setCnpjCheck({ status: "error" });
        });
    }, 420);

    return () => {
      window.clearTimeout(timer);
      if (cnpjRequestRef.current === requestId) cnpjRequestRef.current += 1;
    };
  }, [draft.cnpj, requiresCnpj]);

  const nameInvalid = draft.name.trim().length < 2;
  const legalNameInvalid = requiresCnpj && draft.legalName.trim().length < 2;
  const emailInvalid = !isValidEmail(draft.email);
  const phoneInvalid = phoneDigits.length < 10 || phoneDigits.length > 11;
  const descriptionInvalid = draft.description.trim().length < 20;
  const cepInvalid = cepDigits.length !== 8;
  const numberInvalid = !draft.number.trim();
  const locationInvalid =
    !draft.city.trim() ||
    !BRAZIL_STATES.some((state) => state.code === draft.state);
  const areasInvalid =
    draft.areas.filter((value) => !parseCauseSelection(value).subtopic)
      .length === 0;
  const supportInvalid = type === "company" && draft.supportTypes.length === 0;
  const duplicateCnpj = cnpjCheck.status === "duplicate";

  const validateAndSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationAttempted(true);
    setTouched({
      name: true,
      legalName: true,
      cnpj: true,
      email: true,
      phone: true,
      description: true,
      cep: true,
      number: true,
    });

    if (
      nameInvalid ||
      legalNameInvalid ||
      (requiresCnpj && !cnpjValid) ||
      duplicateCnpj ||
      emailInvalid ||
      phoneInvalid ||
      descriptionInvalid ||
      cepInvalid ||
      numberInvalid ||
      locationInvalid ||
      areasInvalid ||
      supportInvalid
    ) {
      return;
    }

    await onSubmit();
  };

  return (
    <>
      <form className={styles.form} onSubmit={validateAndSubmit} noValidate>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Voltar
        </button>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Representação</span>
          <h2>
            {type === "company"
              ? "Empresa apoiadora"
              : "Organização ou iniciativa"}
          </h2>
          <p>
            {type === "company"
              ? "Cadastre os dados essenciais da empresa."
              : "Cadastre os dados essenciais da iniciativa."}
          </p>
        </header>

        {type === "ngo" && (
          <fieldset className={styles.fieldset}>
            <legend>
              Tipo de iniciativa <span aria-hidden="true">*</span>
            </legend>
            <div className={styles.segmentedControl}>
              {(
                [
                  ["formal", "Organização formal"],
                  ["independent", "Projeto independente"],
                  ["punctual", "Ação pontual"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={kind === value ? styles.segmentSelected : ""}
                  aria-pressed={kind === value}
                  onClick={() => {
                    onChange("initiativeKind", value);
                    if (value !== "formal") {
                      onChange("legalName", "");
                      onChange("cnpj", "");
                      setCnpjCheck({ status: "idle" });
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <section className={styles.section}>
          <div className={styles.field}>
            <label htmlFor="representation-name">
              {type === "company"
                ? "Nome da empresa"
                : kind === "punctual"
                  ? "Nome da ação"
                  : "Nome da iniciativa"}{" "}
              *
            </label>
            <input
              id="representation-name"
              value={draft.name}
              onBlur={() => markTouched("name")}
              onChange={(event) => onChange("name", event.target.value)}
              maxLength={120}
              aria-invalid={
                shouldShow("name", Boolean(draft.name)) && nameInvalid
              }
            />
            {shouldShow("name", Boolean(draft.name)) && nameInvalid && (
              <FieldFeedback tone="error">
                Use pelo menos 2 caracteres.
              </FieldFeedback>
            )}
          </div>

          {requiresCnpj && (
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="representation-legal-name">
                  Razão social *
                </label>
                <input
                  id="representation-legal-name"
                  value={draft.legalName}
                  onBlur={() => markTouched("legalName")}
                  onChange={(event) =>
                    onChange("legalName", event.target.value)
                  }
                  maxLength={160}
                  aria-invalid={
                    shouldShow("legalName", Boolean(draft.legalName)) &&
                    legalNameInvalid
                  }
                />
                {shouldShow("legalName", Boolean(draft.legalName)) &&
                  legalNameInvalid && (
                    <FieldFeedback tone="error">
                      Informe a razão social completa.
                    </FieldFeedback>
                  )}
              </div>

              <div className={styles.field}>
                <label htmlFor="representation-cnpj">CNPJ *</label>
                <div className={styles.statusInput}>
                  <input
                    id="representation-cnpj"
                    inputMode="numeric"
                    value={draft.cnpj}
                    onBlur={() => markTouched("cnpj")}
                    onChange={(event) => {
                      const formatted = formatCnpj(event.target.value);
                      currentCnpjRef.current = onlyDigits(formatted);
                      onChange("cnpj", formatted);
                      setCnpjCheck({ status: "idle" });
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    aria-invalid={
                      Boolean(draft.cnpj) && (!cnpjValid || duplicateCnpj)
                    }
                  />
                  {cnpjCheck.status === "checking" && (
                    <span className={styles.loadingStatus}>
                      <LoaderCircle
                        className={styles.spinner}
                        aria-hidden="true"
                      />
                    </span>
                  )}
                </div>

                {shouldShow("cnpj", Boolean(draft.cnpj)) && !cnpjComplete && (
                  <FieldFeedback tone="error">
                    Complete os 14 dígitos do CNPJ.
                  </FieldFeedback>
                )}
                {cnpjComplete && !cnpjValid && (
                  <FieldFeedback tone="error">
                    CNPJ inválido pelos dígitos verificadores.
                  </FieldFeedback>
                )}
                {cnpjValid && cnpjCheck.status === "checking" && (
                  <FieldFeedback tone="neutral">
                    Verificando se este CNPJ já está cadastrado...
                  </FieldFeedback>
                )}
                {cnpjValid && cnpjCheck.status === "available" && (
                  <FieldFeedback tone="valid">
                    CNPJ válido e disponível para cadastro.
                  </FieldFeedback>
                )}
                {cnpjValid && cnpjCheck.status === "duplicate" && (
                  <FieldFeedback tone="error">
                    Este CNPJ já está cadastrado como “
                    {cnpjCheck.organizationName}”. Use a busca de instituições
                    para solicitar vínculo.
                  </FieldFeedback>
                )}
                {cnpjValid && cnpjCheck.status === "error" && (
                  <FieldFeedback tone="neutral">
                    Não foi possível conferir a duplicidade agora. O servidor
                    validará novamente ao cadastrar.
                  </FieldFeedback>
                )}
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="representation-email">E-mail *</label>
              <input
                id="representation-email"
                type="email"
                value={draft.email}
                onBlur={() => markTouched("email")}
                onChange={(event) => onChange("email", event.target.value)}
                aria-invalid={
                  shouldShow("email", Boolean(draft.email)) && emailInvalid
                }
              />
              {shouldShow("email", Boolean(draft.email)) && emailInvalid && (
                <FieldFeedback tone="error">
                  Digite um e-mail válido.
                </FieldFeedback>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="representation-phone">Telefone *</label>
              <input
                id="representation-phone"
                inputMode="tel"
                value={draft.phone}
                onBlur={() => markTouched("phone")}
                onChange={(event) =>
                  onChange("phone", formatPhone(event.target.value))
                }
                placeholder="(19) 99999-9999"
                aria-invalid={
                  shouldShow("phone", Boolean(draft.phone)) && phoneInvalid
                }
              />
              {shouldShow("phone", Boolean(draft.phone)) && phoneInvalid && (
                <FieldFeedback tone="error">
                  Informe DDD e telefone com 10 ou 11 dígitos.
                </FieldFeedback>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="representation-description">Descrição *</label>
            <textarea
              id="representation-description"
              value={draft.description}
              onBlur={() => markTouched("description")}
              onChange={(event) => onChange("description", event.target.value)}
              maxLength={500}
              placeholder={
                kind === "punctual"
                  ? "Explique o objetivo da ação e como ela funciona."
                  : "Conte brevemente o que a iniciativa faz."
              }
              aria-invalid={
                shouldShow("description", Boolean(draft.description)) &&
                descriptionInvalid
              }
            />
            <FieldFeedback
              tone={
                descriptionInvalid &&
                shouldShow("description", Boolean(draft.description))
                  ? "error"
                  : "neutral"
              }
            >
              {draft.description.trim().length}/500 caracteres · mínimo de 20.
            </FieldFeedback>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              Localização <span aria-hidden="true">*</span>
            </h3>
          </div>

          <div className={styles.cepOnlyRow}>
            <div className={styles.field}>
              <label htmlFor="representation-cep">CEP *</label>
              <div className={styles.statusInput}>
                <input
                  id="representation-cep"
                  inputMode="numeric"
                  value={draft.cep}
                  onBlur={() => markTouched("cep")}
                  onChange={(event) => handleCepChange(event.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  aria-invalid={
                    shouldShow("cep", Boolean(draft.cep)) && cepInvalid
                  }
                />
                {cepLoading && (
                  <span className={styles.loadingStatus}>
                    <LoaderCircle
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                  </span>
                )}
              </div>

              {shouldShow("cep", Boolean(draft.cep)) &&
                cepDigits.length > 0 &&
                cepDigits.length < 8 && (
                  <FieldFeedback tone="error">
                    Complete os 8 dígitos do CEP.
                  </FieldFeedback>
                )}
              {cepMessage && (
                <FieldFeedback
                  tone={
                    cepStatus === "valid"
                      ? "valid"
                      : cepStatus === "error"
                        ? "error"
                        : "neutral"
                  }
                >
                  {cepMessage}
                </FieldFeedback>
              )}
            </div>
          </div>

          {cepDigits.length === 8 && (
            <>
              <div className={styles.addressRow}>
                <div className={styles.field}>
                  <label htmlFor="representation-street">Logradouro *</label>
                  <input
                    id="representation-street"
                    value={draft.street}
                    onChange={(event) => onChange("street", event.target.value)}
                    maxLength={140}
                    placeholder="Rua, avenida, estrada..."
                  />
                </div>
                <div className={styles.smallField}>
                  <label htmlFor="representation-number">Número *</label>
                  <input
                    id="representation-number"
                    value={draft.number}
                    onBlur={() => markTouched("number")}
                    onChange={(event) => onChange("number", event.target.value)}
                    maxLength={20}
                    placeholder="S/N"
                    aria-invalid={
                      shouldShow("number", Boolean(draft.number)) &&
                      numberInvalid
                    }
                  />
                  {shouldShow("number", Boolean(draft.number)) &&
                    numberInvalid && (
                      <FieldFeedback tone="error">
                        Informe o número ou use S/N.
                      </FieldFeedback>
                    )}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="representation-district">Bairro</label>
                  <input
                    id="representation-district"
                    value={draft.district}
                    onChange={(event) =>
                      onChange("district", event.target.value)
                    }
                    maxLength={100}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="representation-complement">
                    Complemento <span>opcional</span>
                  </label>
                  <input
                    id="representation-complement"
                    value={draft.complement}
                    onChange={(event) =>
                      onChange("complement", event.target.value)
                    }
                    maxLength={100}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="representation-city">Cidade *</label>
                  <input
                    id="representation-city"
                    value={draft.city}
                    onChange={(event) => onChange("city", event.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="representation-state">UF *</label>
                  <select
                    id="representation-state"
                    value={draft.state}
                    onChange={(event) => onChange("state", event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {BRAZIL_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.code} - {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {validationAttempted && locationInvalid && (
                <FieldFeedback tone="error">
                  Confirme cidade e UF antes de continuar.
                </FieldFeedback>
              )}
            </>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.compactHeading}>
            <h3>
              {type === "company"
                ? "Causas que deseja apoiar"
                : "Áreas de atuação"}{" "}
              <span aria-hidden="true">*</span>
            </h3>
          </div>
          <SelectedItems
            values={draft.areas}
            getLabel={causeSelectionLabel}
            onRemove={(value) => {
              const parsed = parseCauseSelection(value);
              onChange(
                "areas",
                parsed.subtopic
                  ? draft.areas.filter((item) => item !== value)
                  : draft.areas.filter(
                      (item) =>
                        parseCauseSelection(item).parent !== parsed.parent,
                    ),
              );
            }}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setAreasOpen(true)}
          >
            <Plus aria-hidden="true" />
            {type === "company" ? "Adicionar causas" : "Adicionar áreas"}
          </button>
          {validationAttempted && areasInvalid && (
            <FieldFeedback tone="error">
              Escolha pelo menos uma causa principal.
            </FieldFeedback>
          )}
        </section>

        {type === "company" && (
          <section className={styles.section}>
            <div className={styles.compactHeading}>
              <h3>
                Como pode apoiar <span aria-hidden="true">*</span>
              </h3>
            </div>
            <SelectedItems
              values={draft.supportTypes}
              onRemove={(value) =>
                onChange(
                  "supportTypes",
                  draft.supportTypes.filter((item) => item !== value),
                )
              }
            />
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setSupportOpen(true)}
            >
              <Plus aria-hidden="true" />
              Adicionar formas de apoio
            </button>
            {validationAttempted && supportInvalid && (
              <FieldFeedback tone="error">
                Escolha pelo menos uma forma de apoio.
              </FieldFeedback>
            )}
          </section>
        )}

        <footer className={styles.footer}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={saving || cnpjCheck.status === "checking"}
          >
            {saving && (
              <LoaderCircle className={styles.spinner} aria-hidden="true" />
            )}
            {saving
              ? "Cadastrando..."
              : (submitLabel ?? "Cadastrar e continuar")}
          </button>
        </footer>
      </form>

      <CauseSelectionModal
        open={areasOpen}
        title={type === "company" ? "Causas de interesse" : "Áreas de atuação"}
        description={
          type === "company"
            ? "Escolha as causas principais e marque subtópicos para deixar o interesse da empresa mais específico."
            : "Escolha as áreas principais e marque subtópicos que descrevem melhor a atuação da iniciativa."
        }
        selected={draft.areas}
        maxParents={type === "company" ? 5 : 5}
        onChange={(next) => onChange("areas", next)}
        onClose={() => setAreasOpen(false)}
      />

      <SelectionModal
        open={supportOpen}
        title="Formas de apoio"
        options={COMPANY_SUPPORT_OPTIONS}
        selected={draft.supportTypes}
        maxSelected={8}
        allowCustom
        customLabel="Adicionar outra forma de apoio"
        onChange={(next) => onChange("supportTypes", next)}
        onClose={() => setSupportOpen(false)}
      />
    </>
  );
}
