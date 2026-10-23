/** Independent, strict server-side mirror of the local CONG worker proposal contract.
 * Validation only. Never use generated content directly as an executable instruction.
 */
import { z } from "zod";
const blueprint = z.enum(["volunteers","projects","donations","agenda","board","dispatch","delivery_routes","availability","forms","inventory","events","assistance","partners","assets","messages","reservations","custom"]);
const fieldType = z.enum(["text","long_text","number","date","boolean","select","email"]);
const restricted: Set<string> = new Set(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"]);
const fieldKey = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const slug = z.string().max(70).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const field = z.strictObject({
 key: fieldKey, label: z.string().trim().min(2).max(80), type: fieldType,
 required:z.boolean(),help:z.string().max(240),options:z.array(z.string().trim().min(1).max(60)).max(24)
}).superRefine((f,ctx)=>{
 if(f.type==="select" && (f.options.length<2 || new Set(f.options.map(v=>v.toLocaleLowerCase("pt-BR"))).size!==f.options.length)) ctx.addIssue({code:"custom",message:"Seleção exige opções distintas"});
 if(f.type!=="select" && f.options.length)ctx.addIssue({code:"custom",message:"Opções indevidas"});
});
const fields=z.array(field).max(32).superRefine((values,ctx)=>{if(new Set(values.map(v=>v.key)).size!==values.length)ctx.addIssue({code:"custom",message:"Campos repetidos"});});
const module=z.strictObject({alias:fieldKey,blueprint_key:blueprint,name:z.string().trim().min(2).max(100),description:z.string().max(450),fields});
const system=z.strictObject({name:z.string().trim().min(2).max(100),description:z.string().trim().min(4).max(700),modules:z.array(module).min(1).max(10),workflow:z.array(z.strictObject({kind:z.enum(["receive","review","prepare","assign","execute","monitor","custom"]),title:z.string().trim().min(2).max(100),description:z.string().trim().min(1).max(350),module_alias:fieldKey})).max(8)});
const section=z.strictObject({type:z.enum(["hero","text","features","impact","cta","contact","form","faq","gallery"]),title:z.string().max(140),text:z.string().max(1100),action_label:z.string().max(80),linked_module_alias:z.string()});
const page=z.strictObject({title:z.string().trim().min(2).max(100),slug,sections:z.array(section).min(1).max(12)});
const site=z.strictObject({name:z.string().trim().min(2).max(100),audience:z.string().trim().min(2).max(220),style:z.string().trim().min(2).max(220),pages:z.array(page).min(1).max(8)});
const publicForm=z.strictObject({name:z.string().trim().min(2).max(110),page_slug:slug,form_module_alias:fieldKey,target_module_alias:fieldKey,fields:z.array(field).min(1).max(24),bindings:z.array(z.strictObject({form_field_key:fieldKey,module_field_key:fieldKey}))});
const proposal=z.strictObject({
 schema_version:z.literal("cong.assistant.v2"),phase:z.enum(["clarify","propose"]),reply:z.string().trim().min(2).max(1200),
 questions:z.array(z.string().trim().min(10).max(230)).max(1),
 memory:z.strictObject({summary:z.string().max(1700),facts:z.array(z.strictObject({key:z.string().trim().min(1).max(70),value:z.string().trim().min(1).max(380)})).max(30),assumptions:z.array(z.string().trim().min(1).max(350)).max(12)}),
 plan:z.strictObject({system:system.nullable(),site:site.nullable(),connection:z.strictObject({link_system:z.boolean(),public_forms:z.array(publicForm).max(6)}),limitations:z.array(z.string()).max(12),confirmations:z.array(z.string()).max(12)})
});
export type ValidProposal=z.infer<typeof proposal>;
export function validateProposal(value:unknown,goal:"system"|"site"|"both",asked:number):value is ValidProposal{
 const result=proposal.safeParse(value);
 if(!result.success)return false;
 const v=result.data,p=v.plan;
 if(v.phase==="clarify")return asked<4&&v.questions.length===1&&p.system===null&&p.site===null&&!p.connection.link_system&&p.connection.public_forms.length===0;
 if(v.questions.length)return false;
 if(goal!=="site"&&!p.system||goal!=="system"&&!p.site)return false;
 if(goal==="site"&&p.system!==null||goal==="system"&&p.site!==null)return false;
 if((!p.system||!p.site)&&(p.connection.link_system||p.connection.public_forms.length>0))return false;
 if(!p.connection.link_system&&p.connection.public_forms.length>0)return false;
 if(JSON.stringify(v).length>100000)return false;
 const modules=new Map(p.system?.modules.map(m=>[m.alias,m])??[]);
 if(modules.size!==p.system?.modules.length&&p.system)return false;
 for(const m of p.system?.modules??[])if(restricted.has(m.blueprint_key)&&m.fields.length)return false;
 for(const w of p.system?.workflow??[])if(!modules.has(w.module_alias))return false;
 const pages=new Map(p.site?.pages.map(pg=>[pg.slug,pg])??[]);
 if(p.site&&pages.size!==p.site.pages.length)return false;
 for(const pg of p.site?.pages??[])for(const s of pg.sections){
  if(s.type==="form"&&modules.get(s.linked_module_alias)?.blueprint_key!=="forms")return false;
  if(s.type!=="form"&&s.linked_module_alias!=="")return false;
 }
 for(const f of p.connection.public_forms){
  const pg=pages.get(f.page_slug),formMod=modules.get(f.form_module_alias),dest=modules.get(f.target_module_alias);
  if(!pg||!formMod||formMod.blueprint_key!=="forms"||!dest||restricted.has(dest.blueprint_key))return false;
  if(!pg.sections.some(s=>s.type==="form"&&s.linked_module_alias===f.form_module_alias))return false;
  const source=new Map(f.fields.map(x=>[x.key,x])),target=new Map(dest.fields.map(x=>[x.key,x]));
  if(source.size!==f.fields.length)return false;
  const usedSource=new Set<string>(),usedTarget=new Set<string>();
  for(const b of f.bindings){
   const a=source.get(b.form_field_key),d=target.get(b.module_field_key);
   if(!a||!d||usedSource.has(b.form_field_key)||usedTarget.has(b.module_field_key)||a.type!==d.type||a.type==="boolean")return false;
   if(a.type==="select"&&!a.options.every(o=>d.options.includes(o)))return false;
   usedSource.add(b.form_field_key);usedTarget.add(b.module_field_key);
  }
  for(const d of dest.fields)if(d.required&&!usedTarget.has(d.key))return false;
 }
 return true;
}
