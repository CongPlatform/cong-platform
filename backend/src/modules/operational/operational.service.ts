import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { blueprints, fieldsSchema, type ModuleField } from "./operational.schemas.js";
import { checkSchemaChange, validateRecord, validateSpecialistRecord } from "./operational.validation.js";
import { syncOperationalRelations, validateOperationalRelationFields, assertRecordNotReferenced, listOperationalRecordOptions } from "./operational.relations.js";

const notFound = () => new AppError("Recurso não encontrado nesta organização.", 404, "OPERATIONAL_NOT_FOUND");
const conflict = () => new AppError("Este item foi alterado por outra pessoa. Atualize a página.", 409, "OPERATIONAL_VERSION_CONFLICT");
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function ensureId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) throw new AppError("Identificador inválido.", 400, "INVALID_OPERATIONAL_ID");
  return value;
}

export async function listSystems(org: string) {
  const result = await pool.query(`select s.id, s.name, s.description, s.status, s.version,
    s.created_at as "createdAt", s.updated_at as "updatedAt", count(m.id)::int as "moduleCount"
    from public.operational_systems s left join public.operational_modules m
      on m.organization_id=s.organization_id and m.system_id=s.id
    where s.organization_id=$1 and s.status <> 'archived'
    group by s.id order by s.updated_at desc limit 100`, [org]);
  return result.rows;
}

export async function getSystem(org: string, id: string) {
  const system = await pool.query(`select id, name, description, status, version, brand_site_id as "brandSiteId", dashboard_config as "dashboardConfig", created_at as "createdAt", updated_at as "updatedAt" from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'`, [org,id]);
  if (!system.rows[0]) throw notFound();
  const modules = await pool.query(`select id, system_id as "systemId", blueprint_key as "blueprintKey", name, description, schema_fields as fields, schema_version as "schemaVersion", position, updated_at as "updatedAt" from public.operational_modules where organization_id=$1 and system_id=$2 order by position, created_at`, [org,id]);
  return {...system.rows[0], modules: modules.rows};
}

