import { apiGet,apiPost,apiRequest,apiTenantGet,apiTenantPatch,apiTenantPost,apiDelete,apiTenantDelete } from "./api";
import { supabase } from "./supabase";

export type MessageScope = "global"|"organization";
export interface MessageContact { id:string;name:string;username:string|null;avatarUrl:string|null }
export interface MessageConversation {
  id:string;kind:"direct"|"group";title:string|null;description:string|null;peerId:string|null;peerName:string|null;
  peerUsername:string|null;avatarUrl:string|null;createdBy:string|null;
  contactStatus:"pending"|"accepted"|"rejected";lastMessage:string|null;lastMessageAt:string|null;unreadCount:number;memberCount:number;
}
export interface MessageGalleryItem {id:string;messageId:string;name:string;mime:string;size:number;createdAt:string;url:string|null}
export interface MessageGalleryPage {items:MessageGalleryItem[];hasMore:boolean}
export interface MessageParticipant {userId:string;name:string;avatarUrl:string|null;role:"owner"|"admin"|"member";lastReadAt:string|null;lastDeliveredAt:string|null}
export interface MessageReaction {emoji:string;userId:string}
export interface MessageEntry {
  id:string;senderUserId:string;senderName:string;avatarUrl:string|null;body:string;
  attachmentId:string|null;attachmentName:string|null;attachmentMime:string|null;attachmentSize:number|null;
  replyToId:string|null;replyBody:string|null;replySenderName:string|null;
  reactions:MessageReaction[];createdAt:string;deletedForAllAt:string|null;
}
export interface MessageModuleSettings {enabled:boolean;directMessagesEnabled:boolean;readReceiptsEnabled:boolean;canManage:boolean}
const prefix=(scope:MessageScope)=>`/messages/${scope}`;
const get=<T>(scope:MessageScope,path:string)=>scope==="organization"?apiTenantGet<T>(`${prefix(scope)}${path}`):apiGet<T>(`${prefix(scope)}${path}`);
const post=<T>(scope:MessageScope,path:string,data?:unknown)=>scope==="organization"?apiTenantPost<T>(`${prefix(scope)}${path}`,data):apiPost<T>(`${prefix(scope)}${path}`,data);
export async function searchMessageContacts(scope:MessageScope,q:string){return(await get<{users:MessageContact[]}>(scope,`/people?q=${encodeURIComponent(q)}`)).users;}
export function fetchConversations(scope:MessageScope){return get<{viewerId:string;conversations:MessageConversation[]}>(scope,"/conversations");}
export async function fetchGlobalMessageUnreadCount(){return(await fetchConversations("global")).conversations.reduce((sum,c)=>sum+c.unreadCount,0);}
export async function beginConversation(scope:MessageScope,recipientUserId:string){return(await post<{conversation:{id:string}}>(scope,"/conversations",{recipientUserId})).conversation.id;}
export async function createMessageGroup(scope:MessageScope,title:string,participantUserIds:string[],description=""){return(await post<{conversation:{id:string}}>(scope,"/groups",{title,participantUserIds,description})).conversation.id;}
export function manageMessageGroup(scope:MessageScope,id:string,change:{action:"leave"}|{action:"rename";title:string}|{action:"describe";description:string}|{action:"add"|"remove"|"promote"|"demote";userId:string}){return post<{ok:boolean}>(scope,`/conversations/${id}/group`,change);}
export function respondToContactRequest(scope:MessageScope,id:string,decision:"accepted"|"rejected"){return post(scope,`/conversations/${id}/contact`,{decision});}
export function fetchMessages(scope:MessageScope,id:string){return get<{messages:MessageEntry[];participants:MessageParticipant[]}>(scope,`/conversations/${id}/messages`);}
export function acknowledgeMessages(scope:MessageScope,id:string){return post(scope,`/conversations/${id}/read`);}
export function sendMessage(scope:MessageScope,id:string,clientMessageId:string,body:string,attachmentId?:string,replyToId?:string){return post(scope,`/conversations/${id}/messages`,{clientMessageId,body,attachmentId,replyToId});}
export function deleteMessage(scope:MessageScope,id:string,messageId:string,mode:"me"|"everyone"){return post(scope,`/conversations/${id}/messages/${messageId}/delete`,{mode});}
export function toggleMessageReaction(scope:MessageScope,id:string,messageId:string,emoji:string){return post(scope,`/conversations/${id}/messages/${messageId}/reaction`,{emoji});}
export async function uploadMessageAttachment(scope:MessageScope,id:string,file:File){
  if(!file.size||file.size>25_000_000)throw new Error("O arquivo deve ter até 25 MB.");
  const metadata=await post<{attachmentId:string;path:string;token:string;bucket:string}>(scope,`/conversations/${id}/attachments/prepare`,{
    fileName:file.name.slice(0,255),mimeType:file.type||"application/octet-stream",size:file.size,
  });
  const {error}=await supabase.storage.from(metadata.bucket).uploadToSignedUrl(metadata.path,metadata.token,file,{contentType:"application/octet-stream"});
  if(error)throw new Error("Não foi possível enviar o arquivo. Tente novamente.");
  return metadata.attachmentId;
}
export function getMessageAttachmentLink(scope:MessageScope,id:string,attachment:string){return get<{url:string;name:string;mime:string;size:number}>(scope,`/conversations/${id}/attachments/${attachment}`);}
export async function fetchMessageSettings(){return(await apiTenantGet<{settings:MessageModuleSettings}>("/messages/organization/settings")).settings;}
export async function saveMessageSettings(changes:Partial<Omit<MessageModuleSettings,"canManage">>){return(await apiTenantPatch<{settings:MessageModuleSettings}>("/messages/organization/settings",changes)).settings;}

export function fetchConversationMedia(scope:MessageScope,id:string,offset=0){
  return get<MessageGalleryPage>(scope,`/conversations/${id}/media?offset=${offset}`);
}
export function uploadGroupPhoto(scope:MessageScope,id:string,file:File){
  const form=new FormData();form.append("avatar",file);
  return apiRequest<{avatarUrl:string|null}>(`${prefix(scope)}/conversations/${id}/group/photo`,{
    method:"POST",body:form,organizationScoped:scope==="organization",
  });
}
export function removeGroupPhoto(scope:MessageScope,id:string){
  const path=`${prefix(scope)}/conversations/${id}/group/photo`;
  return scope==="organization"?apiTenantDelete<{ok:boolean}>(path):apiDelete<{ok:boolean}>(path);
}
