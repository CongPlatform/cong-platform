import assert from "node:assert/strict";
import {test} from "node:test";
import {dashboardConfigSchema,operationalBrandSiteSchema} from "./operational.schemas.js";

const first="1455b0e9-62cf-4f7a-9b0b-acd7f8def420";
const second="2455b0e9-62cf-4f7a-9b0b-acd7f8def420";

test("aceita painel padrão e seleção de módulos",()=>{
  assert.equal(dashboardConfigSchema.safeParse({version:1,visibleModuleIds:null,showTasks:true}).success,true);
  assert.equal(dashboardConfigSchema.safeParse({version:2,visibleModuleIds:[first,second],showTasks:false}).success,true);
  assert.equal(dashboardConfigSchema.safeParse({version:3,visibleModuleIds:[],showTasks:true}).success,true);
});

test("impede IDs inválidos, repetição e configurações extras",()=>{
  assert.equal(dashboardConfigSchema.safeParse({version:1,visibleModuleIds:[first,first],showTasks:true}).success,false);
  assert.equal(dashboardConfigSchema.safeParse({version:1,visibleModuleIds:["outro"],showTasks:true}).success,false);
  assert.equal(dashboardConfigSchema.safeParse({version:0,visibleModuleIds:null,showTasks:true}).success,false);
  assert.equal(dashboardConfigSchema.safeParse({version:1,visibleModuleIds:null,showTasks:true,organizationId:first}).success,false);
});

test("associação visual permite somente UUID ou ausência de vínculo",()=>{
  assert.equal(operationalBrandSiteSchema.safeParse({version:1,siteId:first}).success,true);
  assert.equal(operationalBrandSiteSchema.safeParse({version:1,siteId:null}).success,true);
  assert.equal(operationalBrandSiteSchema.safeParse({version:1,siteId:"outra-ong"}).success,false);
  assert.equal(operationalBrandSiteSchema.safeParse({version:-1,siteId:null}).success,false);
});