export async function createSystem(org: string, actor: string, name: string, description: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`insert into public.operational_systems (organization_id, created_by_auth_user_id, name, description, brand_site_id)
      values ($1,$2,$3,$4,(select id from public.institutional_sites i where i.organization_id=$1 and i.published_at is not null and (select count(*) from public.institutional_sites p where p.organization_id=$1 and p.published_at is not null)=1 limit 1)) returning id`, [org,actor,name,description]);
    const id = result.rows[0]?.id as string;
    await client.query(`insert into public.operational_events (organization_id, system_id, action, actor_auth_user_id) values ($1,$2,'system.created',$3)`, [org,id,actor]);
    await client.query("COMMIT");
    return getSystem(org,id);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateSystem(org: string, actor: string, id: string, changes: {name?: string; description?: string}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`update public.operational_systems set name=coalesce($3,name), description=coalesce($4,description), version=version+1 where organization_id=$1 and id=$2 and status <> 'archived' returning id`, [org,id,changes.name??null,changes.description??null]);
    if (!result.rowCount) throw notFound();
    await client.query(`insert into public.operational_events (organization_id,system_id,action,actor_auth_user_id) values ($1,$2,'system.updated',$3)`, [org,id,actor]);
    await client.query("COMMIT");
    return getSystem(org,id);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function publishSystem(org: string, actor: string, id: string, status: "active" | "draft", version: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(`select version from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update`, [org,id]);
    if (!current.rowCount) throw notFound();
    if (current.rows[0]?.version !== version) throw conflict();
    if (status === "active") {
      const count = await client.query(`select count(*)::int as n from public.operational_modules where organization_id=$1 and system_id=$2`, [org,id]);
      if (!count.rows[0]?.n) throw new AppError("Adicione ao menos um módulo antes de ativar.", 400, "EMPTY_OPERATIONAL_SYSTEM");
    }
    await client.query(`update public.operational_systems set status=$3,version=version+1 where organization_id=$1 and id=$2`, [org,id,status]);
    await client.query(`insert into public.operational_events (organization_id,system_id,action,actor_auth_user_id) values ($1,$2,'system.published',$3)`, [org,id,actor]);
    await client.query("COMMIT");
    return getSystem(org,id);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function installModule(org: string, actor: string, systemId: string, blueprintKey: string, name?: string) {
  const blueprint = blueprints.find(b => b.key === blueprintKey);
  if (!blueprint) throw new AppError("Módulo desconhecido.", 400, "INVALID_BLUEPRINT");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const system = await client.query(`select id,status from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update`, [org, systemId]);
    if (!system.rowCount) throw notFound();
    if (system.rows[0]?.status !== 'draft') throw new AppError('Volte o sistema ao rascunho antes de adicionar módulos.', 409, 'SYSTEM_NOT_DRAFT');
    const count = await client.query(`select count(*)::int as n from public.operational_modules where organization_id=$1 and system_id=$2`, [org,systemId]);
    if ((count.rows[0]?.n ?? 0) >= 20) throw new AppError("Limite de 20 módulos por sistema.", 400, "MODULE_LIMIT");
    const result = await client.query(`insert into public.operational_modules (organization_id,system_id,blueprint_key,name,description,schema_fields,position) values ($1,$2,$3,$4,$5,$6::jsonb,$7) returning id`, [org,systemId,blueprint.key,name??blueprint.name,blueprint.description,JSON.stringify(blueprint.fields),count.rows[0]?.n??0]);
    const id = result.rows[0]?.id as string;
    if(blueprint.key==="messages") await client.query("insert into public.operational_message_channels(organization_id,system_id,module_id,name,created_by_auth_user_id) values ($1,$2,$3,'Geral',$4)",[org,systemId,id,actor]);
    await client.query(`insert into public.operational_schema_history (organization_id,system_id,module_id,version,fields,changed_by_auth_user_id) values ($1,$2,$3,1,$4::jsonb,$5)`, [org,systemId,id,JSON.stringify(blueprint.fields),actor]);
    await client.query(`update public.operational_systems set version=version+1 where organization_id=$1 and id=$2`, [org,systemId]);
    await client.query(`insert into public.operational_events (organization_id,system_id,module_id,action,actor_auth_user_id) values ($1,$2,$3,'module.installed',$4)`, [org,systemId,id,actor]);
    await client.query("COMMIT");
    return getSystem(org,systemId);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateModule(org: string, actor: string, systemId: string, moduleId: string, changes: {name?: string; description?: string; fields?: ModuleField[]; schemaVersion: number}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const system = await client.query(`select id,status from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update`, [org,systemId]);
    if (!system.rowCount) throw notFound();
    if (system.rows[0]?.status !== 'draft') throw new AppError('Volte o sistema ao rascunho para editar sua estrutura.',409,'SYSTEM_NOT_DRAFT');
    const original = await client.query(`select schema_fields as fields, schema_version as version from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3 for update`,[org,systemId,moduleId]);
    if (!original.rowCount) throw notFound();
    if (original.rows[0]?.version !== changes.schemaVersion) throw conflict();
    if (changes.fields) await validateOperationalRelationFields(client,org,systemId,moduleId,changes.fields);
    if (changes.fields && ["agenda","board","dispatch","delivery_routes","availability","messages","reservations"].includes((await client.query("select blueprint_key from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3",[org,systemId,moduleId])).rows[0]?.blueprint_key)) throw new AppError("Esta peça utiliza tarefas e não possui campos de cadastro.",400,"AGENDA_NO_FIELDS");
    if (changes.fields) {
      const existing = await client.query(`select exists(select 1 from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3) as has_records`, [org,systemId,moduleId]);
      checkSchemaChange(fieldsSchema.parse(original.rows[0]?.fields), changes.fields, Boolean(existing.rows[0]?.has_records));
    }
    const nextVersion = changes.schemaVersion + 1;
    await client.query(`update public.operational_modules set name=coalesce($4,name), description=coalesce($5,description), schema_fields=coalesce($6::jsonb,schema_fields),schema_version=$7 where organization_id=$1 and system_id=$2 and id=$3`, [org,systemId,moduleId,changes.name??null,changes.description??null,changes.fields?JSON.stringify(changes.fields):null,nextVersion]);
    const fields = changes.fields ?? fieldsSchema.parse(original.rows[0]?.fields);
    await client.query(`insert into public.operational_schema_history (organization_id,system_id,module_id,version,fields,changed_by_auth_user_id) values ($1,$2,$3,$4,$5::jsonb,$6)`, [org,systemId,moduleId,nextVersion,JSON.stringify(fields),actor]);
    await client.query(`update public.operational_systems set version=version+1 where organization_id=$1 and id=$2`,[org,systemId]);
    await client.query(`insert into public.operational_events (organization_id,system_id,module_id,action,actor_auth_user_id) values ($1,$2,$3,'module.schema_updated',$4)`,[org,systemId,moduleId,actor]);
    await client.query("COMMIT");
    return getSystem(org,systemId);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function lockModule(org: string, systemId: string, moduleId: string, client: import("pg").PoolClient): Promise<ModuleField[]> {
  const result = await client.query(`select m.schema_fields as fields,m.blueprint_key as blueprint from public.operational_modules m join public.operational_systems s on s.organization_id=m.organization_id and s.id=m.system_id where m.organization_id=$1 and m.system_id=$2 and m.id=$3 and s.status <> 'archived' for share of m`, [org,systemId,moduleId]);
  if (!result.rowCount) throw notFound();
  if (["agenda","board","dispatch","delivery_routes","availability","messages","reservations"].includes(result.rows[0]?.blueprint)) throw new AppError("Esta peça utiliza tarefas. Abra sua visualização operacional.",400,"AGENDA_NOT_RECORDS");
  return fieldsSchema.parse(result.rows[0]?.fields);
}

export async function listRecords(org: string, systemId: string, moduleId: string, offset: number) {
  const module = await pool.query(`select 1 from public.operational_modules m join public.operational_systems s on s.organization_id=m.organization_id and s.id=m.system_id where m.organization_id=$1 and m.system_id=$2 and m.id=$3 and s.status <> 'archived'`, [org,systemId,moduleId]);
  if (!module.rowCount) throw notFound();
  const [result, total] = await Promise.all([
    pool.query(`select id, data, revision, created_at as "createdAt", updated_at as "updatedAt" from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null order by created_at desc,id desc limit 50 offset $4`,[org,systemId,moduleId,offset]),
    pool.query(`select count(*)::int as count from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null`,[org,systemId,moduleId]),
  ]);
  return {records: result.rows, total: total.rows[0]?.count??0};
}

export async function createRecord(org: string, actor: string, systemId: string, moduleId: string, data: Record<string, unknown>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fields = await lockModule(org,systemId,moduleId,client);
    const limit = await client.query(`select count(*)::int as n from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null`,[org,systemId,moduleId]);
    if ((limit.rows[0]?.n ?? 0) >= 5000) throw new AppError("O módulo atingiu seu limite inicial de registros.", 409, "RECORD_LIMIT");
    const clean = validateRecord(fields,data);
    const blueprintRow = await client.query<{blueprint_key:string}>(
      `select blueprint_key from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,
      [org,systemId,moduleId]
    );
    validateSpecialistRecord(blueprintRow.rows[0]?.blueprint_key??"custom", clean);
    const result = await client.query(`insert into public.operational_records (organization_id,system_id,module_id,data,created_by_auth_user_id) values ($1,$2,$3,$4::jsonb,$5) returning id,data,revision,created_at as "createdAt",updated_at as "updatedAt"`, [org,systemId,moduleId,JSON.stringify(clean),actor]);
    const record = result.rows[0];
    await syncOperationalRelations(client,org,systemId,moduleId,record.id,fields,clean);
    await client.query(`insert into public.operational_events (organization_id,system_id,module_id,record_id,action,actor_auth_user_id) values ($1,$2,$3,$4,'record.created',$5)`, [org,systemId,moduleId,record?.id,actor]);
    await client.query("COMMIT");
    return record;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateRecord(org: string, actor: string, systemId: string, moduleId: string, recordId: string, data: Record<string, unknown>, revision: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fields = await lockModule(org,systemId,moduleId,client);
    const original = await client.query(`select revision from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and archived_at is null for update`, [org,systemId,moduleId,recordId]);
    if (!original.rowCount) throw notFound();
    if (original.rows[0]?.revision !== revision) throw conflict();
    const clean = validateRecord(fields,data);
    const blueprintRow = await client.query<{blueprint_key:string}>(
      `select blueprint_key from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,
      [org,systemId,moduleId]
    );
    validateSpecialistRecord(blueprintRow.rows[0]?.blueprint_key??"custom", clean);
    await syncOperationalRelations(client,org,systemId,moduleId,recordId,fields,clean);
    const result = await client.query(`update public.operational_records set data=$5::jsonb,revision=revision+1 where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 returning id,data,revision,created_at as "createdAt",updated_at as "updatedAt"`, [org,systemId,moduleId,recordId,JSON.stringify(clean)]);
    await client.query(`insert into public.operational_events (organization_id,system_id,module_id,record_id,action,actor_auth_user_id) values ($1,$2,$3,$4,'record.updated',$5)`, [org,systemId,moduleId,recordId,actor]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function archiveRecord(org: string, actor: string, systemId: string, moduleId: string, recordId: string, revision: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockModule(org,systemId,moduleId,client);
    const original = await client.query(`select revision from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and archived_at is null for update`, [org,systemId,moduleId,recordId]);
    if (!original.rowCount) throw notFound();
    if (original.rows[0]?.revision !== revision) throw conflict();
    await assertRecordNotReferenced(client,org,systemId,moduleId,recordId);
    await client.query("delete from public.operational_record_links where organization_id=$1 and system_id=$2 and source_module_id=$3 and source_record_id=$4",[org,systemId,moduleId,recordId]);
    await client.query(`update public.operational_records set archived_at=now(), revision=revision+1 where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4`,[org,systemId,moduleId,recordId]);
    await client.query(`insert into public.operational_events (organization_id,system_id,module_id,record_id,action,actor_auth_user_id) values ($1,$2,$3,$4,'record.archived',$5)`, [org,systemId,moduleId,recordId,actor]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function deleteSystem(org:string,actor:string,systemId:string,confirmation:string,version:number){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const current=await client.query("select name,version from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update",[org,systemId]);
    if(!current.rowCount)throw notFound();
    if(current.rows[0]?.version!==version)throw conflict();
    if(current.rows[0]?.name!==confirmation)throw new AppError("Digite o nome exato do sistema para confirmar.",400,"SYSTEM_CONFIRMATION_INVALID");
    const count=await client.query(`select
      (select count(*)::int from public.operational_modules where organization_id=$1 and system_id=$2) as modules,
      (select count(*)::int from public.operational_records where organization_id=$1 and system_id=$2) as records,
      (select count(*)::int from public.operational_tasks where organization_id=$1 and system_id=$2) as tasks`,[org,systemId]);
    await client.query("insert into public.operational_system_deletions(organization_id,deleted_system_id,removed_module_count,removed_record_count,removed_task_count,actor_auth_user_id) values ($1,$2,$3,$4,$5,$6)",[org,systemId,count.rows[0]?.modules??0,count.rows[0]?.records??0,count.rows[0]?.tasks??0,actor]);
    const removed=await client.query("delete from public.operational_systems where organization_id=$1 and id=$2 and version=$3",[org,systemId,version]);
    if(!removed.rowCount)throw conflict();
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function createFoodIntake(org:string,actor:string,systemId:string,moduleId:string,items:{item:string;quantidade:number;unidade:string}[]){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const fields=await lockModule(org,systemId,moduleId,client);
    const schemaKeys=new Map(fields.map(field=>[field.key,field]));
    if(!["item","quantidade","unidade","situacao"].every(key=>schemaKeys.has(key))||schemaKeys.get("quantidade")?.type!=="number"){
      throw new AppError("Esta experiência exige um módulo de Doações com os campos padrão.",409,"INCOMPATIBLE_DONATIONS_MODULE");
    }
    const count=await client.query("select count(*)::int as n from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null",[org,systemId,moduleId]);
    if((count.rows[0]?.n??0)+items.length>5000)throw new AppError("O módulo atingiu o limite de registros.",409,"RECORD_LIMIT");
    const now=new Date().toISOString().slice(0,10);
    const inserted:string[]=[];
    for(const item of items){
      const clean=validateRecord(fields,{item:item.item,quantidade:item.quantidade,unidade:item.unidade,situacao:"Recebida",data:now});
      const record=await client.query("insert into public.operational_records (organization_id,system_id,module_id,data,created_by_auth_user_id) values ($1,$2,$3,$4::jsonb,$5) returning id",[org,systemId,moduleId,JSON.stringify(clean),actor]);
      const recordId=record.rows[0]?.id as string;
      inserted.push(recordId);
      await client.query("insert into public.operational_events (organization_id,system_id,module_id,record_id,action,actor_auth_user_id) values ($1,$2,$3,$4,'record.created',$5)",[org,systemId,moduleId,recordId,actor]);
    }
    await client.query("COMMIT");
    return inserted;
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}

export async function getRecordOptions(org:string,systemId:string,moduleId:string,q:string,ids:string[]){
  return listOperationalRecordOptions(pool,org,systemId,moduleId,q,ids);
}
