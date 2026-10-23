import { AppError } from "../../utils/app-error.js";
import { fieldsSchema, type ModuleField } from "./operational.schemas.js";

export function checkSchemaChange(current: ModuleField[], proposed: ModuleField[], hasRecords: boolean): void {
  fieldsSchema.parse(proposed);
  if (!hasRecords) return;
  const byKey = new Map(proposed.map(f => [f.key, f]));
  for (const oldField of current) {
    const next = byKey.get(oldField.key);
    if (!next || next.type !== oldField.type || (next.required && !oldField.required) ||
        JSON.stringify(next.options ?? []) !== JSON.stringify(oldField.options ?? []) ||
        next.targetModuleId !== oldField.targetModuleId) {
      throw new AppError("Alteração incompatível com registros existentes. Mantenha tipo, opções e campos antigos.", 409, "SCHEMA_CHANGE_NEEDS_MIGRATION");
    }
  }
  if (proposed.some(f => f.required && !current.some(old => old.key === f.key))) {
    throw new AppError("Novos campos obrigatórios exigem migração dos registros existentes.", 409, "REQUIRED_FIELD_REQUIRES_MIGRATION");
  }
}

export function validateRecord(fields: ModuleField[], data: Record<string, unknown>): Record<string, string | number | boolean | null> {
  if (JSON.stringify(data).length > 18000) throw new AppError("Registro acima do limite de tamanho.", 400, "RECORD_TOO_LARGE");
  const allowed = new Set(fields.map(f => f.key));
  for (const key of Object.keys(data)) if (!allowed.has(key)) throw new AppError(`Campo não definido: ${key}`, 400, "UNKNOWN_MODULE_FIELD");
  const result: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const value = data[field.key];
    if (value === undefined || value === null || value === "") {
      if (field.required) throw new AppError(`Preencha ${field.label}.`, 400, "REQUIRED_MODULE_FIELD");
      result[field.key] = null;
      continue;
    }
    if (field.type === "boolean") {
      if (typeof value !== "boolean") throw new AppError(`Valor inválido: ${field.label}.`, 400, "INVALID_FIELD_VALUE");
    } else if (field.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e12) throw new AppError(`Número inválido: ${field.label}.`, 400, "INVALID_FIELD_VALUE");
    } else {
      if (typeof value !== "string") throw new AppError(`Texto inválido: ${field.label}.`, 400, "INVALID_FIELD_VALUE");
      if (value.length > (field.type === "long_text" ? 4000 : 300)) throw new AppError(`Texto longo demais: ${field.label}.`, 400, "FIELD_TOO_LONG");
      if (field.type === "relation" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new AppError(`Escolha um registro válido: ${field.label}.`, 400, "INVALID_RELATION_VALUE");
      if (field.type === "select" && !field.options?.includes(value)) throw new AppError(`Opção inválida: ${field.label}.`, 400, "INVALID_FIELD_OPTION");
      if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError(`E-mail inválido: ${field.label}.`, 400, "INVALID_FIELD_VALUE");
      if (field.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value)) throw new AppError(`Data inválida: ${field.label}.`, 400, "INVALID_FIELD_VALUE");
    }
    result[field.key] = value;
  }
  return result;
}


/** Additional domain rules for the typed operational blueprints.
 * They run on the server even when a client bypasses the visual editor.
 * Custom schemas remain supported: if a conventional field is absent, this
 * validator does not invent it or reject unrelated custom fields.
 */
export function validateSpecialistRecord(blueprintKey:string, data:Record<string,string|number|boolean|null>):void {
  const numeric=(field:string,minimum:number,integer=false)=>{
    const value=data[field];
    if(value===null||value===undefined)return;
    if(typeof value!=="number"||!Number.isFinite(value)||value<minimum||(integer&&!Number.isInteger(value))){
      throw new AppError(`Confira o valor do campo ${field}.`,400,"INVALID_OPERATIONAL_QUANTITY");
    }
  };
  if(blueprintKey==="inventory")numeric("saldo",0);
  if(blueprintKey==="donations")numeric("quantidade",0.0000001);
  if(blueprintKey==="events")numeric("vagas",0,true);
}
