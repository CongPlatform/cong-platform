import { z } from "zod";

export const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label: z.string().trim().min(2).max(75),
  type: z.enum(["text", "long_text", "number", "date", "boolean", "select", "email", "relation"]),
  required: z.boolean().default(false),
  help: z.string().max(240).default(""),
  options: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
  targetModuleId: z.string().uuid().optional(),
}).strict().superRefine((field, ctx) => {
  if (field.type === "select" && (!field.options?.length || new Set(field.options).size !== field.options.length)) {
    ctx.addIssue({code: "custom", message: "Uma seleção exige opções únicas.", path: ["options"]});
  }
  if (field.type === "relation" && !field.targetModuleId) {
    ctx.addIssue({code: "custom", message: "Escolha a peça que será vinculada.", path: ["targetModuleId"]});
  }
  if (field.type !== "relation" && field.targetModuleId) {
    ctx.addIssue({code: "custom", message: "Este campo não admite uma peça relacionada.", path: ["targetModuleId"]});
  }
  if (field.type !== "select" && field.options?.length) {
    ctx.addIssue({code: "custom", message: "Apenas campos de seleção admitem opções.", path: ["options"]});
  }
});
export type ModuleField = z.infer<typeof fieldSchema>;

export const fieldsSchema = z.array(fieldSchema).max(32).superRefine((fields, ctx) => {
  const keys = new Set<string>();
  for (const [i, field] of fields.entries()) {
    if (keys.has(field.key)) ctx.addIssue({code: "custom", message: "Código de campo duplicado.", path: [i, "key"]});
    keys.add(field.key);
  }
});

export const createSystemSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(800).default("") }).strict();
export const editSystemSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().max(800).optional() }).strict().refine(x => Object.keys(x).length > 0);
export const installModuleSchema = z.object({ blueprintKey: z.enum(["volunteers", "projects", "donations", "agenda", "board", "dispatch", "delivery_routes", "availability", "forms", "inventory", "events", "assistance", "partners", "assets", "messages", "reservations", "custom"]), name: z.string().trim().min(2).max(100).optional() }).strict();
export const editModuleSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().max(800).optional(), fields: fieldsSchema.optional(), schemaVersion: z.number().int().positive() }).strict().refine(x => x.fields !== undefined || x.name !== undefined || x.description !== undefined);
export const recordCreateSchema = z.object({data: z.record(z.string(), z.unknown())}).strict();
export const recordEditSchema = z.object({data: z.record(z.string(), z.unknown()), revision: z.number().int().positive()}).strict();
export const recordArchiveSchema = z.object({revision: z.number().int().positive()}).strict();
export const publishSystemSchema = z.object({ status: z.enum(["draft", "active"]), version: z.number().int().positive() }).strict();

export const operationalPlanSchema = z.object({
  revision: z.number().int().min(0),
  intent: z.string().trim().max(1200),
  needs: z.array(z.enum(["people","resources","activities","monitoring","custom"])).max(5).refine(values=>new Set(values).size===values.length),
  steps: z.array(z.object({
    id: z.string().uuid(),
    kind: z.enum(["receive","review","prepare","assign","execute","monitor","custom"]),
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().max(360),
    moduleId: z.string().uuid().nullable(),
  }).strict()).max(12).superRefine((steps,ctx)=>{
    const seen=new Set<string>();
    for(const [index,step] of steps.entries()){
      if(seen.has(step.id))ctx.addIssue({code:"custom",message:"Etapa repetida.",path:[index,"id"]});
      seen.add(step.id);
    }
  }),
}).strict();
export type OperationalPlan = z.infer<typeof operationalPlanSchema>;

