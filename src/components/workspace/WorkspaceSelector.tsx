import { useState } from "react";
import {
  FiBriefcase,
  FiChevronDown,
  FiCode,
  FiHeart,
  FiPenTool,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import ModalMensagem from "../modalMensagem/ModalMensagem";
import { useAuth } from "../../contexts/auth-context";
import { useOrganization } from "../../contexts/organization-context";
import { useWorkspace } from "../../contexts/workspace-context";

import styles from "./WorkspaceSelector.module.css";

function collaborationLabel(role: string): string {
  if (role === "designer") return "Designer";
  if (role === "developer") return "Desenvolvedor";
  if (role === "translator") return "Tradução e acessibilidade";
  if (role === "volunteer") return "Voluntário";
  return "Colaboração";
}

function roleIcon(role: string) {
  if (role === "designer") return <FiPenTool aria-hidden="true" />;
  if (role === "developer") return <FiCode aria-hidden="true" />;
  if (role === "volunteer") return <FiHeart aria-hidden="true" />;
  return <FiBriefcase aria-hidden="true" />;
}

export default function WorkspaceSelector({
  collapsed,
  onChanged,
}: {
  collapsed: boolean;
  onChanged?: () => void;
}) {
  const { collaborationProfiles } = useAuth();
  const { organizations } = useOrganization();
  const {
    workspace,
    switchingWorkspace,
    selectPersonalWorkspace,
    selectCollaborationWorkspace,
    selectOrganizationWorkspace,
  } = useWorkspace();
  const [open, setOpen] = useState(false);

  const currentLabel =
    workspace.kind === "organization"
      ? workspace.organization.name
      : workspace.kind === "collaboration"
        ? collaborationLabel(workspace.profile.role)
        : "Conta pessoal";

  const currentIcon =
    workspace.kind === "organization"
      ? <FiUsers aria-hidden="true" />
      : workspace.kind === "collaboration"
        ? roleIcon(workspace.profile.role)
        : <FiUser aria-hidden="true" />;

  async function switchWorkspace(action: () => Promise<void>): Promise<void> {
    await action();
    setOpen(false);
    onChanged?.();
  }

  return (
    <>
      <div className={styles.root} data-collapsed={collapsed ? "true" : "false"}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen(true)}
          disabled={switchingWorkspace}
          title={collapsed ? `Atuando como ${currentLabel}` : undefined}
          aria-haspopup="dialog"
        >
          <span className={styles.icon}>
            {currentIcon}
          </span>
          <span className={styles.triggerText}>
            <small>Atuando como</small>
            <strong>{currentLabel}</strong>
          </span>
          <FiChevronDown className={styles.chevron} aria-hidden="true" />
        </button>
      </div>

      <ModalMensagem
        aberto={open}
        titulo="Como você quer participar agora?"
        tamanho="medio"
        mostrarBotaoOk={false}
        fecharAoClicarFora
        onFechar={() => setOpen(false)}
        mensagem={
          <div className={styles.modalContent}>
            <p className={styles.modalLead}>
              A CONG reorganiza as ferramentas de acordo com o contexto escolhido. Você pode trocar quando quiser.
            </p>

            <section className={styles.modalGroup}>
              <span>Conta pessoal</span>
              <button
                type="button"
                className={styles.modalOption}
                data-active={workspace.kind === "personal" ? "true" : "false"}
                onClick={() => void switchWorkspace(selectPersonalWorkspace)}
              >
                <span className={styles.modalIcon}><FiUser /></span>
                <span>
                  <strong>Conta pessoal</strong>
                  <small>Comunidade, perfil e atividades pessoais.</small>
                </span>
              </button>
            </section>

            {collaborationProfiles.length > 0 ? (
              <section className={styles.modalGroup}>
                <span>Perfis de colaboração</span>
                <div className={styles.optionGrid}>
                  {collaborationProfiles.map((profile) => {
                    const icon = roleIcon(profile.role);
                    const active = workspace.kind === "collaboration" && workspace.profile.id === profile.id;
                    return (
                      <button
                        type="button"
                        key={profile.id}
                        className={styles.modalOption}
                        data-active={active ? "true" : "false"}
                        onClick={() => void switchWorkspace(() => selectCollaborationWorkspace(profile))}
                      >
                        <span className={styles.modalIcon}>{icon}</span>
                        <span>
                          <strong>{collaborationLabel(profile.role)}</strong>
                          <small>Ferramentas e oportunidades deste perfil.</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {organizations.length > 0 ? (
              <section className={styles.modalGroup}>
                <span>Organizações</span>
                <div className={styles.optionGrid}>
                  {organizations.map((organization) => {
                    const active = workspace.kind === "organization" && workspace.organization.id === organization.id;
                    return (
                      <button
                        type="button"
                        key={organization.id}
                        className={styles.modalOption}
                        data-active={active ? "true" : "false"}
                        onClick={() => void switchWorkspace(() => selectOrganizationWorkspace(organization))}
                      >
                        <span className={styles.modalIcon}><FiUsers /></span>
                        <span>
                          <strong>{organization.name}</strong>
                          <small>{organization.organizationType === "ngo" ? "ONG ou projeto social" : "Empresa apoiadora"}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        }
      />
    </>
  );
}
