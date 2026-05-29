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
exports.actions = void 0;
exports.getSkillInfo = getSkillInfo;
exports.executeAction = executeAction;
const layerSplitter_1 = require("./services/layerSplitter");
const psdExporter_1 = require("./services/psdExporter");
const aiModelManager_1 = require("./services/aiModelManager");
const aiModels_1 = require("./types/aiModels");
const fs = __importStar(require("fs"));
const layerSplitter = new layerSplitter_1.LayerSplitter();
const psdExporter = new psdExporter_1.PsdExporter();
let originalSize = null;
let currentLayers = [];
let lastSegmentationResult = null;
exports.actions = {
    'split-image': {
        name: '拆分图片图层',
        description: '将电商图片拆分为多个可编辑的图层模块（本地模式）',
        async execute(context) {
            const { parameters, logger } = context;
            const imagePath = parameters.imagePath;
            const outputPath = parameters.outputPath;
            if (!imagePath) {
                return { success: false, message: '请提供图片路径' };
            }
            if (!fs.existsSync(imagePath)) {
                return { success: false, message: '图片文件不存在' };
            }
            logger.info(`开始处理图片: ${imagePath}`);
            const result = await layerSplitter.splitImage(imagePath);
            if (result.success) {
                currentLayers = result.layers;
                originalSize = result.originalSize;
                logger.info(`成功识别 ${result.layers.length} 个图层模块`);
                if (outputPath) {
                    const exportResult = await psdExporter.exportPsd({
                        layers: result.layers,
                        outputPath,
                        width: result.originalSize.width,
                        height: result.originalSize.height
                    });
                    if (exportResult.success) {
                        return {
                            success: true,
                            message: `${result.message}\n${exportResult.message}`,
                            layers: result.layers,
                            originalSize: result.originalSize
                        };
                    }
                }
                return result;
            }
            return result;
        }
    },
    'ai-split-image': {
        name: 'AI智能拆分图片图层',
        description: '使用国内AI模型智能拆分电商图片图层',
        async execute(context) {
            const { parameters, logger } = context;
            const imagePath = parameters.imagePath;
            const outputPath = parameters.outputPath;
            const aiProvider = parameters.aiProvider;
            const segmentationMode = parameters.mode;
            if (!imagePath) {
                return { success: false, message: '请提供图片路径' };
            }
            if (!fs.existsSync(imagePath)) {
                return { success: false, message: '图片文件不存在' };
            }
            if (!aiModelManager_1.aiModelManager.isInitialized()) {
                const config = {
                    provider: aiProvider || 'aliyun',
                    apiKey: process.env[`${aiProvider?.toUpperCase() || 'ALIYUN'}_API_KEY`] || ''
                };
                await aiModelManager_1.aiModelManager.initialize(config);
            }
            logger.info(`开始AI智能处理图片: ${imagePath}`);
            const result = await aiModelManager_1.aiModelManager.segmentImage(imagePath, {
                mode: segmentationMode,
                minConfidence: 0.7,
                includeMasks: true
            });
            if (result.success) {
                currentLayers = result.layers.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    x: layer.x,
                    y: layer.y,
                    width: layer.width,
                    height: layer.height,
                    opacity: 100,
                    visible: true,
                    type: layer.type === 'text' ? 'text' : layer.type === 'product' ? 'image' : 'shape'
                }));
                originalSize = result.originalSize;
                lastSegmentationResult = result;
                logger.info(`${result.message} (置信度: ${(result.confidence * 100).toFixed(1)}%)`);
                if (outputPath) {
                    const exportResult = await psdExporter.exportPsd({
                        layers: currentLayers,
                        outputPath,
                        width: result.originalSize.width,
                        height: result.originalSize.height
                    });
                    if (exportResult.success) {
                        return {
                            success: true,
                            message: `${result.message}\n模型: ${result.model}\n置信度: ${(result.confidence * 100).toFixed(1)}%\n${exportResult.message}`,
                            layers: currentLayers,
                            originalSize: result.originalSize,
                            model: result.model,
                            confidence: result.confidence
                        };
                    }
                }
                return {
                    success: true,
                    message: `${result.message}\n模型: ${result.model}\n置信度: ${(result.confidence * 100).toFixed(1)}%`,
                    layers: currentLayers,
                    originalSize: result.originalSize,
                    model: result.model,
                    confidence: result.confidence
                };
            }
            return result;
        }
    },
    'configure-ai': {
        name: '配置AI模型',
        description: '配置使用的AI模型提供商',
        async execute(context) {
            const { parameters, logger } = context;
            const provider = parameters.provider;
            const apiKey = parameters.apiKey;
            const secretKey = parameters.secretKey;
            if (!provider || !apiKey) {
                return { success: false, message: '请提供AI提供商和API密钥' };
            }
            const config = {
                provider,
                apiKey,
                secretKey
            };
            await aiModelManager_1.aiModelManager.initialize(config);
            logger.info(`已配置AI模型: ${provider}`);
            return {
                success: true,
                message: `已成功配置 ${provider} AI模型`,
                provider: provider
            };
        }
    },
    'list-ai-providers': {
        name: '列出AI提供商',
        description: '获取支持的AI模型提供商列表',
        async execute(context) {
            const providers = aiModelManager_1.aiModelManager.getAvailableProviders();
            const current = aiModelManager_1.aiModelManager.getCurrentProvider();
            return {
                success: true,
                message: `当前使用: ${current}`,
                providers: providers.map(p => ({
                    name: p.name,
                    provider: p.provider,
                    capabilities: p.capabilities,
                    supportedFormats: p.supportedFormats
                })),
                current
            };
        }
    },
    'export-psd': {
        name: '导出 PSD 文件',
        description: '将拆分后的图层导出为 PSD 文件',
        async execute(context) {
            const { parameters, logger } = context;
            const layers = parameters.layers;
            const outputPath = parameters.outputPath;
            if (!outputPath) {
                return { success: false, message: '请提供输出路径' };
            }
            let exportLayers = layers;
            let width = 1920;
            let height = 1080;
            if (layers && layers.length > 0) {
                width = Math.max(...layers.map(l => l.x + l.width));
                height = Math.max(...layers.map(l => l.y + l.height));
            }
            else if (currentLayers.length > 0 && originalSize) {
                exportLayers = currentLayers;
                width = originalSize.width;
                height = originalSize.height;
            }
            logger.info(`开始导出 PSD 到: ${outputPath}`);
            const result = await psdExporter.exportPsd({
                layers: exportLayers,
                outputPath,
                width,
                height
            });
            if (result.success) {
                logger.info(`PSD 导出成功`);
            }
            else {
                logger.error(`PSD 导出失败: ${result.message}`);
            }
            return result;
        }
    },
    'get-layers': {
        name: '获取当前图层列表',
        description: '获取当前已拆分的图层列表',
        async execute(context) {
            return {
                success: true,
                message: currentLayers.length > 0 ? '获取成功' : '暂无图层数据',
                layers: currentLayers,
                originalSize,
                segmentationResult: lastSegmentationResult
            };
        }
    },
    'clear-layers': {
        name: '清空图层数据',
        description: '清空当前已拆分的图层数据',
        async execute(context) {
            currentLayers = [];
            originalSize = null;
            lastSegmentationResult = null;
            return { success: true, message: '图层数据已清空' };
        }
    },
    'get-segmentation-mask': {
        name: '获取分割遮罩',
        description: '获取指定图层的分割遮罩图像',
        async execute(context) {
            const { parameters } = context;
            const layerId = parameters.layerId;
            if (!lastSegmentationResult) {
                return { success: false, message: '没有可用的分割结果' };
            }
            const layer = lastSegmentationResult.layers.find(l => l.id === layerId);
            if (!layer) {
                return { success: false, message: '未找到指定的图层' };
            }
            return {
                success: true,
                message: `图层 ${layer.name} 的遮罩信息`,
                layer: {
                    id: layer.id,
                    name: layer.name,
                    mask: layer.mask,
                    attributes: layer.attributes
                }
            };
        }
    }
};
function getSkillInfo() {
    return {
        name: 'psd-layer-splitter',
        title: '电商图片图层拆分',
        description: '将电商图片的每个图层模块拆分成可编辑的 PSD 图层效果，并可以导出 PSD 文件。支持阿里云、腾讯云、百度、智谱AI、字节豆包等国内主流AI模型',
        version: '2.0.0',
        supportedProviders: aiModels_1.AI_PROVIDERS.map(p => ({
            name: p.name,
            provider: p.provider,
            capabilities: p.capabilities
        })),
        actions: Object.keys(exports.actions).map(id => ({
            id,
            ...exports.actions[id]
        }))
    };
}
async function executeAction(actionId, context) {
    const action = exports.actions[actionId];
    if (!action) {
        return { success: false, message: `未知的动作: ${actionId}` };
    }
    try {
        return await action.execute(context);
    }
    catch (error) {
        return {
            success: false,
            message: `执行失败: ${error.message}`
        };
    }
}
