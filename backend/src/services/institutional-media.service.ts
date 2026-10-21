import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

const bucket = () => supabaseAdmin.storage.from("institutional-media");

// As imagens dos modelos nativos são públicas e não pertencem a uma ONG.
// Apenas estes identificadores fixos ficam dispensados da checagem de posse.
const nativeEditorialMedia = new Map<string, string>([
  ["fcb07f94-d90b-58fc-9b41-0b96677b9dbc", "/institutional/editorial/conexao09-mobilizacao.webp"],
  ["2afc375e-8e84-51db-af13-1860366aef07", "/institutional/editorial/conexao09-retrato.webp"],
  ["c08b327d-c1bd-561d-b0d8-6a0bea34cc83", "/institutional/editorial/conexao09-mural.webp"],
  ["fa4dbcb9-eac8-5e76-9bfb-e714692c3c77", "/institutional/editorial/conexao09-planejamento.webp"],
  ["0bf223f8-5e46-58c2-b3e1-c558f22faf94", "/institutional/editorial/conexao09-encontro.webp"],
  ["b04dc1fd-74b5-512b-a2fe-140da996b0c6", "/institutional/editorial/conexao09-horta.webp"],
  ["9f4b6ddc-fd5d-5b2f-a193-a19a9a4c6069", "/institutional/editorial/essencial09-atendimento.webp"],
  ["a225558a-2695-5ead-ae99-0b1a6ea94970", "/institutional/editorial/essencial09-cuidado.webp"],
  ["5712b774-c531-5aa7-bc06-18b76a733eea", "/institutional/editorial/essencial09-oficina.webp"],
  ["18f86df1-1062-5b38-af7a-b0e4fdcd7fef", "/institutional/editorial/essencial09-equipe.webp"],
  ["aa80c751-249f-535e-962b-d522f05e9b0e", "/institutional/editorial/essencial09-recepcao.webp"],
  ["7a05e653-3001-5638-bc90-a09ccedcbc86", "/institutional/editorial/essencial09-movimento.webp"],
  ["fcb07f94-d90b-58fc-9b41-0b96677b9dbc", "/institutional/editorial/conexao09-mobilizacao.webp"],
  ["2afc375e-8e84-51db-af13-1860366aef07", "/institutional/editorial/conexao09-retrato.webp"],
  ["c08b327d-c1bd-561d-b0d8-6a0bea34cc83", "/institutional/editorial/conexao09-mural.webp"],
  ["fa4dbcb9-eac8-5e76-9bfb-e714692c3c77", "/institutional/editorial/conexao09-planejamento.webp"],
  ["0bf223f8-5e46-58c2-b3e1-c558f22faf94", "/institutional/editorial/conexao09-encontro.webp"],
  ["b04dc1fd-74b5-512b-a2fe-140da996b0c6", "/institutional/editorial/conexao09-horta.webp"],
  ["9f4b6ddc-fd5d-5b2f-a193-a19a9a4c6069", "/institutional/editorial/essencial09-atendimento.webp"],
  ["a225558a-2695-5ead-ae99-0b1a6ea94970", "/institutional/editorial/essencial09-cuidado.webp"],
  ["5712b774-c531-5aa7-bc06-18b76a733eea", "/institutional/editorial/essencial09-oficina.webp"],
  ["18f86df1-1062-5b38-af7a-b0e4fdcd7fef", "/institutional/editorial/essencial09-equipe.webp"],
  ["aa80c751-249f-535e-962b-d522f05e9b0e", "/institutional/editorial/essencial09-recepcao.webp"],
  ["7a05e653-3001-5638-bc90-a09ccedcbc86", "/institutional/editorial/essencial09-movimento.webp"],
  ["fa86408e-a3e6-5b3e-8011-54bf6e5aae40", "/institutional/editorial/sereno08-janela.webp"],
  ["51b95bf2-1f83-57b0-ad4e-5c0780c8eb05", "/institutional/editorial/sereno08-leitura.webp"],
  ["92f4e426-90cc-582f-ae1d-15e46d923ed6", "/institutional/editorial/sereno08-ateli.webp"],
  ["27c02ed6-2eae-5cf3-934e-1ec1d639d0b8", "/institutional/editorial/sereno08-cafe.webp"],
  ["e0f387ec-ae5e-5033-a77f-8b8d349a041b", "/institutional/editorial/sereno08-horta.webp"],
  ["1503ac30-255f-539c-84f4-cd742789095f", "/institutional/editorial/sereno08-conversa.webp"],
  ["b07eb51f-9ea8-5262-a67e-d56f00089db8", "/institutional/editorial/sereno08-rede.svg"],
  ["c0d23e31-e9ad-50de-a48e-de053fcc8239", "/institutional/editorial/acolher07-cachorro.webp"],
  ["1db9fb35-5cbb-5c4b-b22d-8956ced52123", "/institutional/editorial/acolher07-gato.webp"],
  ["d3800222-4d9a-5a8b-89db-6e59616c9649", "/institutional/editorial/acolher07-vinculo.webp"],
  ["ea3ec638-31f3-53e1-9aa2-5d21c27c08c1", "/institutional/editorial/acolher07-idoso.webp"],
  ["0fb65ae8-ada2-595d-bf11-98f9ea2ee36d", "/institutional/editorial/acolher07-clinica.webp"],
  ["d35e15af-8b46-5071-a0bf-3dcdd3ed8c7b", "/institutional/editorial/acolher07-familia.webp"],
  ["edfb16b5-3546-5265-b787-772ade4cf2a7", "/institutional/editorial/acolher07-jornada.svg"],

  ["f09c7997-ef4d-59d5-af36-9889e14f4e36", "/institutional/editorial/comunidade-caderno-rua.webp"],
  ["fb225e08-1cea-5d99-8e9e-e7d244690262", "/institutional/editorial/comunidade-caderno-obra.webp"],
  ["ed0152e8-66ad-5a23-ac52-5139be20a483", "/institutional/editorial/comunidade-caderno-mapa.webp"],
  ["30a50d33-f8b9-5ae5-a9fa-6296f79795dc", "/institutional/editorial/comunidade-caderno-moradora.webp"],
  ["841b7ef8-a74a-5e62-b262-ba921519d31c", "/institutional/editorial/comunidade-caderno-horta.webp"],
  ["9bfdd67e-18e4-59d3-b2c8-8ac840e419ec", "/institutional/editorial/comunidade-caderno-casa.webp"],
  ["b922e602-3a1c-53b0-bded-a234e313f869", "/institutional/editorial/comunidade-caderno-planta.svg"],
  ["251553bd-3deb-590d-811d-9d30fae23343", "/institutional/editorial/profundezas-atlas-baleia.webp"],
  ["f58074d4-b905-5917-9ff5-694aebe7a9cc", "/institutional/editorial/profundezas-atlas-hero.webp"],
  ["353ce3cb-ed33-56ad-909e-519a4beae833", "/institutional/editorial/profundezas-atlas-bathymetry.svg"],
  ["f709a95d-2a3b-56ce-a57e-d168f2545bb2", "/institutional/editorial/profundezas-atlas-sonar.svg"],
  ["2163b607-cc9c-50be-b517-415a913af03b", "/institutional/editorial/profundezas-atlas-coral.svg"],
  ["e63ac709-932c-5de8-8c9e-f62a54dbf502", "/institutional/editorial/profundezas-atlas-current.svg"],
  ["e8bb1bdf-bd21-5ab3-8754-d05c50f5d9e9", "/institutional/editorial/profundezas-atlas-marine-map.svg"],
  ["8a242bb4-eb58-5a0c-98df-354df051efcf", "/institutional/editorial/profundezas-atlas-specimen.svg"],
  ["ee044054-bcea-55e5-aa5e-c160f1432acc", "/institutional/editorial/vozes-v4-falas.svg"],
  ["53470c76-cfa0-515c-9707-4c54cb7e8997", "/institutional/editorial/vozes-v4-escuta.svg"],
  ["daafd1c2-8a26-57c6-b8cd-5897c02c4b44", "/institutional/editorial/vozes-v4-caminhos.svg"],
  ["4bf30952-9fa6-57e3-9a5c-30a7344c675f", "/institutional/editorial/vozes-v4-rede.webp"],
  ["eafade72-048f-5367-8774-28bb5f35d1fe", "/institutional/editorial/vozes-v4-reuniao.webp"],
  ["f483208b-3e43-5d70-bb2b-e31963583872", "/institutional/editorial/vozes-v4-escuta-grupo.webp"],
  ["9767b6b5-b484-538c-b4ff-6e7897a431cf", "/institutional/editorial/vozes-v4-retratos.webp"],
  ["4fbcd05e-6c47-5615-9def-0479d7f34843", "/institutional/editorial/vozes-v4-olhar.webp"],
  ["44ed5949-4e19-5f38-a0a4-b7f1ebd40fc5", "/institutional/editorial/pulso-v3-hero.webp"],
  ["5a1d8c8a-1433-53d5-bfb9-78d0e64211f4", "/institutional/editorial/pulso-v3-grupo.webp"],
  ["572aa808-7926-566b-83d4-44704ebc5b61", "/institutional/editorial/pulso-v3-estudo.webp"],
  ["2910df32-6625-5432-bea8-c65622c0b4b3", "/institutional/editorial/pulso-v3-oficina.webp"],
  ["d1635621-117a-57d3-bfaf-0bc525e814a9", "/institutional/editorial/pulso-v3-biblioteca.webp"],
  ["41688244-a7cc-5142-8c9c-0b50cb6e9a7b", "/institutional/editorial/pulso-v3-digital.webp"],
  ["1891ab39-ad8d-5479-ad25-ab17c35871aa", "/institutional/editorial/pulso-v3-participacao.webp"],
  ["6ee6fabe-de5f-50da-86b4-33f7ebdf3c18", "/institutional/editorial/pulso-v3-comunidade.webp"],
  ["3ed56cd9-37dc-5e6c-9052-aff168f1c537", "https://images.unsplash.com/photo-1433086966358-54859d0ed716"],
  ["e161aa5c-5788-5d03-9a5a-7e56148a2009", "https://images.unsplash.com/photo-1511497584788-876760111969"],
  ["955fa3ed-8395-58fb-b645-ceff4fec7ec9", "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5"],
  ["40632f14-bae3-56ef-8593-d0afe0ee7b99", "https://images.unsplash.com/photo-1501785888041-af3ef285b470"],
  ["cc995d89-82e6-5de5-b24c-661b0bd15e41", "/institutional/editorial/horizonte-editorial-1.webp"],
  ["f62210c7-4a8a-5a1d-adcd-261c52ccd125", "/institutional/editorial/horizonte-editorial-2.webp"],
  ["56073ef9-f8a0-549d-9f97-9bcea97f82ec", "/institutional/editorial/horizonte-editorial-3.webp"],
  ["fcf0626a-cb66-5c6d-8bc1-8376c6ec12e1", "/institutional/editorial/horizonte-editorial-4.webp"],
  ["a02dea41-1fe0-5a77-a6a3-a6a6bb6232fe", "/institutional/editorial/horizonte-editorial-5.webp"],
  ["d1d5b9fe-9f75-5ff2-bfab-d430ea3ba58d", "/institutional/editorial/horizonte-editorial-6.webp"],
  [
    "146e56f0-9e93-5a77-b1c7-3d08f4696d16",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644",
  ],
  [
    "2ea778c9-5b71-54c1-b99e-4816f291982c",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45",
  ],
  [
    "93000888-2beb-56bc-91eb-49b4c42fe902",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
  ],
  [
    "8dfd19fa-b288-5828-8f50-96ae5def9cf5",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7",
  ],
  [
    "03371f2f-6451-5ac8-9157-f3db91efb9a6",
    "https://images.unsplash.com/photo-1558788353-f76d92427f16",
  ],
  [
    "dd19150f-36c0-5e29-aa86-9491435b04b2",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb",
  ],
  [
    "2a835c16-6cf1-5f97-8e98-d8a47efa7147",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d",
  ],
  [
    "ce5f0df2-8228-53c3-b332-2617e3d0febb",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528",
  ],
  [
    "70fab016-9aa2-5652-b620-3737711ae1af",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  ],
  [
    "39069bf2-1485-5b6e-a85c-d01bd9a6da15",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
  ],
  [
    "00f031d9-9665-5f0d-a16b-8f0a0de42f8d",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a",
  ],
  [
    "f4e4a7ab-0b02-5808-b09a-ba08db233554",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac",
  ],
  [
    "02d6fcb4-a579-5be4-9e40-a46470326df3",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc",
  ],
  [
    "a6c754d3-16c5-5231-8fdd-e3f76ffe4138",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211",
  ],
  [
    "8a79bfc0-5ed9-5ea8-a16c-eab4c508ab34",
    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
  ],
  [
    "888a1775-4aa1-59c4-a2e6-de1191751aaa",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
  ],
  [
    "efc86355-5734-5f83-8a01-ddf5a1843fdf",
    "https://unsplash.com/photos/elderly-couple-waving-hello-in-a-room-w1eDyNeSMi0/download",
  ],
  [
    "6c93dd46-bd73-5160-ad1a-e63ece2ffa08",
    "https://unsplash.com/photos/caregiver-assisting-elderly-couple-with-coloring-bSXk1lOp8T0/download",
  ],
  [
    "9e1adec1-2fb5-5e30-9c13-acb9f8ce76d3",
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a",
  ],
  [
    "0597f887-427d-591e-ae7b-5e2b9ee1044d",
    "https://images.unsplash.com/photo-1531058020387-3be344556be6",
  ],
 
  ["1584173f-3da9-5558-8daf-fff08ea060c4", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1280&q=80"],
  ["49f28f66-2bcc-5505-aca7-fe9d9e480d42", "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1280&q=80"],
  ["7e4c301f-6d1c-58f2-a1ac-c13309203f9d", "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1280&q=80"],
  ["ed5737a8-6ea7-5714-bfdd-b6d1545392e9", "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80"],
  ["c4cd182d-4438-554f-909b-45fb723a8890", "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80"],
  ["469987cb-af7f-5cac-8d92-04ae57ad4474", "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1280&q=80"],
  ["994432e9-40b1-59d4-9f53-ea9499f1aa61", "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1280&q=80"],
  ["76d24d82-2dca-5e09-94d6-ed8287076d72", "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1280&q=80"],
  ["f3bb6efc-f1b9-5255-8b74-08334301845b", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1280&q=80"],
  ["c004a32b-f159-52dc-bc4c-059aca8dc175", "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1280&q=80"],
  ["6dee7570-ea7e-5b1f-b3b3-22681b78dc37", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1280&q=80"],
  ["cf705e6f-2583-5356-9664-28b29d796a4c", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80"],
  ["a0dbd092-dc6f-5b0f-9917-a6868510b612", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1280&q=80"],
  ["0cc79902-4510-5e93-929a-c9e4228692f6", "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1280&q=80"],
  ["c823306e-e597-5a09-a041-5c1ce8905953", "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1280&q=80"],
  ["23e1663c-670b-5c69-9cd0-e03ad0aa79d9", "https://images.unsplash.com/photo-1484291470158-b8f8d608850d?auto=format&fit=crop&w=1280&q=80"],
  ["653a826e-3ea5-567b-a262-b1cf45d6b9ce", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1280&q=80"],
  ["efe0bedc-7a9b-5836-a311-9da0a6633ce7", "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1280&q=80"],
  ["ca3b3f10-143d-54b2-8ebd-2164b5973eef", "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1280&q=80"],
  ["ad4f559a-7eda-51e4-8f86-741a8503dc03", "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1280&q=80"],
]);

export interface InstitutionalMediaAsset {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

interface StoredMediaAsset extends Omit<InstitutionalMediaAsset, "url"> {
  storagePath: string;
}

function detectImageType(buffer: Buffer): string | null {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }

  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

async function getActiveUserId(
  client: PoolClient,
  authUserId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      select id
      from public.users
      where auth_user_id = $1
        and active = true
      limit 1
    `,
    [authUserId],
  );

  const userId = result.rows[0]?.id;

  if (!userId) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return userId;
}

function safeFileName(name: string, extension: string): string {
  return (
    Array.from(name)
      .map((char) =>
        char.charCodeAt(0) < 32 || char === "/" || char === "\\" ? "_" : char,
      )
      .join("")
      .slice(0, 180) || `imagem.${extension}`
  );
}

export async function uploadInstitutionalMedia(
  authUserId: string,
  organizationId: string,
  file: Express.Multer.File,
): Promise<InstitutionalMediaAsset> {
  const mimeType = detectImageType(file.buffer);

  if (
    !mimeType ||
    mimeType !== file.mimetype ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new AppError(
      "Envie uma imagem JPG, PNG ou WebP de até 5 MB.",
      400,
      "INVALID_INSTITUTIONAL_MEDIA",
    );
  }

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[mimeType];

  if (!extension) {
    throw new AppError(
      "Formato de imagem não suportado.",
      400,
      "INVALID_INSTITUTIONAL_MEDIA",
    );
  }

  const client = await pool.connect();
  const assetId = randomUUID();
  const storagePath = `${organizationId}/${assetId}.${extension}`;

  try {
    await client.query("begin");

    const userId = await getActiveUserId(client, authUserId);

    const { error } = await bucket().upload(storagePath, file.buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      throw new AppError(
        "Não foi possível armazenar a imagem.",
        503,
        "INSTITUTIONAL_MEDIA_UPLOAD_FAILED",
      );
    }

    const name = safeFileName(file.originalname, extension);

    await client.query(
      `
        insert into public.organization_media_assets (
          id,
          organization_id,
          owner_user_id,
          storage_path,
          name,
          mime_type,
          size_bytes
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [assetId, organizationId, userId, storagePath, name, mimeType, file.size],
    );

    const { data, error: signedUrlError } = await bucket().createSignedUrl(
      storagePath,
      60 * 60,
    );

    if (signedUrlError || !data?.signedUrl) {
      throw new AppError(
        "A imagem foi enviada, mas não pôde ser aberta.",
        503,
        "INSTITUTIONAL_MEDIA_SIGN_FAILED",
      );
    }

    await client.query("commit");

    return {
      id: assetId,
      name,
      mimeType,
      sizeBytes: file.size,
      url: data.signedUrl,
    };
  } catch (error) {
    await client.query("rollback");
    await bucket().remove([storagePath]);
    throw error;
  } finally {
    client.release();
  }
}

export async function assertOrganizationAsset(
  client: PoolClient,
  organizationId: string,
  assetId: string,
): Promise<void> {
  if (nativeEditorialMedia.has(assetId)) return;

  const result = await client.query<{ id: string }>(
    `
      select id
      from public.organization_media_assets
      where id = $1
        and organization_id = $2
      limit 1
    `,
    [assetId, organizationId],
  );

  if (!result.rows[0]) {
    throw new AppError(
      "A imagem selecionada não pertence a esta organização.",
      400,
      "INSTITUTIONAL_MEDIA_NOT_AVAILABLE",
    );
  }
}

export async function getSignedOrganizationAssets(
  organizationId: string,
  assetIds: string[],
): Promise<Map<string, InstitutionalMediaAsset>> {
  const uniqueIds = [...new Set(assetIds)];
  const assets = new Map<string, InstitutionalMediaAsset>();
  const organizationAssetIds: string[] = [];

  for (const id of uniqueIds) {
    const url = nativeEditorialMedia.get(id);
    if (url) {
      assets.set(id, {
        id,
        name: "Imagem demonstrativa",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        url,
      });
    } else {
      organizationAssetIds.push(id);
    }
  }

  if (organizationAssetIds.length === 0) return assets;

  const result = await pool.query<StoredMediaAsset>(
    `
      select
        id,
        name,
        mime_type as "mimeType",
        size_bytes as "sizeBytes",
        storage_path as "storagePath"
      from public.organization_media_assets
      where organization_id = $1
        and id = any($2::uuid[])
    `,
    [organizationId, organizationAssetIds],
  );

  if (result.rows.length === 0) {
    return assets;
  }

  const { data, error } = await bucket().createSignedUrls(
    result.rows.map((asset) => asset.storagePath),
    60 * 60,
  );

  result.rows.forEach((asset, index) => {
    assets.set(asset.id, {
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      url: error ? "" : (data?.[index]?.signedUrl ?? ""),
    });
  });

  return assets;
}
