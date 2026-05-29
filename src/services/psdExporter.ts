import * as fs from 'fs';
import { Layer, ExportOptions } from '../types';
import { DetailedLayer, PSDExportOptions } from '../types/photoshop';

export class PsdExporter {
  private createPsdHeader(width: number, height: number): Buffer {
    const header = Buffer.alloc(26);
    
    header.write('8BPS', 0, 4, 'ascii');
    header.writeUInt16BE(1, 4);
    header.writeUInt16BE(1, 6);
    header.writeUInt32BE(width, 8);
    header.writeUInt32BE(height, 12);
    header.writeUInt16BE(72, 16);
    header.writeUInt16BE(72, 18);
    header.writeUInt32BE(1, 20);
    header.writeUInt16BE(8, 24);
    
    return header;
  }

  private createPsdColorModeData(): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(0);
    return length;
  }

  private createPsdImageResources(): Buffer {
    const resources: Buffer[] = [];
    
    const gridGuides = this.createGridGuideResource();
    resources.push(gridGuides);
    
    const copyright = this.createCopyrightResource();
    resources.push(copyright);
    
    const totalSize = resources.reduce((sum, r) => sum + r.length, 0);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(totalSize, 0);
    
    return Buffer.concat([length, ...resources]);
  }

  private createGridGuideResource(): Buffer {
    const data = Buffer.alloc(16);
    data.writeUInt16BE(0, 0);
    data.writeUInt32BE(28346457, 2);
    data.writeUInt32BE(0, 6);
    data.writeUInt32BE(0, 10);
    
    const id = Buffer.alloc(2);
    id.writeUInt16BE(1044, 0);
    
    const name = Buffer.alloc(1);
    name.writeUInt8(0, 0);
    
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length, 0);
    
    const paddedSize = (data.length + 3) & ~3;
    const padding = Buffer.alloc(paddedSize - data.length);
    
    return Buffer.concat([id, name, size, data, padding]);
  }

  private createCopyrightResource(): Buffer {
    const copyrightText = 'Commercial E-Commerce PSD';
    const data = Buffer.from(copyrightText, 'utf8');
    
    const id = Buffer.alloc(2);
    id.writeUInt16BE(1008, 0);
    
    const name = Buffer.alloc(1);
    name.writeUInt8(0, 0);
    
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length, 0);
    
    const paddedSize = (data.length + 3) & ~3;
    const padding = Buffer.alloc(paddedSize - data.length);
    
    return Buffer.concat([id, name, size, data, padding]);
  }

  private createPsdLayerAndMaskInfo(layers: Layer[] | DetailedLayer[], width: number, height: number, options?: PSDExportOptions): Buffer {
    const layerRecords: Buffer[] = [];
    const layerImages: Buffer[] = [];
    
    const sortedLayers = [...layers].sort((a, b) => (a as any).order - (b as any).order);
    
    sortedLayers.forEach((layer) => {
      const top = height - layer.y - layer.height;
      const bottom = height - layer.y;
      const left = layer.x;
      const right = layer.x + layer.width;
      
      const layerRecord = this.createLayerRecord(layer, top, left, bottom, right);
      layerRecords.push(layerRecord);
      
      const layerImage = this.createLayerImage(layer, right - left, bottom - top);
      layerImages.push(layerImage);
    });

    const layerCount = Buffer.alloc(2);
    layerCount.writeInt16BE(-sortedLayers.length, 0);
    
    const layerRecordsSize = layerRecords.reduce((sum, buf) => sum + buf.length, 0);
    const layerImagesSize = layerImages.reduce((sum, buf) => sum + buf.length, 0);
    
    const layerInfoSize = Buffer.alloc(4);
    const totalLayerInfoSize = 2 + layerRecordsSize + layerImagesSize;
    layerInfoSize.writeUInt32BE(totalLayerInfoSize, 0);
    
    const globalMaskInfo = Buffer.alloc(4);
    globalMaskInfo.writeUInt32BE(0, 0);
    
    return Buffer.concat([layerInfoSize, layerCount, ...layerRecords, ...layerImages, globalMaskInfo]);
  }

  private createLayerRecord(layer: Layer | DetailedLayer, top: number, left: number, bottom: number, right: number): Buffer {
    const parts: Buffer[] = [];
    
    const rect = Buffer.alloc(16);
    rect.writeInt32BE(top, 0);
    rect.writeInt32BE(left, 4);
    rect.writeInt32BE(bottom, 8);
    rect.writeInt32BE(right, 12);
    parts.push(rect);
    
    const numChannels = 4;
    const channels = Buffer.alloc(numChannels * 6);
    for (let i = 0; i < numChannels; i++) {
      channels.writeInt16BE(i, i * 6);
      channels.writeUInt16BE(0, i * 6 + 2);
      channels.writeUInt16BE(0, i * 6 + 4);
    }
    parts.push(channels);
    
    const blendMode = Buffer.alloc(12);
    blendMode.write('8BIM', 0, 4, 'ascii');
    
    let blendSig = 'norm';
    if ('blendMode' in layer) {
      const blendMap: Record<string, string> = {
        'normal': 'norm',
        'multiply': 'mul ',
        'screen': 'scrn',
        'overlay': 'over',
        'darken': 'dark',
        'lighten': 'lite',
        'color_dodge': 'dodge',
        'color_burn': 'burn'
      };
      blendSig = blendMap[layer.blendMode] || 'norm';
    }
    blendMode.write(blendSig, 4, 4, 'ascii');
    
    const opacity = 'opacity' in layer ? Math.round(layer.opacity * 2.55) : 255;
    blendMode.writeUInt8(opacity, 8);
    blendMode.writeUInt8(0, 9);
    blendMode.writeUInt8(0, 10);
    blendMode.writeUInt8(0, 11);
    parts.push(blendMode);
    
    const extraLength = Buffer.alloc(4);
    extraLength.writeUInt32BE(0, 0);
    parts.push(extraLength);
    
    const maskData = Buffer.alloc(0);
    if ('mask' in layer && layer.mask && layer.mask.hasMask) {
    }
    parts.push(Buffer.alloc(4));
    
    const blendingRanges = Buffer.alloc(0);
    parts.push(Buffer.alloc(4));
    
    const name = Buffer.alloc(1);
    name.writeUInt8(0, 0);
    const layerName = layer.name || 'Layer';
    const nameUtf8 = Buffer.from(layerName, 'utf8');
    const nameLen = nameUtf8.length;
    const nameBuffer = Buffer.alloc(1 + nameLen + (4 - ((1 + nameLen) % 4)) % 4);
    nameBuffer.writeUInt8(nameLen, 0);
    nameUtf8.copy(nameBuffer, 1);
    parts.push(nameBuffer);
    
    return Buffer.concat(parts);
  }

  private createLayerImage(layer: Layer | DetailedLayer, width: number, height: number): Buffer {
    const rawData: Buffer[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 200, g = 180, b = 220, a = 255;
        
        const gradient = (x + y) / (width + height);
        r = Math.round(180 + gradient * 75);
        g = Math.round(160 + gradient * 95);
        b = Math.round(200 - gradient * 20);
        a = Math.round(('opacity' in layer ? layer.opacity : 100) / 100 * 255);
        
        rawData.push(Buffer.from([r, g, b, a]));
      }
    }
    
    const channels = ['red', 'green', 'blue', 'alpha'];
    const channelData: Buffer[] = [];
    
    channels.forEach(() => {
      const rleData = this.rleEncode(Buffer.concat(rawData).filter((_, i) => i % 4 === 0));
      const lineSizes = Buffer.alloc(height * 2);
      for (let i = 0; i < height; i++) {
        lineSizes.writeUInt16BE(0, i * 2);
      }
      channelData.push(lineSizes);
      channelData.push(rleData);
    });
    
    return Buffer.concat(channelData);
  }

  private createPsdImageData(width: number, height: number, layers: Layer[] | DetailedLayer[]): Buffer {
    const rawData: Buffer[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 255, g = 255, b = 255, a = 0;
        
        const layer = layers.find(l => 
          x >= l.x && x < l.x + l.width && 
          y >= l.y && y < l.y + l.height &&
          l.visible
        );
        
        if (layer) {
          const layerX = x - layer.x;
          const layerY = y - layer.y;
          const gradient = (layerX + layerY) / (layer.width + layer.height);
          r = Math.round(180 + gradient * 75);
          g = Math.round(160 + gradient * 95);
          b = Math.round(220 - gradient * 35);
          a = Math.round(('opacity' in layer ? layer.opacity : 100) / 100 * 255);
        }
        
        rawData.push(Buffer.from([r, g, b, a]));
      }
    }
    
    const channels = ['red', 'green', 'blue', 'alpha'];
    const channelData: Buffer[] = [];
    const combinedRaw = Buffer.concat(rawData);
    
    channels.forEach((channel, index) => {
      const channelPixels: number[] = [];
      for (let i = index; i < combinedRaw.length; i += 4) {
        channelPixels.push(combinedRaw[i]);
      }
      const rleData = this.rleEncode(Buffer.from(channelPixels));
      const lineSizes = Buffer.alloc(height * 2);
      for (let i = 0; i < height; i++) {
        lineSizes.writeUInt16BE(0, i * 2);
      }
      channelData.push(lineSizes);
      channelData.push(rleData);
    });
    
    const compression = Buffer.alloc(2);
    compression.writeUInt16BE(1, 0);
    
    return Buffer.concat([compression, ...channelData]);
  }

  private rleEncode(data: Buffer): Buffer {
    const result: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      const start = i;
      const byte = data[i];
      
      while (i < data.length && data[i] === byte && i - start < 127) {
        i++;
      }
      
      const count = i - start;
      
      if (count > 1 || byte === 0) {
        result.push(count - 1);
        result.push(byte);
      } else {
        const rawStart = i;
        while (i < data.length && (i - rawStart < 128) && (i === rawStart || data[i] !== data[i - 1])) {
          i++;
        }
        
        const rawCount = i - rawStart;
        result.push(257 - rawCount);
        for (let j = rawStart; j < i; j++) {
          result.push(data[j]);
        }
      }
    }
    
    return Buffer.from(result);
  }

  async exportPsd(options: ExportOptions): Promise<{ success: boolean; message: string }> {
    try {
      const { layers, outputPath, width, height } = options;
      
      const header = this.createPsdHeader(width, height);
      const colorModeData = this.createPsdColorModeData();
      const imageResources = this.createPsdImageResources();
      const layerAndMaskInfo = this.createPsdLayerAndMaskInfo(layers, width, height);
      const imageData = this.createPsdImageData(width, height, layers);
      
      const psdBuffer = Buffer.concat([
        header,
        colorModeData,
        imageResources,
        layerAndMaskInfo,
        imageData
      ]);
      
      await fs.promises.writeFile(outputPath, psdBuffer);
      
      return {
        success: true,
        message: `PSD 文件已成功导出到: ${outputPath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `PSD 导出失败: ${(error as Error).message}`
      };
    }
  }

  async exportEcommercePsd(
    layers: DetailedLayer[],
    outputPath: string,
    width: number,
    height: number,
    options?: PSDExportOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      const header = this.createPsdHeader(width, height);
      const colorModeData = this.createPsdColorModeData();
      const imageResources = this.createPsdImageResources();
      const layerAndMaskInfo = this.createPsdLayerAndMaskInfo(layers, width, height, options);
      const imageData = this.createPsdImageData(width, height, layers);
      
      const psdBuffer = Buffer.concat([
        header,
        colorModeData,
        imageResources,
        layerAndMaskInfo,
        imageData
      ]);
      
      await fs.promises.writeFile(outputPath, psdBuffer);
      
      return {
        success: true,
        message: `商业级电商 PSD 文件已成功导出到: ${outputPath} (${layers.length} 个图层)`
      };
    } catch (error) {
      return {
        success: false,
        message: `商业级电商 PSD 导出失败: ${(error as Error).message}`
      };
    }
  }
}
