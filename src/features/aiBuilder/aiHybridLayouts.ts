/**
 * Composição híbrida segura para sites construídos com IA.
 *
 * Não executa HTML, CSS ou JavaScript de respostas do modelo: traduz a proposta
 * validada para nós nativos do editor CONG. As outras seções continuam podendo
 * usar as composições do acervo. Não há modelos de conteúdo fixos neste arquivo.
 */
import type { AiSection } from "../../services/aiAssistantService";
import type {
  InstitutionalLayoutNode as Node,
  InstitutionalSectionStyle,
  InstitutionalSectionType,
} from "../../services/institutionalService";

export type HybridLook = "human" | "impact" | "institutional";
export interface HybridComposition {
  id: string;
  title: string;
  layout: Node;
  sectionStyle: InstitutionalSectionStyle;
}

const slot=(name:string,presentation:string,style?:Extract<Node,{type:"slot"}>["style"]):Node=>({
  type:"slot",slot:name,presentation,...(style?{style}:{})
});
const stack=(children:Node[],gap:"small"|"medium"|"large"="medium",surface?:"card"|"highlight"):Node=>({
  type:"stack",gap,children,...(surface?{surface}:{})
});
const columns=(first:Node,second:Node,ratio:"1:1"|"2:1"|"1:2"|"2:3"|"3:2"="1:1"):Node=>({
  type:"columns",ratio,gap:"large",children:[first,second]
});
const photo=(name:string,presentation:"heroImage"|"wideImage"|"cardImage"):Node=>slot(name,presentation,{
  imageFit:"cover",imageAspect:presentation==="wideImage"?"16:9":"4:3",imageFrame:"rounded",
});
const heading=():Node=>slot("title","heading");
const description=():Node=>slot("description","lead");
const actions=():Node=>stack([slot("primaryAction","primaryAction"),slot("secondaryAction","secondaryAction")],"small");
const opening=():Node=>stack([
  slot("eyebrow","eyebrow"),slot("title","display"),description(),actions(),
],"large");
const card=(kind:"project"|"support",pictureFirst:boolean):Node=>{
  const photoNode=photo("image","cardImage");
  const titleNode=slot("title","itemTitle");
  const textNode=slot("description","itemBody");
  return stack(kind==="project"?[
    ...(pictureFirst?[photoNode]:[]),titleNode,textNode,
    slot("action","secondaryAction"),...(!pictureFirst?[photoNode]:[]),
  ]:[slot("kind","supportIcon"),titleNode,textNode,slot("action","primaryAction")],"medium","card");
};
const cards=(count:number,item:Node):Node=>({type:"repeat",source:"items",columns:count>=3?3:count===2?2:1,gap:"large",item});
const editorial=(kind:"hero"|"about"|"projects"|"support",seed:number,look:HybridLook):InstitutionalSectionStyle=>({
  spacing:kind==="hero"?"generous":kind==="about"?"comfortable":"generous",
  contentWidth:"wide",
  backgroundColor:"background",
  backgroundDecor:look==="institutional"?"none":seed%3===0?"soft-glow":seed%3===1?"corner-glow":"wash",
  backgroundDecorTone:look==="human"?"secondary":kind==="support"?"accent":"primary",
  backgroundDecorIntensity:look==="institutional"?0:seed%2===0?18:10,
});
const hash=(text:string):number=>{
  let result=2166136261;
  for(const ch of text){result=Math.imul(result^ch.charCodeAt(0),16777619)>>>0;}
  return result;
};
/**
 * Escolhe quando criar layout novo em vez de repetir catálogo. Regras limitadas
 * à estrutura já validada: páginas com uma única imagem ou coleção pequena não
 * ganham cartões vazios. A escolha é estável ao remontar o mesmo plano.
 */
export function createHybridComposition(args:{
  type:InstitutionalSectionType;
  section:AiSection;
  siteStyle:string;
  pageSlug:string;
  pageIndex:number;
  sectionIndex:number;
  look:HybridLook;
}):HybridComposition|null{
 const {type,section,siteStyle,pageSlug,pageIndex,sectionIndex,look}=args;
 const count=section.items?.filter(item=>item.title.trim()).length??0;
 const seed=hash(`${pageSlug}|${section.title}|${siteStyle}`);
 const alternating=(seed+pageIndex+sectionIndex)%3;
 // Sempre dar à primeira capa uma composição autoral. Nas demais páginas,
 // alternar com o acervo CONG para manter riqueza e compatibilidade.
 const eligible=type==="organization_intro"?(pageIndex===0||alternating===0):
   type==="organization_about"?alternating!==1:
   type==="projects_showcase"?count>=2&&alternating!==0:
   type==="support_actions"?count>=2&&alternating!==2:false;
 if(!eligible)return null;
 const flip=alternating===1;
 let layout:Node;
 let id:string;
 let title:string;
 if(type==="organization_intro"){
   const lead=opening();const image=photo("image","heroImage");
   layout=columns(flip?image:lead,flip?lead:image,flip?"1:1":"3:2");
   id="ai-hybrid-hero";title="Abertura editorial criada pela CONG";
 }else if(type==="organization_about"){
   const copy=stack([slot("eyebrow","eyebrow"),heading(),slot("description","body"),slot("action","secondaryAction")],"large");
   const image=photo("image","wideImage");
   layout=columns(flip?image:copy,flip?copy:image,flip?"2:3":"3:2");
   id="ai-hybrid-about";title="Narrativa visual original";
 }else if(type==="projects_showcase"){
   const header=stack([heading(),description()],"small");
   const item=card("project",!flip);
   layout=stack([header,cards(count,item)],"large");
   id="ai-hybrid-projects";title="Galeria modular original";
 }else if(type==="support_actions"){
   const summary=stack([heading(),description()],"large");
   const item=card("support",false);
   layout=count>=3?stack([summary,cards(count,item)],"large"):
     columns(summary,cards(count,item),"1:2");
   id="ai-hybrid-support";title="Caminhos de participação originais";
 }else return null;
 return {id,title,layout,sectionStyle:editorial(type==="organization_intro"?"hero":
   type==="organization_about"?"about":type==="projects_showcase"?"projects":"support",seed,look)};
}
