import { MAX_MESSAGE_ATTACHMENT_BYTES } from "../../../services/messageAttachments";
const MAX_PIXELS=2400;
export async function canvasAsFile(canvas:HTMLCanvasElement,name:string):Promise<File>{
  const ratio=Math.min(1,MAX_PIXELS/Math.max(canvas.width,canvas.height));
  const target=document.createElement("canvas");target.width=Math.round(canvas.width*ratio);target.height=Math.round(canvas.height*ratio);
  target.getContext("2d")?.drawImage(canvas,0,0,target.width,target.height);
  const blob=await new Promise<Blob|null>(resolve=>target.toBlob(resolve,"image/jpeg",0.88));
  if(!blob || blob.size>MAX_MESSAGE_ATTACHMENT_BYTES)throw new Error("Imagem muito grande para enviar.");
  return new File([blob],name.replace(/\.[^.]+$/," ").trim()+".jpg",{type:"image/jpeg"});
}
export async function prepareMessageFile(file:File):Promise<File>{
  if(file.size>MAX_MESSAGE_ATTACHMENT_BYTES)throw new Error("O arquivo ultrapassa 25 MB.");
  if(!file.size)throw new Error("Arquivo vazio.");
  return file;
}
