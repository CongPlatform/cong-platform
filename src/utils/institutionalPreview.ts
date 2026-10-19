import { createDefaultSectionContent } from "../data/institutional/sectionCatalog";
import {
  findNativeDesignFamilyByCategory,
  findNativeDesignFamilyById,
  findNativeDesignFamilyByName,
  type NativeDesignFamilyId,
} from "../data/institutional/nativeDesignFamilies";
import type {
  InstitutionalBrand,
  InstitutionalImageValue,
  InstitutionalLayoutNode,
  InstitutionalSection,
  InstitutionalSectionType,
  InstitutionalSite,
  InstitutionalTemplate,
  InstitutionalVariant,
} from "../services/institutionalService";

const FIXED_DATE = "2026-01-01T00:00:00.000Z";


const NATIVE_EXAMPLE_SECTION_ORDER: Record<NativeDesignFamilyId, readonly InstitutionalSectionType[]> = {
  horizonte: ["site_header", "organization_intro", "impact_metrics", "organization_about", "projects_showcase", "custom_content", "support_actions", "transparency", "organization_contact", "site_footer"],
  "territorio-vivo": ["site_header", "organization_intro", "impact_metrics", "projects_showcase", "organization_about", "custom_content", "support_actions", "transparency", "organization_contact", "site_footer"],
  acolher: ["site_header", "organization_intro", "organization_about", "custom_content", "projects_showcase", "impact_metrics", "support_actions", "organization_contact", "transparency", "site_footer"],
  essencial: ["site_header", "organization_intro", "impact_metrics", "projects_showcase", "support_actions", "organization_about", "transparency", "organization_contact", "custom_content", "site_footer"],
  comunidade: ["site_header", "organization_intro", "organization_about", "projects_showcase", "custom_content", "impact_metrics", "support_actions", "transparency", "organization_contact", "site_footer"],
  vozes: ["site_header", "organization_intro", "custom_content", "organization_about", "projects_showcase", "impact_metrics", "support_actions", "transparency", "organization_contact", "site_footer"],
  pulso: ["site_header", "organization_intro", "projects_showcase", "impact_metrics", "organization_about", "support_actions", "custom_content", "organization_contact", "transparency", "site_footer"],
  profundezas: ["site_header", "organization_intro", "impact_metrics", "organization_about", "projects_showcase", "custom_content", "transparency", "support_actions", "organization_contact", "site_footer"],
  sereno: ["site_header", "organization_intro", "custom_content", "organization_about", "projects_showcase", "impact_metrics", "support_actions", "organization_contact", "transparency", "site_footer"],
  conexao: ["site_header", "organization_intro", "impact_metrics", "projects_showcase", "organization_about", "support_actions", "transparency", "custom_content", "organization_contact", "site_footer"],
};

interface NativeExampleCopy {
  organizationName: string;
  shortName: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  projectsTitle: string;
  projectsDescription: string;
  projectCategories: readonly [string, string, string, string];
  projectTitles: readonly [string, string, string, string];
  projectDescriptions: readonly [string, string, string, string];
  metrics: readonly [
    { value: string; label: string; period: string },
    { value: string; label: string; period: string },
    { value: string; label: string; period: string },
    { value: string; label: string; period: string },
  ];
  supportTitle: string;
  supportDescription: string;
  contactDescription: string;
  email: string;
  phone: string;
  address: string;
  footerDescription: string;
  story: string;
  storyPerson: string;
}

