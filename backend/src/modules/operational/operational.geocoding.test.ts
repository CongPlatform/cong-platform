import assert from "node:assert/strict";
import test from "node:test";
import {searchAddress} from "./operational.geocoding.js";

const originalFetch=globalThis.fetch;
const originalKey=process.env.GEOAPIFY_API_KEY;
const originalLegacy=process.env.GEOCODING_SEARCH_URL;

function restore(){
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.GEOAPIFY_API_KEY;
  else process.env.GEOAPIFY_API_KEY=originalKey;
  if(originalLegacy===undefined)delete process.env.GEOCODING_SEARCH_URL;
  else process.env.GEOCODING_SEARCH_URL=originalLegacy;
}

test("Geoapify recebe endereço no servidor e retorna coordenadas normalizadas",async()=>{
  try{
    process.env.GEOAPIFY_API_KEY="test-key";
    delete process.env.GEOCODING_SEARCH_URL;
    globalThis.fetch=async(input)=>{
      const url=new URL(String(input));
      assert.equal(url.hostname,"api.geoapify.com");
      assert.equal(url.searchParams.get("text"),"Rua da Consolação, 100, São Paulo");
      assert.equal(url.searchParams.get("apiKey"),"test-key");
      return Response.json({results:[{lat:-23.55,lon:-46.66,formatted:"Rua da Consolação, São Paulo, SP"}]});
    };
    assert.deepEqual(await searchAddress("test-geoapify","Rua da Consolação, 100, São Paulo"),[{lat:-23.55,lon:-46.66,label:"Rua da Consolação, São Paulo, SP"}]);
  }finally{restore();}
});

test("sem provedor configurado avisa o administrador sem chamar a rede",async()=>{
  try{
    delete process.env.GEOAPIFY_API_KEY;
    delete process.env.GEOCODING_SEARCH_URL;
    globalThis.fetch=async()=>{throw new Error("network should not be reached");};
    await assert.rejects(()=>searchAddress("test-no-provider","Rua da Consolação, 100, São Paulo"),{code:"GEOCODING_UNAVAILABLE"});
  }finally{restore();}
});

test("chave inválida gera erro específico",async()=>{
  try{
    process.env.GEOAPIFY_API_KEY="wrong-key";
    globalThis.fetch=async()=>new Response("Unauthorized",{status:401});
    await assert.rejects(()=>searchAddress("test-wrong-key","Rua da Consolação, 100, São Paulo"),{code:"GEOCODING_AUTH_FAILED"});
  }finally{restore();}
});

test("mantém suporte ao provedor HTTPS anterior",async()=>{
  try{
    delete process.env.GEOAPIFY_API_KEY;
    process.env.GEOCODING_SEARCH_URL="https://geocoder.example.org/search";
    globalThis.fetch=async(input)=>{
      const url=new URL(String(input));
      assert.equal(url.searchParams.get("q"),"Av. Paulista, 1000, São Paulo");
      return Response.json([{lat:"-23.56",lon:"-46.65",display_name:"Av. Paulista, São Paulo"}]);
    };
    assert.deepEqual(await searchAddress("test-legacy","Av. Paulista, 1000, São Paulo"),[{lat:-23.56,lon:-46.65,label:"Av. Paulista, São Paulo"}]);
  }finally{restore();}
});
