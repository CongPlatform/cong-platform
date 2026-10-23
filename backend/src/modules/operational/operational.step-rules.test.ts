import assert from "node:assert/strict";
import {test} from "node:test";
import {defaultStepRule,ruleAllowsPriority,dueDateFromDays} from "./operational.step-rule-logic.js";

test("regra nova começa desligada",()=>{
  const rule=defaultStepRule("step-a");
  assert.equal(rule.enabled,false);
  assert.equal(rule.revision,0);
  assert.equal(rule.assignment,"unassigned");
});

test("prioridade opcional não altera outras prioridades",()=>{
  assert.equal(ruleAllowsPriority({enabled:false,priority:"any"},"high"),false);
  assert.equal(ruleAllowsPriority({enabled:true,priority:"any"},"normal"),true);
  assert.equal(ruleAllowsPriority({enabled:true,priority:"high"},"normal"),false);
  assert.equal(ruleAllowsPriority({enabled:true,priority:"high"},"high"),true);
});

test("prazos são calculados em UTC, sem depender do horário local",()=>{
  assert.equal(dueDateFromDays(2,new Date("2026-10-21T23:30:00Z")),"2026-10-23");
  assert.equal(dueDateFromDays(0,new Date("2026-10-21T23:30:00Z")),null);
  assert.equal(dueDateFromDays(31,new Date("2026-10-21T23:30:00Z")),null);
});
