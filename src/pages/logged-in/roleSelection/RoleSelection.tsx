import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import RoleScrollSelector, {
  type RoleOption,
} from "../../../components/roleScrollSelector/RoleScrollSelector";

import { useAuth } from "../../../contexts/auth-context";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import styles from "./RoleSelection.module.css";

const communityRoles: readonly RoleOption[] = [
  {
    id: "organization",
    label: "ONG",
  },
  {
    id: "developer",
    label: "Desenvolvedor",
  },
  {
    id: "designer",
    label: "Designer",
  },
  {
    id: "translator",
    label: "Tradutor",
  },
  {
    id: "volunteer",
    label: "Voluntário",
  },
  {
    id: "supporter",
    label: "Empresa",
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();

  const { logout } = useAuth();

  const navigationTimeoutRef =
    useRef<number | null>(null);

  const [selectedRole, setSelectedRole] =
    useState<RoleOption | null>(null);

  const [isLeaving, setIsLeaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    return () => {
      if (
        navigationTimeoutRef.current !== null
      ) {
        window.clearTimeout(
          navigationTimeoutRef.current,
        );
      }
    };
  }, []);

  const handleRoleSelect = (
    role: RoleOption,
  ) => {
    if (isLeaving) {
      return;
    }

    setErrorMessage("");
    setSelectedRole(role);
    setIsLeaving(true);

    navigationTimeoutRef.current =
      window.setTimeout(() => {
        navigate(
          `/app/criar-perfil/${role.id}`,
        );
      }, 520);
  };

  const handleLogout = async () => {
    if (isLeaving) {
      return;
    }

    try {
      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Não foi possível encerrar a sessão:",
        error,
      );

      setErrorMessage(
        "Não foi possível sair da conta. Tente novamente.",
      );
    }
  };

  const statusMessage = errorMessage
    ? errorMessage
    : selectedRole
      ? `Configurando perfil de ${selectedRole.label}...`
      : "";

  const isStatusVisible = Boolean(
    selectedRole || errorMessage,
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <img
          src={logo}
          alt="CONG"
          className={styles.logo}
        />

        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
          disabled={isLeaving}
        >
          <LogOut aria-hidden="true" />
          Sair
        </button>
      </header>

      <RoleScrollSelector
        roles={communityRoles}
        onRoleSelect={handleRoleSelect}
      />

      <div
        className={`${styles.selectionStatus} ${
          isStatusVisible
            ? styles.selectionStatusVisible
            : ""
        }`}
        role={
          errorMessage ? "alert" : "status"
        }
        aria-live={
          errorMessage
            ? "assertive"
            : "polite"
        }
      >
        {statusMessage}
      </div>
    </main>
  );
}