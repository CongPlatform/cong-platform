import { MAX_MESSAGE_ATTACHMENT_BYTES } from "../../../services/messageAttachments";

const MAX_PIXELS = 1600;

export async function canvasAsFile(
  canvas: HTMLCanvasElement,
  name: string,
): Promise<File> {
  for (
    let maxEdge = MAX_PIXELS;
    maxEdge >= 480;
    maxEdge = Math.round(maxEdge * 0.75)
  ) {
    const resized = document.createElement("canvas");
    const ratio = Math.min(1, maxEdge / Math.max(canvas.width, canvas.height));
    resized.width = Math.max(1, Math.round(canvas.width * ratio));
    resized.height = Math.max(1, Math.round(canvas.height * ratio));
    resized
      .getContext("2d")
      ?.drawImage(canvas, 0, 0, resized.width, resized.height);
    for (const quality of [0.86, 0.72, 0.56, 0.42]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        resized.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_MESSAGE_ATTACHMENT_BYTES) {
        return new File([blob], name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
        });
      }
    }
  }
  throw new Error(
    "A imagem continua grande demais para enviar, mesmo depois da compressão.",
  );
}

export async function prepareMessageFile(file: File): Promise<File> {
  if (
    file.type.startsWith("image/") &&
    file.type !== "image/svg+xml" &&
    file.type !== "image/gif"
  ) {
    // Compression is opt-in through the preview editor when possible, but large images
    // must still be preprocessed before encryption and upload.
    if (file.size <= MAX_MESSAGE_ATTACHMENT_BYTES) return file;
    const image = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        MAX_PIXELS / Math.max(image.width, image.height),
      );
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await canvasAsFile(canvas, file.name);
    } finally {
      image.close();
    }
  }
  if (file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
    throw new Error(
      "Este arquivo ultrapassa 1 MB. Fotos podem ser comprimidas; outros arquivos precisam ser menores.",
    );
  }
  if (!file.size) throw new Error("Não é possível anexar um arquivo vazio.");
  return file;
}
