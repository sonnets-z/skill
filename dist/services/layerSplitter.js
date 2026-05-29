"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerSplitter = void 0;
const sharp_1 = __importDefault(require("sharp"));
class LayerSplitter {
    generateId() {
        return Math.random().toString(36).substring(2, 11);
    }
    async detectLayers(imageBuffer) {
        const layers = [];
        try {
            const image = (0, sharp_1.default)(imageBuffer);
            const metadata = await image.metadata();
            if (!metadata.width || !metadata.height) {
                return layers;
            }
            const width = metadata.width;
            const height = metadata.height;
            const gridSize = 100;
            const cols = Math.ceil(width / gridSize);
            const rows = Math.ceil(height / gridSize);
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = col * gridSize;
                    const y = row * gridSize;
                    const w = Math.min(gridSize, width - x);
                    const h = Math.min(gridSize, height - y);
                    layers.push({
                        id: this.generateId(),
                        name: `图层_${row + 1}_${col + 1}`,
                        x,
                        y,
                        width: w,
                        height: h,
                        opacity: 100,
                        visible: true,
                        type: 'image'
                    });
                }
            }
            layers.push({
                id: this.generateId(),
                name: '背景层',
                x: 0,
                y: 0,
                width: width,
                height: height,
                opacity: 100,
                visible: true,
                type: 'shape'
            });
        }
        catch (error) {
            console.error('图层检测失败:', error);
        }
        return layers;
    }
    async extractVisualBlocks(imageBuffer) {
        const layers = [];
        try {
            const image = (0, sharp_1.default)(imageBuffer);
            const metadata = await image.metadata();
            if (!metadata.width || !metadata.height) {
                return layers;
            }
            const width = metadata.width;
            const height = metadata.height;
            const blockDefinitions = [
                { name: '顶部导航', x: 0, y: 0, w: width, h: Math.min(100, height * 0.15) },
                { name: '商品主图', x: width * 0.05, y: height * 0.1, w: width * 0.6, h: height * 0.5 },
                { name: '商品信息', x: width * 0.7, y: height * 0.1, w: width * 0.25, h: height * 0.3 },
                { name: '价格标签', x: width * 0.7, y: height * 0.45, w: width * 0.25, h: height * 0.15 },
                { name: '促销信息', x: width * 0.05, y: height * 0.65, w: width * 0.9, h: height * 0.1 },
                { name: '商品详情', x: width * 0.05, y: height * 0.8, w: width * 0.9, h: height * 0.15 },
                { name: '底部版权', x: 0, y: height * 0.95, w: width, h: height * 0.05 }
            ];
            blockDefinitions.forEach((block, index) => {
                layers.push({
                    id: this.generateId(),
                    name: block.name,
                    x: Math.round(block.x),
                    y: Math.round(block.y),
                    width: Math.round(block.w),
                    height: Math.round(block.h),
                    opacity: 100,
                    visible: true,
                    type: index < 2 ? 'image' : 'text'
                });
            });
        }
        catch (error) {
            console.error('视觉块提取失败:', error);
        }
        return layers;
    }
    async splitImage(imagePath) {
        try {
            const imageBuffer = await (0, sharp_1.default)(imagePath).toBuffer();
            const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            if (!metadata.width || !metadata.height) {
                return {
                    success: false,
                    message: '无法读取图片尺寸',
                    layers: [],
                    originalSize: { width: 0, height: 0 }
                };
            }
            const visualBlocks = await this.extractVisualBlocks(imageBuffer);
            return {
                success: true,
                message: `成功识别 ${visualBlocks.length} 个图层模块`,
                layers: visualBlocks,
                originalSize: { width: metadata.width, height: metadata.height }
            };
        }
        catch (error) {
            return {
                success: false,
                message: `图片处理失败: ${error.message}`,
                layers: [],
                originalSize: { width: 0, height: 0 }
            };
        }
    }
}
exports.LayerSplitter = LayerSplitter;
