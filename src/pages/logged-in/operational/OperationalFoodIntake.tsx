import {useState} from "react";
import {FiCheck,FiMinus,FiPlus,FiShoppingBag} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import {createOperationalFoodIntake,type OperationalModule} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

type FoodName="Arroz"|"Feijão"|"Macarrão"|"Leite"|"Óleo"|"Açúcar"|"Farinha"|"Outros";
type Unit="Unidades"|"Kg"|"Litros"|"Caixas";
const foods:{name:FoodName;symbol:string;unit:Unit;hint:string}[]=[
  {name:"Arroz",symbol:"🍚",unit:"Kg",hint:"Grãos"},{name:"Feijão",symbol:"🫘",unit:"Kg",hint:"Grãos"},
  {name:"Macarrão",symbol:"🍝",unit:"Kg",hint:"Massas"},{name:"Leite",symbol:"🥛",unit:"Litros",hint:"Bebidas"},
  {name:"Óleo",symbol:"🫗",unit:"Litros",hint:"Cozinha"},{name:"Açúcar",symbol:"🍬",unit:"Kg",hint:"Mercearia"},
  {name:"Farinha",symbol:"🌾",unit:"Kg",hint:"Mercearia"},{name:"Outros",symbol:"📦",unit:"Unidades",hint:"Outro alimento"},
];
export default function OperationalFoodIntake({systemId,module,onRecorded}:{systemId:string;module:OperationalModule;onRecorded:()=>void}){
  const [open,setOpen]=useState(false);
  const [amounts,setAmounts]=useState<Partial<Record<FoodName,number>>>({});
  const [units,setUnits]=useState<Partial<Record<FoodName,Unit>>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const selected=foods.filter(food=>(amounts[food.name]??0)>0);
  const compatible=module.blueprintKey==="donations"&&["item","quantidade","unidade","situacao"].every(key=>module.fields.some(field=>field.key===key))&&module.fields.every(field=>!field.required||["item","quantidade","unidade","situacao","data"].includes(field.key))&&module.fields.find(field=>field.key==="situacao")?.options?.includes("Recebida")&&["Kg","Litros","Unidades","Caixas"].every(unit=>module.fields.find(field=>field.key==="unidade")?.options?.includes(unit));
  function adjust(name:FoodName,change:number){setAmounts(state=>({...state,[name]:Math.max(0,Math.min(100000,(state[name]??0)+change))}));setError("");}
  async function receive(){if(busy||selected.length===0)return;setBusy(true);setError("");
    try{await createOperationalFoodIntake(systemId,module.id,selected.map(food=>({item:food.name,quantidade:amounts[food.name]??0,unidade:units[food.name]??food.unit})));setNotice(`${selected.length} tipo(s) de alimento registrado(s).`);setAmounts({});setOpen(false);onRecorded();}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível registrar o recebimento.");}
    finally{setBusy(false);}
  }
  if(!compatible)return null;
  return <><button type="button" className={styles.ghostButton} onClick={()=>{setOpen(true);setNotice("");}}><FiShoppingBag/> Registrar alimentos visualmente</button>{notice&&<span className={styles.inlineSuccess} role="status"><FiCheck/>{notice}</span>}
    <ModalMensagem aberto={open} titulo="Recebimento de alimentos" tamanho="grande" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)setOpen(false);}} mensagem={<div className={styles.foodIntake}><p>Selecione os alimentos recebidos e ajuste a quantidade. Todos os itens serão registrados juntos no módulo de Doações.</p><div className={styles.foodGrid}>{foods.map(food=>{const count=amounts[food.name]??0;return <div key={food.name} className={`${styles.foodCard} ${count>0?styles.foodSelected:""}`}><button type="button" className={styles.foodIllustration} aria-label={`Adicionar ${food.name}`} onClick={()=>adjust(food.name,1)}><span aria-hidden="true">{food.symbol}</span></button><strong>{food.name}</strong><span>{food.hint}</span><div className={styles.foodCounter}><button type="button" aria-label={`Reduzir ${food.name}`} disabled={count===0||busy} onClick={()=>adjust(food.name,-1)}><FiMinus/></button><input type="number" min={0} max={100000} step="any" aria-label={`Quantidade de ${food.name}`} value={count} onChange={e=>setAmounts(state=>({...state,[food.name]:Math.max(0,Math.min(100000,Number(e.target.value)||0))}))}/><button type="button" aria-label={`Aumentar ${food.name}`} disabled={busy} onClick={()=>adjust(food.name,1)}><FiPlus/></button></div><select value={units[food.name]??food.unit} aria-label={`Unidade de ${food.name}`} onChange={e=>setUnits(state=>({...state,[food.name]:e.target.value as Unit}))}><option>Unidades</option><option>Kg</option><option>Litros</option><option>Caixas</option></select></div>;})}</div><div className={styles.foodSummary}><div><strong>{selected.length} tipo(s) selecionado(s)</strong><p>{selected.length?selected.map(food=>`${food.name}: ${amounts[food.name]} ${units[food.name]??food.unit}`).join(" · "):"Clique em um alimento para começar."}</p></div><button type="button" className={styles.primaryButton} disabled={busy||!selected.length} onClick={()=>void receive()}>{busy?"Registrando...":"Confirmar recebimento"}</button></div>{error&&<p role="alert" className={styles.error}>{error}</p>}</div>}/>
  </>;
}
