export const portalIntakeTypes=new Set(["text","long_text","email","number","date","select","boolean"]);

export function portalIntakeCompatible(fields:ReadonlyArray<{type:string}>):boolean{
  return fields.length>0&&fields.every(field=>portalIntakeTypes.has(field.type));
}

export function portalCanAccess(role:"volunteer"|"beneficiary",resource:"tasks"|"requests"):boolean{
  return role==="volunteer"?resource==="tasks":resource==="requests";
}
