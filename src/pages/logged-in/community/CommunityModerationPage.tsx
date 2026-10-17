import { useState } from "react";
import { FiShield, FiClipboard } from "react-icons/fi";
import CommunityModerationPanel from "../../../components/community/CommunityModerationPanel";
import SecurityAuditPanel from "../../../components/security/SecurityAuditPanel";
import styles from "./CommunityModerationPage.module.css";

export default function CommunityModerationPage() {
  const [view,setView]=useState<"moderation"|"audit">("moderation");
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <span><FiShield /> Administração da plataforma</span>
        <h1>Moderação</h1>
        <p>Revise denúncias, documente decisões e consulte o histórico de responsabilidade.</p>
      </header>
      <nav className={styles.auditNav} aria-label="Painéis administrativos">
        <button type="button" aria-current={view==="moderation"?"page":undefined} onClick={()=>setView("moderation")}><FiShield/> Denúncias e decisões</button>
        <button type="button" aria-current={view==="audit"?"page":undefined} onClick={()=>setView("audit")}><FiClipboard/> Auditoria e responsabilidade</button>
      </nav>
      {view==="moderation"?<CommunityModerationPanel variant="page"/>:<SecurityAuditPanel/>}
    </main>
  );
}
