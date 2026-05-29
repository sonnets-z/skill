import { LayerSplitter } from './services/layerSplitter';
import { PsdExporter } from './services/psdExporter';
import { Layer, ActionContext } from './types';
import * as fs from 'fs';

const layerSplitter = new LayerSplitter();
const psdExporter = new PsdExporter();

let originalSize: { width: number; height: number } | null = null;
let currentLayers: Layer[] = [];

export const actions = {
  'split-image': {
    name: '拆分图片图层',
    description: '将电商图片拆分为多个可编辑的图层模块',
    async execute(context: ActionContext) {
      const { parameters, logger } = context;
      const imagePath = parameters.imagePath as string;
      const outputPath = parameters.outputPath as string | undefined;

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

  'export-psd': {
    name: '导出 PSD 文件',
    description: '将拆分后的图层导出为 PSD 文件',
    async execute(context: ActionContext) {
      const { parameters, logger } = context;
      const layers = parameters.layers as Layer[];
      const outputPath = parameters.outputPath as string;

      if (!outputPath) {
        return { success: false, message: '请提供输出路径' };
      }

      let exportLayers = layers;
      let width = 1920;
      let height = 1080;

      if (layers && layers.length > 0) {
        width = Math.max(...layers.map(l => l.x + l.width));
        height = Math.max(...layers.map(l => l.y + l.height));
      } else if (currentLayers.length > 0 && originalSize) {
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
      } else {
        logger.error(`PSD 导出失败: ${result.message}`);
      }

      return result;
    }
  },

  'get-layers': {
    name: '获取当前图层列表',
    description: '获取当前已拆分的图层列表',
    async execute(context: ActionContext) {
      return {
        success: true,
        message: currentLayers.length > 0 ? '获取成功' : '暂无图层数据',
        layers: currentLayers,
        originalSize
      };
    }
  },

  'clear-layers': {
    name: '清空图层数据',
    description: '清空当前已拆分的图层数据',
    async execute(context: ActionContext) {
      currentLayers = [];
      originalSize = null;
      return { success: true, message: '图层数据已清空' };
    }
  }
};

export function getSkillInfo() {
  return {
    name: 'psd-layer-splitter',
    title: '电商图片图层拆分',
    description: '将电商图片的每个图层模块拆分成可编辑的 PSD 图层效果，并可以导出 PSD 文件',
    version: '1.0.0',
    actions: Object.keys(actions).map(id => ({
      id,
      ...actions[id as keyof typeof actions]
    }))
  };
}

export async function executeAction(actionId: string, context: ActionContext): Promise<unknown> {
  const action = actions[actionId as keyof typeof actions];
  
  if (!action) {
    return { success: false, message: `未知的动作: ${actionId}` };
  }

  try {
    return await action.execute(context);
  } catch (error) {
    return {
      success: false,
      message: `执行失败: ${(error as Error).message}`
    };
  }
}