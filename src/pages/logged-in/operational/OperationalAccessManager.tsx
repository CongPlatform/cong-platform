import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheck, FiChevronDown, FiLock, FiPlus, FiSearch, FiShield, FiUserCheck, FiUsers, FiX } from "react-icons/fi";
import {
  addAccessRole, changeModuleGrant, pendingJoinRequests, reviewJoinRequest, revokeSystemGrant,
  setSystemGrant, systemAccessOverview, type AccessOverview, type AccessPerson, type AccessRole, type JoinRequest,
} from "../../../features/operational/operationalAccessService";
import css from "./OperationalAccessManager.module.css";

type Section = "people" | "roles";
type Level = "inherit" | "none" | "read" | "write";

function accessDescription(role: AccessRole): string {
  if (role.canConfigure) return "Pode organizar o sistema e gerenciar seus recursos.";
  if (role.canWrite) return "Pode consultar, cadastrar e atualizar registros.";
  return "Pode consultar informações sem modificá-las.";
}

function accessTitle(role: AccessRole): string {
  if (role.presetCode === "administrator") return "Gerenciar tudo";
  if (role.presetCode === "editor") return "Participar e editar";
  if (role.presetCode === "viewer") return "Apenas acompanhar";
  return role.name;
}

function nameInitials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function OperationalAccessManager({ systemId, onClose }: { systemId: string; onClose: () => void }) {
  const [data, setData] = useState<AccessOverview | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [section, setSection] = useState<Section>("people");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showAreaSettings, setShowAreaSettings] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [declineConfirm, setDeclineConfirm] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleWrite, setRoleWrite] = useState(false);
  const [roleConfigure, setRoleConfigure] = useState(false);

  const load = useCallback(async () => {
    const overview = await systemAccessOverview(systemId);
    setData(overview);
    try {
      setRequests(await pendingJoinRequests());
      setCanReview(true);
    } catch {
      setCanReview(false);
      setRequests([]);
    }
  }, [systemId]);

  useEffect(() => {
    let active = true;
    void systemAccessOverview(systemId).then(async overview=>{
      if(!active)return;
      setData(overview);
      try{const requests=await pendingJoinRequests();if(active){setRequests(requests);setCanReview(true);}}
      catch{if(active){setCanReview(false);setRequests([]);}}
    }).catch(err=>{if(active)setError(err instanceof Error?err.message:"Não foi possível consultar as permissões.");});
    return () => { active = false; };
  }, [systemId]);

  const effectiveSelectedUser = data?.people.some(person=>person.id===selectedUser)?selectedUser:(data?.people[0]?.id??null);
  const people = useMemo(() => data?.people.filter(person => `${person.name} ${person.email}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))) ?? [], [data, search]);
  const selected = data?.people.find(person => person.id === effectiveSelectedUser) ?? null;
  const grant = data?.grants.find(item => item.userId === effectiveSelectedUser);
    const customAreas = data?.modules.filter(item => grant?.modules[item.id] !== undefined) ?? [];

  async function commit(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setNotice(message);
      setRevokeConfirm(false);
      setDeclineConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar. Confira sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function selectPerson(person: AccessPerson) {
    setSelectedUser(person.id);
    setShowAreaSettings(false);
    setRevokeConfirm(false);
    setError("");
    setNotice("");
    setSection("people");
  }

  async function createRole() {
    if (roleName.trim().length < 2) return;
    await commit(() => addAccessRole(systemId, { name: roleName.trim(), canRead: true, canWrite: roleWrite || roleConfigure, canConfigure: roleConfigure }), "Perfil criado. Agora ele pode ser atribuído a uma pessoa.");
    setRoleName("");
    setRoleWrite(false);
    setRoleConfigure(false);
  }

  return <div className={css.backdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="cong-access-title">
      <header className={css.header}>
        <div><span className={css.kicker}>ACESSOS DO SISTEMA</span><h2 id="cong-access-title">Quem pode usar este sistema?</h2><p>Escolha uma pessoa e defina o que ela pode fazer.</p></div>
        <button type="button" className={css.close} onClick={onClose} aria-label="Fechar" disabled={busy}><FiX /></button>
      </header>
      <div className={css.body}>
        {error && <div className={css.error} role="alert">{error}</div>}
        {notice && <div className={css.notice} role="status"><FiCheck />{notice}</div>}
        <div className={css.toolbar} role="tablist" aria-label="Configurações de acesso">
          <button type="button" role="tab" aria-selected={section === "people"} className={section === "people" ? css.tabActive : ""} onClick={() => setSection("people")}><FiUsers /> Pessoas</button>
          <button type="button" role="tab" aria-selected={section === "roles"} className={section === "roles" ? css.tabActive : ""} onClick={() => setSection("roles")}><FiShield /> Perfis personalizados</button>
        </div>
        {canReview && <div className={css.requests}>
          <button type="button" className={css.requestsButton} aria-expanded={showJoinRequests} onClick={() => setShowJoinRequests(value => !value)}>
            <FiUserCheck /><span>Pedidos para participar da ONG</span><strong>{requests.length}</strong><FiChevronDown className={showJoinRequests ? css.chevronOpen : ""} />
          </button>
          {showJoinRequests && <div className={css.requestContent}>
            {requests.length === 0 ? <p>Nenhum pedido aguardando aprovação.</p> : requests.map(person => <div key={person.id} className={css.requestPerson}>
              <div><strong>{person.name}</strong><small>{person.email}</small></div>
              <div className={css.requestActions}>
                <button disabled={busy} onClick={() => void commit(() => reviewJoinRequest(person.id, true), "Participação na ONG aprovada. Defina o acesso ao sistema na lista de pessoas.")}>Aprovar</button>
                {declineConfirm === person.id ? <><button disabled={busy} className={css.danger} onClick={() => void commit(() => reviewJoinRequest(person.id, false), "Pedido recusado.")}>Confirmar recusa</button><button onClick={() => setDeclineConfirm(null)} disabled={busy}>Cancelar</button></> : <button disabled={busy} className={css.ghost} onClick={() => setDeclineConfirm(person.id)}>Recusar</button>}
              </div>
            </div>)}
          </div>}
        </div>}
        {section === "people" ? <div className={css.layout}>
          <aside className={css.roster} aria-label="Integrantes da ONG">
            <div className={css.rosterHeading}><strong>Pessoas da ONG</strong><span>{data?.people.length ?? 0}</span></div>
            <label className={css.search}><FiSearch /><span className={css.srOnly}>Buscar pessoa por nome ou e-mail</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar pessoa" /></label>
            <div className={css.personList}>
              {!data ? <p className={css.empty}>Consultando integrantes…</p> : people.length === 0 ? <p className={css.empty}>Nenhuma pessoa encontrada.</p> : people.map(person => {
                const personGrant = data.grants.find(value => value.userId === person.id);
                const role = data.roles.find(value => value.id === personGrant?.roleId);
                const active = person.id === effectiveSelectedUser;
                return <button type="button" key={person.id} className={`${css.personButton} ${active ? css.selected : ""}`} aria-pressed={active} onClick={() => selectPerson(person)}>
                  <span className={css.avatar}>{nameInitials(person.name)}</span><span className={css.personInfo}><strong>{person.name}</strong><small>{person.protected ? "Acesso completo" : role?.name ?? "Sem acesso"}</small></span>
                </button>;
              })}
            </div>
          </aside>
          <section className={css.detail} aria-label="Configurar acesso da pessoa selecionada">
            {!selected || !data ? <div className={css.emptyDetail}>Selecione uma pessoa para configurar o acesso.</div> : <>
              <div className={css.detailHeading}><div className={css.avatarLarge}>{nameInitials(selected.name)}</div><div><h3>{selected.name}</h3><p>{selected.email}</p></div></div>
              {selected.protected ? <div className={css.protected}><FiLock /><div><strong>Acesso completo protegido</strong><p>Esta conta administra a organização ou criou o sistema. O acesso não pode ser reduzido aqui.</p></div></div> : <>
                <h4 className={css.labelTitle}>O que essa pessoa pode fazer?</h4>
                <div className={css.roleCards}>
                  {data.roles.map(role => <button key={role.id} type="button" disabled={busy} className={`${css.roleCard} ${grant?.roleId === role.id ? css.roleActive : ""}`} aria-pressed={grant?.roleId === role.id} onClick={() => { if (grant?.roleId !== role.id) void commit(() => setSystemGrant(systemId, selected.id, role.id), `Perfil ${role.name} atribuído.`); }}>
                    <span className={css.roleCardTop}><strong>{accessTitle(role)}</strong>{grant?.roleId === role.id ? <FiCheck /> : null}</span><span>{accessDescription(role)}</span>{role.presetCode === null && <small>Perfil criado pela ONG</small>}
                  </button>)}
                </div>
                {!grant && <p className={css.hint}>Atualmente esta pessoa não acessa este sistema. Escolha uma das opções acima para liberar.</p>}
                {grant && <>
                  <button type="button" className={css.advancedToggle} aria-expanded={showAreaSettings} onClick={() => setShowAreaSettings(value => !value)}><span><strong>Personalizar acesso por área</strong><small>{customAreas.length ? `${customAreas.length} área(s) com regra específica` : "Opcional · as áreas seguem o perfil acima"}</small></span><FiChevronDown className={showAreaSettings ? css.chevronOpen : ""} /></button>
                  {showAreaSettings && <div className={css.areaSettings}>
                    <p>Altere apenas as áreas que precisam de uma regra diferente. As demais seguem a permissão geral.</p>
                    {data.modules.length === 0 ? <span className={css.empty}>Este sistema ainda não possui áreas.</span> : data.modules.map(item => <label key={item.id} className={css.areaRow}><span>{item.name}</span><select disabled={busy} value={grant.modules[item.id] ?? "inherit"} onChange={event => void commit(() => changeModuleGrant(systemId, selected.id, item.id, event.target.value as Level), `Acesso a ${item.name} atualizado.`)}><option value="inherit">Igual ao perfil</option><option value="none">Não pode acessar</option><option value="read">Só visualizar</option><option value="write">Visualizar e editar</option></select></label>)}
                  </div>}
                  <div className={css.revokeArea}>
                    {revokeConfirm ? <div className={css.confirm}><strong>Retirar o acesso de {selected.name}?</strong><div><button type="button" disabled={busy} className={css.danger} onClick={() => void commit(() => revokeSystemGrant(systemId, selected.id), "Acesso removido deste sistema.")}>Sim, retirar acesso</button><button type="button" disabled={busy} className={css.ghost} onClick={() => setRevokeConfirm(false)}>Cancelar</button></div></div> : <button type="button" disabled={busy} className={css.revokeButton} onClick={() => setRevokeConfirm(true)}>Retirar acesso ao sistema</button>}
                  </div>
                </>}
              </>}
            </>}
          </section>
        </div> : <div className={css.roleSection}>
          <div><h3>Criar perfil para reutilizar</h3><p>Exemplo: “Coordenação de eventos” pode editar registros, mas não configurar a estrutura do sistema.</p></div>
          <div className={css.customForm}>
            <label className={css.nameInput}>Nome do perfil<input value={roleName} maxLength={80} placeholder="Ex.: Coordenação de eventos" onChange={event => setRoleName(event.target.value)} /></label>
            <label className={css.optionLine}><input type="checkbox" checked={roleWrite} disabled={busy || roleConfigure} onChange={event => setRoleWrite(event.target.checked)} /><span><strong>Editar registros</strong><small>Permite cadastrar e alterar informações.</small></span></label>
            <label className={css.optionLine}><input type="checkbox" checked={roleConfigure} disabled={busy} onChange={event => { setRoleConfigure(event.target.checked); if (event.target.checked) setRoleWrite(true); }} /><span><strong>Configurar o sistema</strong><small>Permite alterar peças, percursos e configurações.</small></span></label>
            <button className={css.primary} type="button" disabled={busy || roleName.trim().length < 2} onClick={() => void createRole()}><FiPlus /> Criar perfil</button>
          </div>
          <div className={css.roleList}><strong>Perfis disponíveis</strong>{data?.roles.map(role => <div key={role.id}><span>{role.name}</span><small>{accessDescription(role)}</small></div>)}</div>
          <button type="button" className={css.backLink} onClick={() => setSection("people")}><FiArrowLeft /> Voltar às pessoas</button>
        </div>}
      </div>
      <footer className={css.footer}><span><FiLock /> Alterações salvas e verificadas pelo servidor.</span><button type="button" onClick={onClose} disabled={busy}>Concluir</button></footer>
    </section>
  </div>;
}
