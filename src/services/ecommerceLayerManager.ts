import {
  ImageAnalysis,
  DetailedLayer,
  LayerType,
  BlendMode,
  PSDExportOptions,
  ProcessingReport
} from '../types/photoshop';
import sharp from 'sharp';
import * as fs from 'fs';

export class EcommerceLayerManager {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  async generateEcommerceLayers(
    imagePath: string,
    analysis: ImageAnalysis
  ): Promise<{ layers: DetailedLayer[]; originalSize: { width: number; height: number } }> {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const metadata = await sharp(imageBuffer).metadata();
    
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;
    
    const layers: DetailedLayer[] = [];
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

  private createProductLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createModelLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createHairDetailLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createShadowLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createReflectionLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createHighlightLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createLogoLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createTextLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createFeaturesLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createTransparentLayer(width: number, height: number, order: number): DetailedLayer {
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

  private createBackgroundLayer(width: number, height: number, order: number): DetailedLayer {
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

  generateProcessingReport(
    analysis: ImageAnalysis,
    layers: DetailedLayer[],
    solution: any,
    startTime: number,
    originalSize: { width: number; height: number }
  ): ProcessingReport {
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

  private calculateQualityScore(analysis: ImageAnalysis): number {
    let score = 70;
    
    if (analysis.isWhiteBackground) score += 10;
    if (analysis.isEcommerceMainImage) score += 10;
    if (analysis.backgroundComplexity === 'low') score += 5;
    if (analysis.subjectComplexity === 'low') score += 5;
    if (analysis.hasShadow) score += 3;
    if (analysis.hasReflection) score += 2;
    
    return Math.min(score, 100);
  }

  private generateDetailedRecommendations(analysis: ImageAnalysis): string[] {
    const recommendations: string[] = [];
    
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