const NATIVE_EXAMPLE_COPY: Record<NativeDesignFamilyId, NativeExampleCopy> = {
  horizonte: {
    organizationName: "Instituto Ponte Norte",
    shortName: "Ponte Norte",
    eyebrow: "EDUCAÇÃO · MENTORIA · PRIMEIRO EMPREGO",
    heroTitle: "Talento existe em todo lugar. Oportunidade também deveria.",
    heroDescription: "O Instituto Ponte Norte acompanha jovens de escolas públicas de Campinas com reforço, mentoria e preparação para o primeiro emprego.",
    aboutTitle: "Da sala de aula para escolhas mais amplas.",
    aboutDescription: "A Ponte Norte nasceu em 2018 para aproximar estudantes, educadores e profissionais voluntários. Cada turma combina aprendizagem, orientação de carreira e conexão com oportunidades reais.",
    projectsTitle: "Quatro caminhos para atravessar a ponte.",
    projectsDescription: "Programas diferentes para momentos diferentes da trajetória escolar e profissional.",
    projectCategories: ["Aprendizagem", "Carreira", "Mentoria", "Oportunidades"],
    projectTitles: ["Base Forte", "Primeiro Passo", "Mentoria 1:1", "Portas Abertas"],
    projectDescriptions: [
      "Reforço de português, matemática e habilidades digitais para estudantes do ensino médio.",
      "Oficinas de currículo, entrevistas e organização financeira para quem busca a primeira experiência profissional.",
      "Encontros quinzenais entre jovens e profissionais voluntários durante seis meses.",
      "Rede de empresas parceiras que oferece visitas, vagas de aprendizagem e experiências de carreira.",
    ],
    metrics: [
      { value: "1.240", label: "jovens acompanhados", period: "desde 2018" },
      { value: "82%", label: "concluíram o ciclo", period: "turmas de 2025" },
      { value: "196", label: "mentores voluntários", period: "rede ativa" },
      { value: "34", label: "empresas parceiras", period: "em 2026" },
    ],
    supportTitle: "Ajude uma trajetória a ganhar mais possibilidades.",
    supportDescription: "Você pode financiar uma vaga, mentorar um jovem ou abrir sua empresa para experiências de carreira.",
    contactDescription: "Fale com a equipe da Ponte Norte sobre inscrições, voluntariado ou parcerias.",
    email: "contato@pontenorte.org.br",
    phone: "(19) 3220-1840",
    address: "Campinas, SP · atendimento em escolas e polos parceiros",
    footerDescription: "Educação, mentoria e oportunidades para jovens construírem seus próprios caminhos.",
    story: "“Eu achava que faculdade e trabalho em tecnologia eram coisas muito distantes. A mentoria me ajudou a transformar isso em um plano.”",
    storyPerson: "Luana, 18 anos · participante do ciclo 2025",
  },
  "territorio-vivo": {
    organizationName: "Instituto Raízes do Vale",
    shortName: "Raízes do Vale",
    eyebrow: "MATA ATLÂNTICA · ÁGUA · COMUNIDADES",
    heroTitle: "Cuidar das nascentes é cuidar de quem vive depois delas.",
    heroDescription: "O Raízes do Vale restaura áreas de Mata Atlântica, monitora nascentes e trabalha com comunidades rurais no Vale do Ribeira.",
    aboutTitle: "Conservação que começa no território, não no escritório.",
    aboutDescription: "Biólogos, agricultores e moradores mapeiam áreas prioritárias, recuperam vegetação nativa e acompanham a qualidade da água ao longo do ano.",
    projectsTitle: "Paisagens restauradas com quem conhece cada caminho.",
    projectsDescription: "Ciência de campo, restauração e conhecimento local trabalhando na mesma direção.",
    projectCategories: ["Restauração", "Água", "Comunidade", "Pesquisa"],
    projectTitles: ["Corredores da Mata", "Nascentes Vivas", "Guardiões do Vale", "BioMapa"],
    projectDescriptions: [
      "Restauração de trechos que reconectam fragmentos de floresta e ampliam áreas de circulação da fauna.",
      "Proteção de nascentes e acompanhamento participativo da qualidade da água em propriedades rurais.",
      "Formação e apoio a lideranças locais que organizam ações ambientais em seus bairros e comunidades.",
      "Monitoramento de espécies com câmeras, registros comunitários e dados abertos para pesquisadores.",
    ],
    metrics: [
      { value: "186 ha", label: "em restauração", period: "2022–2026" },
      { value: "73", label: "nascentes monitoradas", period: "ciclo atual" },
      { value: "14", label: "comunidades parceiras", period: "Vale do Ribeira" },
      { value: "128", label: "espécies registradas", period: "BioMapa 2026" },
    ],
    supportTitle: "Proteja um território que abastece muita gente.",
    supportDescription: "Doe mudas, apoie uma frente de restauração ou participe de um mutirão de campo.",
    contactDescription: "Nossa equipe atende pesquisadores, moradores, escolas e parceiros interessados em atuar no território.",
    email: "contato@raizesdovale.org.br",
    phone: "(13) 3842-7031",
    address: "Registro e municípios parceiros do Vale do Ribeira, SP",
    footerDescription: "Restauração, água e biodiversidade construídas junto das comunidades do Vale do Ribeira.",
    story: "“A nascente sempre esteve aqui. O projeto ajudou a comunidade a entender como proteger o entorno e acompanhar a água ao longo do ano.”",
    storyPerson: "Dona Célia, agricultora e guardiã de nascente",
  },
  acolher: {
    organizationName: "Casa Patas & Laços",
    shortName: "Patas & Laços",
    eyebrow: "RESGATE · ACOLHIMENTO · ADOÇÃO RESPONSÁVEL",
    heroTitle: "Cada resgate merece terminar em segurança e vínculo.",
    heroDescription: "A Casa Patas & Laços resgata cães e gatos em situação de risco, oferece tratamento e prepara cada animal para uma adoção responsável.",
    aboutTitle: "Um abrigo de passagem, não de permanência.",
    aboutDescription: "A equipe combina atendimento veterinário, lares temporários e acompanhamento pós-adoção para que cada história encontre uma família preparada.",
    projectsTitle: "Cuidado em todas as etapas do recomeço.",
    projectsDescription: "Do primeiro atendimento ao acompanhamento da nova família.",
    projectCategories: ["Resgate", "Saúde", "Acolhimento", "Adoção"],
    projectTitles: ["Plantão de Resgate", "Clínica Solidária", "Lar de Passagem", "Encontro de Famílias"],
    projectDescriptions: [
      "Atendimento de ocorrências prioritárias em parceria com protetores e clínicas da região.",
      "Vacinação, castração, exames e tratamento para animais acolhidos pelo projeto.",
      "Rede de famílias temporárias que oferece rotina doméstica enquanto a adoção não acontece.",
      "Feiras e entrevistas de adoção com acompanhamento nos primeiros meses da nova casa.",
    ],
    metrics: [
      { value: "418", label: "animais resgatados", period: "2025" },
      { value: "301", label: "adoções responsáveis", period: "2025" },
      { value: "67", label: "lares temporários", period: "rede ativa" },
      { value: "91%", label: "adoções mantidas", period: "após 6 meses" },
    ],
    supportTitle: "Um pouco de espaço pode virar uma nova chance.",
    supportDescription: "Ajude com ração, tratamento, lar temporário ou adoção responsável.",
    contactDescription: "Entre em contato para adoção, lar temporário, doações ou orientação sobre resgate.",
    email: "oi@pataseLacos.org.br".toLowerCase(),
    phone: "(19) 99842-1160",
    address: "Hortolândia, SP · visitas somente com agendamento",
    footerDescription: "Resgate responsável, cuidado veterinário e famílias preparadas para novos começos.",
    story: "“A Amora chegou assustada e sem confiar em ninguém. No lar temporário ela reaprendeu a brincar; hoje dorme no sofá da família que a adotou.”",
    storyPerson: "História da Amora · adoção acompanhada em 2026",
  },
  essencial: {
    organizationName: "Rede Cuidado Já",
    shortName: "Cuidado Já",
    eyebrow: "SAÚDE PRIMÁRIA · ORIENTAÇÃO · ACESSO",
    heroTitle: "Cuidado rápido para quem não pode esperar a burocracia passar.",
    heroDescription: "A Rede Cuidado Já organiza triagem, orientação e atendimentos básicos gratuitos em bairros com menor acesso a serviços de saúde.",
    aboutTitle: "Atendimento simples, seguro e perto de casa.",
    aboutDescription: "Profissionais voluntários e unidades parceiras realizam ações de prevenção, encaminhamento e acompanhamento de casos prioritários.",
    projectsTitle: "Serviços essenciais organizados para chegar mais rápido.",
    projectsDescription: "Frentes objetivas para prevenção, atendimento e continuidade do cuidado.",
    projectCategories: ["Triagem", "Prevenção", "Saúde", "Encaminhamento"],
    projectTitles: ["Plantão de Orientação", "Saúde no Bairro", "Linha Materna", "Rede de Encaminhamento"],
    projectDescriptions: [
      "Triagem inicial e orientação para pessoas que não sabem qual serviço procurar.",
      "Ações periódicas com aferição, vacinação parceira e educação em saúde.",
      "Acompanhamento de gestantes em situação de vulnerabilidade e conexão com a rede pública.",
      "Fluxo com clínicas e profissionais parceiros para exames e consultas de continuidade.",
    ],
    metrics: [
      { value: "8.460", label: "orientações realizadas", period: "últimos 12 meses" },
      { value: "1.920", label: "atendimentos presenciais", period: "2026" },
      { value: "27", label: "profissionais voluntários", period: "escala ativa" },
      { value: "11", label: "bairros atendidos", period: "região metropolitana" },
    ],
    supportTitle: "Fortaleça uma rede que responde quando o cuidado é urgente.",
    supportDescription: "Profissionais, empresas e doadores podem apoiar atendimentos, insumos e logística.",
    contactDescription: "Para orientações de saúde, parcerias ou voluntariado profissional, fale com nossa central.",
    email: "contato@cuidadoja.org.br",
    phone: "0800 014 2026",
    address: "Região Metropolitana de Campinas, SP",
    footerDescription: "Acesso, orientação e prevenção para reduzir barreiras ao cuidado em saúde.",
    story: "“Eu precisava entender onde buscar atendimento para minha mãe. A orientação certa evitou mais uma semana de idas e voltas.”",
    storyPerson: "Rafael, familiar atendido pela central",
  },
  comunidade: {
    organizationName: "Coletivo Chão Comum",
    shortName: "Chão Comum",
    eyebrow: "MORADIA · SANEAMENTO · BAIRRO",
    heroTitle: "Casa digna muda a rotina. Bairro forte muda o futuro.",
    heroDescription: "O Chão Comum realiza melhorias habitacionais e pequenas obras comunitárias com participação direta de moradores da periferia de Sumaré.",
    aboutTitle: "Obra feita com escuta, técnica e mão na massa.",
    aboutDescription: "Arquitetos, pedreiros, voluntários e famílias definem prioridades juntos: telhado, banheiro, acessibilidade, drenagem ou espaços coletivos.",
    projectsTitle: "Transformações que cabem no quarteirão e mudam a vida diária.",
    projectsDescription: "Intervenções de pequena escala, resultado visível e decisão compartilhada.",
    projectCategories: ["Moradia", "Infraestrutura", "Formação", "Território"],
    projectTitles: ["Casa Segura", "Rua que Cuida", "Oficina de Obra", "Mapa do Bairro"],
    projectDescriptions: [
      "Reparos prioritários em moradias com infiltração, risco elétrico ou falta de acessibilidade.",
      "Mutirões para drenagem, iluminação e recuperação de pequenos espaços de uso coletivo.",
      "Formação prática para moradores interessados em manutenção, pintura e pequenos reparos.",
      "Levantamento comunitário de problemas e prioridades para orientar novas frentes de trabalho.",
    ],
    metrics: [
      { value: "126", label: "casas melhoradas", period: "2024–2026" },
      { value: "9", label: "ruas com intervenções", period: "em Sumaré" },
      { value: "214", label: "moradores em mutirões", period: "último ciclo" },
      { value: "18", label: "profissionais parceiros", period: "rede técnica" },
    ],
    supportTitle: "Construção também é uma forma de participação.",
    supportDescription: "Doe materiais, participe de um mutirão ou apoie tecnicamente uma intervenção.",
    contactDescription: "Moradores, profissionais e empresas podem conversar com a equipe sobre novas frentes no território.",
    email: "contato@chaocomum.org.br",
    phone: "(19) 3873-4418",
    address: "Sumaré, SP · atuação por ciclos territoriais",
    footerDescription: "Melhorias habitacionais e infraestrutura comunitária construídas com quem vive o território.",
    story: "“A reforma resolveu a infiltração, mas o melhor foi ver a rua inteira participando. Depois disso a gente não parou de conversar sobre o bairro.”",
    storyPerson: "Márcia, moradora do Jardim Esperança",
  },
  vozes: {
    organizationName: "Rede Aurora",
    shortName: "Aurora",
    eyebrow: "DIREITOS · AUTONOMIA · RENDA",
    heroTitle: "Quando uma mulher conhece seus direitos, novas decisões ficam possíveis.",
    heroDescription: "A Rede Aurora oferece orientação, formação e apoio a mulheres que buscam autonomia financeira e acesso a direitos.",
    aboutTitle: "Acolhimento que não termina na escuta.",
    aboutDescription: "Cada participante pode acessar orientação jurídica, rodas de apoio, formação profissional e uma rede de encaminhamentos construída com parceiros locais.",
    projectsTitle: "Informação, renda e rede para sustentar escolhas.",
    projectsDescription: "Programas pensados para fortalecer autonomia de maneira prática e contínua.",
    projectCategories: ["Direitos", "Renda", "Rede", "Incidência"],
    projectTitles: ["Direito sem Medo", "Renda Própria", "Círculos Aurora", "Vozes Públicas"],
    projectDescriptions: [
      "Plantões de orientação jurídica e encaminhamento para serviços especializados.",
      "Formação profissional, organização financeira e apoio a pequenos negócios liderados por mulheres.",
      "Encontros de apoio, troca de experiências e fortalecimento de vínculos comunitários.",
      "Formação de lideranças e participação em debates públicos sobre direitos e proteção.",
    ],
    metrics: [
      { value: "2.780", label: "mulheres atendidas", period: "desde 2021" },
      { value: "640", label: "orientações jurídicas", period: "2025" },
      { value: "38", label: "turmas de formação", period: "concluídas" },
      { value: "76%", label: "relatam mais autonomia", period: "avaliação interna" },
    ],
    supportTitle: "Fortaleça escolhas que precisam de rede para durar.",
    supportDescription: "Doe, ofereça mentoria profissional ou conecte a Aurora a oportunidades de trabalho e renda.",
    contactDescription: "Fale com a equipe sobre atendimento, parcerias institucionais ou participação voluntária.",
    email: "contato@redeaurora.org.br",
    phone: "(11) 3042-8096",
    address: "São Paulo, SP · atendimento presencial e remoto",
    footerDescription: "Direitos, autonomia econômica e redes de apoio para mulheres ampliarem suas escolhas.",
    story: "“Eu cheguei procurando orientação jurídica e encontrei também uma turma de formação. Foi a primeira vez em muito tempo que consegui planejar os próximos meses.”",
    storyPerson: "Camila, participante da Rede Aurora",
  },
  pulso: {
    organizationName: "Projeto Batida Livre",
    shortName: "Batida Livre",
    eyebrow: "ESPORTE · CULTURA · JUVENTUDE",
    heroTitle: "A rua já tem potência. A gente ajuda a transformar em caminho.",
    heroDescription: "O Batida Livre combina esporte, música e formação para adolescentes e jovens da zona norte de São Paulo.",
    aboutTitle: "Treino, palco, oficina e conversa no mesmo lugar.",
    aboutDescription: "As atividades acontecem no contraturno escolar e usam cultura urbana e esporte como ponto de partida para convivência, disciplina e projetos de futuro.",
    projectsTitle: "Movimento que vira repertório, vínculo e oportunidade.",
    projectsDescription: "Quatro frentes com ritmos diferentes e o mesmo foco: juventude protagonista.",
    projectCategories: ["Esporte", "Música", "Formação", "Cultura"],
    projectTitles: ["Quadra Aberta", "Estúdio 013", "Corre de Futuro", "Festival do Bairro"],
    projectDescriptions: [
      "Basquete, futsal e treino funcional com educadores e rodas de conversa após as atividades.",
      "Produção musical, escrita, beatmaking e gravação de trabalhos autorais.",
      "Oficinas de portfólio, comunicação, trabalho e organização de projetos pessoais.",
      "Evento anual produzido com os próprios jovens, artistas locais e coletivos parceiros.",
    ],
    metrics: [
      { value: "520", label: "jovens participantes", period: "2025" },
      { value: "96", label: "oficinas realizadas", period: "último ciclo" },
      { value: "41", label: "artistas e educadores", period: "rede parceira" },
      { value: "7", label: "territórios conectados", period: "zona norte" },
    ],
    supportTitle: "Coloque recurso, repertório ou presença nessa batida.",
    supportDescription: "Apoie uma turma, ofereça uma oficina ou ajude a equipar quadra e estúdio.",
    contactDescription: "Quer participar, apoiar uma turma ou levar uma oficina? Fala com a equipe.",
    email: "salve@batidalivre.org.br",
    phone: "(11) 99801-7713",
    address: "Zona Norte de São Paulo · polos comunitários parceiros",
    footerDescription: "Esporte, cultura e formação para juventudes ocuparem a cidade com mais possibilidades.",
    story: "“Eu entrei por causa do basquete e fiquei pela música. Hoje ajudo a organizar os eventos e já penso em trabalhar com produção.”",
    storyPerson: "Davi, 17 anos · participante e monitor jovem",
  },
  profundezas: {
    organizationName: "Observatório Mar Aberto",
    shortName: "Mar Aberto",
    eyebrow: "OCEANO · PESQUISA · CIÊNCIA CIDADÃ",
    heroTitle: "Conhecer o oceano é o primeiro passo para protegê-lo melhor.",
    heroDescription: "O Observatório Mar Aberto produz dados sobre ecossistemas costeiros e aproxima comunidades, escolas e pesquisadores da conservação marinha.",
    aboutTitle: "Ciência que sai do laboratório e volta para a costa.",
    aboutDescription: "Expedições, monitoramento comunitário e educação científica transformam registros de campo em informação útil para conservação e políticas públicas.",
    projectsTitle: "Dados profundos, participação próxima.",
    projectsDescription: "Pesquisa aplicada e ciência cidadã conectadas às decisões sobre o litoral.",
    projectCategories: ["Pesquisa", "Manguezais", "Recifes", "Cidadania"],
    projectTitles: ["Atlas Costeiro", "Mangue Vivo", "Recifes Sentinela", "Olho no Mar"],
    projectDescriptions: [
      "Base aberta com registros de espécies, qualidade da água e alterações observadas no litoral.",
      "Monitoramento e restauração de áreas de manguezal em parceria com comunidades locais.",
      "Acompanhamento periódico de recifes com mergulhadores, pesquisadores e sensores de campo.",
      "Programa de ciência cidadã para pescadores, estudantes e moradores registrarem mudanças no ambiente.",
    ],
    metrics: [
      { value: "312 mil", label: "registros de campo", period: "base aberta" },
      { value: "46 km", label: "de costa monitorada", period: "2026" },
      { value: "23", label: "pesquisadores associados", period: "rede científica" },
      { value: "680", label: "cidadãos colaboradores", period: "Olho no Mar" },
    ],
    supportTitle: "Ajude ciência de campo a chegar mais longe.",
    supportDescription: "Apoie uma saída de pesquisa, doe equipamento ou participe da rede de ciência cidadã.",
    contactDescription: "Pesquisadores, escolas, comunidades costeiras e apoiadores podem falar diretamente com o Observatório.",
    email: "contato@maraberto.org.br",
    phone: "(13) 3202-0914",
    address: "Santos, SP · atuação em trechos do litoral paulista",
    footerDescription: "Pesquisa, dados abertos e ciência cidadã para conservar ecossistemas marinhos.",
    story: "“Quando os pescadores começaram a registrar as mudanças junto com a equipe, os dados ficaram muito mais completos e passaram a contar a história do lugar.”",
    storyPerson: "Dr. Henrique Sato · coordenação científica",
  },
  sereno: {
    organizationName: "Casa Tempo Bom",
    shortName: "Tempo Bom",
    eyebrow: "CONVIVÊNCIA · AUTONOMIA · LONGEVIDADE",
    heroTitle: "Envelhecer com companhia também é uma forma de cuidado.",
    heroDescription: "A Casa Tempo Bom cria atividades de convivência, apoio às famílias e acompanhamento para pessoas idosas que vivem na região de Jundiaí.",
    aboutTitle: "Um lugar onde a rotina ganha encontros, não obrigações.",
    aboutDescription: "Oficinas, rodas de conversa, movimento e orientação às famílias são organizados respeitando interesses, ritmos e autonomia de cada participante.",
    projectsTitle: "Programas para manter vínculos, movimento e escolhas.",
    projectsDescription: "Cuidado cotidiano com leveza, escuta e participação ativa das pessoas idosas.",
    projectCategories: ["Convivência", "Bem-estar", "Cultura", "Famílias"],
    projectTitles: ["Café com Histórias", "Movimento Leve", "Clube de Oficinas", "Cuidar de Quem Cuida"],
    projectDescriptions: [
      "Encontros semanais para conversa, memória, leitura e construção de vínculos.",
      "Atividades orientadas de mobilidade, equilíbrio e bem-estar adequadas a diferentes ritmos.",
      "Música, jardinagem, tecnologia e artes escolhidas pelos próprios participantes.",
      "Orientação e grupos de apoio para familiares e cuidadores da comunidade.",
    ],
    metrics: [
      { value: "286", label: "pessoas idosas ativas", period: "2026" },
      { value: "22", label: "atividades por mês", period: "agenda regular" },
      { value: "74", label: "familiares acompanhados", period: "último trimestre" },
      { value: "89%", label: "frequência média", period: "atividades regulares" },
    ],
    supportTitle: "Ajude a manter encontros que fazem diferença na semana inteira.",
    supportDescription: "Doe, ofereça uma oficina ou apoie o transporte de participantes com mobilidade reduzida.",
    contactDescription: "Fale com a Casa Tempo Bom sobre participação, visitas, voluntariado ou apoio às famílias.",
    email: "contato@casatempobom.org.br",
    phone: "(11) 4521-6048",
    address: "Jundiaí, SP · atividades de segunda a sexta",
    footerDescription: "Convivência, autonomia e apoio para envelhecer com mais vínculos e participação.",
    story: "“Eu vim para uma oficina de jardinagem e acabei encontrando um grupo de amigos. Agora quarta-feira virou o dia que eu mais espero.”",
    storyPerson: "Seu Antônio, 72 anos · participante desde 2024",
  },
  conexao: {
    organizationName: "Instituto Vira Rede",
    shortName: "Vira Rede",
    eyebrow: "PESSOAS · TERRITÓRIOS · SOLUÇÕES",
    heroTitle: "Problemas diferentes. Uma rede capaz de construir respostas em conjunto.",
    heroDescription: "O Vira Rede conecta iniciativas locais de educação, renda, alimentação e meio ambiente a voluntários, empresas e recursos.",
    aboutTitle: "Uma organização feita para conectar quem já está fazendo.",
    aboutDescription: "Em vez de centralizar todas as ações, o Instituto apoia projetos de bairro com capacitação, articulação, pequenas bolsas e ferramentas de gestão.",
    projectsTitle: "Uma rede, muitas frentes, impacto compartilhado.",
    projectsDescription: "Projetos locais mantêm sua identidade e ganham estrutura para colaborar e crescer.",
    projectCategories: ["Educação", "Renda", "Alimentação", "Ambiente"],
    projectTitles: ["Rede de Aprendizagem", "Renda no Bairro", "Mesa Compartilhada", "Quintais Vivos"],
    projectDescriptions: [
      "Apoio a cursinhos, bibliotecas comunitárias e projetos de reforço escolar.",
      "Formação e microapoio para coletivos de geração de renda e economia solidária.",
      "Conexão entre cozinhas solidárias, doadores e produtores locais para reduzir desperdício.",
      "Pequenos projetos de hortas, compostagem e recuperação de áreas verdes comunitárias.",
    ],
    metrics: [
      { value: "31", label: "iniciativas na rede", period: "em 2026" },
      { value: "6.800", label: "pessoas alcançadas", period: "últimos 12 meses" },
      { value: "112", label: "voluntários especializados", period: "rede ativa" },
      { value: "R$ 420 mil", label: "mobilizados para projetos", period: "2025" },
    ],
    supportTitle: "Entre com o que você tem. A rede ajuda a encontrar onde faz mais sentido.",
    supportDescription: "Tempo, conhecimento, recursos ou conexões podem fortalecer diferentes iniciativas do território.",
    contactDescription: "Converse com o Vira Rede para cadastrar uma iniciativa, oferecer apoio ou construir uma parceria.",
    email: "contato@virarede.org.br",
    phone: "(19) 3518-2260",
    address: "Campinas e região · atuação em rede com organizações parceiras",
    footerDescription: "Conexões, estrutura e recursos para iniciativas locais ampliarem seu impacto sem perder identidade.",
    story: "“A gente já fazia o projeto no bairro, mas não sabia como organizar parceria e prestação de contas. A rede ajudou a estruturar sem tirar nossa autonomia.”",
    storyPerson: "Renato, coordenador de iniciativa parceira",
  },
};

