import assert from "node:assert/strict";
import {test} from "node:test";
import {archiveTaskSchema,createTaskSchema,deleteSystemSchema,editTaskSchema,foodIntakeSchema} from "./operational.schemas.js";

const baseTask={title:"Separar cestas",notes:"Conferir os alimentos disponíveis",priority:"normal",dueOn:null,stepId:null,moduleId:null,recordId:null,assigneeUserId:null};
test("aceita tarefa de operação com responsável e etapa opcionais",()=>{
  const parsed=createTaskSchema.parse(baseTask);
  assert.equal(parsed.title,"Separar cestas");
  assert.equal(parsed.priority,"normal");
});
test("recusa tarefa com estado indevido ou campos imprevistos",()=>{
  assert.equal(createTaskSchema.safeParse({...baseTask,status:"done"}).success,false);
  assert.equal(editTaskSchema.safeParse({revision:1,status:"pendente"}).success,false);
  assert.equal(editTaskSchema.safeParse({revision:0,status:"done"}).success,false);
});
test("controla versões e nomes na exclusão de sistemas",()=>{
  assert.equal(deleteSystemSchema.safeParse({confirmation:"Ações da ONG",version:2}).success,true);
  assert.equal(deleteSystemSchema.safeParse({confirmation:"",version:2}).success,false);
  assert.equal(deleteSystemSchema.safeParse({confirmation:"Ações da ONG",version:0}).success,false);
});
test("respeita o controle de concorrência ao arquivar tarefas",()=>{
  assert.equal(archiveTaskSchema.safeParse({revision:5}).success,true);
  assert.equal(archiveTaskSchema.safeParse({revision:-1}).success,false);
});
test("valida lote de alimentos sem aceitar itens inventados",()=>{
  assert.equal(foodIntakeSchema.safeParse({items:[{item:"Arroz",quantidade:3,unidade:"Kg"}]}).success,true);
  assert.equal(foodIntakeSchema.safeParse({items:[{item:"Arroz",quantidade:0,unidade:"Kg"}]}).success,false);
  assert.equal(foodIntakeSchema.safeParse({items:[{item:"Item desconhecido",quantidade:2,unidade:"Kg"}]}).success,false);
  assert.equal(foodIntakeSchema.safeParse({items:[]}).success,false);
});
