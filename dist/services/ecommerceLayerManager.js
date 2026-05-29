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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcommerceLayerManager = void 0;
const sharp_1 = __importDefault(require("sharp"));
const fs = __importStar(require("fs"));
class EcommerceLayerManager {
    generateId() {
        return Math.random().toString(36).substring(2, 11);
    }
    async generateEcommerceLayers(imagePath, analysis) {
        const imageBuffer = await fs.promises.readFile(imagePath);
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        const width = metadata.width || 1000;
        const height = metadata.height || 1000;
        const layers = [];
        let order = 0;
        if (analysis.productType !== 'other') {
            layers.push(this.createProductLayer(width, height, order++));
        }
        if (analysis.hasModel) {
            layers.push(this.createModelLayer(width, height, order++));
            if (analysis.hasHair) {
                layers.push(this.createHairDetailLayer(width, height, order++));
            }
        }
        if (analysis.hasShadow) {
            layers.push(this.createShadowLayer(width, height, order++));
        }
        if (analysis.hasReflection) {
            layers.push(this.createReflectionLayer(width, height, order++));
        }
        layers.push(this.createHighlightLayer(width, height, order++));
        layers.push(this.createLogoLayer(width, height, order++));
        layers.push(this.createTextLayer(width, height, order++));
        layers.push(this.createFeaturesLayer(width, height, order++));
        if (analysis.hasTransparentMaterial) {
            layers.push(this.createTransparentLayer(width, height, order++));
        }
        layers.push(this.createBackgroundLayer(width, height, order++));
        return { layers, originalSize: { width, height } };
    }
    createProductLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '产品主体',
            type: 'product',
            x: Math.round(width * 0.15),
            y: Math.round(height * 0.15),
            width: Math.round(width * 0.7),
            height: Math.round(height * 0.7),
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 0.5,
                density: 100
            },
            effects: {},
            order
        };
    }
    createModelLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '模特人物',
            type: 'model',
            x: Math.round(width * 0.2),
            y: Math.round(height * 0.1),
            width: Math.round(width * 0.6),
            height: Math.round(height * 0.8),
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 0.3,
                density: 100
            },
            effects: {},
            order
        };
    }
    createHairDetailLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '发丝细节',
            type: 'hair_detail',
            x: Math.round(width * 0.3),
            y: Math.round(height * 0.05),
            width: Math.round(width * 0.4),
            height: Math.round(height * 0.25),
            opacity: 100,
            visible: true,
            blendMode: 'multiply',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 2,
                density: 90
            },
            effects: {},
            order
        };
    }
    createShadowLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '产品阴影',
            type: 'shadow',
            x: Math.round(width * 0.12),
            y: Math.round(height * 0.75),
            width: Math.round(width * 0.76),
            height: Math.round(height * 0.2),
            opacity: 60,
            visible: true,
            blendMode: 'multiply',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 10,
                density: 100
            },
            effects: {
                dropShadow: {
                    enabled: true,
                    angle: 120,
                    distance: 5,
                    spread: 5,
                    size: 15,
                    opacity: 30,
                    color: '#000000'
                }
            },
            order
        };
    }
    createReflectionLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '高光反射',
            type: 'reflection',
            x: Math.round(width * 0.3),
            y: Math.round(height * 0.25),
            width: Math.round(width * 0.4),
            height: Math.round(height * 0.3),
            opacity: 40,
            visible: true,
            blendMode: 'screen',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 5,
                density: 80
            },
            effects: {
                outerGlow: {
                    enabled: true,
                    spread: 5,
                    size: 20,
                    opacity: 25,
                    color: '#ffffff'
                }
            },
            order
        };
    }
    createHighlightLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '高光细节',
            type: 'highlight',
            x: Math.round(width * 0.25),
            y: Math.round(height * 0.2),
            width: Math.round(width * 0.5),
            height: Math.round(height * 0.4),
            opacity: 70,
            visible: true,
            blendMode: 'overlay',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 3,
                density: 100
            },
            effects: {},
            order
        };
    }
    createLogoLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '品牌LOGO',
            type: 'logo',
            x: Math.round(width * 0.05),
            y: Math.round(height * 0.05),
            width: Math.round(width * 0.15),
            height: Math.round(height * 0.1),
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: false,
                maskData: null,
                feather: 0,
                density: 100
            },
            effects: {},
            order
        };
    }
    createTextLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '文案区域',
            type: 'text',
            x: Math.round(width * 0.6),
            y: Math.round(height * 0.15),
            width: Math.round(width * 0.35),
            height: Math.round(height * 0.3),
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: false,
                maskData: null,
                feather: 0,
                density: 100
            },
            effects: {},
            order
        };
    }
    createFeaturesLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '功能卖点',
            type: 'features',
            x: Math.round(width * 0.6),
            y: Math.round(height * 0.5),
            width: Math.round(width * 0.35),
            height: Math.round(height * 0.4),
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: false,
                maskData: null,
                feather: 0,
                density: 100
            },
            effects: {},
            order
        };
    }
    createTransparentLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '透明材质',
            type: 'transparent',
            x: Math.round(width * 0.25),
            y: Math.round(height * 0.3),
            width: Math.round(width * 0.5),
            height: Math.round(height * 0.4),
            opacity: 85,
            visible: true,
            blendMode: 'color_dodge',
            mask: {
                hasMask: true,
                maskData: null,
                feather: 1,
                density: 95
            },
            effects: {},
            order
        };
    }
    createBackgroundLayer(width, height, order) {
        return {
            id: this.generateId(),
            name: '背景',
            type: 'background',
            x: 0,
            y: 0,
            width: width,
            height: height,
            opacity: 100,
            visible: true,
            blendMode: 'normal',
            mask: {
                hasMask: false,
                maskData: null,
                feather: 0,
                density: 100
            },
            effects: {},
            order
        };
    }
    generateProcessingReport(analysis, layers, solution, startTime, originalSize) {
        const qualityScore = this.calculateQualityScore(analysis);
        const recommendations = this.generateDetailedRecommendations(analysis);
        return {
            originalAnalysis: analysis,
            selectedSolution: solution,
            layersGenerated: layers.length,
            processingTime: Date.now() - startTime,
            qualityScore,
            recommendations,
            originalSize
        };
    }
    calculateQualityScore(analysis) {
        let score = 70;
        if (analysis.isWhiteBackground)
            score += 10;
        if (analysis.isEcommerceMainImage)
            score += 10;
        if (analysis.backgroundComplexity === 'low')
            score += 5;
        if (analysis.subjectComplexity === 'low')
            score += 5;
        if (analysis.hasShadow)
            score += 3;
        if (analysis.hasReflection)
            score += 2;
        return Math.min(score, 100);
    }
    generateDetailedRecommendations(analysis) {
        const recommendations = [];
        recommendations.push('使用钢笔工具建立精确选区路径');
        recommendations.push('在Select and Mask中精修边缘，消除白边');
        recommendations.push('添加图层蒙版保护原始像素');
        recommendations.push('使用混合模式处理高光和阴影');
        if (analysis.isEcommerceMainImage) {
            recommendations.push('创建白底主图版本，尺寸1000x1000以上');
            recommendations.push('添加产品阴影增强立体感');
        }
        if (analysis.hasTransparentMaterial) {
            recommendations.push('使用Blend If滑块处理透明层次');
        }
        if (analysis.hasHair) {
            recommendations.push('使用通道分离头发选区');
            recommendations.push('使用边缘画笔工具精修发丝');
        }
        return recommendations;
    }
}
exports.EcommerceLayerManager = EcommerceLayerManager;
