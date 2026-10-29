/**
 * Auditoria determinística de rascunhos institucionais (Patch 2).
 * Somente lê a estrutura salva. Não faz chamadas HTTP e não finge testar
 * disponibilidade de links externos, entrega de formulários ou carregamento de imagens.
 */
import type { InstitutionalLayoutNode, InstitutionalSite } from "../../services/institutionalService";
import { safeInstitutionalHref } from "../../utils/institutionalLinks";

export type SiteQualityIssue = {
  severity: "blocker" | "warning";
  code: string;
  message: string;
  page?: string;
};
export type SiteQualityReport = {
  blockers: SiteQualityIssue[];
  warnings: SiteQualityIssue[];
  checkedPages: number;
  checkedLinks: number;
  checkedImages: number;
  checkedForms: number;
};

type Section = InstitutionalSite["pages"][number]["sections"][number];
type AnyRecord = Record<string, unknown>;
const asRecord = (value: unknown): AnyRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : null;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const bodyTypes = new Set(["organization_intro", "organization_about", "projects_showcase", "impact_metrics", "support_actions", "transparency", "organization_contact", "custom_content"]);
const imageTypes = new Set(["image", "media_gallery", "campaign_card"]);
const forbiddenPlaceholders = /\b(lorem ipsum|exemplo de texto|texto de exemplo|insira (?:aqui|seu|sua)|adicione (?:aqui|seu|sua))\b|\{\{[^}]{1,70}\}\}/i;

function forEachLayout(node: InstitutionalLayoutNode | undefined, callback: (node: InstitutionalLayoutNode) => void): void {
  if (!node) return;
  callback(node);
  if (node.type === "repeat") forEachLayout(node.item, callback);
  if (node.type === "stack" || node.type === "columns" || node.type === "grid") node.children.forEach(child => forEachLayout(child, callback));
}

/**
 * O editor admite links internos no domínio da própria ONG e anchors semânticos.
 * A auditoria verifica os destinos conhecidos, não faz requisições externas.
 */
