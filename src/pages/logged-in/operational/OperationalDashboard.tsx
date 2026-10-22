import {useEffect,useMemo,useState} from "react";
import {FiArrowRight,FiBarChart2,FiCheckCircle,FiClipboard,FiGrid,FiLayers,FiList,FiSettings,FiUsers,FiAlertCircle,FiCalendar,FiColumns,FiHeart,FiTruck,FiMapPin,FiClock,FiFileText,FiFolder} from "react-icons/fi";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {getOperationalDashboard,saveOperationalDashboard,type OperationalDashboard as Dashboard,type OperationalDashboardModule,type OperationalMetricSpec,type OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./OperationalDashboard.module.css";

interface Props {system:OperationalSystem;onSystem:(system:OperationalSystem)=>void;onOpenModule:(id:string)=>void;onOpenTasks:()=>void}
type Layout="overview"|"analytics"|"list"|"operations";
const labels:Record<string,string>={volunteers:"Pessoas cadastradas",projects:"Projetos e ações",donations:"Recebimentos",agenda:"Compromissos com data",board:"Tarefas no quadro",dispatch:"Atividades para distribuição",delivery_routes:"Registros da peça",availability:"Disponibilidades na semana",forms:"Registros da peça",custom:"Registros"};
const layouts:{id:Layout;label:string;icon:typeof FiGrid}[]=[{id:"overview",label:"Visão mista",icon:FiGrid},{id:"analytics",label:"Análise",icon:FiBarChart2},{id:"list",label:"Lista",icon:FiList},{id:"operations",label:"Operação",icon:FiLayers}];
const taskLabels=[{key:"todo",label:"A fazer"},{key:"progress",label:"Em andamento"},{key:"blocked",label:"Atenção"},{key:"done",label:"Concluídas"}] as const;
const format=(value:number)=>value.toLocaleString("pt-BR");
function CountBars({items}:{items:{name:string;total:number}[]}){
  const max=Math.max(1,...items.map(item=>item.total));
  return <div className={styles.barRows}>{items.map(item=><div className={styles.barRow} key={item.name}><span title={item.name}>{item.name}</span><div className={styles.barTrack}><i style={{width:`${item.total/max*100}%`}}/></div><strong>{format(item.total)}</strong></div>)}</div>;
}
function TaskBreakdown({dashboard,onOpenTasks}:{dashboard:Dashboard;onOpenTasks:()=>void}){
  const total=dashboard.tasks.total;
  return <section className={styles.card}><div className={styles.panelHead}><div><h3>Andamento da equipe</h3><p>{format(total)} {total===1?"tarefa registrada":"tarefas registradas"}</p></div><button type="button" className={styles.link} onClick={onOpenTasks}>Abrir tarefas <FiArrowRight/></button></div>
    <div className={styles.stacked} role="img" aria-label={taskLabels.map(t=>`${t.label}: ${dashboard.tasks[t.key]}`).join(", ")}>{taskLabels.map(t=><span key={t.key} data-kind={t.key} style={{width:`${total?dashboard.tasks[t.key]/total*100:0}%`}}/>)}</div>
    <div className={styles.taskLegend}>{taskLabels.map(t=><div key={t.key}><span data-kind={t.key}/><div>{t.label}</div><strong>{format(dashboard.tasks[t.key])}</strong></div>)}</div>
    {total===0&&<p className={styles.emptyHint}>Quando houver tarefas, a distribuição será exibida aqui.</p>}
  </section>;
}
function StatCard({item,onOpenModule}:{item:OperationalDashboardModule;onOpenModule:(id:string)=>void}){
  const icons:Record<string,typeof FiUsers>={volunteers:FiUsers,projects:FiFolder,donations:FiHeart,agenda:FiCalendar,board:FiColumns,dispatch:FiTruck,delivery_routes:FiMapPin,availability:FiClock,forms:FiFileText};
  const Icon=icons[item.blueprintKey]??FiClipboard;
  return <button className={styles.stat} type="button" onClick={()=>onOpenModule(item.id)}><span className={styles.statTop}><span className={styles.statIcon}><Icon/></span><FiArrowRight/></span><strong>{format(item.total)}</strong><span className={styles.statName}>{item.name}</span><small>{labels[item.blueprintKey]??"Registros ativos"}</small></button>;
}
export default function OperationalDashboard(props:Props){return <DashboardContent key={props.system.id} {...props}/>;}
function DashboardContent({system,onSystem,onOpenModule,onOpenTasks}:Props){
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [customize,setCustomize]=useState(false);
  const [newMetricField,setNewMetricField]=useState("");
  const [layout,setLayout]=useState<Layout>(()=>{try{const saved=localStorage.getItem("cong-operational-dashboard-layout");return layouts.some(item=>item.id===saved)?saved as Layout:"overview";}catch{return "overview";}});
  useEffect(()=>{let live=true;void getOperationalDashboard(system.id).then(data=>{if(live)setDashboard(data);}).catch(e=>{if(live)setError(e instanceof Error?e.message:"Não foi possível carregar o painel.");});return()=>{live=false;};},[system.id]);
  const configured=system.dashboardConfig??{};
  const shown=useMemo(()=>dashboard?.modules.filter(item=>configured.visibleModuleIds==null||configured.visibleModuleIds.includes(item.id))??[],[dashboard,configured.visibleModuleIds]);
  const showTasks=configured.showTasks!==false;
  const activeAreas=shown.filter(item=>item.total>0).length;
  const ready=shown.some(item=>item.total>0);
  const chooseLayout=(next:Layout)=>{setLayout(next);try{localStorage.setItem("cong-operational-dashboard-layout",next);}catch{return;}};
  async function save(visibleModuleIds:string[]|null,show:boolean,metrics:OperationalMetricSpec[]=configured.metrics??[]){
    if(busy)return;
    setBusy(true);setError("");
    try{const changed=await saveOperationalDashboard(system,{visibleModuleIds,showTasks:show,metrics});onSystem(changed);setDashboard(await getOperationalDashboard(system.id));}catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar o painel.");}finally{setBusy(false);}
  }
  function flip(id:string){if(!dashboard)return;const ids=configured.visibleModuleIds??dashboard.modules.map(m=>m.id);void save(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id],showTasks);}
  const metricFields=system.modules.flatMap(module=>module.fields.filter(field=>field.type==="number"||field.type==="select").map(field=>({module,field,key:`${module.id}:${field.key}`})));
  function addMetric(){const found=metricFields.find(item=>item.key===newMetricField);if(!found||(configured.metrics?.length??0)>=8)return;const next:OperationalMetricSpec={id:crypto.randomUUID(),moduleId:found.module.id,fieldKey:found.field.key,operation:found.field.type==="number"?"sum":"distribution",title:`${found.module.name} — ${found.field.label}`};void save(configured.visibleModuleIds??null,showTasks,[...(configured.metrics??[]),next]);setNewMetricField("");}
  function removeMetric(id:string){void save(configured.visibleModuleIds??null,showTasks,(configured.metrics??[]).filter(item=>item.id!==id));}
  return <div className={styles.dashboard}>
    <div className={styles.head}><div><span className={styles.eyebrow}>VISÃO GERAL</span><h2>Seu trabalho em andamento</h2><p>Acompanhe as informações deste sistema em um só lugar.</p></div><button className={styles.personalize} type="button" aria-expanded={customize} onClick={()=>setCustomize(value=>!value)}><FiSettings/>{customize?"Concluir personalização":"Personalizar"}</button></div>
    <div className={styles.layoutPicker} role="group" aria-label="Como visualizar o painel">{layouts.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" aria-pressed={layout===item.id} onClick={()=>chooseLayout(item.id)}><Icon/>{item.label}</button>;})}</div>
    {error&&<div role="alert" className={styles.error}>{error}{!dashboard&&<button onClick={()=>void getOperationalDashboard(system.id).then(setDashboard).then(()=>setError("")).catch(e=>setError(String(e)))}>Tentar novamente</button>}</div>}
    {customize&&dashboard&&<section className={styles.customize}><div><strong>Escolha o que acompanhar</strong><p>Os indicadores apresentam dados reais deste sistema. Desmarque as áreas que não precisar.</p></div><div className={styles.checks}>{dashboard.modules.map(item=><label key={item.id}><input type="checkbox" checked={shown.some(m=>m.id===item.id)} disabled={busy} onChange={()=>flip(item.id)}/>{item.name}</label>)}<label><input type="checkbox" checked={showTasks} disabled={busy} onChange={()=>void save(configured.visibleModuleIds??null,!showTasks)}/>Andamento das tarefas</label></div>
      <div className={styles.metricChooser}><strong>Indicadores dos seus campos</strong><p>Crie até oito indicadores a partir dos campos numéricos ou de seleção já existentes.</p><div><select aria-label="Campo para novo indicador" value={newMetricField} onChange={e=>setNewMetricField(e.target.value)} disabled={busy}><option value="">Escolha um campo</option>{metricFields.map(item=><option value={item.key} key={item.key}>{item.module.name} — {item.field.label}</option>)}</select><button type="button" disabled={busy||!newMetricField||(configured.metrics?.length??0)>=8} onClick={addMetric}>Adicionar indicador</button></div>
      {(configured.metrics??[]).map(metric=><div className={styles.metricEdit} key={metric.id}><span>{metric.title} · {metric.operation==="sum"?"Soma":metric.operation==="average"?"Média":"Distribuição"}</span><button type="button" disabled={busy} onClick={()=>removeMetric(metric.id)}>Remover</button></div>)}</div></section>}
    {!dashboard?<CongLoadingState variant="cards" count={5} label="Preparando indicadores"/>:<>
      <div className={styles.summary}><div><span>Áreas acompanhadas</span><strong>{format(shown.length)}</strong></div><div><span>Áreas com atividade</span><strong>{format(activeAreas)}</strong></div><div><span>Tarefas pendentes</span><strong>{format(dashboard.tasks.todo+dashboard.tasks.progress+dashboard.tasks.blocked)}</strong></div><div><span>Concluídas</span><strong>{format(dashboard.tasks.done)}</strong></div></div>
      {dashboard.metrics?.length>0&&<section className={styles.card}><div className={styles.panelHead}><div><h3>Indicadores personalizados</h3><p>Valores calculados a partir dos registros autorizados</p></div></div><div className={styles.customMetrics}>{dashboard.metrics.map(metric=><div className={styles.customMetric} key={metric.id}><strong>{metric.title}</strong>{metric.operation==="distribution"?<CountBars items={metric.distribution.map(item=>({name:item.label,total:item.count}))}/>:<span>{metric.value===null?"Sem dados":metric.value.toLocaleString("pt-BR",{maximumFractionDigits:2})}</span>}</div>)}</div></section>}
      {shown.length===0?<section className={styles.card}><FiBarChart2/><h3>{dashboard.modules.length?"Escolha o que acompanhar":"Seu sistema está pronto para começar"}</h3><p>{dashboard.modules.length?"Abra Personalizar e selecione uma área.":"Adicione uma peça no modo Construir para começar a organizar seu trabalho."}</p></section>:<>
        {(layout==="overview"||layout==="analytics")&&<div className={styles.charts}>
          <section className={styles.card}><div className={styles.panelHead}><div><h3>Atividade por área</h3><p>Totais disponíveis em cada peça</p></div><FiBarChart2/></div>{ready?<CountBars items={shown.map(item=>({name:item.name,total:item.total}))}/>:<p className={styles.emptyHint}>Os dados aparecem à medida que a equipe começa a registrar atividades.</p>}</section>
          {showTasks&&<TaskBreakdown dashboard={dashboard} onOpenTasks={onOpenTasks}/>}
        </div>}
        {layout==="overview"&&<section className={styles.moduleSection}><div className={styles.sectionTitle}><h3>Acessar áreas</h3><span>{shown.length} {shown.length===1?"área":"áreas"}</span></div><div className={styles.statGrid}>{shown.slice(0,6).map(item=><StatCard key={item.id} item={item} onOpenModule={onOpenModule}/>)}</div>{shown.length>6&&<div className={styles.extraAreas}>{shown.slice(6).map(item=><button key={item.id} onClick={()=>onOpenModule(item.id)}>{item.name}<FiArrowRight/></button>)}</div>}</section>}
        {layout==="analytics"&&<section className={styles.card}><div className={styles.panelHead}><div><h3>Indicadores por área</h3><p>Contagem de registros e atividades disponíveis, sem estimativas</p></div></div><div className={styles.metricList}>{shown.map(item=><button type="button" key={item.id} onClick={()=>onOpenModule(item.id)}><span>{item.name}<small>{labels[item.blueprintKey]??"Registros ativos"}</small></span><strong>{format(item.total)}</strong><FiArrowRight/></button>)}</div></section>}
        {layout==="list"&&<section className={styles.card}><div className={styles.panelHead}><div><h3>Áreas do sistema</h3><p>Encontre rapidamente o que precisa utilizar</p></div></div><div className={styles.metricList}>{shown.map(item=><button type="button" key={item.id} onClick={()=>onOpenModule(item.id)}><span>{item.name}<small>{labels[item.blueprintKey]??"Registros ativos"}</small></span><strong>{format(item.total)}</strong><FiArrowRight/></button>)}</div></section>}
        {layout==="operations"&&<div className={styles.operations}>{showTasks&&<TaskBreakdown dashboard={dashboard} onOpenTasks={onOpenTasks}/>}<section className={styles.card}><h3>Continuar trabalhando</h3><p>Entre diretamente na área que precisa de atenção.</p><div className={styles.quickList}>{shown.map(item=><button key={item.id} type="button" onClick={()=>onOpenModule(item.id)}><strong>{item.name}</strong><span>{format(item.total)} <FiArrowRight/></span></button>)}</div></section></div>}
        {layout==="list"&&showTasks&&<TaskBreakdown dashboard={dashboard} onOpenTasks={onOpenTasks}/>}
      </>}
      {dashboard.tasks.blocked>0&&showTasks&&<div className={styles.warning}><FiAlertCircle/> Existem {format(dashboard.tasks.blocked)} {dashboard.tasks.blocked===1?"tarefa que precisa":"tarefas que precisam"} de atenção. <button onClick={onOpenTasks}>Ver tarefas <FiArrowRight/></button></div>}
      {dashboard.tasks.total>0&&dashboard.tasks.todo+dashboard.tasks.progress+dashboard.tasks.blocked===0&&showTasks&&<div className={styles.success}><FiCheckCircle/> Todas as tarefas registradas estão concluídas.</div>}
    </>}
  </div>;
}
