const MAX_BYTES=2_000_000;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

/** Normalize phone photos before sending the small private group avatar. */
export async function prepareGroupPhoto(file:File):Promise<File>{
  if(!IMAGE_TYPES.has(file.type))throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if(file.size<=MAX_BYTES)return file;
  const picture=await createImageBitmap(file);
  try{
    const canvas=document.createElement("canvas");
    const scale=Math.min(1,1280/Math.max(picture.width,picture.height));
    canvas.width=Math.max(1,Math.round(picture.width*scale));
    canvas.height=Math.max(1,Math.round(picture.height*scale));
    canvas.getContext("2d")?.drawImage(picture,0,0,canvas.width,canvas.height);
    for(const quality of [0.88,0.77,0.65,0.52]){
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob&&blob.size<=MAX_BYTES&&blob.size>0)return new File([blob],"foto-grupo.jpg",{type:"image/jpeg"});
    }
    throw new Error("Não foi possível preparar esta foto. Escolha outra imagem.");
  }finally{picture.close();}
}
