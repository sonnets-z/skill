import {
  ImageAnalysis,
  ProductType,
  ComplexityLevel,
  AspectRatio
} from '../types/photoshop';
import sharp from 'sharp';
import * as fs from 'fs';

export class ImageAnalyzer {
  async analyzeImage(imagePath: string): Promise<ImageAnalysis> {
    try {
      const imageBuffer = await fs.promises.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();
      
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixelStats = this.analyzePixelStats(data, info);
      const aspectRatio = this.calculateAspectRatio(info.width, info.height);
      const isWhiteBackground = this.checkWhiteBackground(data, info);
      const backgroundComplexity = this.assessBackgroundComplexity(data, info);
      const subjectComplexity = this.assessSubjectComplexity(data, info);
      const productType = this.detectProductType(data, info);
      
      const hasModel = this.detectPerson(data, info);
      const hasHair = hasModel || this.detectHairLikeTextures(data, info);
      const hasTransparentMaterial = this.detectTransparentMaterial(data, info);
      const hasShadow = this.detectShadow(data, info);
      const hasReflection = this.detectReflection(data, info);
      const isEcommerceMainImage = this.checkEcommerceImage(info, productType);

      const recommendations = this.generateRecommendations({
        productType,
        hasModel,
        hasHair,
        hasTransparentMaterial,
        hasShadow,
        hasReflection,
        isWhiteBackground,
        backgroundComplexity,
        subjectComplexity,
        isEcommerceMainImage,
        aspectRatio
      });

      return {
        productType,
        hasModel,
        hasHair,
        hasTransparentMaterial,
        hasShadow,
        hasReflection,
        isWhiteBackground,
        backgroundComplexity,
        subjectComplexity,
        isEcommerceMainImage,
        aspectRatio,
        recommendations
      };
    } catch (error) {
      throw new Error(`图片分析失败: ${(error as Error).message}`);
    }
  }

  private analyzePixelStats(data: Buffer, info: sharp.OutputInfo): any {
    const r = data[0];
    const g = data[1];
    const b = data[2];
    
    const brightness = (r + g + b) / 3;
    const isWhiteish = r > 240 && g > 240 && b > 240;
    const isBlackish = r < 30 && g < 30 && b < 30;
    
    return {
      brightness,
      isWhiteish,
      isBlackish,
      hasColor: !(Math.abs(r - g) < 10 && Math.abs(g - b) < 10)
    };
  }

  private calculateAspectRatio(width: number, height: number): AspectRatio {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return 'square';
    return ratio > 1 ? 'horizontal' : 'vertical';
  }

  private checkWhiteBackground(data: Buffer, info: sharp.OutputInfo): boolean {
    let whitePixelCount = 0;
    let edgePixelCount = 0;
    
    for (let x = 0; x < info.width; x++) {
      for (let y = 0; y < info.height; y++) {
        if (x < 50 || x > info.width - 50 || y < 50 || y > info.height - 50) {
          edgePixelCount++;
          const idx = (y * info.width + x) * (info.channels || 3);
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          if (r > 245 && g > 245 && b > 245) {
            whitePixelCount++;
          }
        }
      }
    }
    
    return edgePixelCount > 0 ? (whitePixelCount / edgePixelCount) > 0.8 : false;
  }

