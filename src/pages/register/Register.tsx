import {
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import PasswordFields from "../../components/passwordFields/PasswordFields";
import {
  type BreachStatus,
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_TIER,
  analysePassword,
  checkPasswordBreach,
  isDisallowedPassword,
} from "../../components/passwordFields/passwordUtils";
import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import { ApiError, apiPost } from "../../services/api";
import mascot from "../../assets/mascot/cong-default.webp";
import styles from "./Register.module.css";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  conductAccepted: boolean;
  privacyAccepted: boolean;
};

type FieldName = keyof FormState;
type ErrorMap = Partial<Record<FieldName, string>>;
type TouchedMap = Partial<Record<FieldName, boolean>>;
type ModalKind = "passwordHelp" | "conduct" | "privacy" | null;
type RegisterStep = 1 | 2 | 3;

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    name: string;
  };
};

const initialFormState: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  conductAccepted: false,
  privacyAccepted: false,
};

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(100, "O nome deve ter no máximo 100 caracteres."),
    email: z
      .string()
      .trim()
      .email("Digite um e-mail válido.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(128, "A senha ultrapassou o limite permitido."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    conductAccepted: z.boolean(),
    privacyAccepted: z.boolean(),
  })
  .superRefine((data, context) => {
    const analysis = analysePassword(data.password);

    if (isDisallowedPassword(data.password)) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message:
          "Esta senha é usada como exemplo pela CONG. Crie uma combinação própria.",
      });
    }

    if (
      data.password.length >= MIN_PASSWORD_LENGTH &&
      analysis.tier < MIN_PASSWORD_TIER
    ) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Essa senha ainda está fraca. Fortaleça-a antes de continuar.",
      });
    }

    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas precisam ser iguais.",
      });
    }

    if (!data.conductAccepted) {
      context.addIssue({
        code: "custom",
        path: ["conductAccepted"],
        message: "Leia e aceite o Código de Conduta para continuar.",
      });
    }

    if (!data.privacyAccepted) {
      context.addIssue({
        code: "custom",
        path: ["privacyAccepted"],
        message: "Leia e aceite as informações de privacidade para continuar.",
      });
    }
  });

function getZodErrors(error: z.ZodError): ErrorMap {
  const nextErrors: ErrorMap = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0] as FieldName | undefined;

    if (field && !nextErrors[field]) {
      nextErrors[field] = issue.message;
    }
  });

  return nextErrors;
}

function getRegistrationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    console.error("Unknown registration error:", error);
    return "Não foi possível criar sua conta.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  if (error.status === 409 || error.code === "EMAIL_ALREADY_REGISTERED") {
    return "Já existe uma conta usando este e-mail.";
  }

  if (error.status === 400) {
    return "Revise os dados informados e tente novamente.";
  }

  return error.message || "Não foi possível concluir o cadastro.";
}

function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;

  return (
    <p id={id} className={styles.fieldError} role="alert">
      {children}
    </p>
  );
}

