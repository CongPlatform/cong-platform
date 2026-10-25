/** Distribuição adaptativa após o lote pré-definido P001–P060.
 * Nunca usa nota de familiaridade nem informações do participante.
 * Quatro famílias e quatro grupos são nivelados antes de escolher um roteiro.
 */
import { randomInt } from 'node:crypto';

export const FAMILIES = ['F1','F2','F3','F4'] as const;
export const GROUPS = ['G1','G2','G3','G4'] as const;
export type Family = typeof FAMILIES[number];
export type Group = typeof GROUPS[number];
export interface CountCell {family: string; group_code: string; n: number;}
export interface ScenarioUse {scenario_code: string; family: string; uses: number;}
export interface Assignment {family: Family; group: Group; scenarioCode: string;}
export type RandomPick = (maxExclusive: number)=>number;

function selectRandom<T>(items: readonly T[], pick: RandomPick): T {
  if (!items.length) throw new Error('Catálogo insuficiente para distribuir novos participantes');
  const i = pick(items.length);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) throw new Error('Gerador aleatório inválido');
  return items[i]!;
}
export function chooseAdditionalAssignment(cells: CountCell[], scenarios: ScenarioUse[], pick: RandomPick = randomInt): Assignment {
  const familyCount = Object.fromEntries(FAMILIES.map(f=>[f,0])) as Record<Family,number>;
  const groupCount = Object.fromEntries(GROUPS.map(g=>[g,0])) as Record<Group,number>;
  const pairCount = Object.fromEntries(FAMILIES.flatMap(f=>GROUPS.map(g=>[`${f}:${g}`,0]))) as Record<string,number>;
  for (const {family,group_code,n} of cells) {
    if (!FAMILIES.includes(family as Family) || !GROUPS.includes(group_code as Group) || !Number.isInteger(n) || n<0) throw new Error('Contagem de distribuição inválida');
    const f=family as Family,g=group_code as Group;
    familyCount[f]+=n;groupCount[g]+=n;pairCount[`${f}:${g}`]=(pairCount[`${f}:${g}`]??0)+n;
  }
  const minFamily = Math.min(...Object.values(familyCount));
  const minGroup = Math.min(...Object.values(groupCount));
  const possible=FAMILIES.flatMap(f=>GROUPS.map(g=>({f,g})))
    .filter(({f,g})=>familyCount[f]===minFamily && groupCount[g]===minGroup);
  const minPair=Math.min(...possible.map(({f,g})=>pairCount[`${f}:${g}`]!));
  const cell=selectRandom(possible.filter(({f,g})=>pairCount[`${f}:${g}`]===minPair),pick);
  const available=scenarios.filter(s=>s.family===cell.f && /^S\d{3,}$/.test(s.scenario_code) && Number.isInteger(s.uses) && s.uses>=0);
  if(!available.length)throw new Error(`Nenhum roteiro cadastrado para ${cell.f}`);
  const minUse=Math.min(...available.map(s=>s.uses));
  const chosen=selectRandom(available.filter(s=>s.uses===minUse),pick);
  return {family:cell.f,group:cell.g,scenarioCode:chosen.scenario_code};
}
