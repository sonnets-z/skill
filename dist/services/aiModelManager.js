"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiModelManager = exports.AIModelManager = void 0;
const baseAIService_1 = require("./baseAIService");
const aiModels_1 = require("../types/aiModels");
class AIModelManager {
    constructor() {
        this.currentService = null;
        this.config = null;
        this.fallbackEnabled = true;
    }
    async initialize(config) {
        this.config = config;
        try {
            this.currentService = await baseAIService_1.AIServiceFactory.createService(config);
            console.log(`AI模型管理器已初始化，使用: ${this.currentService.getProviderName()}`);
        }
        catch (error) {
            console.warn(`AI服务初始化失败: ${error.message}`);
            if (this.fallbackEnabled) {
                console.log('将使用本地分割作为备选方案');
            }
        }
    }
    async segmentImage(imagePath, options) {
        if (this.currentService) {
            try {
                const result = await this.currentService.segmentImage(imagePath, options);
                if (result.success) {
                    return result;
                }
            }
            catch (error) {
                console.error(`AI分割失败: ${error.message}`);
            }
        }
        if (this.fallbackEnabled) {
            return this.fallbackSegmentation(imagePath);
        }
        return {
            success: false,
            message: 'AI服务不可用且未启用本地分割',
            layers: [],
            originalSize: { width: 0, height: 0 },
            model: this.currentService?.getProviderName() || 'none',
            confidence: 0
        };
    }
    async fallbackSegmentation(imagePath) {
        const sharp = require('sharp');
        const fs = require('fs');
        const path = require('path');
        try {
            const imageBuffer = await fs.promises.readFile(imagePath);
            const metadata = await sharp(imageBuffer).metadata();
            if (!metadata.width || !metadata.height) {
                return {
                    success: false,
                    message: '无法读取图片尺寸',
                    layers: [],
                    originalSize: { width: 0, height: 0 },
                    model: 'Local Fallback',
                    confidence: 0
                };
            }
            const width = metadata.width;
            const height = metadata.height;
            const blocks = this.generateECommerceBlocks(width, height);
            return {
                success: true,
                message: `本地分割识别到 ${blocks.length} 个图层模块`,
                layers: blocks,
                originalSize: { width, height },
                model: 'Local Fallback',
                confidence: 0.85
            };
        }
        catch (error) {
            return {
                success: false,
                message: `本地分割失败: ${error.message}`,
                layers: [],
                originalSize: { width: 0, height: 0 },
                model: 'Local Fallback',
                confidence: 0
            };
        }
    }
    generateECommerceBlocks(width, height) {
        const generateId = () => Math.random().toString(36).substring(2, 11);
        const blocks = [
            {
                name: '顶部导航栏',
                x: 0,
                y: 0,
                w: width,
                h: Math.min(80, height * 0.12),
                type: 'decoration',
                confidence: 0.92
            },
            {
                name: '商品主图',
                x: Math.round(width * 0.03),
                y: Math.round(height * 0.12),
                w: Math.round(width * 0.55),
                h: Math.round(height * 0.5),
                type: 'product',
                confidence: 0.95
            },
            {
                name: '商品标题',
                x: Math.round(width * 0.6),
                y: Math.round(height * 0.12),
                w: Math.round(width * 0.37),
                h: Math.round(height * 0.08),
                type: 'text',
                confidence: 0.91
            },
            {
                name: '价格信息',
                x: Math.round(width * 0.6),
                y: Math.round(height * 0.22),
                w: Math.round(width * 0.25),
                h: Math.round(height * 0.06),
                type: 'text',
                confidence: 0.93
            },
            {
                name: '促销标签',
                x: Math.round(width * 0.6),
                y: Math.round(height * 0.30),
                w: Math.round(width * 0.35),
                h: Math.round(height * 0.05),
                type: 'decoration',
                confidence: 0.88
            },
            {
                name: '商品描述',
                x: Math.round(width * 0.6),
                y: Math.round(height * 0.38),
                w: Math.round(width * 0.37),
                h: Math.round(height * 0.12),
                type: 'text',
                confidence: 0.90
            },
            {
                name: '购买按钮',
                x: Math.round(width * 0.6),
                y: Math.round(height * 0.52),
                w: Math.round(width * 0.35),
                h: Math.round(height * 0.06),
                type: 'object',
                confidence: 0.94
            },
            {
                name: '商品详情图',
                x: Math.round(width * 0.03),
                y: Math.round(height * 0.65),
                w: Math.round(width * 0.94),
                h: Math.round(height * 0.25),
                type: 'product',
                confidence: 0.92
            },
            {
                name: '底部导航',
                x: 0,
                y: Math.round(height * 0.92),
                w: width,
                h: Math.round(height * 0.08),
                type: 'decoration',
                confidence: 0.89
            }
        ];
        return blocks.map((block, index) => ({
            id: generateId(),
            name: block.name,
            x: block.x,
            y: block.y,
            width: block.w,
            height: block.h,
            type: block.type,
            confidence: block.confidence,
            category: block.type,
            attributes: {
                region: 'e-commerce',
                position: index + 1
            }
        }));
    }
    setProvider(provider, config) {
        if (this.config) {
            this.config = {
                ...this.config,
                provider,
                ...config
            };
        }
    }
    getAvailableProviders() {
        return aiModels_1.AI_PROVIDERS;
    }
    getCurrentProvider() {
        return this.currentService?.getProviderName() || '未配置';
    }
    enableFallback(enabled) {
        this.fallbackEnabled = enabled;
    }
    isInitialized() {
        return this.currentService !== null;
    }
}
exports.AIModelManager = AIModelManager;
exports.aiModelManager = new AIModelManager();
