import { FiShield } from "react-icons/fi";
import CommunityModerationPanel from "../../../components/community/CommunityModerationPanel";
import styles from "./CommunityModerationPage.module.css";

export default function CommunityModerationPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <span>
          <FiShield /> Administração da plataforma
        </span>
        <h1>Moderação</h1>
        <p>
          Revise denúncias da Comunidade CONG e registre decisões de forma
          clara.
        </p>
      </header>
      <CommunityModerationPanel variant="page" />
    </main>
  );
}