function svgDataUri(
  first: string,
  second: string,
  familyId?: NativeDesignFamilyId,
  variant = 0,
): string {
  const familyMotif: Record<NativeDesignFamilyId, string> = {
    horizonte: `<path d="M0 540 330 250 505 370 690 170 960 390V720H0Z" fill="#fff" fill-opacity=".18"/><rect x="610" y="105" width="210" height="430" rx="28" fill="#fff" fill-opacity=".24"/><circle cx="420" cy="250" r="92" fill="#fff" fill-opacity=".7"/>`,
    "territorio-vivo": `<path d="M0 500C180 390 260 430 390 345s260-125 570 40v335H0Z" fill="#fff" fill-opacity=".2"/><path d="M0 590C220 470 430 560 620 430s230-80 340-5v295H0Z" fill="#fff" fill-opacity=".18"/><circle cx="720" cy="180" r="120" fill="#fff" fill-opacity=".16"/>`,
    acolher: `<path d="M650 210c85-120 250-12 175 112-42 69-175 145-175 145s-132-76-174-145c-75-124 90-232 174-112Z" fill="#fff" fill-opacity=".32"/><circle cx="270" cy="315" r="105" fill="#fff" fill-opacity=".56"/><circle cx="210" cy="250" r="30" fill="#fff" fill-opacity=".38"/><circle cx="330" cy="250" r="30" fill="#fff" fill-opacity=".38"/>`,
    essencial: `<rect x="590" y="95" width="130" height="430" rx="18" fill="#fff" fill-opacity=".22"/><rect x="440" y="245" width="430" height="130" rx="18" fill="#fff" fill-opacity=".22"/><circle cx="240" cy="300" r="110" fill="#fff" fill-opacity=".5"/>`,
    comunidade: `<path d="M85 500 260 330l175 170v160H85Z" fill="#fff" fill-opacity=".28"/><path d="M410 500 600 270l190 230v160H410Z" fill="#fff" fill-opacity=".18"/><rect x="200" y="520" width="85" height="140" fill="#fff" fill-opacity=".24"/><circle cx="770" cy="180" r="92" fill="#fff" fill-opacity=".2"/>`,
    vozes: `<path d="M0 0h960v720H0z" fill="#fff" fill-opacity=".03"/><path d="M640 70c150 55 190 210 75 310-115 100-250 28-260-115-9-128 72-235 185-195Z" fill="#fff" fill-opacity=".24"/><circle cx="265" cy="305" r="115" fill="#fff" fill-opacity=".58"/><path d="M70 585c210-80 390-30 540 70" stroke="#fff" stroke-opacity=".28" stroke-width="24" fill="none"/>`,
    pulso: `<path d="M-40 560 1010 170" stroke="#fff" stroke-opacity=".22" stroke-width="92"/><path d="M-20 660 1000 300" stroke="#fff" stroke-opacity=".18" stroke-width="28"/><circle cx="690" cy="245" r="135" fill="#fff" fill-opacity=".26"/><path d="m650 115 36 88 92 10-70 60 21 91-79-48-79 48 21-91-70-60 92-10Z" fill="#fff" fill-opacity=".18"/>`,
    profundezas: `<path d="M0 510c140-85 260 85 410 0s265-80 550 5v205H0Z" fill="#fff" fill-opacity=".2"/><path d="M0 580c190-80 290 75 475-5s330-35 485 10" stroke="#fff" stroke-opacity=".24" stroke-width="16" fill="none"/><ellipse cx="690" cy="240" rx="170" ry="70" fill="#fff" fill-opacity=".22"/><path d="m840 240 75-50v100Z" fill="#fff" fill-opacity=".22"/>`,
    sereno: `<path d="M705 110c-120 85-120 240 12 320 72-118 83-218-12-320Z" fill="#fff" fill-opacity=".22"/><path d="M720 420c-45-170 5-270 125-320" stroke="#fff" stroke-opacity=".28" stroke-width="18" fill="none"/><circle cx="280" cy="305" r="118" fill="#fff" fill-opacity=".52"/>`,
    conexao: `<circle cx="250" cy="300" r="95" fill="#fff" fill-opacity=".5"/><circle cx="510" cy="210" r="62" fill="#fff" fill-opacity=".3"/><circle cx="735" cy="360" r="86" fill="#fff" fill-opacity=".24"/><path d="M335 286 448 229M565 234l105 89" stroke="#fff" stroke-opacity=".36" stroke-width="18" stroke-linecap="round"/>`,
  };
  const motif = familyId ? familyMotif[familyId] : `<circle cx="730" cy="185" r="155" fill="white" fill-opacity=".28"/><circle cx="210" cy="535" r="205" fill="white" fill-opacity=".18"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><defs><linearGradient id="g${variant}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient><radialGradient id="light${variant}" cx="72%" cy="18%" r="72%"><stop stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="grain${variant}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${variant + 7}"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .055 0"/></filter></defs><rect width="960" height="720" rx="42" fill="url(#g${variant})"/><rect width="960" height="720" rx="42" fill="url(#light${variant})"/><g transform="translate(${(variant % 4) * 14 - 18} ${(variant % 3) * 10 - 8}) scale(${1 + (variant % 2) * .035})">${motif}</g><rect width="960" height="720" rx="42" filter="url(#grain${variant})" opacity=".55"/><path d="M0 620C190 565 325 690 520 625s290-52 440 18v77H0Z" fill="#000" fill-opacity=".08"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function previewImage(
  label: string,
  first = "#3d66c5",
  second = "#f4b644",
  familyId?: NativeDesignFamilyId,
  variant = 0,
): InstitutionalImageValue {
  const family = familyId ? findNativeDesignFamilyById(familyId) : undefined;
  const familyFirst = family ? (variant % 2 === 0 ? family.palette.primary : family.palette.secondary) : first;
  const familySecond = family ? (variant % 3 === 0 ? family.palette.accent : family.palette.background) : second;
  return {
    assetId: `preview-${familyId ?? "generic"}-${label.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}-${variant}`,
    alt: label,
    // Native families ship with a real visual study image, so the first contact
    // with a template never looks like an empty wireframe. Generic/community
    // variants keep the lightweight generated illustration fallback.
    url: familyId && variant === 0
      ? `/institutional/examples/${familyId}.webp`
      : svgDataUri(familyFirst, familySecond, familyId, variant),
  };
}

function mergeContent(
  base: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const result = { ...base };
  Object.entries(source ?? {}).forEach(([key, value]) => {
    const emptyString = typeof value === "string" && value.trim() === "";
    const emptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || emptyString || emptyArray) return;
    result[key] = value;
  });
  return result;
}

export function previewContentForSection(
  type: InstitutionalSectionType,
  source?: Record<string, unknown>,
  familyId?: NativeDesignFamilyId,
): Record<string, unknown> {
  const defaults = createDefaultSectionContent(type);

  if (type === "site_header") {
    return mergeContent({
      ...defaults,
      brandLabel: familyId ? NATIVE_EXAMPLE_COPY[familyId].organizationName : "Organização demonstrativa",
      links: [
        { id: "preview-nav-1", label: "Sobre", href: "#section-preview-about" },
        { id: "preview-nav-2", label: "Projetos", href: "#section-preview-projects" },
        { id: "preview-nav-3", label: "Impacto", href: "#section-preview-impact" },
        { id: "preview-nav-4", label: "Como ajudar", href: "#section-preview-support" },
      ],
      primaryAction: { label: "Quero ajudar", href: "#section-preview-support" },
    }, source);
  }

  if (type === "organization_intro") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      eyebrow: family?.eyebrow ?? "Cuidado que vira oportunidade",
      title: family?.heroTitle ?? "Juntos, transformamos presença em impacto real.",
      description: family?.heroDescription ?? "Uma organização próxima das pessoas, com ações concretas e caminhos simples para participar, apoiar e acompanhar resultados.",
      image: previewImage("Atuação da organização", "#5945a8", "#f3a947", familyId),
      primaryAction: { label: "Conheça nosso trabalho", href: "#section-preview-about" },
      secondaryAction: { label: "Quero ajudar", href: "#section-preview-support" },
    }, source);
  }

  if (type === "organization_about") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      eyebrow: "Quem somos",
      title: family?.aboutTitle ?? "Uma história construída junto da comunidade",
      description: family?.aboutDescription ?? "Nascemos para aproximar pessoas, recursos e oportunidades. Trabalhamos com escuta, presença no território e acompanhamento para que cada ação faça sentido para quem participa.",
      image: previewImage("História e comunidade", "#6e5bc5", "#9bcfba", familyId, 8),
      action: { label: "Conheça nossa história", href: "#" },
    }, source);
  }

  if (type === "projects_showcase") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    const projectTitles = family?.projectTitles ?? ["Capacitação de voluntários", "Ações no território", "Rede de cuidado", "Participação comunitária"] as const;
    const projectCategories = family?.projectCategories ?? ["Formação", "Comunidade", "Apoio", "Participação"] as const;
    const projectDescriptions = family?.projectDescriptions ?? [
      "Encontros práticos para preparar pessoas que querem contribuir com segurança e clareza.",
      "Atividades presenciais construídas em parceria com moradores e organizações locais.",
      "Conexões entre pessoas, serviços e oportunidades para facilitar o acesso ao apoio necessário.",
      "Uma frente que convida pessoas e parceiros a construir impacto em conjunto.",
    ] as const;
    const sourceItems = Array.isArray(source?.items)
      ? source.items.map((raw, index) => {
          if (!raw || typeof raw !== "object") return raw;
          const item = raw as Record<string, unknown>;
          if (item.image) return item;
          const previewPalettes = [
            ["#315b9f", "#9bcfba"],
            ["#d06c5f", "#f0bd63"],
            ["#4a66b8", "#c2a7e8"],
            ["#2f7659", "#e4b653"],
          ] as const;
          const [first, second] = previewPalettes[index % previewPalettes.length];
          return {
            ...item,
            image: previewImage(String(item.title ?? `Projeto ${index + 1}`), first, second, familyId, index + 1),
          };
        })
      : undefined;
    return mergeContent({
      ...defaults,
      title: family?.projectsTitle ?? "Ações que acontecem de verdade",
      description: family?.projectsDescription ?? "Conheça algumas frentes de atuação e veja como cada iniciativa se conecta às necessidades da comunidade.",
      items: [
        { id: "preview-project-1", category: projectCategories[0], title: projectTitles[0], description: projectDescriptions[0], image: previewImage(projectTitles[0], "#315b9f", "#9bcfba", familyId, 1), action: { label: "Ver iniciativa", href: "#" } },
        { id: "preview-project-2", category: projectCategories[1], title: projectTitles[1], description: projectDescriptions[1], image: previewImage(projectTitles[1], "#d06c5f", "#f0bd63", familyId, 2), action: { label: "Ver iniciativa", href: "#" } },
        { id: "preview-project-3", category: projectCategories[2], title: projectTitles[2], description: projectDescriptions[2], image: previewImage(projectTitles[2], "#4a66b8", "#c2a7e8", familyId, 3), action: { label: "Ver iniciativa", href: "#" } },
        { id: "preview-project-4", category: projectCategories[3], title: projectTitles[3], description: projectDescriptions[3], image: previewImage(projectTitles[3], "#2f7659", "#e4b653", familyId, 4), action: { label: "Conhecer", href: "#" } },
      ],
    }, sourceItems ? { ...source, items: sourceItems } : source);
  }

  if (type === "impact_metrics") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    const metrics = family?.metrics ?? [
      { value: "12 mil+", label: "pessoas alcançadas", period: "exemplo" },
      { value: "48", label: "ações realizadas", period: "exemplo" },
      { value: "320+", label: "voluntários mobilizados", period: "exemplo" },
      { value: "18", label: "parcerias ativas", period: "exemplo" },
    ] as const;
    return mergeContent({
      ...defaults,
      title: family ? `O impacto da ${family.shortName} em números.` : "Impacto que pode ser acompanhado",
      description: family ? "Indicadores demonstrativos coerentes com a atuação desta organização fictícia." : "Indicadores ajudam a traduzir o alcance do trabalho e tornam os resultados mais fáceis de compreender.",
      items: metrics.map((metric, index) => ({ id: `preview-impact-${index + 1}`, ...metric, source: "" })),
    }, source);
  }

  if (type === "support_actions") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      title: family?.supportTitle ?? "Há diferentes formas de fazer parte",
      description: family?.supportDescription ?? "Escolha o caminho que combina com você. A organização explica o próximo passo sem complicação.",
      items: [
        { id: "preview-support-1", kind: "donate", title: "Doar", description: "Apoie ações e projetos com uma contribuição.", action: { label: "Quero doar", href: "#" } },
        { id: "preview-support-2", kind: "volunteer", title: "Ser voluntário", description: "Participe com tempo, conhecimento e presença.", action: { label: "Quero participar", href: "#" } },
        { id: "preview-support-3", kind: "partner", title: "Ser parceiro", description: "Construa iniciativas em conjunto com a organização.", action: { label: "Falar com a equipe", href: "#" } },
      ],
    }, source);
  }

  if (type === "transparency") {
    return mergeContent({
      ...defaults,
      title: "Transparência que aproxima",
      description: "Documentos e informações organizados para quem quer acompanhar a atuação da organização.",
      items: [
        { id: "preview-doc-1", category: "report", title: "Relatório de atividades", description: "Resultados, projetos e principais acontecimentos do período.", period: "2026", url: "#" },
        { id: "preview-doc-2", category: "finance", title: "Prestação de contas", description: "Resumo financeiro e destinação dos recursos.", period: "2026", url: "#" },
        { id: "preview-doc-3", category: "governance", title: "Documentos institucionais", description: "Informações de governança e funcionamento.", period: "", url: "#" },
      ],
    }, source);
  }

  if (type === "organization_contact") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      title: family ? `Fale com a ${family.shortName}.` : "Vamos conversar?",
      description: family?.contactDescription ?? "Escolha o canal mais conveniente para falar com a organização.",
      email: family?.email ?? "contato@organizacao.org.br",
      phone: family?.phone ?? "(00) 0000-0000",
      whatsapp: family?.phone ?? "(00) 00000-0000",
      address: family?.address ?? "Atuação comunitária e atendimento mediante orientação da equipe.",
      hours: "Segunda a sexta, em horário comercial",
      socialLinks: [
        { id: "preview-social-1", label: "Instagram", url: "#" },
        { id: "preview-social-2", label: "LinkedIn", url: "#" },
      ],
    }, source);
  }

  if (type === "custom_content") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      quote: family?.story ?? "“Uma história real pode ajudar a compreender o impacto para além dos números.”",
      person: family?.storyPerson ?? "História demonstrativa",
      eyebrow: family ? `UMA HISTÓRIA DA ${family.shortName.toLocaleUpperCase("pt-BR")}` : "HISTÓRIAS QUE INSPIRAM",
      title: family ? "Uma história para mostrar o impacto para além dos números." : "Pessoas e trajetórias dão sentido aos resultados.",
      description: family ? "Relato fictício criado para demonstrar como uma história humana pode entrar no template sem parecer texto genérico." : "Conteúdos demonstrativos ajudam a visualizar a composição. Ao editar, substitua por histórias reais e autorizadas da sua organização.",
      action: { label: "Conhecer mais histórias", href: "#" },
    }, source);
  }

  if (type === "site_footer") {
    const family = familyId ? NATIVE_EXAMPLE_COPY[familyId] : undefined;
    return mergeContent({
      ...defaults,
      title: family?.organizationName ?? "Sua organização",
      description: family?.footerDescription ?? "Pessoas, território e oportunidades conectados para gerar impacto duradouro.",
      email: family?.email ?? "contato@organizacao.org.br",
      phone: family?.phone ?? "(00) 0000-0000",
      socialLinks: [
        { id: "preview-footer-1", label: "Instagram", url: "#" },
        { id: "preview-footer-2", label: "LinkedIn", url: "#" },
      ],
      copyright: family ? `© 2026 ${family.organizationName}. Organização fictícia criada para demonstrar este modelo.` : "Exemplo de conteúdo para visualização do modelo.",
    }, source);
  }

  return mergeContent(defaults, source);
}

export function previewBrandForCategory(category: string): InstitutionalBrand {
  const family = findNativeDesignFamilyByCategory(category);
  const normalized = category.toLocaleLowerCase("pt-BR");
  const palette = family?.palette ?? (normalized.includes("impact")
    ? { primary: "#273d78", secondary: "#6b56b7", accent: "#f0a53c", background: "#fffdf8", text: "#17233d" }
    : normalized.includes("institucional") || normalized.includes("transpar")
      ? { primary: "#274f78", secondary: "#6f5aa8", accent: "#e8a840", background: "#fcfbf7", text: "#10233a" }
      : { primary: "#5b46a7", secondary: "#3b7c72", accent: "#efab42", background: "#fffdf9", text: "#17233d" });

  return {
    organizationId: "preview-organization",
    publicSlug: "preview",
    logoAssetId: null,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    textColor: palette.text,
    headingFont: "brand",
    bodyFont: "interface",
    logoAsset: null,
  };
}
export function previewBrandForVariant(variant: InstitutionalVariant): InstitutionalBrand {
  const family = findNativeDesignFamilyById(variant.familyKey) ?? findNativeDesignFamilyByName(variant.name);
  return previewBrandForCategory(family?.category ?? "humano");
}




function exampleLayoutForSection(
  layout: InstitutionalLayoutNode,
  sectionType: InstitutionalSectionType,
  familyId: NativeDesignFamilyId,
): InstitutionalLayoutNode {
  if (sectionType !== "custom_content") return structuredClone(layout);
  const copy = NATIVE_EXAMPLE_COPY[familyId];

  const walk = (node: InstitutionalLayoutNode): InstitutionalLayoutNode => {
    if (node.type === "element") {
      const id = node.id.toLocaleLowerCase("pt-BR");
      let value = node.value;
      if (id.includes("story-quote")) value = copy.story;
      else if (id.includes("story-person")) value = copy.storyPerson;
      else if (id.includes("story-eyebrow")) value = "HISTÓRIAS QUE INSPIRAM";
      else if (id.includes("story-title")) value = "Pessoas e trajetórias dão sentido aos resultados.";
      else if (id.includes("story-body")) value = "Uma história demonstrativa ajuda a visualizar o ritmo do design. Troque este conteúdo por relatos reais e autorizados da sua organização.";
      else if (id.includes("story-action")) value = { label: "Conhecer mais histórias", href: "#" };
      return { ...node, value };
    }
    if (node.type === "repeat") return { ...node, item: walk(node.item) };
    if (node.type === "stack" || node.type === "grid") return { ...node, children: node.children.map(walk) };
    if (node.type === "columns") return { ...node, children: [walk(node.children[0]), walk(node.children[1])] };
    return { ...node };
  };

  return walk(layout);
}

export function buildNativeExampleSite(
  site: InstitutionalSite,
  familyId: NativeDesignFamilyId,
): InstitutionalSite {
  const family = findNativeDesignFamilyById(familyId);
  if (!family) return site;

  const brand = previewBrandForCategory(family.category);
  return {
    ...structuredClone(site),
    name: `${NATIVE_EXAMPLE_COPY[familyId].organizationName} · ${family.name}`,
    organization: { ...site.organization, name: NATIVE_EXAMPLE_COPY[familyId].organizationName },
    brand: {
      ...brand,
      organizationId: site.brand.organizationId,
      publicSlug: site.brand.publicSlug,
      designSystem: site.brand.designSystem,
    },
    pages: site.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        content: previewContentForSection(section.sectionType, undefined, familyId),
        layout: exampleLayoutForSection(section.layout, section.sectionType, familyId),
      })),
    })),
  };
}

export function withCongBrandFallback(brand: InstitutionalBrand): InstitutionalBrand {
  const validHex = (value: string | null | undefined): value is string => Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
  return {
    ...brand,
    primaryColor: validHex(brand.primaryColor) ? brand.primaryColor : "#1366c4",
    secondaryColor: validHex(brand.secondaryColor) ? brand.secondaryColor : "#04523c",
    accentColor: validHex(brand.accentColor) ? brand.accentColor : "#f7b534",
    backgroundColor: validHex(brand.backgroundColor) ? brand.backgroundColor : "#ffffff",
    textColor: validHex(brand.textColor) ? brand.textColor : "#16345f",
  };
}

export function buildTemplatePreviewSite(
  template: InstitutionalTemplate,
  variants: InstitutionalVariant[],
): InstitutionalSite | null {
  const definition = template.definition;
  if (!definition?.pages.length) return null;
  const family = findNativeDesignFamilyById(template.familyKey) ?? findNativeDesignFamilyByName(template.name);

  const pages = definition.pages.map((sourcePage, pageIndex): InstitutionalSite["pages"][number] => {
    const previewPageId = `preview-page-${template.id}-${pageIndex}`;
    const sectionsToRender = family && sourcePage.isHome
      ? [...sourcePage.sections].sort((left, right) => {
          const order = NATIVE_EXAMPLE_SECTION_ORDER[family.id];
          return order.indexOf(left.sectionType) - order.indexOf(right.sectionType);
        })
      : sourcePage.sections;

    const sections = sectionsToRender.flatMap((section, index): InstitutionalSection[] => {
      const variant = variants.find((item) => item.versionId === section.variantVersionId);
      if (!variant) return [];
      const useExampleCopy = Boolean(family && sourcePage.isHome && !section.settings?.layoutOverride);
      return [{
        id: `preview-${template.id}-${pageIndex}-${index}`,
        pageId: previewPageId,
        sectionType: section.sectionType,
        variantVersionId: section.variantVersionId,
        position: index,
        visible: true,
        content: useExampleCopy
          ? previewContentForSection(section.sectionType, undefined, family?.id)
          : section.content,
        settings: section.settings ?? {},
        variantId: variant.id,
        variantName: variant.name,
        variantVersion: variant.version,
        layout: useExampleCopy
          ? exampleLayoutForSection(variant.layout, section.sectionType, family!.id)
          : variant.layout,
      }];
    });

    return {
      id: previewPageId,
      title: sourcePage.title,
      slug: sourcePage.slug,
      isHome: sourcePage.isHome,
      position: pageIndex,
      sections,
    };
  });

  const brand = previewBrandForCategory(family?.category ?? template.category);
  return {
    id: `preview-site-${template.id}`,
    name: template.name,
    slug: "preview",
    publicSlug: "preview",
    sourceTemplateId: template.id,
    editorConstraints: definition?.editorConstraints ?? {
      mode: "guided",
      minWidthPercent: 25,
      maxWidthPercent: 100,
      minFontSize: 12,
      maxFontSize: 72,
      maxOffset: 40,
    },
    isPrimary: false,
    publishedAt: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    organization: { id: "preview-organization", name: family ? NATIVE_EXAMPLE_COPY[family.id].organizationName : "Sua organização" },
    brand,
    pages,
  };
}
