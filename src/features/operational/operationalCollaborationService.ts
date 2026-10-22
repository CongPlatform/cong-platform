import {apiTenantGet,apiTenantPost} from "../../services/api";

const root=(systemId:string,moduleId:string)=>`/operational/systems/${systemId}/modules/${moduleId}`;
export interface CollabChannel{id:string;name:string;createdAt:string}
export interface CollabMessage{id:string;body:string;authorId:string;authorName:string;createdAt:string}
export const channels=async(systemId:string,moduleId:string)=>(await apiTenantGet<{channels:CollabChannel[]}>(`${root(systemId,moduleId)}/channels`)).channels;
export const createChannel=async(systemId:string,moduleId:string,name:string)=>(await apiTenantPost<{channel:CollabChannel}>(`${root(systemId,moduleId)}/channels`,{name})).channel;
export const messages=async(systemId:string,moduleId:string,channelId:string)=>(await apiTenantGet<{messages:CollabMessage[]}>(`${root(systemId,moduleId)}/channels/${channelId}/messages`)).messages;
export const sendMessage=async(systemId:string,moduleId:string,channelId:string,body:string)=>(await apiTenantPost<{message:CollabMessage}>(`${root(systemId,moduleId)}/channels/${channelId}/messages`,{body})).message;
export interface ReservableResource{id:string;name:string;description:string;active:boolean}
export interface ResourceReservation{id:string;resourceId:string;resourceName:string;title:string;startsAt:string;endsAt:string;createdBy:string;createdByName:string;canCancel:boolean}
export const resources=async(systemId:string,moduleId:string)=>(await apiTenantGet<{resources:ReservableResource[]}>(`${root(systemId,moduleId)}/resources`)).resources;
export const createResource=async(systemId:string,moduleId:string,name:string,description:string)=>(await apiTenantPost<{resource:ReservableResource}>(`${root(systemId,moduleId)}/resources`,{name,description})).resource;
export const reservations=async(systemId:string,moduleId:string,from:string,to:string)=>(await apiTenantGet<{reservations:ResourceReservation[]}>(`${root(systemId,moduleId)}/reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).reservations;
export const book=async(systemId:string,moduleId:string,data:{resourceId:string;title:string;startsAt:string;endsAt:string})=>(await apiTenantPost<{reservation:{id:string}}>(`${root(systemId,moduleId)}/reservations`,data)).reservation;
export const cancelBooking=async(systemId:string,moduleId:string,reservationId:string)=>apiTenantPost<void>(`${root(systemId,moduleId)}/reservations/${reservationId}/cancel`,{});
