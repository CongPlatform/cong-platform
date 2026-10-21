import {
  findNativeDesignFamilyById,
  findNativeDesignFamilyByName,
  nativeDesignFamilies,
  nativeFamilyVisualStyle,
} from "../data/institutional/nativeDesignFamilies";
import type {
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../services/institutionalService";

const recommendedVariantNames: Partial<
  Record<InstitutionalSectionType, string[]>
> = {
  site_header: nativeDesignFamilies.map((family) => family.name),
  organization_intro: nativeDesignFamilies.map((family) => family.name),
  organization_about: nativeDesignFamilies.map((family) => family.name),
  projects_showcase: nativeDesignFamilies.map((family) => family.name),
  impact_metrics: nativeDesignFamilies.map((family) => family.name),
  support_actions: nativeDesignFamilies.map((family) => family.name),
  transparency: nativeDesignFamilies.map((family) => family.name),
  organization_contact: nativeDesignFamilies.map((family) => family.name),
  site_footer: nativeDesignFamilies.map((family) => family.name),
  custom_content: nativeDesignFamilies.map((family) => family.name),
};

export function findRecommendedVariant(
  variants: InstitutionalVariant[],
  sectionType: InstitutionalSectionType,
  preferredName?: string,
): InstitutionalVariant | undefined {
  const available = variants.filter(
    (variant) =>
      variant.sectionType === sectionType &&
      (variant.isSystem || variant.status === "published"),
  );

  if (preferredName) {
    const exact = available.find((variant) => variant.name === preferredName);
    if (exact) return exact;
  }

  const recommendedNames = recommendedVariantNames[sectionType] ?? [];
  for (const name of recommendedNames) {
    const candidate = available.find((variant) => variant.name === name);
    if (candidate) return candidate;
  }

  return available[0];
}

const visualStyleByVariantName: Record<string, string> = {
  "Conexao · Manifesto de rede": "cx9-mosaico",
  "Conexao · Painel de vozes": "cx9-painel",
  "Conexao · Mapa de conexões": "cx9-eixos",
  "Conexao · Galeria movimento": "cx9-fotografia",
  "Conexao · Chamada interativa": "cx9-chamada",
  "Conexao · De onde vêm as conexões": "cx9-origem",
  "Conexao · Rede em movimento": "cx9-linha",
  "Conexao · Manifesto rede": "cx9-valores",
  "Conexao · Retrato coletivo": "cx9-retrato",
  "Conexao · Projetos conexão": "cx9-projetos",
  "Conexao · Revista de iniciativas": "cx9-caderno",
  "Conexao · Explorar por abas": "cx9-navegar",
  "Conexao · Registro audiovisual": "cx9-audiovisual",
  "Conexao · Programas em galeria": "cx9-arquivo",
  "Conexao · Dados em rede": "cx9-impacto",
  "Conexao · Painel editável": "cx9-grafico",
  "Conexao · Prestação de contas": "cx9-contas",
  "Conexao · Notas de evidência": "cx9-perguntas",
  "Conexao · Convite aberto": "cx9-participe",
  "Conexao · Trilhas de colaboração": "cx9-colabore",
  "Conexao · Encontros em imagem": "cx9-encontros",
  "Conexao · Como participar": "cx9-faq",
  "Conexao · Contato em rede": "cx9-contato",
  "Conexao · Canais por motivo": "cx9-rotas",
  "Conexao · Encerramento de conversa": "cx9-encerrar",

  "Essencial · Direto ao cuidado": "es9-porta",
  "Essencial · Qual ajuda você procura?": "es9-servicos",
  "Essencial · Acolhimento em prática": "es9-escuta",
  "Essencial · Orientações em abas": "es9-orientacoes",
  "Essencial · Convite humano": "es9-chamada",
  "Essencial · História do cuidado": "es9-historia",
  "Essencial · Valores de atendimento": "es9-valores",
  "Essencial · Equipe e processos": "es9-equipe",
  "Essencial · Etapas do projeto": "es9-percurso",
  "Essencial · Ações de saúde": "es9-frentes",
  "Essencial · Janelas de cuidado": "es9-programas",
  "Essencial · Como funciona": "es9-fluxo",
  "Essencial · Galeria de cuidado": "es9-galeria",
  "Essencial · Dúvidas práticas": "es9-perguntas",
  "Essencial · Transparência responsável": "es9-transparencia",
  "Essencial · Indicadores de exemplo": "es9-dados",
  "Essencial · Documentos e governança": "es9-documentos",
  "Essencial · Prestação de contas perguntas": "es9-accountability",
  "Essencial · Participe Essencial": "es9-participe",
  "Essencial · Voluntariado e parcerias": "es9-rotas",
  "Essencial · Apoio responsável": "es9-contribuicao",
  "Essencial · Dúvidas de participação": "es9-faq",
  "Essencial · Fale com o Essencial": "es9-contato-abertura",
  "Essencial · Canais de comunicação": "es9-canais",
  "Essencial · Contato e protocolos": "es9-fechamento",



  "Sereno · Capa fotografica": "sr8-capa-fotografica",
  "Sereno · Abertura manifesto": "sr8-abertura-manifesto",
  "Sereno · Agenda viva": "sr8-agenda-viva",
  "Sereno · Documentario de referencia": "sr8-documentario-de-referencia",
  "Sereno · Album de presencas": "sr8-album-de-presencas",
  "Sereno · Cta retorno": "sr8-cta-retorno",
  "Sereno · Historia capa": "sr8-historia-capa",
  "Sereno · Arquivo de vozes": "sr8-arquivo-de-vozes",
  "Sereno · Linha de encontros": "sr8-linha-de-encontros",
  "Sereno · Principios em voz alta": "sr8-principios-em-voz-alta",
  "Sereno · Fotografia de grupo": "sr8-fotografia-de-grupo",
  "Sereno · Fim historia": "sr8-fim-historia",
  "Sereno · Programacao abertura": "sr8-programacao-abertura",
  "Sereno · Oficina na mesa": "sr8-oficina-na-mesa",
  "Sereno · Caderno de campo": "sr8-caderno-de-campo",
  "Sereno · Horta do encontro": "sr8-horta-do-encontro",
  "Sereno · Galeria em movimento": "sr8-galeria-em-movimento",
  "Sereno · Roteiro de participacao": "sr8-roteiro-de-participacao",
  "Sereno · Clareza principio": "sr8-clareza-principio",
  "Sereno · Painel de registros": "sr8-painel-de-registros",
  "Sereno · O que prestamos contas": "sr8-o-que-prestamos-contas",
  "Sereno · Evidencias precisam de contexto": "sr8-evidencias-precisam-de-contexto",
  "Sereno · Duvidas de transparencia": "sr8-duvidas-de-transparencia",
  "Sereno · Participacao abertura": "sr8-participacao-abertura",
  "Sereno · Acoes para participar": "sr8-acoes-para-participar",
  "Sereno · Doar com responsabilidade": "sr8-doar-com-responsabilidade",
  "Sereno · Participar perguntas": "sr8-participar-perguntas",
  "Sereno · Cena de companhia": "sr8-cena-de-companhia",
  "Sereno · Contato manifesto": "sr8-contato-manifesto",
  "Sereno · Contato rotas": "sr8-contato-rotas",
  "Sereno · Contato guia": "sr8-contato-guia",
  "Sereno · Contato encerramento": "sr8-contato-encerramento",
  "Acolher · Casa aberta": "ac7-casa-aberta",
  "Acolher · Tracos de cuidado": "ac7-tracos-de-cuidado",
  "Acolher · Album de recomecos": "ac7-album-de-recomecos",
  "Acolher · Bilhete de casa": "ac7-bilhete-de-casa",
  "Acolher · Primeiro passo": "ac7-primeiro-passo",
  "Acolher · Convite janela": "ac7-convite-janela",
  "Acolher · Historia em primeira pessoa": "ac7-historia-em-primeira-pessoa",
  "Acolher · Olhares que acolhem": "ac7-olhares-que-acolhem",
  "Acolher · Rota do acolhimento": "ac7-rota-do-acolhimento",
  "Acolher · Cuidados em pratica": "ac7-cuidados-em-pratica",
  "Acolher · Historia convite": "ac7-historia-convite",
  "Acolher · Acoes catalogo": "ac7-acoes-catalogo",
  "Acolher · Fichas de encontro": "ac7-fichas-de-encontro",
  "Acolher · Cuidado e saude": "ac7-cuidado-e-saude",
  "Acolher · Roteiro de adocao": "ac7-roteiro-de-adocao",
  "Acolher · Galeria do cuidado": "ac7-galeria-do-cuidado",
  "Acolher · Acoes perguntas": "ac7-acoes-perguntas",
  "Acolher · Transparencia com compromisso": "ac7-transparencia-com-compromisso",
  "Acolher · Numeros com contexto": "ac7-numeros-com-contexto",
  "Acolher · Cuidado com os recursos": "ac7-cuidado-com-os-recursos",
  "Acolher · Documentos para publicar": "ac7-documentos-para-publicar",
  "Acolher · Responsabilidade fim": "ac7-responsabilidade-fim",
  "Acolher · Participar capa": "ac7-participar-capa",
  "Acolher · Formas de apoio": "ac7-formas-de-apoio",
  "Acolher · Apoio na pratica": "ac7-apoio-na-pratica",
  "Acolher · Materiais prioritarios": "ac7-materiais-prioritarios",
  "Acolher · Faq voluntariado": "ac7-faq-voluntariado",
  "Acolher · Participar fecho": "ac7-participar-fecho",
  "Acolher · Contato abertura": "ac7-contato-abertura",
  "Acolher · Contato roteiro": "ac7-contato-roteiro",
  "Acolher · Contato nota": "ac7-contato-nota",

  "Profundezas · Abertura do observatório": "deep5-ocean-cover",
  "Profundezas · Coordenadas do problema": "deep5-coordinate",
  "Profundezas · Indicadores com método": "deep5-reading",
  "Profundezas · Linha d’água": "deep5-waterline",
  "Profundezas · Instrumento em destaque": "deep5-sonar-feature",
  "Profundezas · Próximo mergulho": "deep5-home-end",
  "Profundezas · Princípio científico": "deep5-origin",
  "Profundezas · Protocolo de trabalho": "deep5-protocol",
  "Profundezas · Princípios de campo": "deep5-ethics",
  "Profundezas · Acervo de imagens": "deep5-story-gallery",
  "Profundezas · Índice das frentes": "deep5-research-index",
  "Profundezas · Pesquisa de profundidade": "deep5-sea-depth",
  "Profundezas · Biodiversidade em camadas": "deep5-reef",
  "Profundezas · Correntes e evidências": "deep5-currents",
  "Profundezas · Perguntas e respostas de campo": "deep5-faq",
  "Profundezas · Capa da informação": "deep5-open-data",
  "Profundezas · Série temporal editável": "deep5-chart-series",
  "Profundezas · Metodologia em evidência": "deep5-methods",
  "Profundezas · Perguntas sobre transparência": "deep5-transparency-faq",
  "Profundezas · Chamado à ciência cidadã": "deep5-join-intro",
  "Profundezas · Rotas de participação": "deep5-paths",
  "Profundezas · Convite de responsabilidade": "deep5-join-final",
  "Profundezas · Contato de laboratório": "deep5-contact-intro",
  "Profundezas · Mapa de contato": "deep5-contact-map",
  "Profundezas · Encerramento de contato": "deep5-contact-end",
  "Vozes · Manifesto de abertura": "voz4-manifesto",
  "Vozes · Faixa de declaração": "voz4-statement",
  "Vozes · Três compromissos": "voz4-principles",
  "Vozes · Fotografia com legenda editorial": "voz4-photo-feature",
  "Vozes · Índice de programas": "voz4-index",
  "Vozes · Encerramento com convite": "voz4-join-banner",
  "Vozes · Capa de testemunho": "voz4-story-cover",
  "Vozes · Retrato em arquivo": "voz4-story-portrait",
  "Vozes · Cronologia em edição": "voz4-story-timeline",
  "Vozes · Valores como manifesto": "voz4-story-values",
  "Vozes · Arquivo visual": "voz4-story-gallery",
  "Vozes · Cartaz de iniciativas": "voz4-actions-poster",
  "Vozes · Primeira frente, escuta": "voz4-program-listen",
  "Vozes · Programas em lista de campanha": "voz4-program-ledger",
  "Vozes · Navegação por frentes": "voz4-program-tabs",
  "Vozes · Composição visual de voz": "voz4-program-pictogram",
  "Vozes · Fecho de ações": "voz4-program-close",
  "Vozes · Declaração de transparência": "voz4-trust-opening",
  "Vozes · Nota editorial de responsabilidade": "voz4-trust-note",
  "Vozes · Gráfico de exemplo aberto": "voz4-trust-chart",
  "Vozes · Checklist documental": "voz4-trust-checklist",
  "Vozes · Canais de transparência": "voz4-trust-footer",
  "Vozes · Convite de campanha": "voz4-join-intro",
  "Vozes · Caminhos de participação editáveis": "voz4-join-actions",
  "Vozes · Compromissos mútuos": "voz4-join-principles",
  "Vozes · Perguntas de participação": "voz4-join-faq",
  "Vozes · Sinal público": "voz4-join-closing",
  "Vozes · Abertura tipográfica de contato": "voz4-contact-opening",
  "Vozes · Roteamento de assuntos": "voz4-contact-index",
  "Vozes · Encerramento cuidadoso": "voz4-contact-end",
  "Pulso · Capa de rua": "pulso3-hero",
  "Pulso · Faixa de movimento": "pulso3-stripes",
  "Pulso · Retrato da prática": "pulso3-movement",
  "Pulso · Mosaico de projetos": "pulso3-mosaic",
  "Pulso · Indicadores explicados": "pulso3-samples",
  "Pulso · Convite final de movimento": "pulso3-home-end",
  "Pulso · Manifesto em tipografia": "pulso3-story-open",
  "Pulso · Linha do tempo aberta": "pulso3-story-time",
  "Pulso · Cultura e identidade": "pulso3-story-culture",
  "Pulso · Princípios sem clichês": "pulso3-story-values",
  "Pulso · Galeria de memória": "pulso3-story-gallery",
  "Pulso · Cartaz dos programas": "pulso3-program-open",
  "Pulso · Esporte é encontro": "pulso3-sport",
  "Pulso · Oficinas criativas": "pulso3-creative",
  "Pulso · Formação de futuros": "pulso3-training",
  "Pulso · Perguntas sobre programas": "pulso3-program-guide",
  "Pulso · Painel de registros": "pulso3-program-media",
  "Pulso · Acompanhe as ações": "pulso3-program-last",
  "Pulso · Prestação de contas clara": "pulso3-trust-open",
  "Pulso · Guia para dados confiáveis": "pulso3-trust-principles",
  "Pulso · Gráfico aberto de atividades": "pulso3-trust-chart",
  "Pulso · Checklist de relatórios": "pulso3-trust-docs",
  "Pulso · Carta de responsabilidade": "pulso3-trust-end",
  "Pulso · Convite de participação": "pulso3-join-open",
  "Pulso · Caminhos de contribuição": "pulso3-join-options",
  "Pulso · Roteiro de chegada": "pulso3-join-steps",
  "Pulso · Fotografia de comunidade": "pulso3-join-image",
  "Pulso · Pacto de participação": "pulso3-join-end",
  "Pulso · Contato manifesto": "pulso3-contact-open",
  "Pulso · Assuntos e encaminhamentos": "pulso3-contact-routes",
  "Pulso · Orientação de contato seguro": "pulso3-contact-safety",
  "Território · Abertura de território": "tv2-opening",
  "Território · Caderno de campo": "tv2-field-index",
  "Território · Panorama de paisagem": "tv2-panorama",
  "Território · Frentes de proteção": "tv2-missions",
  "Território · Transparência começa no campo": "tv2-evidence",
  "Território · Convite à participação": "tv2-invitation",
  "Território · História de um território": "tv2-story-opening",
  "Território · Percurso da iniciativa": "tv2-journey",
  "Território · Olhar de perto": "tv2-field-portrait",
  "Território · Princípios e compromissos": "tv2-principles",
  "Território · Frentes que se conectam": "tv2-actions-opening",
  "Território · Programa de restauração": "tv2-forest-restoration",
  "Território · Monitoramento comunitário": "tv2-monitoring",
  "Território · Educação ambiental": "tv2-education",
  "Território · Galeria de paisagens": "tv2-field-gallery",
  "Território · Chamada de projetos": "tv2-actions-end",
  "Território · Carta de transparência": "tv2-transparency-opening",
  "Território · Indicadores verificáveis": "tv2-ledger",
  "Território · Trilha de prestação de contas": "tv2-accountability",
  "Território · Documentos institucionais": "tv2-documents",
  "Território · Participe do território": "tv2-join-opening",
  "Território · Três portas de entrada": "tv2-join-paths",
  "Território · Passos para iniciar": "tv2-join-steps",
  "Território · Compromisso recíproco": "tv2-join-commitment",
  "Território · Contato direto": "tv2-contact-opening",
  "Território · Assuntos e canais": "tv2-contact-paths",
  "Território · Compromisso de resposta": "tv2-contact-end",
  "Horizonte · Capa de revista educacional": "horizonte-cover",
  "Horizonte · Índice editorial": "horizonte-index",
  "Horizonte · Reportagem fotográfica": "horizonte-reportage",
  "Horizonte · Manifesto de impacto": "horizonte-principles",
  "Horizonte · Convite final": "horizonte-home-invitation",
  "Horizonte · Abertura de história": "horizonte-about-intro",
  "Horizonte · Retrato e propósito": "horizonte-about-portrait",
  "Horizonte · Percurso em etapas": "horizonte-about-path",
  "Horizonte · Valores em duas colunas": "horizonte-about-values",
  "Horizonte · Fecho institucional": "horizonte-about-end",
  "Horizonte · Apresentação de programas": "horizonte-actions-intro",
  "Horizonte · Oficina em destaque": "horizonte-actions-card-one",
  "Horizonte · Encontro de aprendizagem": "horizonte-actions-card-two",
  "Horizonte · Três frentes de ação": "horizonte-actions-list",
  "Horizonte · Perguntas sobre programas": "horizonte-actions-faq",
  "Horizonte · Chamada para programas": "horizonte-actions-end",
  "Horizonte · Transparência editorial": "horizonte-trust-intro",
  "Horizonte · Imagem e compromisso": "horizonte-trust-feature",
  "Horizonte · Gráfico de exemplo editável": "horizonte-trust-indicators",
  "Horizonte · Guia de documentos": "horizonte-trust-docs",
  "Horizonte · Compromisso público": "horizonte-trust-end",
  "Horizonte · Participe com retrato": "horizonte-join-cover",
  "Horizonte · Caminhos de participação": "horizonte-join-options",
  "Horizonte · Passos para colaborar": "horizonte-join-steps",
  "Horizonte · Dúvidas sobre participação": "horizonte-join-faq",
  "Horizonte · Convite para colaboração": "horizonte-join-end",
  "Horizonte · Contato com abertura panorâmica": "horizonte-contact-intro",
  "Horizonte · Assuntos para contato": "horizonte-contact-paths",
  "Horizonte · Direcionamento de contato": "horizonte-contact-end",
  "Comunidade · Abertura da rua": "co6-abertura-da-rua",
  "Comunidade · Quatro pontos do bairro": "co6-quatro-pontos-do-bairro",
  "Comunidade · Cartografia de histórias": "co6-cartografia-de-historias",
  "Comunidade · Faixa manifesto": "co6-faixa-manifesto",
  "Comunidade · Cinema de bairro": "co6-cinema-de-bairro",
  "Comunidade · Convite em cartaz": "co6-convite-em-cartaz",
  "Comunidade · Carta de apresentação": "co6-carta-de-apresentacao",
  "Comunidade · Retratos em camadas": "co6-retratos-em-camadas",
  "Comunidade · Linha de construção": "co6-linha-de-construcao",
  "Comunidade · Princípios de convivência": "co6-principios-de-convivencia",
  "Comunidade · Ponto de partida": "co6-ponto-de-partida",
  "Comunidade · Projetos como endereços": "co6-projetos-como-enderecos",
  "Comunidade · Grande obra em foco": "co6-grande-obra-em-foco",
  "Comunidade · Índice de ações interativo": "co6-indice-de-acoes-interativo",
  "Comunidade · Planta do território": "co6-planta-do-territorio",
  "Comunidade · Galeria de campo": "co6-galeria-de-campo",
  "Comunidade · Transparência sem atalhos": "co6-transparencia-sem-atalhos",
  "Comunidade · Resultados com fontes": "co6-resultados-com-fontes",
  "Comunidade · Como prestar contas": "co6-como-prestar-contas",
  "Comunidade · Documentação de bairro": "co6-documentacao-de-bairro",
  "Comunidade · Rodapé de confiança": "co6-rodape-de-confianca",
  "Comunidade · Mutirão visual": "co6-mutirao-visual",
  "Comunidade · Caminhos para contribuir": "co6-caminhos-para-contribuir",
  "Comunidade · Roteiro de participação": "co6-roteiro-de-participacao",
  "Comunidade · A participação tem rosto": "co6-a-participacao-tem-rosto",
  "Comunidade · Convite em movimento": "co6-convite-em-movimento",
  "Comunidade · Contato com localização": "co6-contato-com-localizacao",
  "Comunidade · Contato por assunto": "co6-contato-por-assunto",
  "Comunidade · Compromisso com o cuidado": "co6-compromisso-com-o-cuidado",
  "Navegação humana": "header-human",
  "Navegação essencial": "header-essential",
  "Presença humana": "hero-human-v2",
  "Manifesto claro": "hero-clear",
  "Impacto em movimento": "impact-story",
  "Números editoriais": "impact-editorial",
  "História com presença": "about-human-v2",
  "Projetos em mosaico": "projects-mosaic-v2",
  "Projetos editoriais": "projects-editorial-v2",
  "Caminhos para participar": "support-human-v2",
  "Contato próximo": "contact-human-v2",
  "Rodapé com propósito": "footer-purpose",
  "Rodapé essencial": "footer-essential",
  "Como o trabalho acontece": "process-v2",
  "Campanha editorial": "hero-campaign",
  "Resultados em linha": "impact-ribbon",
  "Editorial com destaque": "about-premium",
  "Ações com destaque": "support-featured",
  "Missão, visão e valores": "values-editorial",
  "Chamada final": "cta-editorial",
  "Linha do tempo": "timeline-editorial",
  "Narrativa humana": "hero-human",
  "Manifesto editorial": "hero-editorial",
  "História editorial": "story-split",
  "Mosaico de iniciativas": "cards-airy",
  "Faixa de impacto": "impact-band",
  "Convites para participar": "support-cards",
  "Painel de confiança": "trust-panel",
  "Contato acolhedor": "contact-panel",
  "Rodapé editorial": "footer-rich",
  "Como funciona": "process",
  "Públicos e participação": "audiences",
  "História em destaque": "story-split",
};

const pulsoAuthoredSectionStyles: Record<string, Record<string, unknown>> = {
  "pulso3-hero": {
    "backgroundColor": "#111922",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundImage": {
      "assetId": "44ed5949-4e19-5f38-a0a4-b7f1ebd40fc5",
      "alt": "Jovens em cenário urbano ao entardecer, imagem ilustrativa"
    },
    "backgroundTreatment": "gradient",
    "backgroundPositionX": 57,
    "backgroundPositionY": 45
  },
  "pulso3-stripes": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-movement": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-mosaic": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-samples": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-home-end": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-story-open": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "pulso3-story-time": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-story-culture": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-story-values": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-story-gallery": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-program-open": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundImage": {
      "assetId": "6ee6fabe-de5f-50da-86b4-33f7ebdf3c18",
      "alt": "Jovens em conversa ao ar livre, composição ilustrativa"
    },
    "backgroundTreatment": "gradient",
    "backgroundPositionX": 57,
    "backgroundPositionY": 45
  },
  "pulso3-sport": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-creative": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-training": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-program-guide": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-program-media": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-program-last": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-trust-open": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-trust-principles": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-trust-chart": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-trust-docs": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-trust-end": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-join-open": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundImage": {
      "assetId": "6ee6fabe-de5f-50da-86b4-33f7ebdf3c18",
      "alt": "Jovens em conversa ao ar livre, composição ilustrativa"
    },
    "backgroundTreatment": "gradient",
    "backgroundPositionX": 57,
    "backgroundPositionY": 45
  },
  "pulso3-join-options": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-join-steps": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-join-image": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-join-end": {
    "backgroundColor": "#171c24",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-contact-open": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-contact-routes": {
    "backgroundColor": "background",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "pulso3-contact-safety": {
    "backgroundColor": "#f5f0e7",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  }
};

