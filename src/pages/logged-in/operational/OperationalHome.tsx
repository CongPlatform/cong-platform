import { useEffect, useRef, useState, type FormEvent } from "react";
import { FiArrowLeft, FiArrowRight, FiBox, FiCompass, FiEdit3, FiPlus, FiTrash2, FiGrid, FiList, FiArrowUpRight, FiClock, FiLayers, FiUsers } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { createOperationalSystem, deleteOperationalSystem, listOperationalSystems, getOperationalCapabilities, type OperationalCapabilities, type OperationalSystemSummary } from "../../../features/operational/operationalService";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import styles from "./Operational.module.css";
import homeStyles from "./OperationalHomeUX.module.css";
import OperationalJoinRequests from "./OperationalJoinRequests";
import {pendingJoinRequests} from "../../../features/operational/operationalAccessService";
import CongLoadingState from "../../../components/feedback/CongLoadingState";

type StartMode = "guided" | "blank";

export default function OperationalHome() {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const [systems, setSystems] = useState<OperationalSystemSummary[]>([]);
  const [layout, setLayout] = useState<"grid"|"list">(() => {try{return localStorage.getItem("cong-system-home-layout")==="list"?"list":"grid";}catch{return "grid";}});
  function changeLayout(next:"grid"|"list"){setLayout(next);try{localStorage.setItem("cong-system-home-layout",next);}catch{return;}}
  const [loading, setLoading] = useState(true);
  const [capabilities,setCapabilities]=useState<OperationalCapabilities|null>(null);
  const [pendingCount,setPendingCount]=useState<number|null>(null);
  const [openJoinRequests,setOpenJoinRequests]=useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState<"choose" | "name">("choose");
  const [startMode, setStartMode] = useState<StartMode>("guided");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<OperationalSystemSummary | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(()=>{let active=true;void pendingJoinRequests().then(items=>{if(active)setPendingCount(items.length);}).catch(()=>{if(active)setPendingCount(null);});return()=>{active=false;};},[]);

  useEffect(() => {
    let active = true;
    void Promise.all([listOperationalSystems(),getOperationalCapabilities()])
      .then(([items,access]) => { if (active) {setSystems(items);setCapabilities(access);} })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar os sistemas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!creating || createStep !== "name") return;
    nameRef.current?.focus();
  }, [creating, createStep]);

  function openCreate() {
    setError("");
    setName("");
    setCreateStep("choose");
    setCreating(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreating(false);
    setError("");
  }

  function chooseStart(mode: StartMode) {
    setStartMode(mode);
    setCreateStep("name");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2 || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await createOperationalSystem(name.trim(), "");
      navigate(`/app/sistemas/${created.id}`, { state: { modularStart: startMode } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o sistema.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!removing || deleting || confirmation !== removing.name) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteOperationalSystem(removing);
      setSystems(items => items.filter(item => item.id !== removing.id));
      setRemoving(null);
      setConfirmation("");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Não foi possível excluir este sistema.");
    } finally {
      setDeleting(false);
    }
  }

  return <main className={styles.page}>
    {openJoinRequests&&<OperationalJoinRequests onClose={()=>{setOpenJoinRequests(false);void pendingJoinRequests().then(items=>setPendingCount(items.length)).catch(()=>{});}}/>}
    <header className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>CONG / SEUS ESPAÇOS</span>
        <h1>Meus sistemas</h1>
        <p>Organize e realize o trabalho da sua organização em um só lugar.</p>
      </div>
      <div className={styles.actions}>{pendingCount!==null&&<button type="button" className={styles.ghostButton} onClick={()=>setOpenJoinRequests(true)}><FiUsers/> Participação na ONG {pendingCount>0&&`(${pendingCount})`}</button>}{capabilities?.canCreate&&<button className={styles.primaryButton} onClick={openCreate}><FiPlus /> Criar sistema</button>}</div>
    </header>

    {!creating && error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <CongLoadingState variant="cards" count={3} label="Preparando seus sistemas"/> : systems.length === 0 ?
      <div className={styles.emptyState}>
        <FiBox size={36}/><h2>O que você gostaria de construir?</h2>
        <p>{capabilities?.canCreate?"Comece com uma ideia ou com um espaço em branco. Você poderá personalizar tudo depois.":"Você ainda não recebeu acesso a um sistema. Peça ao gestor da ONG para autorizar sua participação."}</p>
        {capabilities?.canCreate&&<button className={styles.primaryButton} onClick={openCreate}>Criar meu primeiro sistema <FiArrowRight/></button>}
      </div> : <>
        <section className={homeStyles.summary} aria-label="Resumo dos seus sistemas">
          <div><span>Sistemas</span><strong>{systems.length}</strong></div>
          <div><span>Em uso</span><strong>{systems.filter(s=>s.status==="active").length}</strong></div>
          <div><span>Em construção</span><strong>{systems.filter(s=>s.status!=="active").length}</strong></div>
          <div><span>Peças instaladas</span><strong>{systems.reduce((n,s)=>n+s.moduleCount,0)}</strong></div>
        </section>
        <div className={homeStyles.collectionHeading}><div><h2>Seus espaços de trabalho</h2><p>Escolha um sistema para continuar de onde parou.</p></div><div className={homeStyles.picker} role="group" aria-label="Exibição de sistemas"><button aria-pressed={layout==="grid"} onClick={()=>changeLayout("grid")}><FiGrid/> Grade</button><button aria-pressed={layout==="list"} onClick={()=>changeLayout("list")}><FiList/> Lista</button></div></div>
        <section className={`${homeStyles.systems} ${homeStyles[layout]}`} aria-label="Seus sistemas">
          {systems.map(system=><article className={homeStyles.system} key={system.id}>
            <Link to={`/app/sistemas/${system.id}`} className={homeStyles.open}>
              <div className={homeStyles.logo}><FiBox/></div>
              <div className={homeStyles.info}><span className={homeStyles.status} data-status={system.status}>{system.status==="active"?"Em uso":"Em construção"}</span><h3>{system.name}</h3>{system.description&&<p>{system.description}</p>}</div>
              <div className={homeStyles.metadata}><span><FiLayers/> {system.moduleCount} {system.moduleCount===1?"peça":"peças"}</span><span><FiClock/> Atualizado em {new Date(system.updatedAt).toLocaleDateString("pt-BR")}</span></div>
              <span className={homeStyles.entry}>Abrir <FiArrowUpRight/></span>
            </Link>
            {(capabilities?.canManageAll||capabilities?.canManageIds.includes(system.id))&&<button type="button" className={homeStyles.remove} aria-label={`Excluir sistema ${system.name}`} onClick={()=>{setRemoving(system);setConfirmation("");setDeleteError("");}}><FiTrash2/> Excluir</button>}
          </article>)}
        </section>
      </>}

    <ConfirmActionModal
      open={Boolean(removing)}
      title="Excluir sistema permanentemente?"
      tone="danger"
      confirmLabel="Excluir permanentemente"
      busy={deleting}
      confirmDisabled={!removing || confirmation !== removing.name}
      onCancel={() => { if (!deleting) setRemoving(null); }}
      onConfirm={() => void deleteSelected()}
      description={<div className={styles.deletionExplanation}>
        <p>Essa ação remove o sistema, os módulos, os registros e as tarefas associados. <strong>Não é possível desfazer.</strong></p>
        <label>Para confirmar, digite exatamente <strong>{removing?.name}</strong>
          <input autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Nome do sistema" />
        </label>
        {deleteError && <p role="alert" className={styles.error}>{deleteError}</p>}
      </div>}
    />

    <ModalMensagem
      aberto={creating}
      titulo={createStep === "choose" ? "Como você quer começar?" : "Nome do seu sistema"}
      tamanho="medio"
      mostrarBotaoOk={false}
      fecharAoClicarFora={!saving}
      onFechar={closeCreate}
      mensagem={<div className={styles.newSystemFlow}>
        {createStep === "choose" ? <>
          <p className={styles.newSystemLead}>Não precisa decidir tudo agora. Escolha como prefere dar o primeiro passo.</p>
          <div className={styles.newSystemOptions}>
            <button type="button" className={styles.newSystemOption} onClick={() => navigate("/app/assistente-ia?goal=system")}>
              <span className={styles.newSystemOptionIcon}><FiCompass /></span>
              <strong>Me ajude a começar</strong>
              <span>Conversar com a IA para montar módulos e fluxos reais, editáveis.</span>
              <em>Recomendado</em>
              <FiArrowRight className={styles.newSystemOptionArrow} />
            </button>
            <button type="button" className={styles.newSystemOption} onClick={() => chooseStart("blank")}>
              <span className={styles.newSystemOptionIcon}><FiEdit3 /></span>
              <strong>Começar livremente</strong>
              <span>Ir direto para a biblioteca e montar as peças do meu jeito.</span>
              <FiArrowRight className={styles.newSystemOptionArrow} />
            </button>
          </div>
        </> : <>
          <button type="button" className={styles.newSystemBack} onClick={() => setCreateStep("choose")} disabled={saving}><FiArrowLeft /> Voltar às opções</button>
          <p className={styles.newSystemLead}>Escolha só um nome. Todo o resto será configurado dentro do construtor.</p>
          <form onSubmit={event => void create(event)}>
            <label className={styles.newSystemName}>Nome do sistema
              <input ref={nameRef} value={name} maxLength={100} minLength={2} onChange={event => setName(event.target.value)} placeholder="Ex.: Distribuição de cestas" required />
            </label>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.newSystemActions}>
              <button type="submit" disabled={saving || name.trim().length < 2} className={styles.primaryButton}>
                {saving ? "Criando..." : "Criar sistema"} <FiArrowRight />
              </button>
              <button type="button" className={styles.ghostButton} disabled={saving} onClick={closeCreate}>Cancelar</button>
            </div>
          </form>
        </>}
      </div>}
    />
  </main>;
}
