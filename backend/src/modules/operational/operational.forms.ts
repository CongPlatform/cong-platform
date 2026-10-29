import pool from "../../config/database.js";
import {AppError} from "../../utils/app-error.js";
import {fieldsSchema} from "./operational.schemas.js";
import {validateRecord} from "./operational.validation.js";
import {formFieldsSchema,formSettingsSchema,parseFormSubmission,type FormField} from "./operational.forms.schema.js";
import type {PoolClient} from "pg";

const noForm=()=>new AppError("Formulário não encontrado.",404,"FORM_NOT_FOUND");
const allowedModuleType=new Set(["text","long_text","email","number","date","select"]);
const numericKinds=new Set(["number","integer","currency","percentage"]);
const choiceKinds=new Set(["select","radio"]);
export async function formSite(org:string,systemId:string){
  const {rows}=await pool.query(`select s.brand_site_id as id, i.slug
    from public.operational_systems s join public.institutional_sites i on i.id=s.brand_site_id and i.organization_id=s.organization_id
    where s.organization_id=$1 and s.id=$2 and s.status<>'archived' and i.published_at is not null`,[org,systemId]);
  const site=rows[0];return site?site as {id:string;slug:string}:null;
}
async function ensureMapping(client:PoolClient,org:string,systemId:string,fields:FormField[],targetModuleId:string|null,bindings:Record<string,string>){
  if(!targetModuleId){if(Object.keys(bindings).length)throw new AppError("Selecione uma peça de destino antes de vincular campos.",400,"FORM_MAPPING_NO_MODULE");return;}
  const {rows}=await client.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,[org,systemId,targetModuleId]);
  if(!rows.length)throw new AppError("Peça de destino não encontrada.",400,"FORM_TARGET_INVALID");
  const moduleFields=fieldsSchema.parse(rows[0].schema_fields);
  const chosen=new Set<string>();
  for(const [source,target] of Object.entries(bindings)){
    const field=fields.find(f=>f.key===source),dest=moduleFields.find(f=>f.key===target);
    if(!field||!dest||!allowedModuleType.has(dest.type))throw new AppError("A ligação aponta para um campo inválido.",400,"FORM_MAPPING_INVALID");
    if(chosen.has(target))throw new AppError("Dois campos não podem preencher o mesmo destino.",400,"FORM_MAPPING_DUPLICATE");
    chosen.add(target);
    if((dest.type==="number")!==numericKinds.has(field.kind))throw new AppError("Os tipos dos campos ligados não são compatíveis.",400,"FORM_MAPPING_TYPE");
    if(dest.type==="select"&&(!choiceKinds.has(field.kind)||field.options?.some(value=>!dest.options?.includes(value))))throw new AppError("As opções da seleção devem corresponder às do destino.",400,"FORM_MAPPING_TYPE");
    if(dest.type==="date"&&field.kind!=="date")throw new AppError("Campos de data devem ser conectados a campos de data.",400,"FORM_MAPPING_TYPE");
    if(dest.type==="email"&&field.kind!=="email")throw new AppError("Campos de e-mail devem ser conectados a e-mail.",400,"FORM_MAPPING_TYPE");
  }
  if(moduleFields.some(f=>f.required&&!chosen.has(f.key)))throw new AppError("Associe todos os campos obrigatórios da peça.",400,"FORM_MAPPING_REQUIRED");
}
export async function listForms(org:string,systemId:string){
  const {rows}=await pool.query(`select id,title,description,fields,page_slug as "pageSlug",enabled,target_module_id as "targetModuleId",bindings,revision,created_at as "createdAt"
    from public.operational_forms where organization_id=$1 and system_id=$2 order by created_at asc`,[org,systemId]);
  return rows;
}
export async function createForm(org:string,systemId:string){
  const site=await formSite(org,systemId);
  const {rows}=await pool.query(`insert into public.operational_forms(organization_id,system_id,site_id,title,fields) values($1,$2,$3,'Novo formulário',$4::jsonb) returning id`,[org,systemId,site?.id??null,JSON.stringify([{id:"6453eec8-c60e-45cf-8ffb-cc39432e2241",key:"nome",label:"Nome",kind:"text",required:true}])]);
  return rows[0].id as string;
}
export async function saveForm(org:string,systemId:string,formId:string,settings:unknown){
  const data=formSettingsSchema.parse(settings);
  const site=await formSite(org,systemId);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const exists=await client.query(`select id from public.operational_forms where organization_id=$1 and system_id=$2 and id=$3 and revision=$4 for update`,[org,systemId,formId,data.revision]);
    if(!exists.rowCount)throw new AppError("Este formulário foi alterado em outra tela. Atualize antes de editar.",409,"FORM_VERSION_CONFLICT");
    await ensureMapping(client,org,systemId,data.fields,data.targetModuleId,data.bindings);
    if(data.enabled&&!site)throw new AppError("Vincule um site publicado em Identidade antes de disponibilizar o formulário.",409,"FORM_SITE_REQUIRED");
    const validPage= data.pageSlug==="" || (site?await client.query(`select 1 from public.institutional_pages where site_id=$1 and slug=$2 limit 1`,[site.id,data.pageSlug]).then(r=>Boolean(r.rowCount)):false);
    if(!validPage&&data.enabled)throw new AppError("Escolha uma página válida do site.",400,"FORM_PAGE_INVALID");
    const result=await client.query(`update public.operational_forms set title=$4,description=$5,fields=$6::jsonb,enabled=$7,page_slug=$8,target_module_id=$9,bindings=$10::jsonb,revision=revision+1,site_id=$11
      where organization_id=$1 and system_id=$2 and id=$3 returning id,revision`,[org,systemId,formId,data.title,data.description,JSON.stringify(data.fields),data.enabled,data.pageSlug,data.targetModuleId,JSON.stringify(data.bindings),site?.id??null]);
    await client.query("COMMIT");return result.rows[0];
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
export async function publicForms(slug:string,pageSlug:string){
  const {rows}=await pool.query(`select f.id,f.title,f.description,f.fields from public.operational_forms f
    join public.institutional_sites s on s.id=f.site_id and s.organization_id=f.organization_id
    join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
    join public.organization_brand_profiles b on b.organization_id=s.organization_id
    left join public.institutional_site_domains d on d.site_id=s.id
    where (d.public_slug=$1 or ((s.slug=$1 or b.public_slug=$1) and s.is_primary=true)) and f.site_id=os.brand_site_id and f.enabled=true and (f.page_slug=$2 or (f.page_slug='' and exists(select 1 from public.institutional_pages pg where pg.site_id=s.id and pg.is_home=true and pg.slug=$2))) and s.published_at is not null and os.status='active' order by f.created_at limit 12`,[slug,pageSlug]);
  return rows.map(row=>({...row,fields:formFieldsSchema.parse(row.fields)}));
}
export async function publicFormSubmit(slug:string,formId:string,data:Record<string,unknown>){
  const {rows}=await pool.query(`select f.organization_id,f.system_id,f.fields,f.bindings,f.target_module_id from public.operational_forms f
    join public.institutional_sites s on s.id=f.site_id and s.organization_id=f.organization_id
    join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
    join public.organization_brand_profiles b on b.organization_id=s.organization_id
    left join public.institutional_site_domains d on d.site_id=s.id
    where (d.public_slug=$1 or ((s.slug=$1 or b.public_slug=$1) and s.is_primary=true)) and f.site_id=os.brand_site_id and f.id=$2 and f.enabled=true and s.published_at is not null and os.status='active'`,[slug,formId]);
  if(!rows.length)throw noForm();
  let clean:Record<string,string|number|null>;
  try{clean=parseFormSubmission(formFieldsSchema.parse(rows[0].fields),data);}catch(error){throw new AppError(error instanceof Error?error.message:"Dados inválidos.",400,"FORM_INVALID_INPUT");}
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const count=await client.query(`select count(*)::int as total from public.operational_form_submissions where form_id=$1 and created_at>now()-interval '1 day'`,[formId]);
    if(Number(count.rows[0]?.total??0)>=200)throw new AppError("Este formulário atingiu o limite diário. Tente novamente depois.",429,"FORM_DAILY_LIMIT");
    const result=await client.query(`insert into public.operational_form_submissions(organization_id,system_id,form_id,payload,fields_snapshot,bindings_snapshot,target_module_snapshot_id) values($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7) returning id`,[rows[0].organization_id,rows[0].system_id,formId,JSON.stringify(clean),JSON.stringify(rows[0].fields),JSON.stringify(rows[0].bindings),rows[0].target_module_id]);
    await client.query("COMMIT");return result.rows[0].id as string;
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
export async function formSubmissions(org:string,systemId:string,formId:string){
  const result=await pool.query(`select id,payload,status,created_at as "createdAt" from public.operational_form_submissions where organization_id=$1 and system_id=$2 and form_id=$3 order by created_at desc limit 100`,[org,systemId,formId]);
  return result.rows;
}
export async function reviewSubmission(org:string,systemId:string,formId:string,submissionId:string,decision:"approved"|"rejected",actor:string){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query(`select sub.*,f.target_module_id,f.bindings,f.fields from public.operational_form_submissions sub
      join public.operational_forms f on f.id=sub.form_id and f.organization_id=sub.organization_id and f.system_id=sub.system_id
      where sub.organization_id=$1 and sub.system_id=$2 and sub.form_id=$3 and sub.id=$4 for update of sub`,[org,systemId,formId,submissionId]);
    const submission=result.rows[0];if(!submission||submission.status!=="pending")throw new AppError("Resposta não encontrada ou já analisada.",409,"FORM_ALREADY_REVIEWED");
    let recordId:string|null=null;
    if(decision==="approved"&&submission.target_module_snapshot_id){
      const target=await client.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,[org,systemId,submission.target_module_snapshot_id]);
      if(!target.rowCount)throw new AppError("O módulo vinculado não existe mais.",409,"FORM_TARGET_MISSING");
      await ensureMapping(client,org,systemId,formFieldsSchema.parse(submission.fields_snapshot),submission.target_module_snapshot_id,submission.bindings_snapshot);
      const mapped=Object.fromEntries(Object.entries(submission.bindings_snapshot as Record<string,string>).map(([source,key])=>[key,submission.payload[source]]));
      const clean=validateRecord(fieldsSchema.parse(target.rows[0].schema_fields),mapped);
      const inserted=await client.query(`insert into public.operational_records(organization_id,system_id,module_id,data,created_by_auth_user_id) values($1,$2,$3,$4::jsonb,$5) returning id`,[org,systemId,submission.target_module_snapshot_id,JSON.stringify(clean),actor]);
      recordId=inserted.rows[0].id;
    }
    await client.query(`update public.operational_form_submissions set status=$5,module_record_id=$6,reviewed_by_auth_user_id=$7,reviewed_at=now() where organization_id=$1 and system_id=$2 and form_id=$3 and id=$4`,[org,systemId,formId,submissionId,decision,recordId,actor]);
    await client.query("COMMIT");return {recordId};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function availableSiteForms(orgId:string,siteId:string){
  const {rows}=await pool.query(`select f.id, f.title, f.enabled, f.fields
    from public.operational_forms f
    join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
    join public.institutional_sites site on site.id=$2 and site.organization_id=$1
    where f.organization_id=$1 and f.site_id=site.id and os.brand_site_id=site.id
      and f.enabled=true and os.status='active' order by f.title, f.created_at limit 150`,[orgId,siteId]);
  return rows.map(row=>({...row,fields:formFieldsSchema.parse(row.fields)}));
}
export async function publicPlacedForm(slug:string,formId:string){
  const {rows}=await pool.query(`select f.id,f.title,f.description,f.fields
    from public.operational_forms f
    join public.institutional_sites site on site.id=f.site_id and site.organization_id=f.organization_id
    join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
    join public.organization_brand_profiles b on b.organization_id=site.organization_id
    left join public.institutional_site_domains d on d.site_id=site.id
    where (d.public_slug=$1 or ((site.slug=$1 or b.public_slug=$1) and site.is_primary=true)) and f.id=$2 and f.enabled=true and site.published_at is not null
      and os.status='active' and os.brand_site_id=site.id limit 1`,[slug,formId]);
  if(!rows[0])throw noForm();
  return {...rows[0],fields:formFieldsSchema.parse(rows[0].fields)};
}

export async function siteBuilderResources(orgId:string,siteId:string){
  const site=await pool.query(`select id from public.institutional_sites where id=$1 and organization_id=$2 limit 1`,[siteId,orgId]);
  if(!site.rowCount)throw new AppError("Site não encontrado nesta organização.",404,"SITE_NOT_FOUND");
  const {rows}=await pool.query(`select f.id,f.title,f.description,f.fields,f.enabled,f.site_id as "linkedSiteId", os.id as "systemId",os.name as "systemName",os.brand_site_id as "systemSiteId"
    from public.operational_forms f join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
    where f.organization_id=$1 and os.status='active'
    order by os.name,f.title,f.created_at limit 200`,[orgId]);
  return rows.map(row=>({
    id:row.id,title:row.title,description:row.description??"",fields:formFieldsSchema.parse(row.fields),
    systemId:row.systemId,systemName:row.systemName,
    status:row.systemSiteId!==siteId?"other_site":!row.enabled||row.linkedSiteId!==siteId?"disabled":"ready"
  }));
}

export async function activateFormOnSite(orgId:string,siteId:string,formId:string){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const target=await client.query(`select f.id,f.system_id,f.site_id,f.enabled,os.brand_site_id,os.status
      from public.operational_forms f
      join public.operational_systems os on os.id=f.system_id and os.organization_id=f.organization_id
      where f.organization_id=$1 and f.id=$2 for update of f`,[orgId,formId]);
    if(!target.rowCount)throw noForm();
    const form=target.rows[0];
    const site=await client.query(`select s.id from public.institutional_sites s
      where s.id=$1 and s.organization_id=$2 and s.published_at is not null
        and (s.is_primary=true or exists (
          select 1 from public.institutional_site_domains d
          where d.site_id=s.id and d.organization_id=s.organization_id))`,[siteId,orgId]);
    if(!site.rowCount)throw new AppError("Publique o site em um endereço da CONG antes de liberar o formulário.",409,"FORM_SITE_UNPUBLISHED");
    if(form.status!=="active")throw new AppError("Ative o sistema operacional antes de disponibilizar este formulário.",409,"FORM_SYSTEM_INACTIVE");
    if(form.brand_site_id!==siteId)throw new AppError("Vincule este site ao sistema em Identidade antes de disponibilizar o formulário.",409,"FORM_SYSTEM_SITE_MISMATCH");
    await client.query(`update public.operational_forms set site_id=$3,enabled=true,revision=revision+1
      where organization_id=$1 and id=$2`,[orgId,formId,siteId]);
    await client.query("COMMIT");
    return {enabled:true,siteId};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
