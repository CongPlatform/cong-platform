export type UploadStatus = "ready" | "uploading" | "success" | "error";

export interface UploadExecutionOptions {
  onProgress: (progress: number) => void;

  signal: AbortSignal;
}

export interface FileUploaderProps {
  title?: string;
  description?: string;

  accept?: string[];

  maxSize?: number;
  maxFiles?: number;

  multiple?: boolean;
  autoUpload?: boolean;

  onUpload?: (file: File, options: UploadExecutionOptions) => Promise<void>;

  onUploaded?: (file: File) => void;

  mode?: "upload" | "selection";

  onSelect?: (file: File) => void;

  onRemove?: (file: File) => void;
}
