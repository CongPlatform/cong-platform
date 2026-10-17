import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiGithub, FiMail, FiPauseCircle, FiTrash2 } from "react-icons/fi";
import { SiGoogle } from "react-icons/si";
import ModalMensagem from "../../../../components/modalMensagem/ModalMensagem";
import { useAuth } from "../../../../contexts/auth-context";
import type { AccountAuthProvider } from "../../../../services/accountService";
import { deactivateMyAccount, deleteMyAccount } from "../../../../services/accountService";
import styles from "./AccountAccessSection.module.css";

const PROVIDER_META: Record<AccountAuthProvider, { label: string; description: string; icon: typeof FiMail }> = {
  email: { label: "E-mail e senha", description: "Acesso usando as credenciais cadastradas na CONG.", icon: FiMail },
  google: { label: "Google", description: "Acesso conectado à sua conta Google.", icon: SiGoogle },
  github: { label: "GitHub", description: "Acesso conectado à sua conta GitHub.", icon: FiGithub },
};

type Action = "deactivate" | "delete";

export default function AccountAccessSection() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!account) return null;
  const { authentication } = account;

  function close() {
    if (busy) return;
    setAction(null);
    setConfirmation("");
    setError("");
  }
  async function confirm() {
    if (!action || busy || (action === "delete" && confirmation !== "EXCLUIR")) return;
    setBusy(true);
    setError("");
    try {
      if (action === "deactivate") await deactivateMyAccount();
      else await deleteMyAccount();
      await logout();
      navigate("/login", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a solicitação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.section}>
      <section className={styles.block}>
        <div className={styles.blockHeading}><h3>E-mail principal</h3><p>Endereço usado como referência para esta conta.</p></div>
        <div className={styles.emailRow}>
          <span className={styles.providerIcon} aria-hidden="true"><FiMail /></span>
          <div><strong>{authentication.email}</strong><span>E-mail da conta</span></div>
          <span className={`${styles.status} ${authentication.emailVerified ? styles.statusConnected : styles.statusPending}`}>
            <FiCheckCircle aria-hidden="true" />{authentication.emailVerified ? "Verificado" : "Confirmação pendente"}
          </span>
        </div>
      </section>
      <section className={styles.block}>
        <div className={styles.blockHeadingInline}>
          <div><h3>Métodos de acesso</h3><p>Formas de autenticação vinculadas à sua conta.</p></div>
          <span>{authentication.providers.length} {authentication.providers.length === 1 ? "método" : "métodos"}</span>
        </div>
        {authentication.providers.length === 0 ? <div className={styles.emptyProviders}>Nenhum método de acesso foi identificado.</div> : (
          <div className={styles.providers}>{authentication.providers.map((provider) => {
            const meta = PROVIDER_META[provider]; const Icon = meta.icon;
            return <div key={provider} className={styles.providerRow}>
              <span className={styles.providerIcon} aria-hidden="true"><Icon /></span>
              <div><strong>{meta.label}</strong><p>{meta.description}</p></div>
              <span className={`${styles.status} ${styles.statusConnected}`}><FiCheckCircle aria-hidden="true" />Conectado</span>
            </div>;
          })}</div>
        )}
      </section>
      <section className={`${styles.block} ${styles.lifecycle}`}>
        <div className={styles.blockHeading}><h3>Controle da conta</h3>
          <p>Você decide quando parar de usar a CONG ou solicitar a exclusão dos seus dados.</p></div>
        <div className={styles.lifecycleOptions}>
          <div><FiPauseCircle aria-hidden="true" /><div><strong>Desativar minha conta</strong>
            <p>Suspende o acesso. Um novo login autenticado reativa a conta; seus dados são preservados.</p></div>
            <button type="button" onClick={() => setAction("deactivate")}>Desativar</button>
          </div>
          <div><FiTrash2 aria-hidden="true" /><div><strong>Excluir minha conta</strong>
            <p>Exclui seu acesso e remove seus dados pessoais. Registros institucionais permanecem preservados e anônimos. Se você for a única pessoa responsável por uma ONG, precisará indicar outro membro antes.</p></div>
            <button type="button" className={styles.dangerButton} onClick={() => setAction("delete")}>Excluir conta</button>
          </div>
        </div>
      </section>
      <p className={styles.securityNote}>Alterações de senha, e-mail ou provedores de login exigem verificação adicional.</p>
      <ModalMensagem aberto={action !== null} titulo={action === "delete" ? "Excluir minha conta" : "Desativar sua conta?"}
        tamanho="medio" mostrarBotaoOk={false} onFechar={close} mensagem={
          <div className={styles.confirmDialog}>
            <FiAlertTriangle className={styles.confirmIcon} aria-hidden="true" />
            {action === "delete" ? <>
              <p>A exclusão remove a autenticação e os dados pessoais de sua conta. Conversas pessoais e publicações individuais deixam de estar disponíveis. Conteúdo institucional é preservado sem expor sua identidade. Esta ação não pode ser desfeita.</p>
              <label>Digite <strong>EXCLUIR</strong> para confirmar<input autoComplete="off" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)} placeholder="EXCLUIR" /></label>
            </> : <p>Seu acesso será suspenso e você sairá da sessão. Você poderá reativar a conta entrando novamente com suas credenciais.</p>}
            {error ? <p className={styles.actionError} role="alert">{error}</p> : null}
            <div className={styles.dialogButtons}>
              <button type="button" onClick={close} disabled={busy}>Cancelar</button>
              <button type="button" className={styles.confirmDanger} onClick={() => void confirm()}
                disabled={busy || (action === "delete" && confirmation !== "EXCLUIR")}>{busy ? "Processando..." : action === "delete" ? "Excluir definitivamente" : "Desativar conta"}</button>
            </div>
          </div>}/>
    </div>
  );
}
