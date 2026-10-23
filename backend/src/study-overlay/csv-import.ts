/** Importador da planilha oficial. Execute antes da coleta: cd backend && npx tsx src/study-overlay/csv-import.ts <Roteiros_60.csv> <Sorteio_60.csv> */
import { readFileSync } from "node:fs";
import pool from "../config/database.js";
import { rows } from "./csv-parse.js";


async function main(){
  const [scenarioFile,slotFile]=process.argv.slice(2);
  if(!scenarioFile || !slotFile)throw new Error("Informe os dois CSVs exportados da planilha OFICIAL: Roteiros_60 e Sorteio_60");
  const scenarios=rows(readFileSync(scenarioFile,"utf8"));
  const slots=rows(readFileSync(slotFile,"utf8"));
  if(scenarios.length!==60 || slots.length!==60)throw new Error(`Esperados 60 roteiros e 60 posições: recebidos ${scenarios.length} e ${slots.length}`);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const used=await client.query("SELECT COUNT(*)::int AS n FROM public.study_overlay_participants");
    if(used.rows[0].n!==0)throw new Error("Importação bloqueada: coleta já iniciada. Não substituir protocolo usado.");
    await client.query("DELETE FROM public.study_overlay_slots");
    await client.query("DELETE FROM public.study_overlay_scenarios");
    for(const s of scenarios){
      await client.query("INSERT INTO public.study_overlay_scenarios(scenario_code,ngo,family,prompt_a,prompt_b,rubric,protocol_version) VALUES ($1,$2,$3,$4,$5,$6,$7)",[
        s['Roteiro'],s['ONG'],s['Família'],s['Enunciado A'],s['Enunciado B'],s['Rubrica 6 pontos'],'2026-10-operacional-v2'
      ]);
    }
    for(let i=0;i<slots.length;i++){
      const s=slots[i]; if(!s)throw new Error("Posição inválida");
      const group=s['Grupo']; const expectedByGroup:Record<string,string[]>={G1:['A','Sem IA','B','Com IA'],G2:['A','Com IA','B','Sem IA'],G3:['B','Sem IA','A','Com IA'],G4:['B','Com IA','A','Sem IA']}; const expected=expectedByGroup[group??''];
      if(!expected || [s['1ª versão'],s['1ª condição'],s['2ª versão'],s['2ª condição']].some((v,j)=>v!==expected[j]))throw new Error(`Sequência inválida em ${s['Código atribuído']}`);
      const family=scenarios.find(x=>x['Roteiro']===s['Roteiro'])?.['Família'];
      if(family!==s['Família'])throw new Error(`Família diferente em ${s['Roteiro']}`);
      await client.query("INSERT INTO public.study_overlay_slots(participant_code,scenario_code,cohort,family,group_code,order_number) VALUES ($1,$2,$3,$4,$5,$6)",[
        s['Código atribuído'],s['Roteiro'],s['Amostra'],s['Família'],group,i+1
      ]);
    }
    await client.query("COMMIT"); console.log("Importação concluída: 60 cenários, 60 posições, sem alterações na CONG operacional.");
  }catch(e){await client.query("ROLLBACK"); throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
