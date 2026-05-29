export interface ImageAnalysis {
  productType: ProductType;
  hasModel: boolean;
  hasHair: boolean;
  hasTransparentMaterial: boolean;
  hasShadow: boolean;
  hasReflection: boolean;
  isWhiteBackground: boolean;
  backgroundComplexity: ComplexityLevel;
  subjectComplexity: ComplexityLevel;
  isEcommerceMainImage: boolean;
  aspectRatio: AspectRatio;
  recommendations: string[];
}

export type ProductType = 
  | 'clothing'
  | 'shoes'
  | 'bag'
  | 'accessory'
  | 'electronics'
  | 'jewelry'
  | 'cosmetic'
  | 'food'
  | 'furniture'
  | 'toys'
  | 'model_portrait'
  | 'other';

export type ComplexityLevel = 'low' | 'medium' | 'high';
export type AspectRatio = 'square' | 'horizontal' | 'vertical';

export type CutoutTechnique = 
  | 'pen_tool'
  | 'pen-tool'
  | 'ai_subject'
  | 'ai-subject'
  | 'channel'
  | 'color_range'
  | 'color-range'
  | 'magic_quick'
  | 'magic-quick'
  | 'blend_if'
  | 'blend-if'
  | 'select_mask'
  | 'select-mask';

export interface CutoutSolution {
  primaryTechnique: CutoutTechnique;
  secondaryTechniques: CutoutTechnique[];
  reason: string;
  confidence: number;
}

export interface DetailedLayer {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
  mask: LayerMask | null;
  effects: LayerEffects;
  order: number;
}

export type LayerType = 
  | 'product'
  | 'model'
  | 'background'
  | 'shadow'
  | 'highlight'
  | 'logo'
  | 'text'
  | 'features'
  | 'transparent'
  | 'hair_detail'
  | 'reflection';

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color_dodge'
  | 'color_burn';

export interface LayerMask {
  hasMask: boolean;
  maskData: string | null;
  feather: number;
  density: number;
}

export interface LayerEffects {
  dropShadow?: ShadowEffect;
  innerShadow?: ShadowEffect;
  outerGlow?: GlowEffect;
  innerGlow?: GlowEffect;
  bevelEmboss?: BevelEmboss;
}

export interface ShadowEffect {
  enabled: boolean;
  angle: number;
  distance: number;
  spread: number;
  size: number;
  opacity: number;
  color: string;
}

export interface GlowEffect {
  enabled: boolean;
  spread: number;
  size: number;
  opacity: number;
  color: string;
}

export interface BevelEmboss {
  enabled: boolean;
  style: 'inner_bevel' | 'outer_bevel' | 'emboss' | 'pillow_emboss';
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
}

export interface PSDExportOptions {
  includeHighPass: boolean;
  includeFrequencySeparation: boolean;
  includeBlendIf: boolean;
  preserveBackground: boolean;
  preserveShadows: boolean;
  exportTransparent: boolean;
  addSmartObjects: boolean;
}

export interface ProcessingReport {
  originalAnalysis: ImageAnalysis;
  selectedSolution: CutoutSolution;
  layersGenerated: number;
  processingTime: number;
  qualityScore: number;
  recommendations: string[];
  originalSize: { width: number; height: number };
}