export function auditInstitutionalSite(site: InstitutionalSite): SiteQualityReport {
  const blockers: SiteQualityIssue[] = [];
  const warnings: SiteQualityIssue[] = [];
  const report: SiteQualityReport = {blockers, warnings, checkedPages:site.pages.length, checkedLinks:0, checkedImages:0, checkedForms:0};
  const add = (severity:SiteQualityIssue["severity"],code:string,message:string,page?:string) => {
    const issue = {severity,code,message,...(page?{page}:{})};
    (severity === "blocker" ? blockers : warnings).push(issue);
  };
  const slugs=new Set(site.pages.map(p=>p.slug));
  const paths=new Set<string>(["/",...site.pages.map(p=>`/${p.slug}`)]);
  const home=site.pages.find(p=>p.isHome);
  if (!home) add("blocker","NO_HOME","Não existe uma página inicial definida.");
  if (site.pages.filter(p=>p.isHome).length>1) add("blocker","MULTIPLE_HOMES","Há mais de uma página inicial.");
  if (slugs.size!==site.pages.length) add("blocker","DUPLICATE_SLUG","Existem páginas com endereços internos repetidos.");
  const global=site.pages.flatMap(p=>p.sections.filter(s=>s.visible));
  if (!global.some(s=>s.sectionType === "site_header")) add("warning","NO_HEADER","O site não tem cabeçalho global configurado.");
  if (!global.some(s=>s.sectionType === "site_footer")) add("warning","NO_FOOTER","O site não tem rodapé global configurado.");
  const dedup=new Set<string>();
  const issueOnce = (severity:SiteQualityIssue["severity"],code:string,message:string,page?:string) => {
    const key=`${severity}:${code}:${page??""}:${message}`;
    if(dedup.has(key))return;
    dedup.add(key);add(severity,code,message,page);
  };
  const checkHref=(href:unknown,label:string,page:string) => {
    report.checkedLinks++;
    if(!nonempty(href)||href.trim()==="#"){
      issueOnce("blocker","EMPTY_LINK",`O botão/link “${label}” não tem destino válido.`,page);return;
    }
    const safe=safeInstitutionalHref(href);
    if(!safe){issueOnce("blocker","UNSAFE_LINK",`O destino de “${label}” é inválido ou inseguro.`,page);return;}
    if(safe.startsWith("/")){
      const pathname=safe.split(/[?#]/,1)[0].replace(/\/$/,"") || "/";
      if(!paths.has(pathname)) issueOnce("blocker","BROKEN_INTERNAL_LINK",`“${label}” aponta para a página inexistente ${pathname}.`,page);
    }
    if(/^http:\/\//i.test(safe))issueOnce("warning","HTTP_LINK",`“${label}” utiliza HTTP sem criptografia.`,page);
  };
  const scanAction=(value:unknown,page:string) => {
    if(Array.isArray(value)){value.forEach(v=>scanAction(v,page));return;}
    const obj=asRecord(value);
    if(!obj)return;
    if(nonempty(obj.label) && "href" in obj){checkHref(obj.href,obj.label,page);return;}
    // Não considerar valores arbitrários como ações: somente objetos action,
    // primaryAction, secondaryAction e links dentro do conteúdo conhecido.
    for(const [key,child] of Object.entries(obj)){
      if(["action","primaryAction","secondaryAction","links","socialLinks","items"].includes(key))scanAction(child,page);
    }
  };
  const checkImage=(value:unknown,description:string,page:string,required=false)=>{
    report.checkedImages++;
    const image=asRecord(value);
    if(!image || (!nonempty(image.url) && !nonempty(image.assetId))){
      if(required)issueOnce("warning","MISSING_IMAGE",`Falta imagem em “${description}”.`,page);
      return;
    }
    if(!nonempty(image.alt))issueOnce("warning","MISSING_ALT",`A imagem em “${description}” não tem descrição alternativa.`,page);
  };
  const scanSection=(s:Section,page:string)=>{
    const c=s.content;
    const title=String(c.title||s.sectionType);
    scanAction(c,page);
    const contentText=[c.title,c.description,c.subtitle,c.text].filter(nonempty).join(" ");
    if(forbiddenPlaceholders.test(contentText))issueOnce("warning","PLACEHOLDER",`“${title}” contém texto de exemplo ou marcação provisória.`,page);
    if(s.sectionType === "organization_intro")checkImage(c.image,title,page,true);
    if(s.sectionType === "organization_about" && c.image)checkImage(c.image,title,page);
    if(["projects_showcase","support_actions"].includes(s.sectionType)){
      const items=Array.isArray(c.items)?c.items:[];
      if(items.length===0)issueOnce("warning","EMPTY_COLLECTION",`A seção “${title}” está sem cartões.`,page);
      for(const raw of items){
        const item=asRecord(raw);if(!item)continue;
        if(!nonempty(item.title)||!nonempty(item.description))issueOnce("warning","INCOMPLETE_ITEM",`Há cartões de “${title}” sem título ou descrição.`,page);
        if(s.sectionType === "projects_showcase")checkImage(item.image,String(item.title||title),page,true);
        if(s.sectionType === "support_actions" && (!asRecord(item.action) || !nonempty(asRecord(item.action)?.href)))
          issueOnce("blocker","UNLINKED_SUPPORT",`“${String(item.title||title)}” oferece participação, mas não aponta para um destino.`,page);
        scanAction(item.action,page);
        if(nonempty(item.description)&&forbiddenPlaceholders.test(item.description))issueOnce("warning","PLACEHOLDER",`Há texto provisório em “${String(item.title||title)}”.`,page);
      }
    }
    const layout=(s.settings.layoutOverride as InstitutionalLayoutNode|undefined)??s.layout;
    forEachLayout(layout,node=>{
      if(node.type!=="element")return;
      if(node.elementType === "button"){
        const action=asRecord(node.value);
        checkHref(action?.href, String(action?.label||"Botão"),page);
      }
      if(node.elementType === "image")checkImage(node.value,title,page,true);
      if(imageTypes.has(node.elementType) && node.elementType!=="image"){
        const rich=asRecord(node.value);
        if(node.elementType==="campaign_card")checkImage(rich?.image,title,page,true);
      }
      if(node.elementType === "cong_form"){
        report.checkedForms++;
        const form=asRecord(node.value);
        if(!nonempty(form?.formId))issueOnce("blocker","UNCONFIGURED_FORM",`O formulário em “${title}” não está conectado a um formulário real.`,page);
        else issueOnce("warning","FORM_ACTIVATION",`Confirme que o formulário em “${title}” foi ativado e testado no sistema operacional.`,page);
      }
    });
  };
  for(const page of site.pages){
    const visible=page.sections.filter(s=>s.visible&&bodyTypes.has(s.sectionType));
    if(!visible.length){issueOnce("blocker","EMPTY_PAGE",`A página “${page.title}” não possui seções de conteúdo.`,page.title);continue;}
    if(visible.length<2)issueOnce("warning","SHORT_PAGE",`A página “${page.title}” tem apenas uma seção de conteúdo.`,page.title);
    const wordCount=visible.reduce((n,s)=>n+[s.content.title,s.content.description,s.content.subtitle,s.content.text].filter(nonempty).join(" ").trim().split(/\s+/).filter(Boolean).length,0);
    if(wordCount<45)issueOnce("warning","THIN_CONTENT",`A página “${page.title}” tem pouco conteúdo editorial (${wordCount} palavras nos textos principais).`,page.title);
    for(const section of visible)scanSection(section,page.title);
    if(/contat|fale|mensag/i.test(page.slug+" "+page.title)){
      const hasChannel=visible.some(s=>["email","phone","whatsapp"].some(field=>nonempty(s.content[field])));
      const hasForm=visible.some(s=>{
        let found=false;forEachLayout((s.settings.layoutOverride as InstitutionalLayoutNode|undefined)??s.layout,n=>{if(n.type==="element"&&n.elementType==="cong_form"&&nonempty(asRecord(n.value)?.formId))found=true;});
        return found;
      });
      if(!hasChannel&&!hasForm)issueOnce("warning","NO_CONTACT_CHANNEL",`A página “${page.title}” não possui canal de contato confirmado nem formulário conectado.`,page.title);
    }
  }
  for(const section of global.filter(s=>s.sectionType==="site_header"||s.sectionType==="site_footer")){
    scanAction(section.content,"Navegação global");
  }
  return report;
}

/** Confere também o estado dos formulários reais, quando o usuário tem acesso. */
export async function auditInstitutionalSiteWithForms(site: InstitutionalSite): Promise<SiteQualityReport> {
  const base=auditInstitutionalSite(site);
  if(!base.checkedForms)return base;
  const formIds=new Set<string>();
  for(const page of site.pages)for(const section of page.sections){
    if(!section.visible)continue;
    forEachLayout((section.settings.layoutOverride as InstitutionalLayoutNode|undefined)??section.layout,node=>{
      if(node.type!=="element"||node.elementType!=="cong_form")return;
      const formId=asRecord(node.value)?.formId;
      if(nonempty(formId))formIds.add(formId);
    });
  }
  if(!formIds.size)return base;
  const warnings=base.warnings.filter(issue=>issue.code!=="FORM_ACTIVATION");
  const blockers=[...base.blockers];
  try{
    const {loadSiteBuilderResources}=await import("../operational/operationalFormsService");
    const resources=await loadSiteBuilderResources(site.id);
    const byId=new Map(resources.forms.map(form=>[form.id,form]));
    for(const id of formIds){
      const found=byId.get(id);
      if(!found){warnings.push({severity:"warning",code:"FORM_NOT_VERIFIED",message:`Não foi possível confirmar o formulário ${id.slice(0,8)} nesta organização. Revise seu vínculo no editor.`});continue;}
      if(found.status==="disabled")warnings.push({severity:"warning",code:"FORM_DISABLED",message:`O formulário “${found.title}” ainda não está ativo. Publique o site, ative o sistema e depois o formulário.`});
      if(found.status==="other_site")blockers.push({severity:"blocker",code:"FORM_OTHER_SITE",message:`O formulário “${found.title}” pertence a outro site. Corrija o vínculo antes da publicação.`});
    }
  }catch{
    warnings.push({severity:"warning",code:"FORM_STATUS_UNAVAILABLE",message:"Não foi possível confirmar a ativação dos formulários. Verifique os vínculos no sistema operacional."});
  }
  return {...base,blockers,warnings};
}
