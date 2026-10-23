import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiEye, FiEdit3, FiLock, FiSearch, FiShield, FiUploadCloud, FiX } from "react-icons/fi";
import { ApiError } from "../../../services/api";
import { listSiteAccessPeople, setSiteAccessPerson, type SiteAccessLevel, type SiteAccessPerson } from "../../../services/institutionalAccessService";
import css from "./SitePermissionsDialog.module.css";

const levels: Array<{ value: SiteAccessLevel; title: string; description: string; icon: typeof FiEye }> = [
  { value: "none", title: "Sem acesso", description: "Não abre os sites no editor da CONG.", icon: FiLock },
  { value: "viewer", title: "Visualizar", description: "Consulta os sites e as prévias, sem alterar nada.", icon: FiEye },
  { value: "editor", title: "Editar", description: "Altera páginas e conteúdo, mas não publica.", icon: FiEdit3 },
  { value: "publisher", title: "Editar e publicar", description: "Pode editar, publicar ou tirar sites do ar.", icon: FiUploadCloud },
];

function levelName(value: SiteAccessLevel) {
  return levels.find(level => level.value === value)?.title ?? "Sem acesso";
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function SitePermissionsDialog({ onClose }: { onClose: () => void }) {
  const [people, setPeople] = useState<SiteAccessPerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let active = true;
    void listSiteAccessPeople().then(items => {
      if (!active) return;
      setPeople(items);
      setSelectedId(items[0]?.id ?? null);
    }).catch(err => {
      if (!active) return;
      setError(err instanceof ApiError && err.status === 403 ? "Você não tem permissão para administrar os acessos aos sites." : "Não foi possível carregar as pessoas. Tente abrir esta tela novamente.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => people.filter(person => `${person.name} ${person.email}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [people, query]);
  const selected = people.find(person => person.id === selectedId) ?? null;

  async function changeLevel(level: SiteAccessLevel) {
    if (!selected || busy || selected.roleHasSiteAccess || selected.level === level) return;
    if (level === "none" && !confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await setSiteAccessPerson(selected.id, level);
      setPeople(items => items.map(item => item.id === selected.id ? { ...item, level } : item));
      setSuccess(level === "none" ? "Acesso aos sites retirado." : `Permissão “${levelName(level)}” salva para ${selected.name}.`);
      setConfirmRemove(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar esta permissão.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={css.backdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="sites-access-title">
      <header className={css.header}>
        <div><span className={css.eyebrow}>SITES DA ORGANIZAÇÃO</span><h2 id="sites-access-title">Quem pode acessar os sites?</h2><p>Escolha uma pessoa e defina até onde ela pode ir no editor institucional.</p></div>
        <button type="button" className={css.close} aria-label="Fechar" onClick={onClose} disabled={busy}><FiX /></button>
      </header>
      <div className={css.body}>
        {error && <div className={css.error} role="alert">{error}</div>}
        {success && <div className={css.notice} role="status"><FiCheck />{success}</div>}
        <div className={css.layout}>
          <aside className={css.people} aria-label="Pessoas da organização">
            <div className={css.countTitle}>Pessoas <span>{people.length}</span></div>
            <label className={css.search}><FiSearch /><span className={css.hidden}>Buscar pessoa</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pelo nome" /></label>
            <div className={css.peopleList}>
              {loading ? <p className={css.empty}>Carregando pessoas…</p> : filtered.length === 0 ? <p className={css.empty}>Nenhuma pessoa encontrada.</p> : filtered.map(person => <button key={person.id} type="button" className={`${css.person} ${selectedId === person.id ? css.personSelected : ""}`} aria-pressed={selectedId === person.id} onClick={() => { setSelectedId(person.id); setConfirmRemove(false); setError(""); setSuccess(""); }}><span className={css.avatar}>{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.roleHasSiteAccess ? "Acesso pelo cargo na ONG" : levelName(person.level)}</small></span></button>)}
            </div>
          </aside>
          <div className={css.detail}>
            {!selected ? <div className={css.empty}>Selecione uma pessoa para configurar o acesso.</div> : <>
              <div className={css.personHeader}><div className={css.avatarBig}>{initials(selected.name)}</div><div><h3>{selected.name}</h3><p>{selected.email}</p></div></div>
              {selected.roleHasSiteAccess ? <div className={css.protected}><FiShield /><div><strong>Acesso concedido pelo cargo na organização</strong><p>Este cargo já possui permissões institucionais. Para modificá-las, é necessário revisar o cargo na gestão da ONG.</p></div></div> : <>
                <h4>O que essa pessoa pode fazer?</h4>
                <div className={css.levelGrid}>{levels.map(level => {
                  const Icon = level.icon;
                  return <button key={level.value} type="button" disabled={busy} className={`${css.levelCard} ${selected.level === level.value ? css.levelActive : ""}`} aria-pressed={selected.level === level.value} onClick={() => void changeLevel(level.value)}><Icon /><span><strong>{level.title}</strong><small>{level.description}</small></span>{selected.level === level.value && <FiCheck className={css.tick} />}</button>;
                })}</div>
                {confirmRemove && <div className={css.confirm} role="group" aria-label="Confirmar remoção do acesso"><p>Retirar o acesso de <strong>{selected.name}</strong> aos sites?</p><button type="button" disabled={busy} onClick={() => void changeLevel("none")}>Sim, retirar</button><button type="button" disabled={busy} className={css.cancel} onClick={() => setConfirmRemove(false)}>Cancelar</button></div>}
              </>}
            </>}
          </div>
        </div>
      </div>
      <footer className={css.footer}><span><FiLock /> As permissões são verificadas pelo servidor.</span><button type="button" disabled={busy} onClick={onClose}>Concluir</button></footer>
    </section>
  </div>;
}
