import assert from "node:assert/strict";
import { test } from "node:test";
import { fieldsSchema, createSystemSchema, type ModuleField } from "./operational.schemas.js";
import { checkSchemaChange, validateRecord } from "./operational.validation.js";

const base:ModuleField[]=[{key:"nome",label:"Nome",type:"text",required:true,help:""},{key:"ativo",label:"Ativo",type:"boolean",required:false,help:""}];
test("rejeita código de campo duplicado e código malformado",()=>{
  assert.equal(fieldsSchema.safeParse([...base,base[0]!]).success,false);
  assert.equal(fieldsSchema.safeParse([{...base[0]!,key:"__proto__"}]).success,false);
});
test("valida campos obrigatórios e valores por tipo",()=>{
  assert.throws(()=>validateRecord(base,{}));
  assert.throws(()=>validateRecord(base,{nome:42}));
  assert.deepEqual(validateRecord(base,{nome:"Ana",ativo:false}),{nome:"Ana",ativo:false});
  assert.throws(()=>validateRecord(base,{nome:"Ana",intruso:"não autorizado"}));
});
test("campos de seleção recebem somente opções pré-configuradas",()=>{
  const fields:ModuleField[]=[{key:"situacao",label:"Situação",type:"select",required:true,help:"",options:["Pendente","Recebida"]}];
  assert.deepEqual(validateRecord(fields,{situacao:"Recebida"}),{situacao:"Recebida"});
  assert.throws(()=>validateRecord(fields,{situacao:"Pago"}));
});
test("rejeita datas inexistentes e números fora do limite",()=>{
  const fields:ModuleField[]=[{key:"dia",label:"Dia",type:"date",required:true,help:""},{key:"qtd",label:"Quantidade",type:"number",required:true,help:""}];
  assert.throws(()=>validateRecord(fields,{dia:"2026-02-30",qtd:1}));
  assert.throws(()=>validateRecord(fields,{dia:"2026-02-28",qtd:Infinity}));
  assert.deepEqual(validateRecord(fields,{dia:"2026-02-28",qtd:0}),{dia:"2026-02-28",qtd:0});
});
test("impede exclusão e alteração incompatível quando existem registros",()=>{
  assert.throws(()=>checkSchemaChange(base,[base[0]!],true));
  assert.throws(()=>checkSchemaChange(base,[{...base[0]!,type:"number"},base[1]!],true));
  assert.throws(()=>checkSchemaChange(base,[...base,{key:"codigo",label:"Código",type:"text",required:true,help:""}],true));
  assert.doesNotThrow(()=>checkSchemaChange(base,[...base,{key:"codigo",label:"Código",type:"text",required:false,help:""}],true));
  assert.doesNotThrow(()=>checkSchemaChange(base,[{...base[0]!,label:"Nome completo"},base[1]!],true));
});
test("valida criação estrita de sistemas",()=>{
  assert.equal(createSystemSchema.safeParse({name:"Campanhas",description:"Gestão da ONG"}).success,true);
  assert.equal(createSystemSchema.safeParse({name:"OK",isAdmin:true}).success,false);
});
