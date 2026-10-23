import {z} from "zod";

const numericKinds=new Set(["number","integer","currency","percentage"]);
const choiceKinds=new Set(["select","radio"]);
const textKinds=new Set(["text","textarea"]);

export const formFieldSchema=z.object({
  id:z.string().uuid(),
  key:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label:z.string().trim().min(2).max(80),
  kind:z.enum(["text","textarea","email","phone","whatsapp","cep","cpf","cnpj","rg","number","integer","currency","percentage","date","time","url","select","radio"]),
  required:z.boolean(),
  options:z.array(z.string().trim().min(1).max(70)).max(25).optional(),
  placeholder:z.string().trim().max(100).optional(),
  helpText:z.string().trim().max(180).optional(),
  mask:z.enum(["none","digits","letters","alphanumeric"]).optional(),
  minLength:z.number().int().min(0).max(1000).optional(),
  maxLength:z.number().int().min(1).max(1000).optional(),
  minValue:z.number().finite().min(-1e12).max(1e12).optional(),
  maxValue:z.number().finite().min(-1e12).max(1e12).optional(),
  showWhen:z.object({fieldKey:z.string(),equals:z.string().min(1).max(70)}).strict().optional(),
}).strict().superRefine((field,ctx)=>{
  if(choiceKinds.has(field.kind)&&(!field.options?.length||new Set(field.options).size!==field.options.length))ctx.addIssue({code:"custom",path:["options"],message:"Informe opções diferentes para a seleção."});
  if(!choiceKinds.has(field.kind)&&field.options?.length)ctx.addIssue({code:"custom",path:["options"],message:"Este campo não utiliza opções."});
  if(field.mask&&field.mask!=="none"&&field.kind!=="text")ctx.addIssue({code:"custom",path:["mask"],message:"Máscara personalizada disponível para texto curto."});
  if((field.minLength!==undefined||field.maxLength!==undefined)&&!textKinds.has(field.kind))ctx.addIssue({code:"custom",path:["minLength"],message:"Limites de caracteres disponíveis para campos de texto."});
  if(field.kind==="text"&&(field.maxLength??250)>250)ctx.addIssue({code:"custom",path:["maxLength"],message:"Texto curto aceita até 250 caracteres."});
  if(field.minLength!==undefined&&field.maxLength!==undefined&&field.minLength>field.maxLength)ctx.addIssue({code:"custom",path:["maxLength"],message:"O máximo precisa ser maior ou igual ao mínimo."});
  if((field.minValue!==undefined||field.maxValue!==undefined)&&!numericKinds.has(field.kind))ctx.addIssue({code:"custom",path:["minValue"],message:"Limites numéricos disponíveis para números."});
  if(field.minValue!==undefined&&field.maxValue!==undefined&&field.minValue>field.maxValue)ctx.addIssue({code:"custom",path:["maxValue"],message:"O máximo precisa ser maior ou igual ao mínimo."});
});
export const formFieldsSchema=z.array(formFieldSchema).min(1).max(24).superRefine((fields,ctx)=>{
  const keys=new Set<string>();
  fields.forEach((field,index)=>{
    if(keys.has(field.key))ctx.addIssue({code:"custom",path:[index,"key"],message:"Identificador repetido."});
    if(field.showWhen){
      const origin=fields.slice(0,index).find(previous=>previous.key===field.showWhen?.fieldKey);
      if(!origin||!choiceKinds.has(origin.kind)||!origin.options?.includes(field.showWhen.equals))ctx.addIssue({code:"custom",path:[index,"showWhen"],message:"A condição precisa usar uma opção de um campo anterior."});
    }
    keys.add(field.key);
  });
});
export type FormField=z.infer<typeof formFieldSchema>;
export const formSettingsSchema=z.object({
  revision:z.number().int().positive(),
  title:z.string().trim().min(2).max(110),
  description:z.string().trim().max(300),
  fields:formFieldsSchema,
  enabled:z.boolean(),
  pageSlug:z.string().regex(/^[a-z0-9-]{0,80}$/),
  targetModuleId:z.string().uuid().nullable(),
  bindings:z.record(z.string(),z.string()).default({}),
}).strict();
export const formSubmissionSchema=z.object({data:z.record(z.string(),z.unknown()),consent:z.literal(true),website:z.string().max(80).default("")}).strict();
export const formReviewSchema=z.object({decision:z.enum(["approved","rejected"])}).strict();
const digits=(value:string)=>value.replace(/\D/g,"");
function checkCpf(value:string){const num=digits(value);if(!/^\d{11}$/.test(num)||/^(\d)\1{10}$/.test(num))return false;const check=(size:number)=>{let sum=0;for(let i=0;i<size;i++)sum+=Number(num[i])*(size+1-i);return (sum*10%11)%10;};return check(9)===Number(num[9])&&check(10)===Number(num[10]);}
function checkCnpj(value:string){const num=digits(value);if(!/^\d{14}$/.test(num)||/^(\d)\1{13}$/.test(num))return false;const calc=(size:number)=>{let weight=2,sum=0;for(let i=size-1;i>=0;i--){sum+=Number(num[i])*weight;weight=weight===9?2:weight+1;}const remainder=sum%11;return remainder<2?0:11-remainder;};return calc(12)===Number(num[12])&&calc(13)===Number(num[13]);}
export function parseFormAnswer(field:FormField,value:unknown):string|number|null{
  if(value===null||value===undefined||value===""){
    if(field.required)throw new Error(`Preencha ${field.label}.`);
    return null;
  }
  if(numericKinds.has(field.kind)){
    const number=typeof value==="number"?value:Number(value);
    if(!Number.isFinite(number)||Math.abs(number)>1e12)throw new Error(`Número inválido em ${field.label}.`);
    if(field.kind==="integer"&&!Number.isInteger(number))throw new Error(`Informe um número inteiro em ${field.label}.`);
    if(field.kind==="currency"&&Math.abs(number*100-Math.round(number*100))>1e-6)throw new Error(`Utilize até duas casas decimais em ${field.label}.`);
    if(field.kind==="percentage"&&(number<0||number>100))throw new Error(`Percentual fora de 0 a 100 em ${field.label}.`);
    if(field.minValue!==undefined&&number<field.minValue)throw new Error(`O valor de ${field.label} deve ser pelo menos ${field.minValue}.`);
    if(field.maxValue!==undefined&&number>field.maxValue)throw new Error(`O valor de ${field.label} deve ser no máximo ${field.maxValue}.`);
    return number;
  }
  if(typeof value!=="string")throw new Error(`Valor inválido em ${field.label}.`);
  const text=value.trim();
  if(text.length>1000||(field.kind!=="textarea"&&text.length>250))throw new Error(`Texto muito longo em ${field.label}.`);
  if(field.minLength!==undefined&&text.length<field.minLength)throw new Error(`${field.label}: mínimo de ${field.minLength} caracteres.`);
  if(field.maxLength!==undefined&&text.length>field.maxLength)throw new Error(`${field.label}: máximo de ${field.maxLength} caracteres.`);
  if(field.kind==="text"&&field.mask&&field.mask!=="none"){
    const match=field.mask==="digits"?/^\d+$/:field.mask==="letters"?/^[\p{L}\s]+$/u:/^[\p{L}\p{N}\s]+$/u;
    if(!match.test(text))throw new Error(`Formato inválido em ${field.label}.`);
  }
  const number=digits(text);
  if(field.kind==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw new Error(`E-mail inválido em ${field.label}.`);
  if(["phone","whatsapp"].includes(field.kind)&&(number.length<10||number.length>11))throw new Error(`Telefone inválido em ${field.label}.`);
  if(field.kind==="cep"&&!/^\d{8}$/.test(number))throw new Error(`CEP inválido em ${field.label}.`);
  if(field.kind==="cpf"&&!checkCpf(text))throw new Error(`CPF inválido em ${field.label}.`);
  if(field.kind==="cnpj"&&!checkCnpj(text))throw new Error(`CNPJ inválido em ${field.label}.`);
  if(field.kind==="rg"&&!/^[a-zA-Z0-9.\-\s]{5,25}$/.test(text))throw new Error(`RG inválido em ${field.label}.`);
  if(field.kind==="date"&&(!/^\d{4}-\d{2}-\d{2}$/.test(text)||(Number.isNaN(Date.parse(`${text}T12:00:00Z`))||new Date(`${text}T12:00:00Z`).toISOString().slice(0,10)!==text)))throw new Error(`Data inválida em ${field.label}.`);
  if(field.kind==="time"&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(text))throw new Error(`Horário inválido em ${field.label}.`);
  if(field.kind==="url"){
    try{const url=new URL(text);if(!["https:","http:"].includes(url.protocol)||!url.hostname.includes("."))throw new Error("URL inválida");}catch{throw new Error(`Endereço da internet inválido em ${field.label}.`);}
  }
  if(choiceKinds.has(field.kind)&&!field.options?.includes(text))throw new Error(`Escolha uma opção válida em ${field.label}.`);
  return ["phone","whatsapp","cep","cpf","cnpj"].includes(field.kind)?number:text;
}
export function parseFormSubmission(fields:FormField[],data:Record<string,unknown>){
  if(Object.keys(data).some(key=>!fields.some(field=>field.key===key)))throw new Error("O formulário recebeu um campo desconhecido.");
  const result:Record<string,string|number|null>={};
  for(const field of fields){
    const condition=field.showWhen;
    const visible=!condition||String(result[condition.fieldKey]??"")===condition.equals;
    result[field.key]=visible?parseFormAnswer(field,data[field.key]):null;
  }
  return result;
}
