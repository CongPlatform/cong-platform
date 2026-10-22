import test from "node:test";
import assert from "node:assert/strict";
import {allocateByRoadMatrix,proposeRoadDeliveries} from "./operational.road-routing.js";

const members=[{userId:"u1",name:"Ana",lat:-23.5,lon:-46.6,capacity:2},{userId:"u2",name:"João",lat:-23.52,lon:-46.62,capacity:1}];
const demands=[{id:"a",label:"Entrega A",address:"Rua A",lat:-23.51,lon:-46.61},{id:"b",label:"Entrega B",address:"Rua B",lat:-23.53,lon:-46.63},{id:"c",label:"Entrega C",address:"Rua C",lat:-23.54,lon:-46.64}];
const durations=[
  [0,100,50,120,500],
  [100,0,120,15,20],
  [50,120,0,50,400],
  [120,15,50,0,10],
  [500,20,400,10,0],
];
const distances=durations.map(row=>row.map(value=>value*10));

test("planning over streets assigns only within each volunteer's capacity",()=>{
  const plan=allocateByRoadMatrix(demands,members,{durations,distances});
  assert.equal(plan.routingMode,"road");
  assert.equal(plan.routes.length,2);
  assert.equal(plan.routes.reduce((sum,route)=>sum+route.stops.length,0),3);
  assert.equal(plan.unassigned.length,0);
  assert.ok(plan.routes.every(route=>route.stops.length<=route.capacity));
  assert.ok((plan.roadMinutes??0)>0);
});

test("disconnected road points remain unassigned",()=>{
  const blocked=durations.map(row=>[...row]);
  const dist=distances.map(row=>[...row]);
  for(let i=0;i<5;i++){
    if(i!==4){blocked[4]![i]=null as unknown as number;blocked[i]![4]=null as unknown as number;dist[4]![i]=null as unknown as number;dist[i]![4]=null as unknown as number;}
  }
  const plan=allocateByRoadMatrix(demands,members,{durations:blocked,distances:dist});
  assert.deepEqual(plan.unassigned.map(item=>item.id),["c"]);
});

test("without a route provider the proposal is explicitly approximate",async()=>{
  const prev=process.env.OSRM_ROUTING_BASE_URL;
  delete process.env.OSRM_ROUTING_BASE_URL;
  try{
    const plan=await proposeRoadDeliveries(demands,members);
    assert.equal(plan.routingMode,"estimate");
    assert.equal(plan.roadMinutes,null);
    assert.match(plan.routingNotice,/desativado/);
  }finally{if(prev!==undefined)process.env.OSRM_ROUTING_BASE_URL=prev;}
});


test("without a configured provider a permitted road route is still labeled as approximate",async()=>{
  const prev=process.env.OSRM_ROUTING_BASE_URL;
  delete process.env.OSRM_ROUTING_BASE_URL;
  try{
    const plan=await proposeRoadDeliveries(demands,members,true);
    assert.equal(plan.routingMode,"estimate");
    assert.match(plan.routingNotice,/linha reta/);
  }finally{if(prev!==undefined)process.env.OSRM_ROUTING_BASE_URL=prev;}
});

test("road provider is contacted only with explicit permission",async()=>{
  const originalUrl=process.env.OSRM_ROUTING_BASE_URL;
  const originalFetch=globalThis.fetch;
  process.env.OSRM_ROUTING_BASE_URL="https://example-routing.invalid";
  let calls=0;
  globalThis.fetch=(async(input)=>{
    calls++;
    assert.match(String(input),/\/table\/v1\/driving\//);
    return {ok:true,headers:new Headers(),json:async()=>({code:"Ok",durations,distances})} as Response;
  }) as typeof fetch;
  try{
    const estimate=await proposeRoadDeliveries(demands,members,false);
    assert.equal(estimate.routingMode,"estimate");
    assert.equal(calls,0);
    const road=await proposeRoadDeliveries(demands,members,true);
    assert.equal(calls,1);
    assert.equal(road.routingMode,"road");
    assert.ok((road.roadMinutes??0)>0);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalUrl===undefined)delete process.env.OSRM_ROUTING_BASE_URL;
    else process.env.OSRM_ROUTING_BASE_URL=originalUrl;
  }
});
