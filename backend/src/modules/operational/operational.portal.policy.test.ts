import assert from "node:assert/strict";
import test from "node:test";
import {portalCanAccess,portalIntakeCompatible} from "./operational.portal.policy.js";

test("formulário permite somente campos simples",()=>{
  assert.equal(portalIntakeCompatible([{type:"text"},{type:"email"}]),true);
  assert.equal(portalIntakeCompatible([{type:"relation"}]),false);
  assert.equal(portalIntakeCompatible([]),false);
});
test("áreas de voluntário e beneficiário são distintas",()=>{
  assert.equal(portalCanAccess("volunteer","tasks"),true);
  assert.equal(portalCanAccess("volunteer","requests"),false);
  assert.equal(portalCanAccess("beneficiary","requests"),true);
  assert.equal(portalCanAccess("beneficiary","tasks"),false);
});
