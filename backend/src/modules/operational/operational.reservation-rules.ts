export function validateReservationRange(start:string,end:string){
 const begin=Date.parse(start),finish=Date.parse(end);
 if(!Number.isFinite(begin)||!Number.isFinite(finish)||finish<=begin||finish-begin>14*86400000)return false;
 return true;
}
export function reservationOverlaps(startA:number,endA:number,startB:number,endB:number){
 return startA<endB&&endA>startB;
}
