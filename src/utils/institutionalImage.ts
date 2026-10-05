const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2200;
const WEBP_QUALITY = 0.86;

function outputName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "imagem";
  return `${base.slice(0, 120)}.webp`;
}

export async function prepareInstitutionalImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Envie uma imagem JPG, PNG ou WebP de até 12 MB.");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("Não foi possível preparar esta imagem.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Não foi possível otimizar esta imagem."))),
        "image/webp",
        WEBP_QUALITY,
      );
    });

    if (blob.size > 5 * 1024 * 1024) {
      throw new Error("A imagem continua muito grande mesmo após a otimização.");
    }

    return new File([blob], outputName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
