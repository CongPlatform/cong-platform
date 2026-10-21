import type { NativeDesignFamilyId } from "./nativeDesignFamilies";

export interface NativeEditorialPhoto {
  assetId: string;
  alt: string;
  url: string;
  fallback?: string;
}

export const nativeEditorialPhotos: Record<
  NativeDesignFamilyId,
  readonly NativeEditorialPhoto[]
> = {
  "horizonte": [
    {
      assetId: "146e56f0-9e93-5a77-b1c7-3d08f4696d16",
      alt: "Estudantes colaborando na biblioteca",
      url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644",
    },
    {
      assetId: "2ea778c9-5b71-54c1-b99e-4816f291982c",
      alt: "Estudantes colaborando na biblioteca",
      url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45",
    },
    {
      assetId: "1584173f-3da9-5558-8daf-fff08ea060c4",
      alt: "Jovens durante cerimônia de formação",
      url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "49f28f66-2bcc-5505-aca7-fe9d9e480d42",
      alt: "Estudantes em atividade coletiva",
      url: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "cc995d89-82e6-5de5-b24c-661b0bd15e41",
      alt: "Grupo de estudantes trabalhando em conjunto em uma sala de aula",
      url: "/institutional/editorial/horizonte-editorial-1.webp",
    },
    {
      assetId: "f62210c7-4a8a-5a1d-adcd-261c52ccd125",
      alt: "Caderno de estudos e laptop sobre a mesa de trabalho",
      url: "/institutional/editorial/horizonte-editorial-2.webp",
    },
    {
      assetId: "56073ef9-f8a0-549d-9f97-9bcea97f82ec",
      alt: "Educador conduzindo uma oficina diante da turma",
      url: "/institutional/editorial/horizonte-editorial-3.webp",
    },
    {
      assetId: "fcf0626a-cb66-5c6d-8bc1-8376c6ec12e1",
      alt: "Participantes organizando livros na biblioteca comunitária",
      url: "/institutional/editorial/horizonte-editorial-4.webp",
    },
    {
      assetId: "a02dea41-1fe0-5a77-a6a3-a6a6bb6232fe",
      alt: "Estudantes utilizando computadores durante uma formação",
      url: "/institutional/editorial/horizonte-editorial-5.webp",
    },
    {
      assetId: "d1d5b9fe-9f75-5ff2-bfab-d430ea3ba58d",
      alt: "Participante levantando a mão para contribuir com a aula",
      url: "/institutional/editorial/horizonte-editorial-6.webp",
    },
  ],
  "territorio-vivo": [
    { assetId: "3ed56cd9-37dc-5e6c-9052-aff168f1c537", alt: "Cachoeira cercada de vegetação", url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716", fallback: "/institutional/editorial/territorio-vivo-fallback-5.webp" },
    { assetId: "e161aa5c-5788-5d03-9a5a-7e56148a2009", alt: "Cordilheira coberta por floresta e céu do entardecer", url: "https://images.unsplash.com/photo-1511497584788-876760111969", fallback: "/institutional/editorial/territorio-vivo-fallback-6.webp" },
    { assetId: "955fa3ed-8395-58fb-b645-ceff4fec7ec9", alt: "Vegetação de floresta úmida iluminada por névoa", url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5", fallback: "/institutional/editorial/territorio-vivo-fallback-7.webp" },
    { assetId: "40632f14-bae3-56ef-8593-d0afe0ee7b99", alt: "Sol sobre colinas e vegetação nativa", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470", fallback: "/institutional/editorial/territorio-vivo-fallback-8.webp" },
    {
      assetId: "93000888-2beb-56bc-91eb-49b4c42fe902",
      alt: "Floresta preservada e luz natural",
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
      fallback: "/institutional/editorial/territorio-vivo-fallback-1.webp",
    },
    {
      assetId: "8dfd19fa-b288-5828-8f50-96ae5def9cf5",
      alt: "Floresta preservada e luz natural",
      url: "https://images.unsplash.com/photo-1500534623283-312aade485b7",
      fallback: "/institutional/editorial/territorio-vivo-fallback-2.webp",
    },
    {
      assetId: "7e4c301f-6d1c-58f2-a1ac-c13309203f9d",
      alt: "Floresta com luz natural",
      url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1280&q=80",
      fallback: "/institutional/editorial/territorio-vivo-fallback-3.webp",
    },
    {
      assetId: "ed5737a8-6ea7-5714-bfdd-b6d1545392e9",
      alt: "Paisagem de mata conservada",
      url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80",
      fallback: "/institutional/editorial/territorio-vivo-fallback-4.webp",
    },
  ],
  "acolher": [
    {"assetId": "c0d23e31-e9ad-50de-a48e-de053fcc8239", "alt": "Cachorro caramelo em abrigo bem iluminado", "url": "/institutional/editorial/acolher07-cachorro.webp"},
    {"assetId": "1db9fb35-5cbb-5c4b-b22d-8956ced52123", "alt": "Gato tigrado deitado em sofá no abrigo", "url": "/institutional/editorial/acolher07-gato.webp"},
    {"assetId": "d3800222-4d9a-5a8b-89db-6e59616c9649", "alt": "Voluntário fazendo carinho em cachorro preto", "url": "/institutional/editorial/acolher07-vinculo.webp"},
    {"assetId": "ea3ec638-31f3-53e1-9aa2-5d21c27c08c1", "alt": "Cachorro idoso descansando no ambiente do abrigo", "url": "/institutional/editorial/acolher07-idoso.webp"},
    {"assetId": "0fb65ae8-ada2-595d-bf11-98f9ea2ee36d", "alt": "Veterinária examinando filhote de gato", "url": "/institutional/editorial/acolher07-clinica.webp"},
    {"assetId": "d35e15af-8b46-5071-a0bf-3dcdd3ed8c7b", "alt": "Mulher acolhendo um cachorro em área verde", "url": "/institutional/editorial/acolher07-familia.webp"},
    {"assetId": "edfb16b5-3546-5265-b787-772ade4cf2a7", "alt": "Ilustração editável das quatro etapas do acolhimento", "url": "/institutional/editorial/acolher07-jornada.svg"},

    {
      assetId: "03371f2f-6451-5ac8-9157-f3db91efb9a6",
      alt: "Cachorro aguardando carinho e adoção",
      url: "https://images.unsplash.com/photo-1558788353-f76d92427f16",
    },
    {
      assetId: "dd19150f-36c0-5e29-aa86-9491435b04b2",
      alt: "Cachorro aguardando carinho e adoção",
      url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb",
    },
    {
      assetId: "c4cd182d-4438-554f-909b-45fb723a8890",
      alt: "Cães em ambiente externo",
      url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "469987cb-af7f-5cac-8d92-04ae57ad4474",
      alt: "Retrato de cachorro",
      url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "essencial": [
    {"assetId": "9f4b6ddc-fd5d-5b2f-a193-a19a9a4c6069", "alt": "Imagem demonstrativa de atendimento — essencial", "url": "/institutional/editorial/essencial09-atendimento.webp"},
    {"assetId": "a225558a-2695-5ead-ae99-0b1a6ea94970", "alt": "Imagem demonstrativa de cuidado — essencial", "url": "/institutional/editorial/essencial09-cuidado.webp"},
    {"assetId": "5712b774-c531-5aa7-bc06-18b76a733eea", "alt": "Imagem demonstrativa de oficina — essencial", "url": "/institutional/editorial/essencial09-oficina.webp"},
    {"assetId": "18f86df1-1062-5b38-af7a-b0e4fdcd7fef", "alt": "Imagem demonstrativa de equipe — essencial", "url": "/institutional/editorial/essencial09-equipe.webp"},
    {"assetId": "aa80c751-249f-535e-962b-d522f05e9b0e", "alt": "Imagem demonstrativa de recepcao — essencial", "url": "/institutional/editorial/essencial09-recepcao.webp"},
    {"assetId": "7a05e653-3001-5638-bc90-a09ccedcbc86", "alt": "Imagem demonstrativa de movimento — essencial", "url": "/institutional/editorial/essencial09-movimento.webp"},
    {"assetId": "9f4b6ddc-fd5d-5b2f-a193-a19a9a4c6069", "alt": "Imagem demonstrativa de atendimento — essencial", "url": "/institutional/editorial/essencial09-atendimento.webp"},
    {"assetId": "a225558a-2695-5ead-ae99-0b1a6ea94970", "alt": "Imagem demonstrativa de cuidado — essencial", "url": "/institutional/editorial/essencial09-cuidado.webp"},
    {"assetId": "5712b774-c531-5aa7-bc06-18b76a733eea", "alt": "Imagem demonstrativa de oficina — essencial", "url": "/institutional/editorial/essencial09-oficina.webp"},
    {"assetId": "18f86df1-1062-5b38-af7a-b0e4fdcd7fef", "alt": "Imagem demonstrativa de equipe — essencial", "url": "/institutional/editorial/essencial09-equipe.webp"},
    {"assetId": "aa80c751-249f-535e-962b-d522f05e9b0e", "alt": "Imagem demonstrativa de recepcao — essencial", "url": "/institutional/editorial/essencial09-recepcao.webp"},
    {"assetId": "7a05e653-3001-5638-bc90-a09ccedcbc86", "alt": "Imagem demonstrativa de movimento — essencial", "url": "/institutional/editorial/essencial09-movimento.webp"},
    {
      assetId: "2a835c16-6cf1-5f97-8e98-d8a47efa7147",
      alt: "Profissional de saúde em atendimento",
      url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d",
    },
    {
      assetId: "ce5f0df2-8228-53c3-b332-2617e3d0febb",
      alt: "Profissional de saúde em atendimento",
      url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528",
    },
    {
      assetId: "994432e9-40b1-59d4-9f53-ea9499f1aa61",
      alt: "Instrumentos de cuidado em saúde",
      url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "76d24d82-2dca-5e09-94d6-ed8287076d72",
      alt: "Atendimento e ambiente hospitalar",
      url: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "comunidade": [
    {"assetId": "f09c7997-ef4d-59d5-af36-9889e14f4e36", "alt": "Rua de bairro com casas coloridas e moradores caminhando", "url": "/institutional/editorial/comunidade-caderno-rua.webp"},
    {"assetId": "fb225e08-1cea-5d99-8e9e-e7d244690262", "alt": "Mulher realizando trabalho de marcenaria em obra comunitária", "url": "/institutional/editorial/comunidade-caderno-obra.webp"},
    {"assetId": "ed0152e8-66ad-5a23-ac52-5139be20a483", "alt": "Moradores analisando juntos o mapa de um bairro", "url": "/institutional/editorial/comunidade-caderno-mapa.webp"},
    {"assetId": "30a50d33-f8b9-5ae5-a9fa-6296f79795dc", "alt": "Moradora sorrindo diante de casas do bairro", "url": "/institutional/editorial/comunidade-caderno-moradora.webp"},
    {"assetId": "841b7ef8-a74a-5e62-b262-ba921519d31c", "alt": "Voluntários cultivando horta coletiva diante de mural", "url": "/institutional/editorial/comunidade-caderno-horta.webp"},
    {"assetId": "9bfdd67e-18e4-59d3-b2c8-8ac840e419ec", "alt": "Fachada verde de moradia com vasos e plantas", "url": "/institutional/editorial/comunidade-caderno-casa.webp"},
    {"assetId": "b922e602-3a1c-53b0-bded-a234e313f869", "alt": "Planta conceitual da organização comunitária em cinco etapas, sem dados reais", "url": "/institutional/editorial/comunidade-caderno-planta.svg"},

    {
      assetId: "70fab016-9aa2-5652-b620-3737711ae1af",
      alt: "Moradia, acolhimento e pertencimento",
      url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
    },
    {
      assetId: "39069bf2-1485-5b6e-a85c-d01bd9a6da15",
      alt: "Moradia, acolhimento e pertencimento",
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
    },
    {
      assetId: "f3bb6efc-f1b9-5255-8b74-08334301845b",
      alt: "Espaço comunitário compartilhado",
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "c004a32b-f159-52dc-bc4c-059aca8dc175",
      alt: "Arquitetura e moradia urbana",
      url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "vozes": [
    { assetId: "ee044054-bcea-55e5-aa5e-c160f1432acc", alt: "Ilustração editorial de dois balões de fala sobrepostos", url: "/institutional/editorial/vozes-v4-falas.svg" },
    { assetId: "53470c76-cfa0-515c-9707-4c54cb7e8997", alt: "Ilustração de círculos concêntricos representando escuta e diálogo", url: "/institutional/editorial/vozes-v4-escuta.svg" },
    { assetId: "daafd1c2-8a26-57c6-b8cd-5897c02c4b44", alt: "Ilustração de percursos interligados representando rede de apoio", url: "/institutional/editorial/vozes-v4-caminhos.svg" },
    { assetId: "4bf30952-9fa6-57e3-9a5c-30a7344c675f", alt: "Pessoas em diálogo numa atividade comunitária, imagem ilustrativa", url: "/institutional/editorial/vozes-v4-rede.webp" },
    { assetId: "eafade72-048f-5367-8774-28bb5f35d1fe", alt: "Voluntária organizando livros em espaço comunitário, imagem ilustrativa", url: "/institutional/editorial/vozes-v4-reuniao.webp" },
    { assetId: "f483208b-3e43-5d70-bb2b-e31963583872", alt: "Grupo numa ação educativa, imagem ilustrativa", url: "/institutional/editorial/vozes-v4-escuta-grupo.webp" },
    { assetId: "9767b6b5-b484-538c-b4ff-6e7897a431cf", alt: "Retrato de participante em imagem ilustrativa, substituível pelo editor", url: "/institutional/editorial/vozes-v4-retratos.webp" },
    { assetId: "4fbcd05e-6c47-5615-9def-0479d7f34843", alt: "Retrato de participante em imagem ilustrativa, substituível pelo editor", url: "/institutional/editorial/vozes-v4-olhar.webp" },
    {
      assetId: "00f031d9-9665-5f0d-a16b-8f0a0de42f8d",
      alt: "Mulheres em roda de conversa",
      url: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a",
    },
    {
      assetId: "f4e4a7ab-0b02-5808-b09a-ba08db233554",
      alt: "Mulheres em roda de conversa",
      url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac",
    },
    {
      assetId: "6dee7570-ea7e-5b1f-b3b3-22681b78dc37",
      alt: "Amigos em encontro comunitário",
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "cf705e6f-2583-5356-9664-28b29d796a4c",
      alt: "Retrato humano em ambiente natural",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "pulso": [
    { assetId: "44ed5949-4e19-5f38-a0a4-b7f1ebd40fc5", alt: "Jovens em cenário urbano ao entardecer, imagem ilustrativa", url: "/institutional/editorial/pulso-v3-hero.webp" },
    { assetId: "5a1d8c8a-1433-53d5-bfb9-78d0e64211f4", alt: "Jovens em encontro na cidade ao entardecer", url: "/institutional/editorial/pulso-v3-grupo.webp" },
    { assetId: "572aa808-7926-566b-83d4-44704ebc5b61", alt: "Caderno e planejamento de oficinas", url: "/institutional/editorial/pulso-v3-estudo.webp" },
    { assetId: "2910df32-6625-5432-bea8-c65622c0b4b3", alt: "Educador em encontro de formação", url: "/institutional/editorial/pulso-v3-oficina.webp" },
    { assetId: "d1635621-117a-57d3-bfaf-0bc525e814a9", alt: "Grupo de jovens conversando sobre o futuro da comunidade", url: "/institutional/editorial/pulso-v3-biblioteca.webp" },
    { assetId: "41688244-a7cc-5142-8c9c-0b50cb6e9a7b", alt: "Jovens em formação digital", url: "/institutional/editorial/pulso-v3-digital.webp" },
    { assetId: "1891ab39-ad8d-5479-ad25-ab17c35871aa", alt: "Jovem participante em atividade comunitária", url: "/institutional/editorial/pulso-v3-participacao.webp" },
    { assetId: "6ee6fabe-de5f-50da-86b4-33f7ebdf3c18", alt: "Jovens em conversa ao ar livre, composição ilustrativa", url: "/institutional/editorial/pulso-v3-comunidade.webp" },
    {
      assetId: "02d6fcb4-a579-5be4-9e40-a46470326df3",
      alt: "Esporte, juventude e movimento",
      url: "https://images.unsplash.com/photo-1546519638-68e109498ffc",
    },
    {
      assetId: "a6c754d3-16c5-5231-8fdd-e3f76ffe4138",
      alt: "Esporte, juventude e movimento",
      url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211",
    },
    {
      assetId: "a0dbd092-dc6f-5b0f-9917-a6868510b612",
      alt: "Atividade esportiva ao ar livre",
      url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "0cc79902-4510-5e93-929a-c9e4228692f6",
      alt: "Atividade física em movimento",
      url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "profundezas": [
    { assetId: "251553bd-3deb-590d-811d-9d30fae23343", alt: "Baleia-jubarte sob a superfície oceânica; imagem demonstrativa", url: "/institutional/editorial/profundezas-atlas-baleia.webp" },
    { assetId: "f58074d4-b905-5917-9ff5-694aebe7a9cc", alt: "Baleia-jubarte no oceano com espaço lateral para texto", url: "/institutional/editorial/profundezas-atlas-hero.webp" },
    { assetId: "353ce3cb-ed33-56ad-909e-519a4beae833", alt: "Mapa ilustrativo de linhas batimétricas", url: "/institutional/editorial/profundezas-atlas-bathymetry.svg" },
    { assetId: "f709a95d-2a3b-56ce-a57e-d168f2545bb2", alt: "Diagrama de sonar e leituras oceânicas", url: "/institutional/editorial/profundezas-atlas-sonar.svg" },
    { assetId: "2163b607-cc9c-50be-b517-415a913af03b", alt: "Ilustração de biodiversidade em recife de corais", url: "/institutional/editorial/profundezas-atlas-coral.svg" },
    { assetId: "e63ac709-932c-5de8-8c9e-f62a54dbf502", alt: "Representação gráfica de correntes marítimas", url: "/institutional/editorial/profundezas-atlas-current.svg" },
    { assetId: "e8bb1bdf-bd21-5ab3-8754-d05c50f5d9e9", alt: "Mapa fictício ilustrativo de pontos de monitoramento", url: "/institutional/editorial/profundezas-atlas-marine-map.svg" },
    { assetId: "8a242bb4-eb58-5a0c-98df-354df051efcf", alt: "Prancha científica ilustrada de uma espécie marinha", url: "/institutional/editorial/profundezas-atlas-specimen.svg" },
    {
      assetId: "8a79bfc0-5ed9-5ea8-a16c-eab4c508ab34",
      alt: "Oceano e preservação marinha",
      url: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
    },
    {
      assetId: "888a1775-4aa1-59c4-a2e6-de1191751aaa",
      alt: "Oceano e preservação marinha",
      url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
    },
    {
      assetId: "c823306e-e597-5a09-a041-5c1ce8905953",
      alt: "Mar e ondas sob luz natural",
      url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "23e1663c-670b-5c69-9cd0-e03ad0aa79d9",
      alt: "Paisagem oceânica",
      url: "https://images.unsplash.com/photo-1484291470158-b8f8d608850d?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "sereno": [
    {"assetId": "fa86408e-a3e6-5b3e-8011-54bf6e5aae40", "alt": "Senhora idosa ao sol perto da janela", "url": "/institutional/editorial/sereno08-janela.webp"},
    {"assetId": "51b95bf2-1f83-57b0-ad4e-5c0780c8eb05", "alt": "Senhor idoso lendo jornal no café comunitário", "url": "/institutional/editorial/sereno08-leitura.webp"},
    {"assetId": "92f4e426-90cc-582f-ae1d-15e46d923ed6", "alt": "Grupo intergeracional participando de oficina de arte", "url": "/institutional/editorial/sereno08-ateli.webp"},
    {"assetId": "27c02ed6-2eae-5cf3-934e-1ec1d639d0b8", "alt": "Encontro afetuoso entre duas mulheres para um café", "url": "/institutional/editorial/sereno08-cafe.webp"},
    {"assetId": "e0f387ec-ae5e-5033-a77f-8b8d349a041b", "alt": "Pessoas idosas cultivando horta comunitária", "url": "/institutional/editorial/sereno08-horta.webp"},
    {"assetId": "1503ac30-255f-539c-84f4-cd742789095f", "alt": "Mulher idosa conversando com jovem em praça arborizada", "url": "/institutional/editorial/sereno08-conversa.webp"},
    {"assetId": "b07eb51f-9ea8-5262-a67e-d56f00089db8", "alt": "Diagrama ilustrativo de vínculos, escuta e autonomia", "url": "/institutional/editorial/sereno08-rede.svg"},

    {
      assetId: "efc86355-5734-5f83-8a01-ddf5a1843fdf",
      alt: "Convivência e cuidado na terceira idade",
      url: "https://unsplash.com/photos/elderly-couple-waving-hello-in-a-room-w1eDyNeSMi0/download",
    },
    {
      assetId: "6c93dd46-bd73-5160-ad1a-e63ece2ffa08",
      alt: "Convivência e cuidado na terceira idade",
      url: "https://unsplash.com/photos/caregiver-assisting-elderly-couple-with-coloring-bSXk1lOp8T0/download",
    },
    {
      assetId: "653a826e-3ea5-567b-a262-b1cf45d6b9ce",
      alt: "Retrato em ambiente de convivência",
      url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "efe0bedc-7a9b-5836-a311-9da0a6633ce7",
      alt: "Convivência familiar",
      url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1280&q=80",
    },
  ],
  "conexao": [
    {"assetId": "fcb07f94-d90b-58fc-9b41-0b96677b9dbc", "alt": "Imagem demonstrativa de mobilizacao — conexao", "url": "/institutional/editorial/conexao09-mobilizacao.webp"},
    {"assetId": "2afc375e-8e84-51db-af13-1860366aef07", "alt": "Imagem demonstrativa de retrato — conexao", "url": "/institutional/editorial/conexao09-retrato.webp"},
    {"assetId": "c08b327d-c1bd-561d-b0d8-6a0bea34cc83", "alt": "Imagem demonstrativa de mural — conexao", "url": "/institutional/editorial/conexao09-mural.webp"},
    {"assetId": "fa4dbcb9-eac8-5e76-9bfb-e714692c3c77", "alt": "Imagem demonstrativa de planejamento — conexao", "url": "/institutional/editorial/conexao09-planejamento.webp"},
    {"assetId": "0bf223f8-5e46-58c2-b3e1-c558f22faf94", "alt": "Imagem demonstrativa de encontro — conexao", "url": "/institutional/editorial/conexao09-encontro.webp"},
    {"assetId": "b04dc1fd-74b5-512b-a2fe-140da996b0c6", "alt": "Imagem demonstrativa de horta — conexao", "url": "/institutional/editorial/conexao09-horta.webp"},
    {"assetId": "fcb07f94-d90b-58fc-9b41-0b96677b9dbc", "alt": "Imagem demonstrativa de mobilizacao — conexao", "url": "/institutional/editorial/conexao09-mobilizacao.webp"},
    {"assetId": "2afc375e-8e84-51db-af13-1860366aef07", "alt": "Imagem demonstrativa de retrato — conexao", "url": "/institutional/editorial/conexao09-retrato.webp"},
    {"assetId": "c08b327d-c1bd-561d-b0d8-6a0bea34cc83", "alt": "Imagem demonstrativa de mural — conexao", "url": "/institutional/editorial/conexao09-mural.webp"},
    {"assetId": "fa4dbcb9-eac8-5e76-9bfb-e714692c3c77", "alt": "Imagem demonstrativa de planejamento — conexao", "url": "/institutional/editorial/conexao09-planejamento.webp"},
    {"assetId": "0bf223f8-5e46-58c2-b3e1-c558f22faf94", "alt": "Imagem demonstrativa de encontro — conexao", "url": "/institutional/editorial/conexao09-encontro.webp"},
    {"assetId": "b04dc1fd-74b5-512b-a2fe-140da996b0c6", "alt": "Imagem demonstrativa de horta — conexao", "url": "/institutional/editorial/conexao09-horta.webp"},
    {
      assetId: "9e1adec1-2fb5-5e30-9c13-acb9f8ce76d3",
      alt: "Voluntariado em ação",
      url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a",
    },
    {
      assetId: "0597f887-427d-591e-ae7b-5e2b9ee1044d",
      alt: "Voluntariado em ação",
      url: "https://images.unsplash.com/photo-1531058020387-3be344556be6",
    },
    {
      assetId: "ca3b3f10-143d-54b2-8ebd-2164b5973eef",
      alt: "Grupo trabalhando em conjunto",
      url: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1280&q=80",
    },
    {
      assetId: "ad4f559a-7eda-51e4-8f86-741a8503dc03",
      alt: "Equipe colaborando em mesa compartilhada",
      url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1280&q=80",
    },
  ],
};

const publicPhotos = new Map<string, { url: string; fallback: string }>(
  Object.entries(nativeEditorialPhotos).flatMap(([family, photos]) =>
    photos.map((photo, index) => [
      photo.assetId,
      {
        url: photo.url,
        fallback: photo.fallback ?? (photo.url.startsWith("/institutional/editorial/")
          ? photo.url
          : `/institutional/editorial/${family}${index ? `-${index + 1}` : ""}.webp`),
      },
    ] as const),
  ),
);

/** Resolve only the fixed example IDs. Organization uploads never use this registry. */
export function getNativeEditorialPhoto(assetId: string | undefined) {
  return assetId ? publicPhotos.get(assetId) : undefined;
}