function Modal({
  kind,
  onClose,
  onAccept,
}: {
  kind: Exclude<ModalKind, null>;
  onClose: () => void;
  onAccept?: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const title =
    kind === "passwordHelp"
      ? "Como criar uma senha resistente"
      : kind === "conduct"
        ? "Código de Conduta"
        : "Informações de privacidade";

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>CONG</span>
            <h2 id="register-modal-title">{title}</h2>
          </div>

          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {kind === "passwordHelp" && (
            <>
              <p className={styles.modalLead}>
                Prefira uma senha longa, exclusiva e pouco previsível. Você não
                precisa montar uma sequência difícil de decorar só para cumprir
                uma lista de regras.
              </p>

              <div className={styles.passwordExample}>
                <span>Uma ideia de estrutura</span>
                <strong>cachorro-verde-na-praia-2026</strong>
                <small>
                  Não use este exemplo literalmente. Crie uma combinação
                  própria.
                </small>
              </div>

              <div className={styles.passwordTips}>
                <article>
                  <strong>Alongue</strong>
                  <p>
                    Mais comprimento costuma ajudar mais do que substituições
                    previsíveis como “a” por “@”.
                  </p>
                </article>
                <article>
                  <strong>Não reutilize</strong>
                  <p>
                    Uma senha boa perde o valor se já estiver sendo usada em
                    outro serviço.
                  </p>
                </article>
                <article>
                  <strong>Evite o óbvio</strong>
                  <p>
                    Nome, aniversário, sequências e palavras muito comuns são
                    fáceis de testar.
                  </p>
                </article>
              </div>
            </>
          )}

          {kind === "conduct" && (
            <>
              <p className={styles.modalLead}>
                A CONG é um projeto colaborativo voltado a impacto social.
                Esperamos uma participação respeitosa, segura e construtiva.
              </p>

              <div className={styles.documentSection}>
                <h3>Nosso compromisso</h3>
                <p>
                  Manter um ambiente aberto e acolhedor para estudantes,
                  desenvolvedores, designers, voluntários, ONGs e demais
                  participantes.
                </p>

                <h3>Comportamentos esperados</h3>
                <ul>
                  <li>tratar outras pessoas com respeito;</li>
                  <li>ser paciente com iniciantes;</li>
                  <li>fazer críticas de forma construtiva;</li>
                  <li>
                    aceitar opiniões diferentes e reconhecer contribuições.
                  </li>
                </ul>

                <h3>Não aceitamos</h3>
                <ul>
                  <li>ataques pessoais, humilhações ou assédio;</li>
                  <li>comentários discriminatórios;</li>
                  <li>exposição indevida de dados pessoais;</li>
                  <li>
                    uso malicioso do projeto ou desrespeito aos públicos
                    atendidos.
                  </li>
                </ul>
              </div>
            </>
          )}

          {kind === "privacy" && (
            <>
              <p className={styles.modalLead}>
                Neste cadastro inicial, a CONG utiliza somente os dados
                necessários para criar, identificar e proteger sua conta.
              </p>

              <div className={styles.documentSection}>
                <h3>Nome</h3>
                <p>
                  É usado como dado inicial da conta. No primeiro acesso, você
                  poderá definir como prefere ser chamado na plataforma.
                </p>

                <h3>E-mail</h3>
                <p>
                  É usado para autenticação, confirmação da conta e comunicações
                  essenciais relacionadas ao acesso.
                </p>

                <h3>Senha</h3>
                <p>
                  É encaminhada ao serviço de autenticação responsável pela
                  proteção da conta. A aplicação não deve armazenar sua senha em
                  texto simples.
                </p>

                <h3>Verificação de segurança da senha</h3>
                <p>
                  Para verificar se uma senha já apareceu em vazamentos
                  conhecidos, a checagem usa apenas um pequeno prefixo do hash
                  da senha. A senha completa não é enviada ao serviço de
                  consulta.
                </p>
              </div>
            </>
          )}
        </div>

        <footer className={styles.modalFooter}>
          {kind === "passwordHelp" ? (
            <button
              type="button"
              className={styles.modalSecondaryButton}
              onClick={onClose}
            >
              Entendi
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.modalSecondaryButton}
                onClick={onClose}
              >
                Fechar
              </button>

              <button
                type="button"
                className={styles.modalAcceptButton}
                onClick={onAccept}
              >
                <Check aria-hidden="true" />
                Li e aceito
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const breachRequestId = useRef(0);

  const [step, setStep] = useState<RegisterStep>(1);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [touched, setTouched] = useState<TouchedMap>({});
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [conductOpened, setConductOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [breachStatus, setBreachStatus] = useState<BreachStatus>({
    state: "idle",
  });
  const [breachCheckedPassword, setBreachCheckedPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const passwordAnalysis = analysePassword(formData.password);
  const passwordLocallyAllowed =
    formData.password.length >= MIN_PASSWORD_LENGTH &&
    passwordAnalysis.tier >= MIN_PASSWORD_TIER &&
    !isDisallowedPassword(formData.password);

  const openModal = (kind: Exclude<ModalKind, null>) => {
    if (kind === "conduct") setConductOpened(true);
    if (kind === "privacy") setPrivacyOpened(true);
    setActiveModal(kind);
  };

  const updateField = (field: FieldName, value: string | boolean) => {
    const nextData = { ...formData, [field]: value } as FormState;

    setFormData(nextData);
    setSubmissionError("");

    if (field === "password") {
      breachRequestId.current += 1;
      setBreachStatus({ state: "idle" });
      setBreachCheckedPassword("");
    }

    if (touched[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateField(field, nextData),
      }));
    } else {
      setErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    }

    if (
      field === "password" &&
      (touched.confirmPassword || formData.confirmPassword)
    ) {
      setErrors((current) => ({
        ...current,
        confirmPassword: validateField("confirmPassword", nextData),
      }));
    }
  };

  const validateField = (
    field: FieldName,
    data = formData,
  ): string | undefined => {
    if (field === "name") {
      const value = data.name.trim();
      if (value.length < 2) return "Informe seu nome completo.";
      if (value.length > 100) {
        return "O nome deve ter no máximo 100 caracteres.";
      }
      return undefined;
    }

    if (field === "email") {
      return z.string().trim().email().safeParse(data.email).success
        ? undefined
        : "Digite um e-mail válido.";
    }

    if (field === "password") {
      if (data.password.length < MIN_PASSWORD_LENGTH) {
        return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      }

      if (isDisallowedPassword(data.password)) {
        return "Esta senha é usada como exemplo pela CONG. Crie uma combinação própria.";
      }

      const analysis = analysePassword(data.password);
      if (analysis.tier < MIN_PASSWORD_TIER) {
        return "Essa senha ainda está fraca. Fortaleça-a antes de continuar.";
      }

      if (
        breachStatus.state === "compromised" &&
        breachCheckedPassword === data.password
      ) {
        return "Esta senha apareceu em vazamentos conhecidos. Escolha outra.";
      }

      return undefined;
    }

    if (field === "confirmPassword") {
      if (!data.confirmPassword) return "Confirme sua senha.";
      if (data.confirmPassword !== data.password) {
        return "As senhas precisam ser iguais.";
      }
      return undefined;
    }

    if (field === "conductAccepted") {
      return data.conductAccepted
        ? undefined
        : "Leia e aceite o Código de Conduta para continuar.";
    }

    return data.privacyAccepted
      ? undefined
      : "Leia e aceite as informações de privacidade para continuar.";
  };

  const handleBlur = (field: FieldName) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field) }));
  };

  const runBreachCheck = async (password: string): Promise<BreachStatus> => {
    if (!passwordLocallyAllowed || password !== formData.password) {
      return { state: "idle" };
    }

    const requestId = ++breachRequestId.current;
    setBreachStatus({ state: "checking" });

    const result = await checkPasswordBreach(password, passwordLocallyAllowed);

    if (requestId !== breachRequestId.current) {
      return { state: "idle" };
    }

    setBreachStatus(result);

    if (
      result.state === "safe" ||
      result.state === "compromised" ||
      result.state === "unavailable"
    ) {
      setBreachCheckedPassword(password);
    }

    if (result.state === "compromised") {
      setErrors((current) => ({
        ...current,
        password:
          "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
      }));
    }

    return result;
  };

  const handlePasswordBlur = async () => {
    setTouched((current) => ({ ...current, password: true }));

    const localError = validateField("password");
    setErrors((current) => ({ ...current, password: localError }));

    if (!localError) {
      await runBreachCheck(formData.password);
    }
  };

  const validateStep = async (targetStep: RegisterStep) => {
    const fields: FieldName[] =
      targetStep === 1
        ? ["name", "email"]
        : targetStep === 2
          ? ["password", "confirmPassword"]
          : ["conductAccepted", "privacyAccepted"];

    setTouched((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });

    const nextErrors: ErrorMap = {};
    fields.forEach((field) => {
      const error = validateField(field);
      if (error) nextErrors[field] = error;
    });

    if (targetStep === 2 && !nextErrors.password) {
      const result = await runBreachCheck(formData.password);
      if (result.state === "compromised") {
        nextErrors.password =
          "Esta senha apareceu em vazamentos conhecidos. Escolha outra.";
      }
    }

    setErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return { ...next, ...nextErrors };
    });

    return Object.keys(nextErrors).length === 0;
  };

  const handleAcceptModal = () => {
    if (activeModal === "conduct") {
      updateField("conductAccepted", true);
      setTouched((current) => ({ ...current, conductAccepted: true }));
      setErrors((current) => ({ ...current, conductAccepted: undefined }));
    }

    if (activeModal === "privacy") {
      updateField("privacyAccepted", true);
      setTouched((current) => ({ ...current, privacyAccepted: true }));
      setErrors((current) => ({ ...current, privacyAccepted: undefined }));
    }

    setActiveModal(null);
  };

  const createAccount = async () => {
    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      setTouched({
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
        conductAccepted: true,
        privacyAccepted: true,
      });
      setErrors(getZodErrors(result.error));
      return;
    }

    let currentBreachStatus = breachStatus;
    const breachCheckIsCurrent =
      breachCheckedPassword === result.data.password &&
      (breachStatus.state === "safe" ||
        breachStatus.state === "compromised" ||
        breachStatus.state === "unavailable");

    if (!breachCheckIsCurrent) {
      currentBreachStatus = await runBreachCheck(result.data.password);
    }

    if (currentBreachStatus.state === "compromised") {
      setErrors((current) => ({
        ...current,
        password:
          "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
      }));
      setStep(2);
      return;
    }

    setErrors({});
    setSubmissionError("");
    setIsSubmitting(true);

    try {
      await apiPost<RegisterResponse>(
        "/auth/register",
        {
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        },
        false,
      );

      const email = result.data.email;
      sessionStorage.setItem("cong:pending-verification-email", email);

      navigate("/verifique-seu-email", {
        replace: true,
        state: {
          email,
          justRegistered: true,
        },
      });
    } catch (error) {
      setSubmissionError(getRegistrationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionError("");

    if (step < 3) {
      const valid = await validateStep(step);
      if (valid) {
        setStep((current) => (current + 1) as RegisterStep);
      }
      return;
    }

    await createAccount();
  };

  const goBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as RegisterStep);
      return;
    }

    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const stepTitle =
    step === 1
      ? "Comece por aqui"
      : step === 2
        ? "Proteja sua conta"
        : "Só falta isso";

  const stepDescription =
    step === 1
      ? "Informe seus dados básicos para começar."
      : step === 2
        ? "Crie uma senha forte e confirme antes de continuar."
        : "Leia os documentos e confirme que está de acordo.";

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          <ArrowLeft aria-hidden="true" />
          <span>{step > 1 ? "Voltar" : "Voltar"}</span>
        </button>

        <p className={styles.loginPrompt}>
          Já tem uma conta? <TransitionLink to="/login">Entrar</TransitionLink>
        </p>
      </header>

      <section className={styles.layout}>
        <aside className={styles.visual} aria-hidden="true">
          <div className={styles.visualGlow} />
          <div className={styles.mascotStage}>
            <div className={styles.mascotHalo} />
            <img src={mascot} alt="" />
          </div>

          <span className={styles.visualEyebrow}>CRIE SUA CONTA</span>
          <h1>Faça parte do bando!</h1>
          <p>
            Um passo de cada vez para entrar na CONG e começar a construir seu
            impacto.
          </p>
        </aside>

        <section className={styles.card} aria-labelledby="register-title">
          <header className={styles.cardHeader}>
            <span className={styles.cardBrand}>CONG</span>

            <div className={styles.cardTitleRow}>
              <div>
                <span className={styles.cardEyebrow}>Cadastro</span>
                <h2 id="register-title">{stepTitle}</h2>
                <p>{stepDescription}</p>
              </div>

              <span className={styles.stepCount}>{step} de 3</span>
            </div>

            <div className={styles.stepIndicator} aria-label={`Etapa ${step} de 3`}>
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={item <= step ? styles.stepActive : undefined}
                />
              ))}
            </div>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {step === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.field}>
                  <label htmlFor="register-name">Nome completo</label>
                  <div
                    className={`${styles.inputWrap} ${
                      touched.name && errors.name ? styles.inputError : ""
                    }`}
                  >
                    <UserRound aria-hidden="true" />
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      aria-invalid={Boolean(touched.name && errors.name)}
                      aria-describedby={
                        touched.name && errors.name
                          ? "register-name-error"
                          : undefined
                      }
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      onBlur={() => handleBlur("name")}
                    />
                  </div>
                  {touched.name && (
                    <FieldError id="register-name-error">
                      {errors.name}
                    </FieldError>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="register-email">E-mail</label>
                  <div
                    className={`${styles.inputWrap} ${
                      touched.email && errors.email ? styles.inputError : ""
                    }`}
                  >
                    <Mail aria-hidden="true" />
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      spellCheck="false"
                      placeholder="nome@exemplo.com"
                      value={formData.email}
                      aria-invalid={Boolean(touched.email && errors.email)}
                      aria-describedby={
                        touched.email && errors.email
                          ? "register-email-error"
                          : undefined
                      }
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      onBlur={() => handleBlur("email")}
                    />
                  </div>
                  {touched.email && (
                    <FieldError id="register-email-error">
                      {errors.email}
                    </FieldError>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
                <PasswordFields
                  password={formData.password}
                  confirmPassword={formData.confirmPassword}
                  passwordError={errors.password}
                  confirmPasswordError={errors.confirmPassword}
                  passwordTouched={Boolean(touched.password)}
                  confirmPasswordTouched={Boolean(touched.confirmPassword)}
                  breachStatus={breachStatus}
                  onPasswordChange={(value) => updateField("password", value)}
                  onConfirmPasswordChange={(value) =>
                    updateField("confirmPassword", value)
                  }
                  onPasswordBlur={handlePasswordBlur}
                  onConfirmPasswordBlur={() => handleBlur("confirmPassword")}
                  onPasswordHelp={() => openModal("passwordHelp")}
                  passwordId="register-password"
                  confirmPasswordId="register-confirm-password"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {step === 3 && (
              <div className={styles.stepContent}>
                <div className={styles.acceptanceIntro}>
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>Antes de criar sua conta</strong>
                    <p>
                      Leia os dois documentos. Depois de abrir cada um, você
                      poderá confirmar que está de acordo.
                    </p>
                  </div>
                </div>

                <div className={styles.acceptanceGroup}>
                  <div className={styles.acceptanceItem}>
                    <div className={styles.acceptanceCopy}>
                      <label
                        className={`${styles.acceptanceLabel} ${
                          !conductOpened ? styles.acceptanceLocked : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.conductAccepted}
                          disabled={!conductOpened}
                          onChange={(event) =>
                            updateField("conductAccepted", event.target.checked)
                          }
                          onBlur={() => handleBlur("conductAccepted")}
                        />
                        <span
                          className={styles.checkboxVisual}
                          aria-hidden="true"
                        >
                          <Check />
                        </span>
                        <span>Li e aceito o Código de Conduta.</span>
                      </label>
                      {touched.conductAccepted && (
                        <FieldError id="register-conduct-error">
                          {errors.conductAccepted}
                        </FieldError>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.documentButton}
                      onClick={() => openModal("conduct")}
                    >
                      {conductOpened
                        ? "Reabrir Código de Conduta"
                        : "Ler Código de Conduta"}
                    </button>
                  </div>

                  <div className={styles.acceptanceItem}>
                    <div className={styles.acceptanceCopy}>
                      <label
                        className={`${styles.acceptanceLabel} ${
                          !privacyOpened ? styles.acceptanceLocked : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.privacyAccepted}
                          disabled={!privacyOpened}
                          onChange={(event) =>
                            updateField("privacyAccepted", event.target.checked)
                          }
                          onBlur={() => handleBlur("privacyAccepted")}
                        />
                        <span
                          className={styles.checkboxVisual}
                          aria-hidden="true"
                        >
                          <Check />
                        </span>
                        <span>Li e aceito as informações de privacidade.</span>
                      </label>
                      {touched.privacyAccepted && (
                        <FieldError id="register-privacy-error">
                          {errors.privacyAccepted}
                        </FieldError>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.documentButton}
                      onClick={() => openModal("privacy")}
                    >
                      {privacyOpened
                        ? "Reabrir informações de privacidade"
                        : "Ler informações de privacidade"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {submissionError && (
              <p className={styles.submitError} role="alert">
                {submissionError}
              </p>
            )}

            <div className={styles.formActions}>
              {step > 1 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    setStep((current) => (current - 1) as RegisterStep)
                  }
                  disabled={isSubmitting}
                >
                  <ArrowLeft aria-hidden="true" />
                  Voltar
                </button>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={
                  isSubmitting ||
                  (step === 2 && breachStatus.state === "checking")
                }
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className={styles.spinner} aria-hidden="true" />
                    Criando sua conta…
                  </>
                ) : step < 3 ? (
                  <>Continuar</>
                ) : (
                  <>Criar minha conta</>
                )}
              </button>
            </div>

            <p className={styles.loginPromptBottom}>
              Já tem uma conta? <TransitionLink to="/login">Entrar</TransitionLink>
            </p>
          </form>
        </section>
      </section>

      {activeModal && (
        <Modal
          kind={activeModal}
          onClose={() => setActiveModal(null)}
          onAccept={handleAcceptModal}
        />
      )}
    </main>
  );
}
