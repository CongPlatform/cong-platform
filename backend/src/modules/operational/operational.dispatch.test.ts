import assert from "node:assert/strict";
import {test} from "node:test";
import {blueprints,installModuleSchema,editTaskSchema} from "./operational.schemas.js";

const example="1455b0e9-62cf-4f7a-9b0b-acd7f8def420";

test("a central de despacho e uma peca operacional sem campos de cadastro",()=>{
  const blueprint=blueprints.find(item=>item.key==="dispatch");
  assert.ok(blueprint);
  assert.equal(blueprint.fields.length,0);
  assert.equal(installModuleSchema.safeParse({blueprintKey:"dispatch"}).success,true);
  assert.equal(installModuleSchema.safeParse({blueprintKey:"dispatch",organizationId:example}).success,false);
});

test("aceita atribuicao e progresso somente com dados validos",()=>{
  assert.equal(editTaskSchema.safeParse({revision:1,assigneeUserId:example}).success,true);
  assert.equal(editTaskSchema.safeParse({revision:2,assigneeUserId:null}).success,true);
  assert.equal(editTaskSchema.safeParse({revision:3,status:"done"}).success,true);
  assert.equal(editTaskSchema.safeParse({revision:1,assigneeUserId:"outra-ong"}).success,false);
  assert.equal(editTaskSchema.safeParse({revision:0,status:"progress"}).success,false);
  assert.equal(editTaskSchema.safeParse({revision:3,status:"delivered"}).success,false);
});
