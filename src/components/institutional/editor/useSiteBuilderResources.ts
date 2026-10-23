import {useCallback,useEffect,useState} from "react";
import {loadSiteBuilderResources,type SiteBuilderFormResource,type SiteBuilderAccessResources} from "../../../features/operational/operationalFormsService";

type Loaded={key:string;forms:SiteBuilderFormResource[];access:SiteBuilderAccessResources|null;error:string};
export function useSiteBuilderResources(siteId?:string){
  const [loaded,setLoaded]=useState<Loaded|null>(null);
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  const key=`${siteId??""}:${revision}`;
  useEffect(()=>{
    if(!siteId)return;
    let active=true;
    void loadSiteBuilderResources(siteId).then(result=>{
      if(active)setLoaded({key,forms:result.forms,access:{published:result.published,systems:result.systems,portal:result.portal},error:""});
    }).catch(()=>{if(active)setLoaded({key,forms:[],access:null,error:"Não foi possível carregar os recursos desta organização."});});
    return()=>{active=false;};
  },[siteId,key]);
  const current=siteId&&loaded?.key===key?loaded:null;
  return {forms:current?.forms??[],access:current?.access??null,loading:Boolean(siteId)&&!current,error:current?.error??"",refresh};
}