export const blueprints: { key: "volunteers" | "projects" | "donations" | "agenda" | "board" | "dispatch" | "delivery_routes" | "availability" | "forms" | "inventory" | "events" | "assistance" | "partners" | "assets" | "messages" | "reservations" | "custom"; name: string; description: string; fields: ModuleField[] }[] = [
  { key: "volunteers", name: "Voluntários", description: "Cadastro de pessoas, disponibilidade e área de atuação.", fields: [
    {key: "nome", label: "Nome", type: "text", required: true, help: ""},
    {key: "email", label: "E-mail", type: "email", required: false, help: ""},
    {key: "area", label: "Área de atuação", type: "select", required: false, help: "", options: ["Acolhimento", "Logística", "Comunicação", "Educação", "Outros"]},
    {key: "disponibilidade", label: "Disponibilidade", type: "text", required: false, help: ""},
    {key: "ativo", label: "Em atividade", type: "boolean", required: false, help: ""},
  ] },
  { key: "projects", name: "Projetos e ações", description: "Organização de projetos, responsáveis e situações.", fields: [
    {key: "titulo", label: "Título", type: "text", required: true, help: ""},
    {key: "descricao", label: "Descrição", type: "long_text", required: false, help: ""},
    {key: "situacao", label: "Situação", type: "select", required: true, help: "", options: ["Planejado", "Em andamento", "Concluído", "Suspenso"]},
    {key: "inicio", label: "Início", type: "date", required: false, help: ""},
  ] },
  { key: "donations", name: "Doações", description: "Acompanhamento de doações e seus recebimentos.", fields: [
    {key: "item", label: "Item / descrição", type: "text", required: true, help: ""},
    {key: "quantidade", label: "Quantidade", type: "number", required: true, help: ""},
    {key: "unidade", label: "Unidade", type: "select", required: true, help: "", options: ["Unidades", "Kg", "Litros", "Caixas"]},
    {key: "situacao", label: "Situação", type: "select", required: true, help: "", options: ["Pendente", "Recebida", "Cancelada"]},
    {key: "data", label: "Data", type: "date", required: false, help: ""},
  ] },
  {key: "agenda", name: "Agenda operacional", description: "Calendário visual com tarefas, datas e remarcação rápida.", fields: []},
  {key: "board", name: "Quadro de operações", description: "Movimente tarefas entre etapas em um quadro visual.", fields: []},
  {key: "dispatch", name: "Central de despacho", description: "Distribua trabalho à equipe, inicie atividades e confirme a execução em uma central visual.", fields: []},
  {key: "delivery_routes", name: "Planejamento de entregas", description: "Receba demandas, consulte a equipe e proponha roteiros de distribuição.", fields: []},
  {key: "availability", name: "Minha escala", description: "Marque visualmente os dias em que pode ajudar nas entregas.", fields: []},
  {key: "forms", name: "Formulários conectados", description: "Crie formulários para seu site, receba respostas e ligue os dados às demais peças.", fields: []},
  {key: "inventory", name: "Estoque", description: "Controle de materiais, quantidades, localização e reposição.", fields: [
    {key:"material",label:"Material",type:"text",required:true,help:""},
    {key:"categoria",label:"Categoria",type:"select",required:false,help:"",options:["Alimento","Higiene","Material escolar","Limpeza","Outros"]},
    {key:"saldo",label:"Quantidade disponível",type:"number",required:true,help:""},
    {key:"unidade",label:"Unidade",type:"select",required:true,help:"",options:["Unidades","Kg","Litros","Pacotes","Caixas"]},
    {key:"local",label:"Local de armazenamento",type:"text",required:false,help:""},
    {key:"repor",label:"Precisa repor",type:"boolean",required:false,help:""}
  ]},
  {key: "events", name: "Eventos", description: "Organize atividades públicas, oficinas, datas e locais.", fields: [
    {key:"nome",label:"Nome do evento",type:"text",required:true,help:""},
    {key:"data",label:"Data",type:"date",required:true,help:""},
    {key:"local",label:"Local",type:"text",required:false,help:""},
    {key:"vagas",label:"Vagas",type:"number",required:false,help:""},
    {key:"situacao",label:"Situação",type:"select",required:true,help:"",options:["Planejado","Inscrições abertas","Concluído","Cancelado"]}
  ]},
  {key: "assistance", name: "Atendimentos", description: "Registre demandas e acompanhe atendimentos, sem impor uma área social específica.", fields: [
    {key:"protocolo",label:"Identificação",type:"text",required:true,help:""},
    {key:"assunto",label:"Assunto",type:"text",required:true,help:""},
    {key:"data",label:"Data",type:"date",required:false,help:""},
    {key:"situacao",label:"Situação",type:"select",required:true,help:"",options:["Recebido","Em análise","Em atendimento","Concluído"]},
    {key:"observacao",label:"Observações",type:"long_text",required:false,help:""}
  ]},
  {key: "partners", name: "Parceiros", description: "Cadastre instituições parceiras, contatos e áreas de colaboração.", fields: [
    {key:"nome",label:"Nome do parceiro",type:"text",required:true,help:""},
    {key:"contato",label:"E-mail",type:"email",required:false,help:""},
    {key:"tipo",label:"Tipo",type:"select",required:false,help:"",options:["Empresa","Instituição pública","ONG","Pessoa física","Outro"]},
    {key:"atuacao",label:"Colaboração",type:"long_text",required:false,help:""},
    {key:"ativo",label:"Parceria ativa",type:"boolean",required:false,help:""}
  ]},
  {key: "assets", name: "Patrimônio", description: "Inventário de bens e equipamentos, estado e responsável.", fields: [
    {key:"bem",label:"Bem ou equipamento",type:"text",required:true,help:""},
    {key:"codigo",label:"Código de identificação",type:"text",required:false,help:""},
    {key:"local",label:"Localização",type:"text",required:false,help:""},
    {key:"estado",label:"Estado",type:"select",required:true,help:"",options:["Em uso","Disponível","Em manutenção","Inativo"]},
    {key:"responsavel",label:"Responsável",type:"text",required:false,help:""}
  ]},
  {key: "messages", name: "Mensagens", description: "Conversas da equipe em canais, com histórico e atualização contínua.", fields: []},
  {key: "reservations", name: "Reservas de recursos", description: "Agenda compartilhada de espaços, veículos e equipamentos com bloqueio de conflitos.", fields: []},
  {key: "custom", name: "Módulo em branco", description: "Crie o seu cadastro com os campos necessários.", fields: [
    {key: "nome", label: "Nome / identificação", type: "text", required: true, help: ""},
  ]},
];


