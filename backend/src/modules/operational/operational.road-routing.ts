import {allocateDeliveries,type AvailableMember,type Delivery,type Allocation,type Point,type RouteStop} from "./operational.routing-logic.js";

type Matrix={durations:(number|null)[][];distances:(number|null)[][]};
export type DeliveryProposal=Allocation&{routingMode:"road"|"estimate";roadMinutes:number|null;routingNotice:string};

export function allocateByRoadMatrix(demands:Delivery[],members:AvailableMember[],matrix:Matrix):DeliveryProposal{
  const people=[...members].filter(m=>m.capacity>0).sort((a,b)=>a.userId.localeCompare(b.userId));
  const orders=[...demands].sort((a,b)=>a.id.localeCompare(b.id));
  const expected=people.length+orders.length;
  if(matrix.durations.length!==expected||matrix.distances.length!==expected||matrix.durations.some(row=>row.length!==expected)||matrix.distances.some(row=>row.length!==expected))throw new Error("Invalid road matrix dimensions");
  const valid=(from:number,to:number)=>{
    const seconds=matrix.durations[from]?.[to];
    const meters=matrix.distances[from]?.[to];
    return typeof seconds==="number"&&Number.isFinite(seconds)&&seconds>=0&&typeof meters==="number"&&Number.isFinite(meters)&&meters>=0;
  };
  const work=people.map((member,i)=>({member,index:i,stops:[] as number[]}));
  const unassigned:Delivery[]=[];
  for(const demand of orders){
    const to=people.length+orders.indexOf(demand);
    let choice:{route:number;at:number;score:number}|null=null;
    for(const [ri,route] of work.entries()){
      if(route.stops.length>=route.member.capacity)continue;
      for(let at=0;at<=route.stops.length;at++){
        const prev=at===0?route.index:route.stops[at-1]!;
        const next=at===route.stops.length?null:route.stops[at]!;
        if(!valid(prev,to)||(next!==null&&!valid(to,next)))continue;
        const removed=next===null?0:valid(prev,next)?matrix.durations[prev]![next]!:0;
        const seconds=matrix.durations[prev]![to]!+(next===null?0:matrix.durations[to]![next]!)-removed;
        const score=seconds+route.stops.length*60;
        if(!choice||score<choice.score-0.001||(Math.abs(score-choice.score)<0.001&&(ri<choice.route||(ri===choice.route&&at<choice.at))))choice={route:ri,at,score};
      }
    }
    if(choice)work[choice.route]!.stops.splice(choice.at,0,to);
    else unassigned.push(demand);
  }
  let roadSeconds=0;
  const routes=work.map(route=>{
    let prev=route.index,meters=0;
    const stops:RouteStop[]=route.stops.map((index,i)=>{
      roadSeconds+=matrix.durations[prev]![index]!;
      meters+=matrix.distances[prev]![index]!;
      prev=index;
      return {...orders[index-people.length]!,position:i+1};
    });
    return {userId:route.member.userId,name:route.member.name,capacity:route.member.capacity,approxKm:Math.round(meters/100)/10,stops};
  });
  return {routes,unassigned,approxKm:Math.round(routes.reduce((sum,r)=>sum+r.approxKm,0)*10)/10,routingMode:"road",roadMinutes:Math.round(roadSeconds/60),routingNotice:"Estimativas por vias calculadas com OSRM; não incluem trânsito em tempo real, paradas ou janelas de horário."};
}

const configuredProvider=()=>{
  const raw=process.env.OSRM_ROUTING_BASE_URL?.trim();
  if(!raw)return null;
  const parsed=new URL(raw);
  const local=parsed.hostname==="localhost"||parsed.hostname==="127.0.0.1";
  if((parsed.protocol!=="https:"&&!(local&&parsed.protocol==="http:"))||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error("Invalid OSRM_ROUTING_BASE_URL");
  return parsed.toString().replace(/\/$/,"");
};

async function requestMatrix(points:Point[]):Promise<Matrix>{
  const provider=configuredProvider();
  if(!provider)throw new Error("Routing provider not configured");
  const coords=points.map(p=>`${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  const response=await fetch(`${provider}/table/v1/driving/${coords}?annotations=duration,distance`,{signal:AbortSignal.timeout(6000),headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error(`OSRM HTTP ${response.status}`);
  const size=Number(response.headers.get("content-length")??0);
  if(size>1000000)throw new Error("Road matrix too large");
  const body=await response.json() as {code?:string;durations?:unknown;distances?:unknown};
  if(body.code!=="Ok"||!Array.isArray(body.durations)||!Array.isArray(body.distances))throw new Error("Invalid OSRM table");
  const rows=[body.durations,body.distances];
  for(const table of rows){
    if(table.length!==points.length||table.some(row=>!Array.isArray(row)||row.length!==points.length||row.some(value=>value!==null&&(typeof value!=="number"||!Number.isFinite(value)||value<0))))throw new Error("Invalid OSRM matrix entries");
  }
  return {durations:body.durations as Matrix["durations"],distances:body.distances as Matrix["distances"]};
}

export async function proposeRoadDeliveries(demands:Delivery[],members:AvailableMember[],allowExternal=false):Promise<DeliveryProposal>{
  const fallback=(reason:string):DeliveryProposal=>({...allocateDeliveries(demands,members),routingMode:"estimate",roadMinutes:null,routingNotice:reason});
  if(!allowExternal)return fallback("Cálculo por vias desativado. Ative-o se a ONG autorizar o envio de coordenadas a um serviço externo.");
  if(!process.env.OSRM_ROUTING_BASE_URL?.trim())return fallback("Roteamento por vias não configurado. A distribuição utiliza distância em linha reta.");
  const available=members.filter(m=>m.capacity>0).sort((a,b)=>a.userId.localeCompare(b.userId));
  const pending=[...demands].sort((a,b)=>a.id.localeCompare(b.id));
  if(!available.length||!pending.length)return fallback("Cadastre destinos e integrantes disponíveis para calcular a distribuição.");
  if(available.length+pending.length>40)return fallback("Há mais de 40 pontos; esta proposta usa proximidade geográfica. Divida a operação em lotes para calcular rotas viárias.");
  try{return allocateByRoadMatrix(pending,available,await requestMatrix([...available,...pending]));}
  catch{return fallback("Serviço de rotas indisponível ou com dados incompletos. Proposta aproximada por linha reta; tente atualizar antes de confirmar.");}
}
