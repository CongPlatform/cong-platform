import {AppError} from "../../utils/app-error.js";

const recently=new Map<string,number>();
type GeocodingResult={lat:number;lon:number;label:string};

function providerUrl(){
  const key=process.env.GEOAPIFY_API_KEY?.trim();
  if(key){
    const url=new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("apiKey",key);
    url.searchParams.set("format","json");
    url.searchParams.set("lang","pt");
    url.searchParams.set("limit","5");
    url.searchParams.set("bias","countrycode:br");
    return {url,kind:"geoapify" as const};
  }
  const configured=process.env.GEOCODING_SEARCH_URL?.trim();
  if(!configured)throw new AppError("A busca de endereços precisa de uma chave GEOAPIFY_API_KEY no servidor.",503,"GEOCODING_UNAVAILABLE");
  let url:URL;
  try{url=new URL(configured);}catch{throw new AppError("Serviço de localização indisponível.",503,"GEOCODING_UNAVAILABLE");}
  if(url.protocol!=="https:"||url.username||url.password)throw new AppError("O serviço de localização deve utilizar HTTPS sem credenciais na URL.",503,"GEOCODING_INSECURE_PROVIDER");
  if(url.hostname.toLowerCase()==="nominatim.openstreetmap.org")throw new AppError("Configure um provedor próprio ou contratado para o construtor.",503,"GEOCODING_PUBLIC_PROVIDER_UNSUPPORTED");
  return {url,kind:"legacy" as const};
}

function parseResults(data:unknown):GeocodingResult[]{
  const candidates=Array.isArray(data)?data:typeof data==="object"&&data!==null&&"results" in data?(data as {results:unknown}).results:null;
  if(!Array.isArray(candidates))return [];
  return candidates.slice(0,5).flatMap((item:unknown)=>{
    if(typeof item!=="object"||item===null)return [];
    const candidate=item as Record<string,unknown>;
    const lat=Number(candidate.lat),lon=Number(candidate.lon);
    const label=typeof candidate.formatted==="string"?candidate.formatted:typeof candidate.display_name==="string"?candidate.display_name:"";
    return label&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[{lat,lon,label:label.slice(0,280)}]:[];
  });
}

export async function searchAddress(org:string,address:string):Promise<GeocodingResult[]>{
  if(address.trim().length<8||address.length>300)throw new AppError("Digite um endereço com rua, número e cidade.",400,"GEOCODING_ADDRESS_INVALID");
  const {url,kind}=providerUrl();
  const last=recently.get(org)??0;
  if(Date.now()-last<2000)throw new AppError("Aguarde um instante antes de consultar outro endereço.",429,"GEOCODING_THROTTLED");
  recently.set(org,Date.now());
  if(kind==="geoapify")url.searchParams.set("text",address.trim());
  else{
    url.searchParams.set("q",address.trim());
    url.searchParams.set("format","jsonv2");
    url.searchParams.set("limit","5");
    url.searchParams.set("addressdetails","0");
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch(url,{signal:controller.signal,redirect:"error",headers:{Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"CONG-Platform/1.0"}});
    if(response.status===401||response.status===403)throw new AppError("A chave do serviço de endereços foi recusada. Verifique GEOAPIFY_API_KEY.",503,"GEOCODING_AUTH_FAILED");
    if(response.status===429)throw new AppError("O serviço de endereços atingiu o limite de consultas. Tente novamente mais tarde.",429,"GEOCODING_PROVIDER_THROTTLED");
    if(!response.ok)throw new Error("Geocoding provider failed");
    const length=Number(response.headers.get("content-length")??0);
    if(length>500000)throw new Error("Unexpected geocoding response size");
    const input:unknown=await response.json();
    return parseResults(input);
  }catch(error){
    if(error instanceof AppError)throw error;
    throw new AppError("Não foi possível consultar endereços. Confira o serviço ou informe o ponto no mapa.",503,"GEOCODING_PROVIDER_ERROR");
  }finally{clearTimeout(timeout);}
}
