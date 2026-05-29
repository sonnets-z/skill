import { SegmentationResult, AIDetectedLayer, AIModelConfig } from '../types/aiModels';
import * as fs from 'fs';
import * as path from 'path';

export interface AIService {
  initialize(): Promise<void>;
  segmentImage(imagePath: string, options?: SegmentationOptions): Promise<SegmentationResult>;
  getProviderName(): string;
}

export interface SegmentationOptions {
  mode?: 'product' | 'semantic' | 'instance' | 'all';
  minConfidence?: number;
  includeMasks?: boolean;
  customPrompt?: string;
}

export abstract class BaseAIService implements AIService {
  protected config: AIModelConfig;
  protected initialized: boolean = false;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error(`${this.getProviderName()}: API密钥未配置`);
    }
    this.initialized = true;
  }

  abstract segmentImage(imagePath: string, options?: SegmentationOptions): Promise<SegmentationResult>;
  abstract getProviderName(): string;

  protected async readImageAsBase64(imagePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(imagePath);
    return buffer.toString('base64');
  }

  protected async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`图片下载失败: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  protected generateLayerId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  protected calculateIOU(box1: AIDetectedLayer, box2: AIDetectedLayer): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 < x1 || y2 < y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;

    return intersection / (area1 + area2 - intersection);
  }

  protected filterOverlappingLayers(layers: AIDetectedLayer[], iouThreshold: number = 0.5): AIDetectedLayer[] {
    const filtered: AIDetectedLayer[] = [];
    const sorted = layers.sort((a, b) => b.confidence - a.confidence);

    for (const layer of sorted) {
      const hasOverlap = filtered.some(existing => this.calculateIOU(layer, existing) > iouThreshold);
      if (!hasOverlap) {
        filtered.push(layer);
      }
    }

    return filtered;
  }
}

export class AIServiceFactory {
  private static services: Map<string, AIService> = new Map();

  static async createService(config: AIModelConfig): Promise<AIService> {
    const serviceKey = `${config.provider}-${config.apiKey.substring(0, 8)}`;

    if (this.services.has(serviceKey)) {
      return this.services.get(serviceKey)!;
    }

    let service: AIService;

    switch (config.provider) {
      case 'aliyun':
        const { AliyunService } = await import('./providers/aliyun');
        service = new AliyunService(config);
        break;
      case 'tencent':
        const { TencentService } = await import('./providers/tencent');
        service = new TencentService(config);
        break;
      case 'baidu':
        const { BaiduService } = await import('./providers/baidu');
        service = new BaiduService(config);
        break;
      case 'zhipu':
        const { ZhipuService } = await import('./providers/zhipu');
        service = new ZhipuService(config);
        break;
      case 'doubao':
        const { DoubaoService } = await import('./providers/doubao');
        service = new DoubaoService(config);
        break;
      default:
        throw new Error(`不支持的AI服务提供商: ${config.provider}`);
    }

    await service.initialize();
    this.services.set(serviceKey, service);

    return service;
  }

  static clearCache(): void {
    this.services.clear();
  }
}
