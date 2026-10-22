import assert from "node:assert/strict";
import {test} from "node:test";
import {operationalPlanSchema} from "./operational.schemas.js";

const step={id:"1455b0e9-62cf-4f7a-9b0b-acd7f8def420",kind:"receive",title:"Receber pedidos",description:"",moduleId:null};
const valid={revision:0,intent:"Receber solicitações e distribuir tarefas",needs:["activities"],steps:[step]};
test("aceita planejamento livre sem módulos vinculados",()=>{
  assert.equal(operationalPlanSchema.safeParse(valid).success,true);
  assert.equal(operationalPlanSchema.safeParse({...valid,needs:[],steps:[]}).success,true);
});
test("rejeita etapas duplicadas e identificadores inválidos",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[step,step]}).success,false);
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[{...step,id:"outro"}]}).success,false);
});
test("rejeita categorias inventadas e campos extras",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,needs:["financeiro"]}).success,false);
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[{...step,code:"alert(1)"}]}).success,false);
  assert.equal(operationalPlanSchema.safeParse({...valid,needs:["activities","activities"]}).success,false);
});
test("limita o plano a doze etapas",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:Array.from({length:13},(_,i)=>({...step,id:`1455b0e9-62cf-4f7a-9b0b-${String(i+1).padStart(12,"0")}`}))}).success,false);
});
test("rejeita referência a peça com identificador inválido",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[{...step,moduleId:"id-invalido"}]}).success,false);
});
test("rejeita nomes de etapas vazios e tipos de ação inexistentes",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[{...step,title:" "}]}).success,false);
  assert.equal(operationalPlanSchema.safeParse({...valid,steps:[{...step,kind:"send_all_data"}]}).success,false);
});
test("rejeita metas acima do limite e versões negativas",()=>{
  assert.equal(operationalPlanSchema.safeParse({...valid,intent:"x".repeat(1201)}).success,false);
  assert.equal(operationalPlanSchema.safeParse({...valid,revision:-1}).success,false);
});
