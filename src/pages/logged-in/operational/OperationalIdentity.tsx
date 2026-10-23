import {useEffect,useState} from "react";
import {FiBox,FiCheckCircle,FiLink2} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import SiteSystemConnectionPanel from "../../../components/institutional/editor/SiteSystemConnectionPanel";
import {getInstitutionalSite,type InstitutionalSite} from "../../../services/institutionalService";
import type {OperationalSystem} from "../../../features/operational/operationalService";
import OperationalPortalSettings from "./OperationalPortalSettings";
import styles from "./OperationalSiteLink.module.css";

interface Props {system:OperationalSystem;onSystem:(system:OperationalSystem)=>void}

export default function OperationalIdentity({system,onSystem}:Props){
  const [site,setSite]=useState<InstitutionalSite|null>(null);
  const [opened,setOpened]=useState(false);
  useEffect(()=>{
    if(!system.brandSiteId)return;
    let active=true;
    void getInstitutionalSite(system.brandSiteId).then(item=>{if(active)setSite(item);}).catch(()=>{if(active)setSite(null);});
    return()=>{active=false;};
  },[system.brandSiteId]);
  const linkedSite=site?.id===system.brandSiteId?site:null;
  const logoVariant=linkedSite?.brand.designSystem?.headerLogoVariant;
  const image=logoVariant&&logoVariant!=="primary"?linkedSite?.brand.logoVariantAssets?.[logoVariant]??linkedSite?.brand.logoAsset:linkedSite?.brand.logoAsset;
  return <>
    <div className={styles.identity}>
      <span className={styles.logo} aria-hidden="true">{image?.url?<img src={image.url} alt=""/>:<FiBox/>}</span>
      <div className={styles.name}><h1>{system.name}</h1>{system.brandSiteId&&<small title={linkedSite?.name??"Site conectado"}><FiCheckCircle/> {linkedSite?.name??"Site conectado"}</small>}</div>
      <div className={styles.actions}>
        <button type="button" className={system.brandSiteId?styles.linkedButton:styles.connectButton} onClick={()=>setOpened(true)} aria-label="Abrir conexões entre site e sistema" title="Visualizar e editar conexões do sistema"><FiLink2/><span>{system.brandSiteId?"Conexões · site conectado":"Conexões · ligar site"}</span></button>
        {system.brandSiteId&&<OperationalPortalSettings system={system}/>}
      </div>
    </div>
    <ModalMensagem aberto={opened} titulo="Conexões do sistema" tamanho="grande" mostrarBotaoOk={false} onFechar={()=>setOpened(false)} mensagem={<SiteSystemConnectionPanel system={system} onSystem={onSystem}/>}/>
  </>;
}
