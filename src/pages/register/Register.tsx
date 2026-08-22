import {
  type ReactNode,
  type SyntheticEvent,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import ModalMensagem from "../../components/modalMensagem/ModalMensagem";
import {
  ApiError,
  apiPost,
} from "../../services/api";
import mascote from "../../assets/mascot/cong-default.webp";
import styles from "./Register.module.css";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

type ErrorMap = Record<string, string>;

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    name: string;
  };
};

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(
        100,
        "O nome deve ter no máximo 100 caracteres.",
      ),

    email: z
      .string()
      .trim()
      .email("Digite um e-mail válido.")
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(
        8,
        "A senha deve ter pelo menos 8 caracteres.",
      )
      .max(
        128,
        "A senha deve ter no máximo 128 caracteres.",
      ),

    confirmPassword: z
      .string()
      .min(1, "Confirme sua senha."),

    termsAccepted: z.boolean(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas precisam ser iguais.",
      });
    }

    if (!data.termsAccepted) {
      context.addIssue({
        code: "custom",
        path: ["termsAccepted"],
        message:
          "Você precisa aceitar os termos e a política de privacidade.",
      });
    }
  });

const initialFormState: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

function getZodErrors(
  error: z.ZodError,
): ErrorMap {
  const nextErrors: ErrorMap = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");

    if (path && !nextErrors[path]) {
      nextErrors[path] = issue.message;
    }
  });

  return nextErrors;
}

function FieldError({
  id,
  children,
}: {
  id: string;
  children?: ReactNode;
}) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      className={styles.fieldError}
      role="alert"
    >
      {children}
    </p>
  );
}

function getRegistrationErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof ApiError)) {
    console.error(
      "Unknown registration error:",
      error,
    );

    return "Não foi possível criar sua conta.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  if (
    error.status === 409 ||
    error.code === "EMAIL_ALREADY_REGISTERED"
  ) {
    return "Já existe uma conta usando este e-mail.";
  }

  if (error.status === 400) {
    return "Revise os dados informados e tente novamente.";
  }

  return error.message ||
    "Não foi possível concluir o cadastro.";
}

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState<FormState>(initialFormState);

  const [errors, setErrors] =
    useState<ErrorMap>({});

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    submissionError,
    setSubmissionError,
  ] = useState("");

  const [
    confirmationModalOpen,
    setConfirmationModalOpen,
  ] = useState(false);

  const updateField = (
    field: keyof FormState,
    value: string | boolean,
  ) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[field];

      return nextErrors;
    });

    setSubmissionError("");
  };

  const passwordChecks = [
    {
      label: "8 caracteres",
      valid: formData.password.length >= 8,
    },
    {
      label: "Até 128 caracteres",
      valid:
        formData.password.length > 0 &&
        formData.password.length <= 128,
    },
  ];

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const result =
      registerSchema.safeParse(formData);

    if (!result.success) {
      setErrors(
        getZodErrors(result.error),
      );

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

      setConfirmationModalOpen(true);
    } catch (error) {
      setSubmissionError(
        getRegistrationErrorMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishRegistration = () => {
    setConfirmationModalOpen(false);

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <main className={styles.registerPage}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => {
          if ((window.history.state?.idx ?? 0) > 0) {
            navigate(-1);
            return;
          }

          navigate("/");
        }}
      >
        <ArrowLeft aria-hidden="true" />
        <span>Voltar</span>
      </button>

      <div className={styles.pageContainer}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>
              <Sparkles aria-hidden="true" />
            </span>

            <div>
              <strong>CONG</strong>
              <small>
                Tecnologia para impacto social
              </small>
            </div>
          </div>

          <p>
            Já tem uma conta?
            <TransitionLink to="/login">
              Entrar
            </TransitionLink>
          </p>
        </header>

        <section className={styles.intro}>
          <div className={styles.mascotStage}>
            <span aria-hidden="true" />

            <img
              src={mascote}
              alt="Mascote da CONG"
            />
          </div>

          <div className={styles.introCopy}>
            <span className={styles.eyebrow}>
              Faça parte da CONG
            </span>

            <h1>
              Crie sua conta e comece sua{" "}
              <span>jornada.</span>
            </h1>

            <p>
              Sua conta é o ponto de entrada para a
              plataforma. Depois, você poderá participar da
              comunidade, integrar organizações e acessar
              diferentes experiências da CONG.
            </p>

            <div className={styles.introTags}>
              <span>
                <ShieldCheck aria-hidden="true" />
                Conta segura
              </span>

              <span>
                <UserRound aria-hidden="true" />
                Perfil pessoal
              </span>

              <span>
                <Sparkles aria-hidden="true" />
                Uma conta, várias possibilidades
              </span>
            </div>
          </div>
        </section>

        <section className={styles.formSurface}>
          <header className={styles.formHeader}>
            <div>
              <span className={styles.formEyebrow}>
                Cadastro
              </span>

              <h2>Crie sua conta</h2>

              <p>
                Informe apenas os dados necessários para
                criar seu acesso à CONG. Outras informações
                poderão ser adicionadas depois.
              </p>
            </div>

            <span className={styles.stepCounter}>
              01
              <small>/01</small>
            </span>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className={styles.stepContent}>
              <div className={styles.accountNote}>
                <ShieldCheck aria-hidden="true" />

                <div>
                  <strong>
                    Começamos somente com o essencial.
                  </strong>

                  <p>
                    Informações sobre organizações,
                    interesses e participação serão
                    configuradas posteriormente dentro da
                    plataforma.
                  </p>
                </div>
              </div>

              <div className={styles.accountGrid}>
                <div
                  className={`${styles.field} ${styles.fieldFull}`}
                >
                  <label htmlFor="register-name">
                    Nome completo
                  </label>

                  <div
                    className={`${styles.inputGroup} ${
                      errors.name
                        ? styles.inputError
                        : ""
                    }`}
                  >
                    <UserRound aria-hidden="true" />

                    <input
                      id="register-name"
                      type="text"
                      value={formData.name}
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      aria-invalid={Boolean(
                        errors.name,
                      )}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <FieldError id="register-name-error">
                    {errors.name}
                  </FieldError>
                </div>

                <div
                  className={`${styles.field} ${styles.fieldFull}`}
                >
                  <label htmlFor="register-email">
                    E-mail
                  </label>

                  <div
                    className={`${styles.inputGroup} ${
                      errors.email
                        ? styles.inputError
                        : ""
                    }`}
                  >
                    <Mail aria-hidden="true" />

                    <input
                      id="register-email"
                      type="email"
                      value={formData.email}
                      placeholder="nome@exemplo.com"
                      autoComplete="email"
                      aria-invalid={Boolean(
                        errors.email,
                      )}
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <FieldError id="register-email-error">
                    {errors.email}
                  </FieldError>
                </div>

                <div className={styles.field}>
                  <label htmlFor="register-password">
                    Senha
                  </label>

                  <div
                    className={`${styles.inputGroup} ${
                      errors.password
                        ? styles.inputError
                        : ""
                    }`}
                  >
                    <LockKeyhole aria-hidden="true" />

                    <input
                      id="register-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={formData.password}
                      placeholder="Crie sua senha"
                      autoComplete="new-password"
                      aria-invalid={Boolean(
                        errors.password,
                      )}
                      onChange={(event) =>
                        updateField(
                          "password",
                          event.target.value,
                        )
                      }
                    />

                    <button
                      type="button"
                      className={
                        styles.passwordToggle
                      }
                      onClick={() =>
                        setShowPassword(
                          (current) => !current,
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Ocultar senhas"
                          : "Mostrar senhas"
                      }
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <FieldError id="register-password-error">
                    {errors.password}
                  </FieldError>
                </div>

                <div className={styles.field}>
                  <label htmlFor="register-confirm-password">
                    Confirmar senha
                  </label>

                  <div
                    className={`${styles.inputGroup} ${
                      errors.confirmPassword
                        ? styles.inputError
                        : ""
                    }`}
                  >
                    <LockKeyhole aria-hidden="true" />

                    <input
                      id="register-confirm-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        formData.confirmPassword
                      }
                      placeholder="Digite novamente"
                      autoComplete="new-password"
                      aria-invalid={Boolean(
                        errors.confirmPassword,
                      )}
                      onChange={(event) =>
                        updateField(
                          "confirmPassword",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <FieldError id="register-confirm-password-error">
                    {errors.confirmPassword}
                  </FieldError>
                </div>
              </div>

              <div
                className={styles.passwordRules}
                aria-label="Requisitos da senha"
              >
                {passwordChecks.map((check) => (
                  <span
                    key={check.label}
                    className={
                      check.valid
                        ? styles.passwordRuleValid
                        : undefined
                    }
                  >
                    <span>
                      <Check aria-hidden="true" />
                    </span>

                    {check.label}
                  </span>
                ))}
              </div>

              <label
                className={`${styles.termsRow} ${
                  errors.termsAccepted
                    ? styles.termsError
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={
                    formData.termsAccepted
                  }
                  onChange={(event) =>
                    updateField(
                      "termsAccepted",
                      event.target.checked,
                    )
                  }
                />

                <span className={styles.checkbox}>
                  <Check aria-hidden="true" />
                </span>

                <span>
                  Li e aceito o{" "}
                  <TransitionLink
                    to="/documentacao#codigo-de-conduta"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    código de conduta
                  </TransitionLink>{" "}
                  e a política de privacidade.
                </span>
              </label>

              <FieldError id="register-terms-error">
                {errors.termsAccepted}
              </FieldError>

              {submissionError && (
                <p
                  className={styles.fieldError}
                  role="alert"
                  aria-live="polite"
                >
                  {submissionError}
                </p>
              )}
            </div>

            <footer className={styles.formFooter}>
              <TransitionLink
                to="/login"
                className={styles.loginLink}
              >
                Já tenho uma conta
              </TransitionLink>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? "Criando sua conta..."
                  : "Criar minha conta"}

                <BadgeCheck aria-hidden="true" />
              </button>
            </footer>
          </form>
        </section>
      </div>

      <ModalMensagem
        aberto={confirmationModalOpen}
        titulo="Conta criada"
        mensagem={
          <p>
            Sua conta foi criada com sucesso.
            Agora você poderá entrar na CONG usando seu
            e-mail e senha.
          </p>
        }
        dados={{
          Conta: {
            Nome: formData.name.trim(),
            "E-mail": formData.email
              .trim()
              .toLowerCase(),
            Senha:
              "Não exibida por segurança",
          },
        }}
        tamanho="grande"
        textoBotaoOk="Ir para o login"
        fecharAoClicarFora={false}
        onFechar={finishRegistration}
      />
    </main>
  );
}