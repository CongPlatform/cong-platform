import { useEffect, useState } from "react";
import { FiAlertOctagon, FiClock, FiMail, FiShield } from "react-icons/fi";
import ModalMensagem from "../modalMensagem/ModalMensagem";
import { clearStoredAuthToken } from "../../services/api";
import styles from "./AccountRestrictionModal.module.css";

type Restriction = {
  kind: "banned" | "suspended";
  reason: string;
  until: string | null;
};

/** Visible to the affected user; no reporter or moderator identity is exposed. */
export default function AccountRestrictionModal() {
  const [restriction, setRestriction] = useState<Restriction | null>(null);
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<Restriction>).detail;
      if (detail?.kind === "banned" || detail?.kind === "suspended")
        setRestriction(detail);
    };
    window.addEventListener("cong:account-restricted", handle);
    return () => window.removeEventListener("cong:account-restricted", handle);
  }, []);
  const banned = restriction?.kind === "banned";
  const close = () => {
    clearStoredAuthToken();
    setRestriction(null);
    window.location.replace("/login");
  };
  return (
    <ModalMensagem
      aberto={Boolean(restriction)}
      titulo={banned ? "Conta banida" : "Conta suspensa"}
      tamanho="medio"
      mostrarBotaoOk={false}
      fecharAoClicarFora={false}
      onFechar={close}
      mensagem={
        restriction ? (
          <div className={styles.content}>
            <span className={styles.icon} aria-hidden="true">
              {banned ? <FiAlertOctagon /> : <FiShield />}
            </span>
            <p className={styles.lead}>
              {banned
                ? "Seu acesso à CONG foi bloqueado."
                : "Seu acesso à CONG está temporariamente suspenso."}
            </p>
            <div className={styles.detail}>
              <strong>Motivo da medida</strong>
              <p>{restriction.reason}</p>
            </div>
            {!banned && restriction.until ? (
              <div className={styles.deadline}>
                <FiClock aria-hidden="true" />{" "}
                <span>
                  Suspensão até{" "}
                  {new Date(restriction.until).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            ) : null}
            <p className={styles.note}>
              A decisão é institucional. A identidade de quem denunciou ou
              analisou o caso não é divulgada.
            </p>
            <div className={styles.actions}>
              <a href="mailto:congplatform@gmail.com?subject=Revis%C3%A3o%20de%20restri%C3%A7%C3%A3o%20CONG">
                <FiMail /> Solicitar esclarecimentos
              </a>
              <button type="button" onClick={close}>
                Entendi
              </button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