const vozesEditorialSectionStyles: Record<string, Record<string, unknown>> = {
  "voz4-manifesto": {
    "backgroundColor": "#F7F1E9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-statement": {
    "backgroundColor": "#741F4D",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-principles": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-photo-feature": {
    "backgroundColor": "#F7F1E9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-index": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-join-banner": {
    "backgroundColor": "#241622",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-story-cover": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-story-portrait": {
    "backgroundColor": "#F3E2D9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-story-timeline": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-story-values": {
    "backgroundColor": "#F7F1E9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-story-gallery": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-actions-poster": {
    "backgroundColor": "#741F4D",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-program-listen": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-program-ledger": {
    "backgroundColor": "#F3E2D9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-program-tabs": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-program-pictogram": {
    "backgroundColor": "#F7F1E9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-program-close": {
    "backgroundColor": "#241622",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-trust-opening": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-trust-note": {
    "backgroundColor": "#F3E2D9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-trust-chart": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-trust-checklist": {
    "backgroundColor": "#F7F1E9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-trust-footer": {
    "backgroundColor": "#741F4D",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-join-intro": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-join-actions": {
    "backgroundColor": "#F3E2D9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-join-principles": {
    "backgroundColor": "#241622",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-join-faq": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-join-closing": {
    "backgroundColor": "#741F4D",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-contact-opening": {
    "backgroundColor": "#FFF9F3",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "generous"
  },
  "voz4-contact-index": {
    "backgroundColor": "#F3E2D9",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  },
  "voz4-contact-end": {
    "backgroundColor": "#241622",
    "backgroundDecor": "none",
    "contentWidth": "wide",
    "spacing": "comfortable"
  }
};

const profundezasAtlasStyles: Record<string, Record<string, unknown>> = {
  "deep5-ocean-cover": {
    "backgroundColor": "#061D30",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "full",
    "backgroundImage": {
      "assetId": "f58074d4-b905-5917-9ff5-694aebe7a9cc",
      "alt": "Baleia-jubarte no oceano com espaço lateral para texto"
    },
    "backgroundTreatment": "dark",
    "backgroundPositionX": 62,
    "backgroundPositionY": 44
  },
  "deep5-coordinate": {
    "backgroundColor": "#E8F3F0",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-reading": {
    "backgroundColor": "#FFFFFF",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-waterline": {
    "backgroundColor": "#DCEFED",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-sonar-feature": {
    "backgroundColor": "#07243A",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-home-end": {
    "backgroundColor": "#0B3547",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-origin": {
    "backgroundColor": "#F5F8F5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "deep5-protocol": {
    "backgroundColor": "#E5F2F0",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-ethics": {
    "backgroundColor": "#072B3D",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-story-gallery": {
    "backgroundColor": "#FFFFFF",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-research-index": {
    "backgroundColor": "#E6F2EF",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "deep5-sea-depth": {
    "backgroundColor": "#FFFFFF",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-reef": {
    "backgroundColor": "#DCEFED",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-currents": {
    "backgroundColor": "#082E43",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-faq": {
    "backgroundColor": "#F5F8F5",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-open-data": {
    "backgroundColor": "#E5F2F0",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "deep5-chart-series": {
    "backgroundColor": "#FFFFFF",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-methods": {
    "backgroundColor": "#082D43",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-transparency-faq": {
    "backgroundColor": "#F5F8F5",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-join-intro": {
    "backgroundColor": "#F5F8F5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "deep5-paths": {
    "backgroundColor": "#DDEFEA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-join-final": {
    "backgroundColor": "#092E43",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-contact-intro": {
    "backgroundColor": "#E4F1ED",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "deep5-contact-map": {
    "backgroundColor": "#FFFFFF",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "deep5-contact-end": {
    "backgroundColor": "#082B40",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  }
};

const comunidadeCadernoStyles: Record<string, Record<string, unknown>> = {
  "co6-abertura-da-rua": {
    "backgroundColor": "#163D34",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "full",
    "backgroundImage": {
      "assetId": "f09c7997-ef4d-59d5-af36-9889e14f4e36",
      "alt": "Rua de bairro com casas coloridas e moradores caminhando"
    },
    "backgroundTreatment": "gradient",
    "backgroundPositionX": 59,
    "backgroundPositionY": 49
  },
  "co6-quatro-pontos-do-bairro": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-cartografia-de-historias": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-faixa-manifesto": {
    "backgroundColor": "#203E35",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "full"
  },
  "co6-cinema-de-bairro": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-convite-em-cartaz": {
    "backgroundColor": "#9A3F25",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-carta-de-apresentacao": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "co6-retratos-em-camadas": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-linha-de-construcao": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-principios-de-convivencia": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-ponto-de-partida": {
    "backgroundColor": "#D8CBB6",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-projetos-como-enderecos": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "co6-grande-obra-em-foco": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-indice-de-acoes-interativo": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-planta-do-territorio": {
    "backgroundColor": "#D8CBB6",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-galeria-de-campo": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-transparencia-sem-atalhos": {
    "backgroundColor": "#203E35",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "co6-resultados-com-fontes": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-como-prestar-contas": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-documentacao-de-bairro": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-rodape-de-confianca": {
    "backgroundColor": "#203E35",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-mutirao-visual": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "co6-caminhos-para-contribuir": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-roteiro-de-participacao": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-a-participacao-tem-rosto": {
    "backgroundColor": "#FFF8EC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-convite-em-movimento": {
    "backgroundColor": "#9A3F25",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-contato-com-localizacao": {
    "backgroundColor": "#F1E7D5",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "co6-contato-por-assunto": {
    "backgroundColor": "#EDE7D8",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "co6-compromisso-com-o-cuidado": {
    "backgroundColor": "#203E35",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  }
};

const acolherCasaStyles: Record<string, Record<string, unknown>> = {
  "ac7-casa-aberta": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-tracos-de-cuidado": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-album-de-recomecos": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-bilhete-de-casa": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-primeiro-passo": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-convite-janela": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-historia-em-primeira-pessoa": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-olhares-que-acolhem": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-rota-do-acolhimento": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-cuidados-em-pratica": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-historia-convite": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-acoes-catalogo": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-fichas-de-encontro": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-cuidado-e-saude": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-roteiro-de-adocao": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-galeria-do-cuidado": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-acoes-perguntas": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-transparencia-com-compromisso": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-numeros-com-contexto": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-cuidado-com-os-recursos": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-documentos-para-publicar": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-responsabilidade-fim": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-participar-capa": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-formas-de-apoio": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-apoio-na-pratica": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-materiais-prioritarios": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-faq-voluntariado": {
    "backgroundColor": "#DAE8DA",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-participar-fecho": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-contato-abertura": {
    "backgroundColor": "#FCF7EE",
    "backgroundDecor": "none",
    "spacing": "generous",
    "contentWidth": "wide"
  },
  "ac7-contato-roteiro": {
    "backgroundColor": "#E9D9CC",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  },
  "ac7-contato-nota": {
    "backgroundColor": "#365A4C",
    "backgroundDecor": "none",
    "spacing": "comfortable",
    "contentWidth": "wide"
  }
};

const serenoPresencasStyles: Record<string, Record<string, unknown>> = {
  "sr8-capa-fotografica": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none",
    "backgroundImage": {
      "assetId": "1503ac30-255f-539c-84f4-cd742789095f",
      "alt": "Mulher idosa conversando com jovem em praça arborizada"
    },
    "backgroundTreatment": "dark",
    "backgroundPositionX": 51
  },
  "sr8-abertura-manifesto": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-agenda-viva": {
    "backgroundColor": "#E5EADD",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-documentario-de-referencia": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-album-de-presencas": {
    "backgroundColor": "#F5F3EB",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-cta-retorno": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-historia-capa": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-arquivo-de-vozes": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-linha-de-encontros": {
    "backgroundColor": "#FFFDF8",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-principios-em-voz-alta": {
    "backgroundColor": "#E5EADD",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-fotografia-de-grupo": {
    "backgroundColor": "#F5F3EB",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-fim-historia": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-programacao-abertura": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-oficina-na-mesa": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-caderno-de-campo": {
    "backgroundColor": "#E5EADD",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-horta-do-encontro": {
    "backgroundColor": "#F5F3EB",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-galeria-em-movimento": {
    "backgroundColor": "#FFFDF8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-roteiro-de-participacao": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-clareza-principio": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-painel-de-registros": {
    "backgroundColor": "#FFFDF8",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-o-que-prestamos-contas": {
    "backgroundColor": "#E5EADD",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-evidencias-precisam-de-contexto": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-duvidas-de-transparencia": {
    "backgroundColor": "#F5F3EB",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-participacao-abertura": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-acoes-para-participar": {
    "backgroundColor": "#E5EADD",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-doar-com-responsabilidade": {
    "backgroundColor": "#FFFDF8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-participar-perguntas": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-cena-de-companhia": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none",
    "backgroundImage": {
      "assetId": "e0f387ec-ae5e-5033-a77f-8b8d349a041b",
      "alt": "Pessoas idosas cultivando horta comunitária"
    },
    "backgroundTreatment": "dark",
    "backgroundPositionX": 51
  },
  "sr8-contato-manifesto": {
    "backgroundColor": "#F5F3EB",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-contato-rotas": {
    "backgroundColor": "#E5EADD",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-contato-guia": {
    "backgroundColor": "#EAE1D4",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "sr8-contato-encerramento": {
    "backgroundColor": "#28483C",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  }
};

const essencial09SectionStyles: Record<string, Record<string, unknown>> = {
  "es9-porta": {
    "backgroundColor": "#F4F8F7",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-servicos": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-escuta": {
    "backgroundColor": "#E8F0EF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-orientacoes": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-chamada": {
    "backgroundColor": "#0E4C5A",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-historia": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-valores": {
    "backgroundColor": "#F4F8F7",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-equipe": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-percurso": {
    "backgroundColor": "#E8F0EF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-frentes": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-programas": {
    "backgroundColor": "#F4F8F7",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-fluxo": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-galeria": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-perguntas": {
    "backgroundColor": "#E8F0EF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-transparencia": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-dados": {
    "backgroundColor": "#F4F8F7",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-documentos": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-accountability": {
    "backgroundColor": "#E8F0EF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-participe": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-rotas": {
    "backgroundColor": "#F4F8F7",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-contribuicao": {
    "backgroundColor": "#0E4C5A",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-faq": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-contato-abertura": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-canais": {
    "backgroundColor": "#F4F8F7",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "es9-fechamento": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  }
};

const conexao09SectionStyles: Record<string, Record<string, unknown>> = {
  "cx9-mosaico": {
    "backgroundColor": "#152A27",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none",
    "backgroundImage": {
      "assetId": "0bf223f8-5e46-58c2-b3e1-c558f22faf94",
      "alt": "Imagem demonstrativa de encontro — conexao"
    },
    "backgroundTreatment": "gradient"
  },
  "cx9-painel": {
    "backgroundColor": "#FBFCF9",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-eixos": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-fotografia": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-chamada": {
    "backgroundColor": "#365BA8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-origem": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-linha": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-valores": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-retrato": {
    "backgroundColor": "#F4E5CE",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-projetos": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-caderno": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-navegar": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-audiovisual": {
    "backgroundColor": "#152A27",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-arquivo": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-impacto": {
    "backgroundColor": "#EFF3E8",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-grafico": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-contas": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-perguntas": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-participe": {
    "backgroundColor": "#152A27",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none",
    "backgroundImage": {
      "assetId": "c08b327d-c1bd-561d-b0d8-6a0bea34cc83",
      "alt": "Imagem demonstrativa de mural — conexao"
    },
    "backgroundTreatment": "dark"
  },
  "cx9-colabore": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-encontros": {
    "backgroundColor": "#FFFFFF",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-faq": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-contato": {
    "backgroundColor": "#FFFFFF",
    "spacing": "generous",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-rotas": {
    "backgroundColor": "#EFF3E8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  },
  "cx9-encerrar": {
    "backgroundColor": "#365BA8",
    "spacing": "comfortable",
    "contentWidth": "wide",
    "backgroundDecor": "none"
  }
};

export function defaultSettingsForVariant(
  variant: InstitutionalVariant,
): Record<string, unknown> {
  const family =
    findNativeDesignFamilyById(variant.familyKey) ??
    findNativeDesignFamilyByName(variant.name);
  const visualStyle = visualStyleByVariantName[variant.name]
    ?? (family ? nativeFamilyVisualStyle(family.id, variant.sectionType) : undefined);
  if (!visualStyle) return {};
  if (visualStyle.startsWith("sr8-")) return { visualStyle, sectionStyle: serenoPresencasStyles[visualStyle] ?? { backgroundColor: "#F5F3EB", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("cx9-")) return { visualStyle, sectionStyle: conexao09SectionStyles[visualStyle] ?? { backgroundColor: "#FFFFFF", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("es9-")) return { visualStyle, sectionStyle: essencial09SectionStyles[visualStyle] ?? { backgroundColor: "#FFFFFF", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("ac7-")) return { visualStyle, sectionStyle: acolherCasaStyles[visualStyle] ?? { backgroundColor: "#FCF7EE", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("co6-")) return { visualStyle, sectionStyle: comunidadeCadernoStyles[visualStyle] ?? { backgroundColor: "#FFF8EC", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("deep5-")) return { visualStyle, sectionStyle: profundezasAtlasStyles[visualStyle] ?? { backgroundColor: "#F5F8F5", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("voz4-")) return { visualStyle, sectionStyle: vozesEditorialSectionStyles[visualStyle] ?? { backgroundColor: "#FFF9F3", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  if (visualStyle.startsWith("pulso3-")) {
    return { visualStyle, sectionStyle: pulsoAuthoredSectionStyles[visualStyle] ?? { backgroundColor: "background", backgroundDecor: "none", spacing: "comfortable", contentWidth: "wide" } };
  }

  const header = variant.sectionType === "site_header";
  const generous = variant.sectionType === "organization_intro";
  const normalWidth =
    variant.sectionType === "organization_contact" ||
    variant.name === "História editorial";
  const editorialDarkVariant = [
    "tv2-opening",
    "tv2-invitation",
    "tv2-principles",
    "tv2-actions-end",
    "tv2-join-commitment",
    "tv2-contact-end",
    "horizonte-principles", "horizonte-about-end", "horizonte-actions-end",
    "horizonte-trust-end", "horizonte-join-end", "horizonte-contact-end",
  ].includes(visualStyle ?? "");
  const familyBackground = editorialDarkVariant
    ? "primary"
    : family &&
    ["tv2-vivo", "essencial", "pulso", "profundezas"].includes(
      family.id,
    ) &&
    ["organization_intro", "custom_content", "site_footer"].includes(
      variant.sectionType,
    )
      ? "primary"
      : variant.sectionType === "site_footer"
        ? "primary"
        : "background";

  return {
    visualStyle,
    sectionStyle: {
      spacing: header ? "compact" : generous ? "generous" : "comfortable",
      contentWidth: normalWidth ? "normal" : "wide",
      backgroundColor: familyBackground,
      backgroundDecor: family ? "template" : undefined,
    },
  };
}
