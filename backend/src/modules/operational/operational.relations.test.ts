import assert from "node:assert/strict";
import test from "node:test";
import {fieldSchema,fieldsSchema,type ModuleField} from "./operational.schemas.js";
import {checkSchemaChange,validateRecord} from "./operational.validation.js";

const destination="8bdc28de-89b9-446d-b7d7-47667a15d9d5";
const other="8d887f0b-d2b2-4c36-8e58-c89ae46dc00c";
const record="db0b9e5b-7f93-4f8b-88a8-82487414ca33";
const relation:ModuleField={key:"responsavel",label:"Responsável",type:"relation",targetModuleId:destination,required:false,help:""};

test("campo de relação exige um módulo alvo UUID",()=>{
  assert.equal(fieldSchema.safeParse(relation).success,true);
  assert.equal(fieldSchema.safeParse({...relation,targetModuleId:undefined}).success,false);
  assert.equal(fieldSchema.safeParse({...relation,targetModuleId:"outro"}).success,false);
  assert.equal(fieldSchema.safeParse({...relation,type:"text"}).success,false);
});

test("registros referenciam identificadores e rejeitam texto arbitrário",()=>{
  assert.equal(validateRecord([relation],{responsavel:record}).responsavel,record);
  assert.equal(validateRecord([relation],{responsavel:null}).responsavel,null);
  assert.throws(()=>validateRecord([relation],{responsavel:"João"}));
});

test("não muda o destino de um relacionamento com dados existentes",()=>{
  assert.doesNotThrow(()=>checkSchemaChange([relation],[relation],true));
  assert.throws(()=>checkSchemaChange([relation],[{...relation,targetModuleId:other}],true));
  assert.doesNotThrow(()=>checkSchemaChange([relation],[{...relation,targetModuleId:other}],false));
});

test("não admite códigos de campo repetidos",()=>{
  assert.equal(fieldsSchema.safeParse([relation,{...relation,label:"Outro"}]).success,false);
});