export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  notes: z.string().trim().max(1600).default(""),
  priority: z.enum(["low","normal","high"]).default("normal"),
  dueOn: z.iso.date().nullable().default(null),
  stepId: z.string().uuid().nullable().default(null),
  moduleId: z.string().uuid().nullable().default(null),
  recordId: z.string().uuid().nullable().default(null),
  assigneeUserId: z.string().uuid().nullable().default(null),
}).strict();
export type CreateTask = z.infer<typeof createTaskSchema>;
export const editTaskSchema = createTaskSchema.partial().extend({
  revision: z.number().int().positive(),
  status: z.enum(["todo","progress","blocked","done"]).optional(),
}).strict();
export type EditTask = z.infer<typeof editTaskSchema>;
export const archiveTaskSchema = z.object({revision:z.number().int().positive()}).strict();
export const deleteSystemSchema = z.object({
  confirmation: z.string().min(2).max(100),
  version: z.number().int().positive(),
}).strict();

export const operationalMetricSchema=z.object({
  id:z.string().uuid(),
  moduleId:z.string().uuid(),
  fieldKey:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  operation:z.enum(["sum","average","distribution"]),
  title:z.string().trim().min(2).max(70),
}).strict();
export type OperationalMetricSpec=z.infer<typeof operationalMetricSchema>;
export const dashboardConfigSchema=z.object({
  version:z.number().int().positive(),
  visibleModuleIds:z.array(z.string().uuid()).max(20).refine(ids=>new Set(ids).size===ids.length).nullable(),
  showTasks:z.boolean(),
  metrics:z.array(operationalMetricSchema).max(8).refine(metrics=>new Set(metrics.map(item=>item.id)).size===metrics.length).default([]),
}).strict();
export const operationalBrandSiteSchema=z.object({
  version:z.number().int().positive(),
  siteId:z.string().uuid().nullable(),
}).strict();

export const foodIntakeSchema=z.object({items:z.array(z.object({item:z.enum(["Arroz","Feijão","Macarrão","Leite","Óleo","Açúcar","Farinha","Outros"]),quantidade:z.number().positive().max(100000),unidade:z.enum(["Unidades","Kg","Litros","Caixas"])}).strict()).min(1).max(20)}).strict();

export const executionSettingsSchema=z.object({advanceOnCompletion:z.boolean(),revision:z.number().int().min(0)}).strict();

export const operationalStepRuleSchema=z.object({
  revision:z.number().int().min(0),
  enabled:z.boolean(),
  priority:z.enum(["any","low","normal","high"]),
  assignment:z.enum(["unassigned","keep"]),
  dueDays:z.number().int().min(0).max(30),
}).strict();
export type OperationalStepRuleInput=z.infer<typeof operationalStepRuleSchema>;

export const deliveryDaySchema=z.iso.date().refine(value=>Number(value.slice(0,4))>=2020&&Number(value.slice(0,4))<=2100);
export const deliveryCoordinateSchema=z.number().finite().min(-90).max(90);
export const deliveryLongitudeSchema=z.number().finite().min(-180).max(180);
export const deliveryDemandSchema=z.object({day:deliveryDaySchema,label:z.string().trim().min(2).max(100),address:z.string().trim().min(5).max(300),lat:deliveryCoordinateSchema,lon:deliveryLongitudeSchema}).strict();
export const deliveryAvailabilitySchema=z.object({day:deliveryDaySchema,userId:z.string().uuid(),capacity:z.number().int().min(0).max(12),lat:deliveryCoordinateSchema,lon:deliveryLongitudeSchema}).strict();
export const deliveryConfirmSchema=z.object({day:deliveryDaySchema,snapshotHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const deliveryCancelSchema=z.object({day:deliveryDaySchema,revision:z.number().int().positive()}).strict();

export const deliverySelfAvailabilitySchema=deliveryAvailabilitySchema.omit({userId:true});
export const deliveryImportSchema=z.object({
  day:deliveryDaySchema,
  moduleId:z.string().uuid(),
  labelField:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  addressField:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  latitudeField:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  longitudeField:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
}).strict();

export const deliveryRoutingPreferenceSchema=z.object({enabled:z.boolean()}).strict();
