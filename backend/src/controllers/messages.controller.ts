import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/messages.service.js";
import { AppError } from "../utils/app-error.js";
import { messageIdSchema } from "../validators/messages.validator.js";

type Scope="global"|"organization";
function ctx(res:Response,scope:Scope):service.MessageContext {
  if(scope==="global")return{scope};
  if(!res.locals.organizationContext)throw new AppError("Selecione uma organização.",400,"MESSAGE_ORG_REQUIRED");
  return{scope,organization:res.locals.organizationContext};
}
function id(req:Request,key="conversationId") {
  const value=messageIdSchema.safeParse(req.params[key]);
  if(!value.success)throw new AppError("Identificador inválido.",400,"MESSAGE_INVALID_ID");
  return value.data;
}
function handle(error:unknown,res:Response){
  if(error instanceof AppError){res.status(error.statusCode).json({error:error.message,code:error.code});return;}
  console.error("Messages API error",error);
  res.status(500).json({error:"Não foi possível concluir esta ação.",code:"MESSAGE_INTERNAL_ERROR"});
}
async function run<T>(res:Response,callback:()=>Promise<T>,status=200){
  try{res.status(status).json(await callback());}catch(error){handle(error,res);}
}
export function messageHandlers(scope:Scope) {
  const withViewer=async <T>(res:Response,fn:(viewer:string,context:service.MessageContext)=>Promise<T>)=>{
    const viewer=await service.getMessageViewer(res.locals.authUser.id);
    return fn(viewer.id,ctx(res,scope));
  };
  return{
    people:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>{
      const q=z.string().max(100).parse(req.query.q??"");return service.findMessageRecipients(u,c,q);
    }).then(users=>({users}))),
    conversations:(_req:Request,res:Response)=>run(res,()=>withViewer(res,async(u,c)=>({viewerId:u,conversations:await service.listMessageConversations(u,c)}))),
    create:(req:Request,res:Response)=>run(res,()=>withViewer(res,async(u,c)=>({conversation:await service.startDirectConversation(u,req.body.recipientUserId,c)})),201),
    createGroup:(req:Request,res:Response)=>run(res,()=>withViewer(res,async(u,c)=>({conversation:await service.createGroupConversation(u,req.body.title,req.body.participantUserIds,c,req.body.description||null)})),201),
    manageGroup:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.manageGroup(u,id(req),c,req.body.action,req.body.userId,req.body.title??req.body.description))),
    messages:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.listConversationMessages(u,id(req),c))),
    media:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.listConversationMedia(u,id(req),c,Math.min(1000,Math.max(0,Math.floor(Number(req.query.offset)||0)))))),
    photo:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>{
      if(!req.file)throw new AppError("Escolha uma foto.",400,"MESSAGE_GROUP_PHOTO_REQUIRED");
      return service.uploadGroupPhoto(u,id(req),c,req.file);
    })),
    removePhoto:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.deleteGroupPhoto(u,id(req),c))),
    send:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.sendConversationMessage(u,id(req),req.body.clientMessageId,req.body.body,c,req.body.attachmentId,req.body.replyToId)),201),
    respond:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.respondToContactRequest(u,id(req),req.body.decision,c))),
    remove:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.deleteConversationMessage(u,id(req),id(req,"messageId"),req.body.mode,c))),
    reaction:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.toggleMessageReaction(u,id(req),id(req,"messageId"),req.body.emoji,c))),
    read:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.markConversationRead(u,id(req),c))),
    createUpload:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.createAttachmentGrant(u,id(req),c,req.body)),201),
    download:(req:Request,res:Response)=>run(res,()=>withViewer(res,(u,c)=>service.getAttachmentUrl(u,id(req),id(req,"attachmentId"),c))),
  };
}
export const getSettings=(_req:Request,res:Response)=>run(res,async()=>({settings:await service.getMessageModuleSettings(res.locals.organizationContext)}));
export const saveSettings=(req:Request,res:Response)=>run(res,async()=>({settings:await service.updateMessageModuleSettings(res.locals.organizationContext,req.body)}));
