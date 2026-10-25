import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { rows } from '../backend/src/study-overlay/csv-parse.ts';
const read=(name)=>rows(readFileSync(new URL(`../data/${name}`,import.meta.url),'utf8'));
const scripts=read('Roteiros_60_CONG_ATUAL.csv'), slots=read('Sorteio_60_OFICIAL.csv');
assert.equal(scripts.length,60);assert.equal(slots.length,60);
const scenarioMap=new Map(scripts.map(x=>[x.Roteiro,x]));
assert.equal(scenarioMap.size,60);
assert.equal(new Set(slots.map(x=>x['Código atribuído'])).size,60);
assert.equal(new Set(slots.map(x=>x['Roteiro'])).size,60);
const groupDef={G1:['A','Sem IA','B','Com IA'],G2:['A','Com IA','B','Sem IA'],G3:['B','Sem IA','A','Com IA'],G4:['B','Com IA','A','Sem IA']};
for(let i=0;i<slots.length;i++){
 const s=slots[i],t=scenarioMap.get(s.Roteiro);
 assert.ok(t);assert.equal(s['Código atribuído'],`P${String(i+1).padStart(3,'0')}`);
 assert.equal(s['Família'],t['Família']);assert.equal(s.ONG,t.ONG);
 assert.deepEqual([s['1ª versão'],s['1ª condição'],s['2ª versão'],s['2ª condição']],groupDef[s['Grupo']]);
 assert.equal(s['Amostra'],i<40?'Principal':'Reserva');
}
for (const x of scripts){
 assert.ok(x['Enunciado A'].length>120);
 assert.ok(x['Enunciado B'].length>120);
 assert.notEqual(x['Enunciado A'],x['Enunciado B']);
 assert.equal(x['Rubrica 6 pontos'].split(' / ').length,6);
}
for(const take of [slots.slice(0,40),slots.slice(40)]){
 for(const g of Object.keys(groupDef)) assert.equal(take.filter(x=>x.Grupo===g).length,take.length/4);
 for(const f of ['F1','F2','F3','F4']) assert.equal(take.filter(x=>x['Família']===f).length,take.length/4);
}
console.log('PASSOU: 60 pares A/B; sequência original P001-P060; grupos/famílias 40+20 equilibrados; seis critérios/roteiro');
