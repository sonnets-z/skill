export interface Layer {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  type: 'image' | 'text' | 'shape' | 'group';
  data?: string;
  children?: Layer[];
}

export interface SplitResult {
  success: boolean;
  message: string;
  layers: Layer[];
  originalSize: { width: number; height: number };
}

export interface ExportOptions {
  layers: Layer[];
  outputPath: string;
  width: number;
  height: number;
}

export interface ActionContext {
  parameters: Record<string, unknown>;
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
}

export interface SkillAction {
  id: string;
  name: string;
  description: string;
  execute: (context: ActionContext) => Promise<unknown>;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  path?: string;
  data?: Buffer;
}

export interface MessageContext {
  message: string;
  attachments?: FileAttachment[];
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
  reply: (content: string, options?: {
    attachments?: FileAttachment[];
    quickReplies?: string[];
  }) => Promise<void>;
}
