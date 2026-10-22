import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState} from "react";
import {FiChevronDown,FiClock,FiGitBranch,FiZap} from "react-icons/fi";
import {
  listOperationalStepRules,saveOperationalStepRule,listOperationalRuleRuns,
  type OperationalStepRule,type OperationalRuleRun
} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

interface Props {systemId:string;stepId:string;stepTitle:string;nextTitle:string|null;editable:boolean;planPending:boolean}
const initial=(stepId:string):OperationalStepRule=>({stepId,revision:0,enabled:false,priority:"any",assignment:"unassigned",dueDays:0});

export default function OperationalStepRuleEditor({systemId,stepId,stepTitle,nextTitle,editable,planPending}:Props){
  const [expanded,setExpanded]=useState(false);
  const [historyExpanded,setHistoryExpanded]=useState(false);
  const [rule,setRule]=useState<OperationalStepRule>(()=>initial(stepId));
  const [history,setHistory]=useState<OperationalRuleRun[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    void listOperationalStepRules(systemId).then(rules=>{
      if(active)setRule(rules.find(item=>item.stepId===stepId)??initial(stepId));
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível carregar a regra.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[systemId,stepId]);

  useEffect(()=>{
    if(!historyExpanded)return;
    let active=true;
    void listOperationalRuleRuns(systemId,stepId).then(items=>{if(active)setHistory(items);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível carregar o histórico.");});
    return()=>{active=false;};
  },[systemId,stepId,historyExpanded]);

  async function update(changes:Partial<OperationalStepRule>){
    if(busy||!editable||planPending)return;
    setBusy(true);setError("");
    const previous=rule;
    const next={...rule,...changes};
    setRule(next);
    try{setRule(await saveOperationalStepRule(systemId,next));}
    catch(e){setRule(previous);setError(e instanceof Error?e.message:"Não foi possível salvar a regra.");}
    finally{setBusy(false);}
  }

  const unavailable=loading||busy||!editable||planPending;
  return <div className={styles.stepRuleEditor}>
    <button type="button" className={styles.stepRuleHeading} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>
      <FiZap aria-hidden="true"/>
      <span><strong>Automação</strong><small>{loading?<CongLoadingState variant="inline" label="Preparando automação"/>:rule.enabled?"Ativa nesta etapa":"Sem ação automática"}</small></span>
      <FiChevronDown aria-hidden="true"/>
    </button>
    {expanded&&<div className={styles.stepRuleBody}>
      <label className={styles.stepRuleToggle}><span>Ao concluir esta etapa</span><input type="checkbox" disabled={unavailable||(!nextTitle&&!rule.enabled)} checked={rule.enabled} onChange={e=>void update({enabled:e.target.checked})}/></label>
      <div className={styles.stepRuleTransition}>
        <span><FiGitBranch aria-hidden="true"/> Próxima tarefa</span>
        <strong>{nextTitle??"Fim do percurso"}</strong>
      </div>
      {!nextTitle&&<p className={styles.stepRuleHint}>A última etapa não tem próxima tarefa.</p>}
      <label className={styles.stepRuleControl}>Executar quando a prioridade for
        <select value={rule.priority} disabled={unavailable} onChange={e=>void update({priority:e.target.value as OperationalStepRule["priority"]})}>
          <option value="any">Qualquer prioridade</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baixa</option>
        </select>
      </label>
      <label className={styles.stepRuleControl}>Responsável pela próxima tarefa
        <select value={rule.assignment} disabled={unavailable} onChange={e=>void update({assignment:e.target.value as OperationalStepRule["assignment"]})}>
          <option value="unassigned">A definir pela equipe</option>
          <option value="keep">Manter o responsável, se ativo</option>
        </select>
      </label>
      <label className={styles.stepRuleControl}>Prazo da próxima tarefa
        <select value={rule.dueDays} disabled={unavailable} onChange={e=>void update({dueDays:Number(e.target.value)})}>
          <option value={0}>Sem prazo automático</option>
          <option value={1}>1 dia depois</option>
          <option value={2}>2 dias depois</option>
          <option value={3}>3 dias depois</option>
          <option value={7}>7 dias depois</option>
          <option value={14}>14 dias depois</option>
          <option value={30}>30 dias depois</option>
        </select>
      </label>
      <p className={styles.stepRuleHint}>Quando uma tarefa de “{stepTitle}” for concluída, a próxima será criada apenas se esta regra permitir. Uma regra específica substitui o avanço geral nesta etapa.</p>
      {planPending&&<p className={styles.stepRuleHint}>O percurso está sendo salvo. A regra poderá ser alterada depois.</p>}
      {error&&<p role="alert" className={styles.stepRuleError}>{error}</p>}
      <button type="button" className={styles.stepRuleHistoryButton} aria-expanded={historyExpanded} onClick={()=>setHistoryExpanded(v=>!v)}><FiClock/> Últimas execuções <FiChevronDown/></button>
      {historyExpanded&&<div className={styles.stepRuleHistory}>{history.length?history.map(item=><div key={item.id}><strong>{item.title}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</time></div>):<p>Nenhuma tarefa gerada até agora.</p>}</div>}
    </div>}
  </div>;
}
