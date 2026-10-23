import type {InstitutionalPage,InstitutionalLayoutNode} from "../services/institutionalService";

export function placedOperationalPieces(page:InstitutionalPage){
  const formIds=new Set<string>();let login=false;
  const walk=(node:InstitutionalLayoutNode):void=>{
    if(node.type==="element"){
      if(node.elementType==="cong_form"&&node.value&&typeof node.value==="object"&&"formId" in node.value&&typeof node.value.formId==="string"&&node.value.formId)formIds.add(node.value.formId);
      if(node.elementType==="cong_login")login=true;
    }else if(node.type==="repeat")walk(node.item);
    else if(node.type==="stack"||node.type==="grid"||node.type==="columns")node.children.forEach(walk);
  };
  for(const section of page.sections){
    if(!section.visible)continue;
    const override=section.settings.layoutOverride;
    const layout=override&&typeof override==="object"&&"type" in override?override as InstitutionalLayoutNode:section.layout;
    walk(layout);
  }
  return {formIds:Array.from(formIds),hasLogin:login};
}
