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
const imageAnalyzer_1 = require("./services/imageAnalyzer");
const cutoutSolver_1 = require("./services/cutoutSolver");
const ecommerceLayerManager_1 = require("./services/ecommerceLayerManager");
const aiModels_1 = require("./types/aiModels");
const fs = __importStar(require("fs"));
const layerSplitter = new layerSplitter_1.LayerSplitter();
const psdExporter = new psdExporter_1.PsdExporter();
const imageAnalyzer = new imageAnalyzer_1.ImageAnalyzer();
const cutoutSelector = new cutoutSolver_1.CutoutSolutionSelector();
const layerManager = new ecommerceLayerManager_1.EcommerceLayerManager();
let originalSize = null;
let currentLayers = [];
let currentDetailedLayers = [];
let lastSegmentationResult = null;
let lastAnalysis = null;
let lastCutoutSolution = null;
let lastProcessingReport = null;
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
    'photoshop-cutout': {
        name: 'Photoshop商业级智能抠图',
        description: '使用Photoshop专业技术智能分析并处理电商图片抠图',
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
            const startTime = Date.now();
            logger.info(`开始Photoshop商业级抠图处理: ${imagePath}`);
            try {
                const analysis = await imageAnalyzer.analyzeImage(imagePath);
                lastAnalysis = analysis;
                logger.info(`图片分析完成 - 产品类型: ${analysis.productType}, 背景: ${analysis.isWhiteBackground ? '白底' : '非白底'}`);
                const cutoutSolution = cutoutSelector.selectSolution(analysis);
                lastCutoutSolution = cutoutSolution;
                logger.info(`抠图方案选择: ${cutoutSolution.reason}`);
                const detailedLayers = await layerManager.generateEcommerceLayers(imagePath, analysis);
                currentDetailedLayers = detailedLayers;
                const report = layerManager.generateProcessingReport(analysis, detailedLayers, cutoutSolution, startTime);
                lastProcessingReport = report;
                currentLayers = detailedLayers.map(l => ({
                    id: l.id,
                    name: l.name,
                    x: l.x,
                    y: l.y,
                    width: l.width,
                    height: l.height,
                    opacity: l.opacity,
                    visible: l.visible,
                    type: l.type === 'text' ? 'text' : 'image'
                }));
                originalSize = { width: report.originalSize.width, height: report.originalSize.height };
                let exportMessage = '';
                if (outputPath) {
                    const exportResult = await psdExporter.exportEcommercePsd(detailedLayers, outputPath, report.originalSize.width, report.originalSize.height, {
                        includeHighPass: true,
                        includeFrequencySeparation: false,
                        includeBlendIf: analysis.hasTransparentMaterial,
                        preserveBackground: !analysis.isWhiteBackground,
                        preserveShadows: analysis.hasShadow,
                        exportTransparent: true,
                        addSmartObjects: true
                    });
                    exportMessage = exportResult.message;
                }
                const qualityChecklist = cutoutSelector.getEcommerceQualityChecklist();
                return {
                    success: true,
                    message: `Photoshop商业级抠图处理完成\n方案: ${cutoutSolution.reason}\n置信度: ${(cutoutSolution.confidence * 100).toFixed(0)}%\n质量评分: ${(report.qualityScore).toFixed(0)}/100${exportMessage ? `\n${exportMessage}` : ''}`,
                    layers: currentLayers,
                    detailedLayers: detailedLayers,
                    analysis: analysis,
                    cutoutSolution: cutoutSolution,
                    report: report,
                    qualityChecklist: qualityChecklist,
                    originalSize: report.originalSize
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Photoshop抠图处理失败: ${error.message}`
                };
            }
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
            const useEcommerceMode = parameters.useEcommerceMode;
            if (!outputPath) {
                return { success: false, message: '请提供输出路径' };
            }
            if (useEcommerceMode && currentDetailedLayers.length > 0 && originalSize) {
                logger.info(`开始导出商业级电商 PSD 到: ${outputPath}`);
                const result = await psdExporter.exportEcommercePsd(currentDetailedLayers, outputPath, originalSize.width, originalSize.height);
                if (result.success) {
                    logger.info(`商业级电商 PSD 导出成功`);
                }
                return result;
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
    'get-analysis': {
        name: '获取图片分析结果',
        description: '获取最后一次处理的图片分析结果',
        async execute(context) {
            if (!lastAnalysis) {
                return { success: false, message: '暂无图片分析结果，请先执行抠图处理' };
            }
            return {
                success: true,
                message: '获取图片分析结果成功',
                analysis: lastAnalysis,
                cutoutSolution: lastCutoutSolution,
                report: lastProcessingReport
            };
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
                detailedLayers: currentDetailedLayers,
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
            currentDetailedLayers = [];
            originalSize = null;
            lastSegmentationResult = null;
            lastAnalysis = null;
            lastCutoutSolution = null;
            lastProcessingReport = null;
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
    },
    'get-cutout-guide': {
        name: '获取Photoshop抠图指南',
        description: '根据图片特征获取详细的Photoshop抠图操作指南',
        async execute(context) {
            if (!lastAnalysis) {
                return { success: false, message: '暂无图片分析结果，请先执行抠图处理' };
            }
            const guide = generatePhotoshopGuide(lastAnalysis, lastCutoutSolution);
            return {
                success: true,
                message: '获取抠图指南成功',
                guide: guide
            };
        }
    }
};
function generatePhotoshopGuide(analysis, solution) {
    const steps = [];
    if (!solution) {
        return { steps: ['请先执行图片分析以获取个性化指南'] };
    }
    steps.push(`1. 分析图片特征: 产品类型 ${analysis.productType}, ${analysis.hasModel ? '有人物' : '无人物'}, ${analysis.hasHair ? '有头发/毛发细节' : '无毛发'}, ${analysis.isWhiteBackground ? '白底图' : '复杂背景'}`);
    steps.push(`2. 推荐方案: ${solution.reason}`);
    switch (solution.primaryTechnique) {
        case 'pen-tool':
            steps.push('3. 使用钢笔工具创建精确路径，确保边缘平滑无锯齿');
            steps.push('4. 将路径转换为选区，创建图层蒙版');
            steps.push('5. 放大检查边缘，使用画笔工具修复');
            break;
        case 'ai-subject':
            steps.push('3. 使用Photoshop AI主体选择功能快速获取选区');
            steps.push('4. 进入Select and Mask调整边缘参数');
            steps.push('5. 细化蒙版，去除白边和背景残留');
            break;
        case 'channel':
            steps.push('3. 进入通道面板，寻找对比度最高的通道');
            steps.push('4. 复制该通道并调整色阶，强化边缘');
            steps.push('5. 使用画笔工具修复缺失的区域');
            steps.push('6. 将通道作为选区加载');
            break;
        case 'color-range':
            steps.push('3. 使用色彩范围选择背景颜色');
            steps.push('4. 调整模糊度和范围参数');
            steps.push('5. 反向选择以获取主体');
            break;
        case 'magic-quick':
            steps.push('3. 使用快速选择工具大致选择主体');
            steps.push('4. 使用选择并遮住边缘优化');
            steps.push('5. 使用智能半径处理复杂边缘');
            break;
        case 'blend-if':
            steps.push('3. 打开图层样式面板');
            steps.push('4. 调整本图层和下一图层滑块');
            steps.push('5. 按住Alt键分离滑块，获得平滑过渡');
            break;
        case 'select-mask':
            steps.push('3. 建立初步选区后进入Select and Mask');
            steps.push('4. 使用精修画笔工具处理边缘');
            steps.push('5. 调整平滑、羽化、对比度和移动边缘参数');
            steps.push('6. 使用净化颜色功能去除边缘杂色');
            break;
    }
    steps.push('7. 检查并保留产品阴影');
    steps.push('8. 确保边缘无白边、无锯齿');
    steps.push('9. 保存为PSD文件');
    if (analysis.isWhiteBackground) {
        steps.push('10. 创建1000x1000纯白底主图版本');
    }
    if (analysis.hasHair) {
        steps.push('特别注意：使用Refine Hair功能处理头发边缘');
    }
    if (analysis.hasTransparentMaterial) {
        steps.push('特别注意：使用图层混合模式和通道保留透明度');
    }
    return { steps };
}
function getSkillInfo() {
    return {
        name: 'psd-layer-splitter',
        title: 'Photoshop商业级电商图片图层拆分',
        description: '专业级电商图片抠图工具，集成Photoshop专业技术和国内主流AI模型。支持钢笔工具、通道抠图、Select and Mask等专业抠图方案，可生成高质量PSD分层文件',
        version: '3.0.0',
        supportedProviders: aiModels_1.AI_PROVIDERS.map(p => ({
            name: p.name,
            provider: p.provider,
            capabilities: p.capabilities
        })),
        supportedCutoutTechniques: [
            { id: 'pen-tool', name: '钢笔工具', description: '精确路径抠图，适合边缘锐利产品' },
            { id: 'ai-subject', name: 'AI主体识别', description: '智能识别主体，适合多数场景' },
            { id: 'channel', name: '通道抠图', description: '适合发丝、毛发、透明材质' },
            { id: 'color-range', name: '色彩范围', description: '适合高反差背景' },
            { id: 'magic-quick', name: '魔棒/快速选择', description: '适合简单背景' },
            { id: 'blend-if', name: 'Blend If', description: '适合透明材质和反光' },
            { id: 'select-mask', name: 'Select and Mask', description: '边缘精修工具' }
        ],
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
