import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import { supabase } from "../../services/supabase";

import logo from "../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../assets/mascot/cong-happy.webp";

import styles from "./RecoverPassword.module.css";

const schema = z.object({
  email: z.email("Digite um e-mail válido."),
});

type FormData = z.infer<typeof schema>;

export default function RecoverPassword() {
  const navigate = useNavigate();

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleBack = () => {
    navigate("/login");
  };

  const onSubmit = async ({ email }: FormData) => {
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setErrorMessage(
        "Não foi possível enviar o link agora. Tente novamente em alguns instantes.",
      );
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className={styles.recoveryPage}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.headerButton}
          onClick={handleBack}
        >
          <ArrowLeft size={17} />
          <span>Voltar</span>
        </button>

        <TransitionLink to="/" className={styles.logoLink}>
          <img src={logo} alt="CONG" className={styles.logo} />
        </TransitionLink>

        <TransitionLink to="/login" className={styles.loginLink}>
          <LogIn size={16} />
          <span>Entrar</span>
        </TransitionLink>
      </header>

      <section className={styles.content}>
        <div className={styles.cardWrapper}>
          <div className={styles.tape} />

          <article
            className={`${styles.card} ${submitted ? styles.cardSuccess : ""}`}
          >
            <div className={styles.cardDecoration}>✦</div>

            <div className={styles.stepLabel}>
              <span>01</span>
              <strong>RECUPERAÇÃO DE ACESSO</strong>
            </div>

            <div className={styles.mailIllustration} aria-hidden="true">
              <div className={styles.mailCircle}>
                {submitted ? <Check size={38} /> : <Mail size={38} />}
              </div>

              <div className={styles.mailOrbit} />

              <span className={`${styles.spark} ${styles.sparkOne}`}>✦</span>
              <span className={`${styles.spark} ${styles.sparkTwo}`}>✦</span>
              <span className={`${styles.spark} ${styles.sparkThree}`}>✦</span>
            </div>

            {!submitted ? (
              <>
                <div className={styles.heading}>
                  <span className={styles.eyebrow}>RECUPERAÇÃO DE ACESSO</span>
                  <h1>
                    Esqueceu sua senha?
                    <span />
                  </h1>
                  <p>
                    Sem problema. Informe o e-mail da sua conta e enviaremos um
                    link para você criar uma nova senha.
                  </p>
                </div>

                <form
                  className={styles.form}
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <label htmlFor="email">E-mail</label>

                  <div
                    className={`${styles.inputWrapper} ${
                      errors.email ? styles.inputError : ""
                    }`}
                  >
                    <Mail size={18} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...register("email")}
                    />
                  </div>

                  {errors.email && (
                    <p className={styles.fieldError}>
                      <CircleAlert size={14} />
                      {errors.email.message}
                    </p>
                  )}

                  {errorMessage && (
                    <div className={styles.errorMessage}>
                      <CircleAlert size={17} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Enviando..."
                      : "Enviar link de recuperação"}
                  </button>
                </form>

                <div className={styles.securityNote}>
                  <ShieldCheck size={18} />
                  <p>
                    Por segurança, não informamos se um e-mail está cadastrado
                    ou não. Caso exista uma conta associada, as instruções serão
                    enviadas.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={styles.heading}>
                  <span className={styles.eyebrow}>LINK ENVIADO</span>
                  <h1>
                    Olhe seu e-mail.
                    <span />
                  </h1>
                  <p>
                    Se existir uma conta associada ao endereço informado,
                    enviamos as instruções para criar uma nova senha.
                  </p>
                </div>

                <div className={styles.successStatus}>
                  <Check size={19} />
                  <span>Confira sua caixa de entrada e também o spam.</span>
                </div>

                <div className={styles.divider}>
                  <Sparkles size={16} />
                </div>

                <TransitionLink to="/login" className={styles.backToLogin}>
                  <LogIn size={17} />
                  Voltar para o login
                </TransitionLink>

                <button
                  type="button"
                  className={styles.tryAgain}
                  onClick={() => setSubmitted(false)}
                >
                  Usar outro e-mail
                </button>
              </>
            )}
          </article>
        </div>

        <aside className={styles.visual} aria-hidden="true">
          <div className={styles.visualBackdrop} />

          <div className={styles.mascotStage}>
            <div className={styles.mascotHalo} />
            <div className={styles.mascotShadow} />

            <img src={mascot} alt="" className={styles.mascot} />

            <div className={styles.notePaper}>
              <span>{submitted ? "e-mail" : "quase lá!"}</span>
              <strong>{submitted ? "confira!" : "1 passo"}</strong>
            </div>

            <div className={styles.envelope}>
              <Mail size={28} />
            </div>

            <span className={`${styles.visualStar} ${styles.starOne}`}>✦</span>
            <span className={`${styles.visualStar} ${styles.starTwo}`}>✦</span>
            <span className={`${styles.visualStar} ${styles.starThree}`}>
              ✦
            </span>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 CONG</span>
        <span>Quando a ONG ativa a força do CONG, o impacto acontece.</span>
      </footer>
    </main>
  );
}
