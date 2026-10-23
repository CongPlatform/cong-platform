/** Audita demandas EXPLICITAS do usuario separadamente do veredito do modelo.
 * Esta verificacao nao significa que uma ligacao foi executada no builder.
 */
export type AiGoal = 'system'|'site'|'both';
// Tipos estruturais compatíveis com o contrato da proposta, sem usar `any`.
type AiModule = {alias:string;blueprint_key:string;name:string;description:string};
type AiSection = {type:string;linked_module_alias:string;text:string};
type AiPage = {slug:string;title:string;sections:AiSection[]};
type AiPublicForm = {name:string;target_module_alias:string;form_module_alias:string;page_slug:string;bindings:unknown[]};
export type AiPlan = {
 system:{modules:AiModule[]}|null;
 site:{pages:AiPage[]}|null;
 connection:{link_system:boolean;public_forms:AiPublicForm[]};
 limitations:string[];
};
export type AiTurn = {role:'usuario'|'assistente';text:string};
export type AiIssue = {code:string;message:string};
export const fold = (s: unknown): string => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const roleText = (m:AiModule):string => fold([m?.name,m?.description].join(' '));
export function auditAiPlan(goal:AiGoal,turns:AiTurn[],plan:AiPlan,previousPlan?:unknown):AiIssue[]{
 const said=fold(turns.filter(t=>t.role==='usuario').map(t=>t.text).join('\n'));
 const mods=Array.isArray(plan?.system?.modules)?plan.system.modules:[];
 const forms=Array.isArray(plan?.connection?.public_forms)?plan.connection.public_forms:[];
 const site=plan?.site;const issues:AiIssue[]=[];
 const add=(code:string,message:string)=>{if(!issues.some(i=>i.code===code))issues.push({code,message})};
 const have=(pattern:RegExp)=>mods.some(m=>pattern.test(roleText(m)));
 const hasType=(bp:string)=>mods.some(m=>m?.blueprint_key===bp);
 const wantsSite=goal!=='system',wantsSystem=goal!=='site';
 if(wantsSite&&!site)add('site_missing','Falta uma proposta de site institucional.');
 if(wantsSystem&&!plan?.system)add('system_missing','Falta uma proposta de sistema interno.');
 if(goal==='both'&&!plan?.connection?.link_system)add('site_system_link','O vínculo entre site e sistema ainda não foi proposto.');
 const requestsPublic = wantsSite&&/(solicit.{0,45}roup|pedid.{0,45}roup|receb.{0,50}pedid|formul.{0,50}(pedido|roup|beneficiar))/.test(said);
 const volunteersPublic = wantsSite&&/(cadastr.{0,45}voluntar|inscri.{0,45}voluntar|voluntar.{0,45}(site|formul|inscri|cadastr))/.test(said);
 const donationPublic = wantsSite&&/(oferec.{0,40}doa|doa.{0,35}(atraves do site|pelo site|no site)|formular.{0,50}doa|site.{0,65}doa)/.test(said);
 const linked=(pat:RegExp)=>forms.some(f=>{
  const target=mods.find(m=>m.alias===f?.target_module_alias);
  const formMod=mods.find(m=>m.alias===f?.form_module_alias);
  const page=site?.pages?.find((p)=>p.slug===f.page_slug);
  return target&&pat.test(roleText(target))&&formMod?.blueprint_key==='forms'&&Array.isArray(f.bindings)&&f.bindings.length>0&&page?.sections?.some((s)=>s.type==='form'&&s.linked_module_alias===f.form_module_alias);
 });
 if(requestsPublic&&!linked(/solicit|pedido|benefici|familia|atendimento|roup/))add('form_clothing','Falta formulário público de pedidos de roupas ligado a um cadastro interno.');
 if(volunteersPublic&&!linked(/voluntar|inscri/))add('form_volunteers','Falta formulário público de inscrição de voluntários ligado ao sistema.');
 if(donationPublic&&!linked(/doa|arrecad|oferta/))add('form_donations','Falta formulário público para oferta de doações ligado ao sistema.');
 if(wantsSystem){
  if(/estoque|control.{0,35}(roup|peca|item|entrada|saida)/.test(said)&&!(hasType('inventory')||have(/estoque|inventario/)))add('inventory','Falta controle de estoque de roupas.');
  if(/doa|arrecad/.test(said)&&!(hasType('donations')||have(/doa|arrecad/)))add('donations','Falta registro das doações.');
  if(/voluntar/.test(said)&&!(hasType('volunteers')||have(/voluntar/)))add('volunteers','Falta cadastro ou gestão dos voluntários.');
  if(/benefici|familias? em situacao|familias? atend/.test(said)&&!(hasType('assistance')||have(/benefici|familia|atendid/)))add('beneficiaries','Falta cadastro de beneficiários.');
  if(/entreg|distribui/.test(said)&&!(hasType('delivery_routes')||have(/entreg|distribui|distribuicao/)))add('deliveries','Falta acompanhamento das entregas/distribuições.');
  if(/campanh|evento/.test(said)&&!(hasType('events')||have(/campanh|evento/)))add('campaigns','Falta organização de campanhas e eventos.');
  const seen=new Set<string>();
  for(const m of mods){
   const bp=String(m?.blueprint_key||'');const name=roleText(m);
   const role=/doa|arrecad/.test(name)||bp==='donations'?'donations':/voluntar/.test(name)||bp==='volunteers'?'volunteers':/estoque|inventario/.test(name)||bp==='inventory'?'inventory':/benefici|familia/.test(name)?'beneficiaries':/entreg|distribui/.test(name)?'deliveries':bp;
   if(role&&seen.has(role)&&['volunteers','inventory','donations','beneficiaries','deliveries'].includes(role))add('possible_duplicates','Existem módulos possivelmente duplicados; revise antes de aplicar.');
   if(role)seen.add(role);
  }
 }
 // Revisões aditivas não podem apagar módulos/páginas anteriores silenciosamente.
 // Se o usuário pediu remoção, o alerta de perda não é emitido.
 const last=fold(turns.filter(t=>t.role==='usuario').at(-1)?.text);
 const explicitlyRemoved=/\b(remova|remover|exclua|excluir|apague|apagar|tire|retire|retirar|substitua|substituir)\b/.test(last);
 if(previousPlan&&!explicitlyRemoved){
  const previous = previousPlan && typeof previousPlan==='object' ? previousPlan as Partial<AiPlan> : undefined;
  const prevModules=Array.isArray(previous?.system?.modules)?previous.system.modules:[];
  const prevPages=Array.isArray(previous?.site?.pages)?previous.site.pages:[];
  if(prevModules.some(m=>!mods.some(n=>n.alias===m.alias)))add('module_lost','A revisão deixou de incluir módulos anteriores sem pedido explícito de remoção.');
  if(prevPages.some(pg=>!site?.pages?.some((p)=>p.slug===pg.slug)))add('page_lost','A revisão deixou de incluir páginas anteriores sem pedido explícito de remoção.');
 }
 if(goal==='both'&&plan?.site&&plan?.system){
  const incompatible=(plan?.limitations||[]).some((l:unknown)=>/apenas (o )?sistema|site (sera|ainda nao foi) (configurado|criado)/.test(fold(l)));
  if(incompatible)add('contradictory_limitations','A proposta contém afirmações contraditórias sobre site e sistema.');
 }
 for(const pg of site?.pages||[])for(const sec of pg.sections||[]){
  if(/centenas de|milhares de|\d{3,}\s+(pessoas|familias|beneficiarios)/.test(fold(sec.text))&&!/(centenas de|milhares de|\d{3,}\s+(pessoas|familias|beneficiarios))/.test(said)){
   add('impact_unverified','O site contém estatísticas de impacto que não foram informadas pela ONG.');
  }
 }
 return issues;
}
