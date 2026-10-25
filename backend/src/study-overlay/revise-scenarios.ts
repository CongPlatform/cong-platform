/** Atualizar textos/rubricas SEM mudar participantes, grupos ou código do roteiro.
 * Uso: cd backend && npx tsx src/study-overlay/revise-scenarios.ts ../data/Roteiros_60_CONG_ATUAL.csv
 * Bloqueia alteração se já existe participante, preservando a integridade do estudo.
 */
import { readFileSync } from 'node:fs';
import pool from '../config/database.js';
import { rows } from './csv-parse.js';
async function main(){
 const file=process.argv[2];if(!file)throw new Error('Informe caminho de Roteiros_60_CONG_ATUAL.csv');
 const scenarios=rows(readFileSync(file,'utf8'));
 if(scenarios.length!==60 || new Set(scenarios.map(s=>s['Roteiro'])).size!==60)throw new Error('É necessário catálogo com 60 roteiros únicos');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(26023,6071)');
  const used=await client.query('SELECT count(*)::int AS n FROM public.study_overlay_participants');
  if(used.rows[0].n!==0)throw new Error('Coleta iniciada. Não sobrescreva cenários usados: faça uma nova versão do protocolo.');
  const total=await client.query('SELECT count(*)::int AS n FROM public.study_overlay_scenarios');
  if(total.rows[0].n!==60)throw new Error('Importe primeiro os 60 roteiros com csv-import.ts');
  for(const row of scenarios){
   const r=await client.query(`UPDATE public.study_overlay_scenarios SET ngo=$2,family=$3,prompt_a=$4,prompt_b=$5,rubric=$6,protocol_version='2026-10-operacional-v2'
      WHERE scenario_code=$1 AND family=$3 RETURNING scenario_code`,[
     row['Roteiro'],row['ONG'],row['Família'],row['Enunciado A'],row['Enunciado B'],row['Rubrica 6 pontos']
   ]);
   if(r.rowCount!==1)throw new Error(`Família ou código divergente para ${row['Roteiro']}`);
  }
  await client.query('COMMIT');console.log('60 cenários atualizados; 60 slots e distribuição preservados.');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
