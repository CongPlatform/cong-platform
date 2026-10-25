import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { rows } from '../backend/src/study-overlay/csv-parse.ts';
import { chooseAdditionalAssignment, FAMILIES, GROUPS } from '../backend/src/study-overlay/allocation.ts';
// Simula 240 entradas adicionais sem acessar dados pessoais nem rede.
const scenarios=FAMILIES.flatMap((f,i)=>Array.from({length:15},(_,j)=>({scenario_code:`S${String(i*15+j+1).padStart(3,'0')}`,family:f,uses:1})));
const cells=FAMILIES.flatMap(f=>GROUPS.map(g=>({family:f,group_code:g,n:0})));
const original=rows(readFileSync(new URL('../data/Sorteio_60_OFICIAL.csv',import.meta.url),'utf8'));
for (const slot of original) cells.find(c=>c.family===slot['Família'] && c.group_code===slot['Grupo']).n++;
assert.equal(cells.reduce((a,x)=>a+x.n,0),60);
const picker=()=>0;
for(let i=1;i<=240;i++) {
 const next=chooseAdditionalAssignment(cells,scenarios,picker);
 const c=cells.find(x=>x.family===next.family && x.group_code===next.group);c.n+=1;
 scenarios.find(x=>x.scenario_code===next.scenarioCode).uses++;
 const fc=FAMILIES.map(f=>cells.filter(x=>x.family===f).reduce((a,x)=>a+x.n,0));
 const gc=GROUPS.map(g=>cells.filter(x=>x.group_code===g).reduce((a,x)=>a+x.n,0));
 assert.ok(Math.max(...fc)-Math.min(...fc)<=1,`Famílias desequilibradas no passo ${i}`);
 assert.ok(Math.max(...gc)-Math.min(...gc)<=1,`Grupos desequilibrados no passo ${i}`);
}
assert.equal(cells.reduce((a,x)=>a+x.n,0),300);
assert.throws(()=>chooseAdditionalAssignment([],[],picker),/Nenhum roteiro/);
console.log('PASSOU: 240 alocações adicionais, grupos/famílias equilibrados, reaproveitamento de roteiros');
