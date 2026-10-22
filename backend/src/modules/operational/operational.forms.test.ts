import test from "node:test";
import assert from "node:assert/strict";
import {parseFormSubmission,formFieldsSchema,type FormField} from "./operational.forms.schema.js";
const fields:FormField[]=[
  {id:"9d4b544e-04f5-4a99-8f1a-a78dd4f9ae66",key:"postal",label:"CEP",kind:"cep",required:true},
  {id:"1f1d8caa-d070-490b-bde2-61c210ed650e",key:"telefone",label:"Telefone",kind:"phone",required:false},
  {id:"30c6efdc-ff53-42ab-8a8d-41bc42e6b6c0",key:"tipo",label:"Tipo de pedido",kind:"select",options:["Atendimento","Inscrição"],required:true},
];
test("CEP e telefone validam e normalizam números",()=>{
  assert.deepEqual(parseFormSubmission(fields,{postal:"13183-000",telefone:"(19) 99123-4567",tipo:"Inscrição"}),{postal:"13183000",telefone:"19991234567",tipo:"Inscrição"});
});
test("Respostas desconhecidas e obrigatoriedade são bloqueadas",()=>{
  assert.throws(()=>parseFormSubmission(fields,{postal:"13183000",tipo:"Inscrição",admin:"true"}));
  assert.throws(()=>parseFormSubmission(fields,{tipo:"Inscrição"}));
});
test("Seleção inválida e CEP incompleto são recusados",()=>{
  assert.throws(()=>parseFormSubmission(fields,{postal:"13183",tipo:"Inscrição"}));
  assert.throws(()=>parseFormSubmission(fields,{postal:"13183000",tipo:"Outro"}));
});
test("CPF e CNPJ exigem dígitos verificadores",()=>{
  const ids:FormField[]=[{...fields[0]!,kind:"cpf",key:"cpf"},{...fields[1]!,kind:"cnpj",key:"cnpj"}];
  assert.deepEqual(parseFormSubmission(ids,{cpf:"529.982.247-25",cnpj:"11.222.333/0001-81"}),{cpf:"52998224725",cnpj:"11222333000181"});
  assert.throws(()=>parseFormSubmission(ids,{cpf:"111.111.111-11",cnpj:"00.000.000/0000-00"}));
});
test("Duplicações de variáveis são rejeitadas",()=>{
  assert.equal(formFieldsSchema.safeParse([fields[0]!,{...fields[1]!,key:"postal"}]).success,false);
});
test("Campos avançados validam limites e novos tipos",()=>{
  const variants:FormField[]=[
    {...fields[0]!,key:"inteiro",kind:"integer",label:"Pessoas",minValue:1,maxValue:10},
    {...fields[1]!,key:"preco",kind:"currency",label:"Valor",required:true},
    {...fields[2]!,key:"percentual",kind:"percentage",label:"Percentual",options:undefined},
  ];
  assert.deepEqual(parseFormSubmission(variants,{inteiro:5,preco:"15.25",percentual:45}),{inteiro:5,preco:15.25,percentual:45});
  assert.throws(()=>parseFormSubmission(variants,{inteiro:1.5,preco:"15.25",percentual:45}));
  assert.throws(()=>parseFormSubmission(variants,{inteiro:5,preco:"15.255",percentual:45}));
  assert.throws(()=>parseFormSubmission(variants,{inteiro:5,preco:"15.25",percentual:101}));
});
test("Campos condicionais não exigem nem salvam valores quando estão ocultos",()=>{
  const base:FormField={...fields[2]!,key:"participa",options:["Sim","Não"],kind:"radio"};
  const child:FormField={...fields[0]!,key:"bairro",kind:"text",label:"Bairro",required:true,showWhen:{fieldKey:"participa",equals:"Sim"}};
  assert.equal(formFieldsSchema.safeParse([base,child]).success,true);
  assert.deepEqual(parseFormSubmission([base,child],{participa:"Não",bairro:"Segredo"}),{participa:"Não",bairro:null});
  assert.throws(()=>parseFormSubmission([base,child],{participa:"Sim"}));
  assert.equal(formFieldsSchema.safeParse([child,base]).success,false);
});
test("URL, horário e máscara de dígitos possuem validação no servidor",()=>{
  const extra:FormField[]=[
    {...fields[0]!,key:"website",kind:"url",label:"Site"},
    {...fields[1]!,key:"hora",kind:"time",label:"Horário",required:true},
    {...fields[2]!,key:"codigo",kind:"text",label:"Código",options:undefined,mask:"digits",required:true},
  ];
  assert.deepEqual(parseFormSubmission(extra,{website:"https://ong.org.br",hora:"14:20",codigo:"123"}),{website:"https://ong.org.br",hora:"14:20",codigo:"123"});
  assert.throws(()=>parseFormSubmission(extra,{website:"javascript:alert(1)",hora:"14:20",codigo:"123"}));
  assert.throws(()=>parseFormSubmission(extra,{website:"https://ong.org.br",hora:"25:00",codigo:"123"}));
  assert.throws(()=>parseFormSubmission(extra,{website:"https://ong.org.br",hora:"14:20",codigo:"12A"}));
});
