"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceFactory = exports.BaseAIService = void 0;
const fs = __importStar(require("fs"));
class BaseAIService {
    constructor(config) {
        this.initialized = false;
        this.config = config;
    }
    async initialize() {
        if (!this.config.apiKey) {
            throw new Error(`${this.getProviderName()}: API密钥未配置`);
        }
        this.initialized = true;
    }
    async readImageAsBase64(imagePath) {
        const buffer = await fs.promises.readFile(imagePath);
        return buffer.toString('base64');
    }
    async downloadImage(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`图片下载失败: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    generateLayerId() {
        return Math.random().toString(36).substring(2, 11);
    }
    calculateIOU(box1, box2) {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
        if (x2 < x1 || y2 < y1)
            return 0;
        const intersection = (x2 - x1) * (y2 - y1);
        const area1 = box1.width * box1.height;
        const area2 = box2.width * box2.height;
        return intersection / (area1 + area2 - intersection);
    }
    filterOverlappingLayers(layers, iouThreshold = 0.5) {
        const filtered = [];
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
exports.BaseAIService = BaseAIService;
class AIServiceFactory {
    static async createService(config) {
        const serviceKey = `${config.provider}-${config.apiKey.substring(0, 8)}`;
        if (this.services.has(serviceKey)) {
            return this.services.get(serviceKey);
        }
        let service;
        switch (config.provider) {
            case 'aliyun':
                const { AliyunService } = await Promise.resolve().then(() => __importStar(require('./providers/aliyun')));
                service = new AliyunService(config);
                break;
            case 'tencent':
                const { TencentService } = await Promise.resolve().then(() => __importStar(require('./providers/tencent')));
                service = new TencentService(config);
                break;
            case 'baidu':
                const { BaiduService } = await Promise.resolve().then(() => __importStar(require('./providers/baidu')));
                service = new BaiduService(config);
                break;
            case 'zhipu':
                const { ZhipuService } = await Promise.resolve().then(() => __importStar(require('./providers/zhipu')));
                service = new ZhipuService(config);
                break;
            case 'doubao':
                const { DoubaoService } = await Promise.resolve().then(() => __importStar(require('./providers/doubao')));
                service = new DoubaoService(config);
                break;
            default:
                throw new Error(`不支持的AI服务提供商: ${config.provider}`);
        }
        await service.initialize();
        this.services.set(serviceKey, service);
        return service;
    }
    static clearCache() {
        this.services.clear();
    }
}
exports.AIServiceFactory = AIServiceFactory;
AIServiceFactory.services = new Map();
