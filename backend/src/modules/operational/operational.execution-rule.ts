export interface ExecutionStep {id:string;title:string;moduleId:string|null}

export function nextExecutionStep(steps:unknown,currentId:string):ExecutionStep|null{
  if(!Array.isArray(steps))return null;
  const index=steps.findIndex(item=>item&&typeof item==="object"&&item.id===currentId);
  if(index<0||index>=steps.length-1)return null;
  const next=steps[index+1];
  if(!next||typeof next!=="object"||typeof next.id!=="string"||typeof next.title!=="string")return null;
  const title=next.title.trim();
  if(title.length<2||title.length>100)return null;
  return {id:next.id,title,moduleId:typeof next.moduleId==="string"?next.moduleId:null};
}
