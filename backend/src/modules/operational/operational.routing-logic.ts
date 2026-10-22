export type Point = {lat:number;lon:number};
export type Delivery = Point & {id:string;label:string;address:string};
export type AvailableMember = Point & {userId:string;name:string;capacity:number};
export type RouteStop = Delivery & {position:number};
export type RouteProposal = {userId:string;name:string;stops:RouteStop[];approxKm:number;capacity:number};
export type Allocation = {routes:RouteProposal[];unassigned:Delivery[];approxKm:number};
export const haversineKm=(a:Point,b:Point):number=>{
  const r=6371.009,toRad=Math.PI/180;
  const deltaLat=(b.lat-a.lat)*toRad,deltaLon=(b.lon-a.lon)*toRad;
  const h=Math.sin(deltaLat/2)**2+Math.cos(a.lat*toRad)*Math.cos(b.lat*toRad)*Math.sin(deltaLon/2)**2;
  return r*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
};
const pathLength=(start:Point,points:Point[])=>points.reduce((sum,point,i)=>sum+haversineKm(i===0?start:points[i-1]!,point),0);
export const orderStops=(start:Point,stops:Delivery[]):Delivery[]=>{
  const remaining=[...stops].sort((a,b)=>a.id.localeCompare(b.id));
  const ordered:Delivery[]=[];
  let cursor=start;
  while(remaining.length){
    remaining.sort((a,b)=>haversineKm(cursor,a)-haversineKm(cursor,b)||a.id.localeCompare(b.id));
    const next=remaining.shift()!;ordered.push(next);cursor=next;
  }
  if(ordered.length>2){
    let improved=true,attempts=0;
    while(improved&&attempts++<20){
      improved=false;
      for(let i=0;i<ordered.length-1;i++)for(let j=i+1;j<ordered.length;j++){
        const candidate=[...ordered.slice(0,i),...ordered.slice(i,j+1).reverse(),...ordered.slice(j+1)];
        if(pathLength(start,candidate)<pathLength(start,ordered)-0.000001){ordered.splice(0,ordered.length,...candidate);improved=true;}
      }
    }
  }
  return ordered;
};
export const allocateDeliveries=(demands:Delivery[],members:AvailableMember[]):Allocation=>{
  const routes=members.filter(m=>m.capacity>0).sort((a,b)=>a.userId.localeCompare(b.userId)).map(member=>({...member,stops:[] as RouteStop[],approxKm:0}));
  const unassigned:Delivery[]=[];
  const sorted=[...demands].sort((a,b)=>a.id.localeCompare(b.id));
  for(const demand of sorted){
    let best:{idx:number;score:number}|null=null;
    for(let i=0;i<routes.length;i++){
      const route=routes[i]!;
      if(route.stops.length>=route.capacity)continue;
      const start=route.stops.length?route.stops[route.stops.length-1]!:route;
      const score=haversineKm(start,demand)+route.stops.length*0.2;
      if(!best||score<best.score-0.000001||(Math.abs(score-best.score)<0.000001&&route.userId<routes[best.idx]!.userId))best={idx:i,score};
    }
    if(best)routes[best.idx]!.stops.push({...demand,position:0});
    else unassigned.push(demand);
  }
  const proposals=routes.map(route=>{
    const ordered=orderStops(route,route.stops);
    return {userId:route.userId,name:route.name,capacity:route.capacity,approxKm:Math.round(pathLength(route,ordered)*10)/10,stops:ordered.map((s,i)=>({...s,position:i+1}))};
  });
  return {routes:proposals,unassigned,approxKm:Math.round(proposals.reduce((s,r)=>s+r.approxKm,0)*10)/10};
};
