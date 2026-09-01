import { FiCheckCircle, FiGithub, FiMail } from "react-icons/fi";
import { SiGoogle } from "react-icons/si";

import { useAuth } from "../../../../contexts/auth-context";
import type { AccountAuthProvider } from "../../../../services/accountService";
import styles from "./AccountAccessSection.module.css";

const PROVIDER_META: Record<
  AccountAuthProvider,
  {
    label: string;
    description: string;
    icon: typeof FiMail;
  }
> = {
  email: {
    label: "E-mail e senha",
    description: "Acesso usando as credenciais cadastradas na CONG.",
    icon: FiMail,
  },
  google: {
    label: "Google",
    description: "Acesso conectado à sua conta Google.",
    icon: SiGoogle,
  },
  github: {
    label: "GitHub",
    description: "Acesso conectado à sua conta GitHub.",
    icon: FiGithub,
  },
};

export default function AccountAccessSection() {
  const { account } = useAuth();

  if (!account) return null;

  const { authentication } = account;

  return (
    <div className={styles.section}>
      <section className={styles.block}>
        <div className={styles.blockHeading}>
          <h3>E-mail principal</h3>
          <p>Endereço usado como referência para esta conta.</p>
        </div>

        <div className={styles.emailRow}>
          <span className={styles.providerIcon} aria-hidden="true">
            <FiMail />
          </span>
          <div>
            <strong>{authentication.email}</strong>
            <span>E-mail da conta</span>
          </div>
          <span
            className={`${styles.status} ${
              authentication.emailVerified
                ? styles.statusConnected
                : styles.statusPending
            }`}
          >
            <FiCheckCircle aria-hidden="true" />
            {authentication.emailVerified
              ? "Verificado"
              : "Confirmação pendente"}
          </span>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHeadingInline}>
          <div>
            <h3>Métodos de acesso</h3>
            <p>Formas de autenticação vinculadas à sua conta.</p>
          </div>
          <span>
            {authentication.providers.length}{" "}
            {authentication.providers.length === 1 ? "método" : "métodos"}
          </span>
        </div>

        {authentication.providers.length === 0 ? (
          <div className={styles.emptyProviders}>
            Nenhum método de acesso foi identificado para esta conta.
          </div>
        ) : (
          <div className={styles.providers}>
            {authentication.providers.map((provider) => {
              const meta = PROVIDER_META[provider];
              const Icon = meta.icon;

              return (
                <div key={provider} className={styles.providerRow}>
                  <span className={styles.providerIcon} aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <strong>{meta.label}</strong>
                    <p>{meta.description}</p>
                  </div>
                  <span
                    className={`${styles.status} ${styles.statusConnected}`}
                  >
                    <FiCheckCircle aria-hidden="true" />
                    Conectado
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className={styles.securityNote}>
        Alterações de e-mail, senha ou identidades de acesso exigem um fluxo
        próprio de segurança e não são feitas pelo formulário público do perfil.
      </p>
    </div>
  );
}
