/** Limits match backend validation and the private Supabase bucket. */
export const MAX_MESSAGE_ATTACHMENT_BYTES=25_000_000;
export const MAX_INLINE_PREVIEW_BYTES=5_000_000;
export const PREVIEW_IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
export const PREVIEW_AUDIO_TYPES=new Set(["audio/webm","audio/mp4","audio/ogg","audio/mpeg","audio/wav"]);
export const PREVIEW_VIDEO_TYPES=new Set(["video/webm","video/mp4"]);