  private assessBackgroundComplexity(data: Buffer, info: sharp.OutputInfo): ComplexityLevel {
    let colorVariations = 0;
    const sampleSize = 100;
    
    const colors = new Set();
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * data.length / 3) * 3;
      const r = Math.round(data[idx] / 32) * 32;
      const g = Math.round(data[idx + 1] / 32) * 32;
      const b = Math.round(data[idx + 2] / 32) * 32;
      colors.add(`${r},${g},${b}`);
    }
    
    if (colors.size < 5) return 'low';
    if (colors.size < 15) return 'medium';
    return 'high';
  }

  private assessSubjectComplexity(data: Buffer, info: sharp.OutputInfo): ComplexityLevel {
    let edgeCount = 0;
    
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < info.width - 1; x++) {
        const idx = (y * info.width + x) * (info.channels || 3);
        const idxRight = (y * info.width + (x + 1)) * (info.channels || 3);
        const idxDown = ((y + 1) * info.width + x) * (info.channels || 3);
        
        const diffRight = Math.abs(data[idx] - data[idxRight]) + 
                         Math.abs(data[idx + 1] - data[idxRight + 1]) + 
                         Math.abs(data[idx + 2] - data[idxRight + 2]);
        
        const diffDown = Math.abs(data[idx] - data[idxDown]) + 
                        Math.abs(data[idx + 1] - data[idxDown + 1]) + 
                        Math.abs(data[idx + 2] - data[idxDown + 2]);
        
        if (diffRight > 50 || diffDown > 50) {
          edgeCount++;
        }
      }
    }
    
    const edgeDensity = edgeCount / (info.width * info.height);
    if (edgeDensity < 0.02) return 'low';
    if (edgeDensity < 0.08) return 'medium';
    return 'high';
  }

  private detectProductType(data: Buffer, info: sharp.OutputInfo): ProductType {
    const aspectRatio = info.width / info.height;
    const centerRegion = this.getCenterRegionStats(data, info);
    
    if (this.hasSkinTones(data, info)) {
      return 'model_portrait';
    }
    
    if (aspectRatio > 2.5 || aspectRatio < 0.4) {
      return 'clothing';
    }
    
    if (this.isJewelry(centerRegion)) {
      return 'jewelry';
    }
    
    if (this.isElectronics(centerRegion)) {
      return 'electronics';
    }
    
    return 'other';
  }

  private getCenterRegionStats(data: Buffer, info: sharp.OutputInfo): any {
    const centerX = Math.floor(info.width / 2);
    const centerY = Math.floor(info.height / 2);
    const regionSize = 100;
    
    let rSum = 0, gSum = 0, bSum = 0;
    let pixelCount = 0;
    
    for (let y = centerY - regionSize; y < centerY + regionSize; y++) {
      for (let x = centerX - regionSize; x < centerX + regionSize; x++) {
        if (x >= 0 && x < info.width && y >= 0 && y < info.height) {
          const idx = (y * info.width + x) * (info.channels || 3);
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          pixelCount++;
        }
      }
    }
    
    return {
      r: rSum / pixelCount,
      g: gSum / pixelCount,
      b: bSum / pixelCount
    };
  }

  private hasSkinTones(data: Buffer, info: sharp.OutputInfo): boolean {
    let skinPixelCount = 0;
    const sampleSize = 1000;
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * data.length / 3) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15) {
        skinPixelCount++;
      }
    }
    
    return skinPixelCount > sampleSize * 0.1;
  }

  private isJewelry(stats: any): boolean {
    const isMetallic = stats.r > 150 && stats.g > 150 && stats.b > 100;
    const hasHighContrast = Math.abs(stats.r - stats.g) + Math.abs(stats.g - stats.b) > 50;
    return isMetallic || hasHighContrast;
  }

  private isElectronics(stats: any): boolean {
    const isDark = stats.r < 100 && stats.g < 100 && stats.b < 100;
    const isGrayish = Math.abs(stats.r - stats.g) < 30 && Math.abs(stats.g - stats.b) < 30;
    return isDark || isGrayish;
  }

  private detectPerson(data: Buffer, info: sharp.OutputInfo): boolean {
    return this.hasSkinTones(data, info);
  }

  private detectHairLikeTextures(data: Buffer, info: sharp.OutputInfo): boolean {
    let darkPixelCount = 0;
    let sampleCount = 0;
    
    for (let i = 0; i < 2000; i += (info.channels || 3)) {
      if (i < data.length) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sampleCount++;
        
        if (r < 80 && g < 70 && b < 60) {
          darkPixelCount++;
        }
      }
    }
    
    return darkPixelCount > sampleCount * 0.15;
  }

  private detectTransparentMaterial(data: Buffer, info: sharp.OutputInfo): boolean {
    let transparentSignals = 0;
    const sampleSize = 500;
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * data.length / 3) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const isLightAndSaturated = r > 200 && g > 200 && b > 200 && 
                                 Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
      
      if (isLightAndSaturated) {
        transparentSignals++;
      }
    }
    
    return transparentSignals > sampleSize * 0.2;
  }

  private detectShadow(data: Buffer, info: sharp.OutputInfo): boolean {
    let softDarkRegions = 0;
    const sampleSize = 800;
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * data.length / 3) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const isSoftDark = r > 50 && r < 150 && g > 50 && g < 150 && b > 50 && b < 150;
      
      if (isSoftDark) {
        softDarkRegions++;
      }
    }
    
    return softDarkRegions > sampleSize * 0.1;
  }

  private detectReflection(data: Buffer, info: sharp.OutputInfo): boolean {
    let brightRegions = 0;
    let sampleCount = 0;
    
    for (let i = 0; i < 1000; i += (info.channels || 3)) {
      if (i < data.length) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sampleCount++;
        
        if (r > 220 && g > 220 && b > 220) {
          brightRegions++;
        }
      }
    }
    
    return brightRegions > sampleCount * 0.05;
  }

  private checkEcommerceImage(info: sharp.OutputInfo, productType: ProductType): boolean {
    const standardSizes = [
      { w: 1000, h: 1000 },
      { w: 1200, h: 1200 },
      { w: 1500, h: 1500 },
      { w: 1600, h: 1600 },
      { w: 2000, h: 2000 }
    ];
    
    const isStandardSize = standardSizes.some(s => 
      Math.abs(info.width - s.w) < 200 && Math.abs(info.height - s.h) < 200
    );
    
    const isSquare = Math.abs(info.width / info.height - 1) < 0.2;
    
    return isStandardSize || isSquare;
  }

  private generateRecommendations(analysis: Omit<ImageAnalysis, 'recommendations'>): string[] {
    const recommendations: string[] = [];
    
    if (analysis.hasHair) {
      recommendations.push('建议使用通道抠图处理发丝细节');
    }
    
    if (analysis.hasTransparentMaterial) {
      recommendations.push('建议使用Blend If和图层蒙版保留透明度');
    }
    
    if (analysis.hasShadow) {
      recommendations.push('注意保留和优化产品阴影效果');
    }
    
    if (analysis.isWhiteBackground) {
      recommendations.push('白底图建议使用快速选择+蒙版清边');
    }
    
    if (analysis.productType === 'clothing' || analysis.productType === 'shoes' || analysis.productType === 'bag') {
      recommendations.push('服装/鞋/包类产品建议使用钢笔工具保证边缘锐利');
    }
    
    if (analysis.hasModel) {
      recommendations.push('模特人像建议结合AI主体识别与Select and Mask精修');
    }
    
    if (analysis.backgroundComplexity === 'high') {
      recommendations.push('复杂背景建议使用色彩范围分离');
    }
    
    if (analysis.isEcommerceMainImage) {
      recommendations.push('电商主图需特别注意边缘净化，无白边，无锯齿');
    }
    
    return recommendations;
  }
}
