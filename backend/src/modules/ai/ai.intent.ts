/** Intercepta apenas manifestacoes inequivocas que NAO pedem uma nova proposta. */
import {fold} from './ai.coverage.js';
import type { AiPlan } from './ai.coverage.js';
export type LocalResponse='decline'|'explain'|null;
export function intentWithoutGeneration(input:string):LocalResponse{
 const s=fold(input).trim().replace(/[.!?;,]+$/g,'').trim();
 if(/^(nao|nao obrigado|nao obrigada|nao precisa|nada|por enquanto nao|deixa assim|esta bom assim|ta bom assim|pode deixar|sem alteracoes|sem mudancas)$/.test(s))return 'decline';
 if(/^(nao entendi|nao consegui entender|explique melhor|explica melhor|resuma|resumir|mostre de forma simples|mostra de forma simples)$/.test(s)|| /^(mal da pra entender|mal da para entender|nao da pra entender|nao da para entender)(?!.*(mude|altere|adicione|inclua|arrume))/i.test(s))return 'explain';
 return null;
}
export function explainProposal(plan:unknown):string{
 const p=plan && typeof plan==='object' ? plan as Partial<AiPlan> : undefined;
 const mods=Array.isArray(p?.system?.modules)?p.system.modules.map(m=>m.name).filter(Boolean).slice(0,10):[];
 const pages=Array.isArray(p?.site?.pages)?p.site.pages.map(page=>page.title).filter(Boolean).slice(0,8):[];
 const forms=Array.isArray(p?.connection?.public_forms)?p.connection.public_forms.map(f=>f.name).filter(Boolean).slice(0,6):[];
 return `Claro! Esta é uma sugestão para revisar, não um sistema já criado.\n`+
  (mods.length?`No sistema interno: ${mods.join(', ')}.\n`:'')+
  (pages.length?`No site: ${pages.join(', ')}.\n`:'')+
  (forms.length?`Formulários públicos propostos: ${forms.join(', ')}.\n`:'Se você pediu formulários conectados, essa ligação ainda precisa ser conferida.\n')+
  `Nada foi publicado ou instalado. Você pode pedir para explicar um módulo ou corrigir algo, sem começar de novo.`;
}
