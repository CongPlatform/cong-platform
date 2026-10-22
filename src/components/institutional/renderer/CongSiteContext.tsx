import {createContext,useContext} from "react";

export interface CongSiteContextValue {
  editable: boolean;
  siteId: string;
  slug: string;
  page: string;
  portalHref: string;
  portalEnabled: boolean;
}

export const CongSiteContext=createContext<CongSiteContextValue|null>(null);
export const useCongSite=()=>useContext(CongSiteContext);
