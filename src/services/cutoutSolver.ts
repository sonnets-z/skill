import {
  ImageAnalysis,
  CutoutSolution,
  CutoutTechnique,
  ProductType
} from '../types/photoshop';

export class CutoutSolutionSelector {
  selectSolution(analysis: ImageAnalysis): CutoutSolution {
    let primaryTechnique: CutoutTechnique = 'pen_tool';
    let secondaryTechniques: CutoutTechnique[] = [];
    let reason = '';
    let confidence = 0.8;

    const {
      productType,
      hasModel,
      hasHair,
      hasTransparentMaterial,
      isWhiteBackground,
      backgroundComplexity,
      subjectComplexity
    } = analysis;

    if (hasHair) {
      primaryTechnique = 'channel';
      secondaryTechniques = ['select_mask', 'magic_quick'];
      reason = '检测到发丝/毛发细节，使用通道抠图结合Select and Mask精修';
      confidence = 0.9;
    } else if (hasTransparentMaterial) {
      primaryTechnique = 'blend_if';
      secondaryTechniques = ['channel', 'select_mask'];
      reason = '检测到透明材质，使用Blend If+通道+蒙版保留透明度';
      confidence = 0.88;
    } else if (hasModel) {
      primaryTechnique = 'ai_subject';
      secondaryTechniques = ['select_mask', 'pen_tool'];
      reason = '模特人像，使用AI主体识别+Select and Mask精修';
      confidence = 0.92;
    } else if (['clothing', 'shoes', 'bag', 'accessory'].includes(productType)) {
      primaryTechnique = 'pen_tool';
      secondaryTechniques = ['magic_quick', 'select_mask'];
      reason = '服装/鞋/包/配饰类产品，优先钢笔工具保证边缘平滑锐利';
      confidence = 0.95;
    } else if (isWhiteBackground) {
      primaryTechnique = 'magic_quick';
      secondaryTechniques = ['color_range', 'select_mask'];
      reason = '白底产品图，快速选择+蒙版清边高效可靠';
      confidence = 0.90;
    } else if (backgroundComplexity === 'low') {
      primaryTechnique = 'color_range';
      secondaryTechniques = ['magic_quick', 'select_mask'];
      reason = '简单背景，使用色彩范围快速分离';
      confidence = 0.85;
    } else if (subjectComplexity === 'high') {
      primaryTechnique = 'ai_subject';
      secondaryTechniques = ['pen_tool', 'select_mask'];
      reason = '主体复杂，使用AI智能识别结合人工精修';
      confidence = 0.88;
    } else {
      primaryTechnique = 'pen_tool';
      secondaryTechniques = ['ai_subject', 'select_mask'];
      reason = '标准产品抠图，钢笔工具为首选';
      confidence = 0.82;
    }

    return {
      primaryTechnique,
      secondaryTechniques,
      reason,
      confidence
    };
  }

  getTechniqueDescription(technique: CutoutTechnique): string {
    const descriptions: Partial<Record<CutoutTechnique, string>> = {
      pen_tool: '钢笔工具精准路径抠图 - 适合边缘锐利的产品，保证平滑无锯齿',
      'pen-tool': '钢笔工具精准路径抠图 - 适合边缘锐利的产品，保证平滑无锯齿',
      ai_subject: 'AI主体识别与快速选择 - 智能定位主体，适合大多数场景',
      'ai-subject': 'AI主体识别与快速选择 - 智能定位主体，适合大多数场景',
      channel: '通道抠图 - 完美处理发丝、毛发、透明材质等精细边缘',
      color_range: '色彩范围抠图 - 适合高反差背景，快速分离',
      'color-range': '色彩范围抠图 - 适合高反差背景，快速分离',
      magic_quick: '魔棒与快速选择工具 - 适合简单背景，高效快捷',
      'magic-quick': '魔棒与快速选择工具 - 适合简单背景，高效快捷',
      blend_if: 'Blend If透明融合 - 完美保留透明层次和反光',
      'blend-if': 'Blend If透明融合 - 完美保留透明层次和反光',
      select_mask: 'Select and Mask精修边缘 - 精细调整边缘，消除白边',
      'select-mask': 'Select and Mask精修边缘 - 精细调整边缘，消除白边'
    };
    return descriptions[technique] || '未知抠图技术';
  }

  getEcommerceQualityChecklist(): string[] {
    return [
      '边缘干净，无白边残留',
      '无锯齿，边缘平滑',
      '无背景像素残留',
      '保留真实阴影',
      '保留材质纹理',
      '保留透明层次',
      '适合亚马逊/电商平台使用',
      '可直接用于二次设计',
      '支持高清放大'
    ];
  }
}
