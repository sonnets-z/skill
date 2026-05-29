export interface AIModelConfig {
  provider: 'aliyun' | 'tencent' | 'baidu' | 'zhipu' | 'doubao' | 'local';
  apiKey: string;
  secretKey?: string;
  region?: string;
}

export interface SegmentationResult {
  success: boolean;
  message: string;
  layers: AIDetectedLayer[];
  originalSize: { width: number; height: number };
  model: string;
  confidence: number;
}

export interface AIDetectedLayer {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'product' | 'text' | 'background' | 'decoration' | 'logo' | 'person' | 'object';
  confidence: number;
  mask?: string;
  category?: string;
  attributes?: Record<string, unknown>;
}

export interface AIServiceProvider {
  name: string;
  provider: AIModelConfig['provider'];
  capabilities: string[];
  maxImageSize: number;
  supportedFormats: string[];
}

export const AI_PROVIDERS: AIServiceProvider[] = [
  {
    name: '阿里云通义万相',
    provider: 'aliyun',
    capabilities: ['图像分割', '主体分割', '语义分割', '商品分割'],
    maxImageSize: 4096,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  {
    name: '腾讯云智绘',
    provider: 'tencent',
    capabilities: ['图像分割', '人像分割', '物品分割', '语义分割'],
    maxImageSize: 4096,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  {
    name: '百度文心一格',
    provider: 'baidu',
    capabilities: ['图像分割', '人像分割', '车辆分割', '商品分割'],
    maxImageSize: 4096,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  {
    name: '智谱AI',
    provider: 'zhipu',
    capabilities: ['图像分割', '语义分割', '实例分割'],
    maxImageSize: 2048,
    supportedFormats: ['jpg', 'jpeg', 'png']
  },
  {
    name: '字节豆包',
    provider: 'doubao',
    capabilities: ['图像分割', '主体识别', '语义分割'],
    maxImageSize: 4096,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
  }
];
