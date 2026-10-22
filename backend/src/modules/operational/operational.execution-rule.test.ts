import assert from "node:assert/strict";
import {test} from "node:test";
import {nextExecutionStep} from "./operational.execution-rule.js";

const steps=[
  {id:"a",title:"Receber",moduleId:null},
  {id:"b",title:"Preparar cesta",moduleId:"m1"},
  {id:"c",title:"Entregar",moduleId:"m2"},
];

test("encontra a próxima etapa na ordem visual",()=>{
  assert.deepEqual(nextExecutionStep(steps,"a"),{id:"b",title:"Preparar cesta",moduleId:"m1"});
  assert.deepEqual(nextExecutionStep(steps,"b"),{id:"c",title:"Entregar",moduleId:"m2"});
});

test("não avança além da última etapa nem etapas desconhecidas",()=>{
  assert.equal(nextExecutionStep(steps,"c"),null);
  assert.equal(nextExecutionStep(steps,"inexistente"),null);
  assert.equal(nextExecutionStep(null,"a"),null);
});

test("não cria tarefa com título inválido",()=>{
  assert.equal(nextExecutionStep([{id:"a",title:"Receber"},{id:"b",title:" "}],"a"),null);
});
