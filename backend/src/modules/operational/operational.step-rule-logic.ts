export interface OperationalStepRule {stepId:string;revision:number;enabled:boolean;priority:"any"|"low"|"normal"|"high";assignment:"unassigned"|"keep";dueDays:number}

export function defaultStepRule(stepId:string):OperationalStepRule{
  return {stepId,revision:0,enabled:false,priority:"any",assignment:"unassigned",dueDays:0};
}

export function ruleAllowsPriority(rule:Pick<OperationalStepRule,"enabled"|"priority">,priority:string):boolean{
  return rule.enabled&&(rule.priority==="any"||rule.priority===priority);
}

export function dueDateFromDays(days:number,at:Date):string|null{
  if(!Number.isInteger(days)||days<0||days>30)return null;
  if(!days)return null;
  const date=new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),at.getUTCDate()+days));
  return date.toISOString().slice(0,10);
}

