import * as fs from 'fs';
import * as path from 'path';
import { Layer, ExportOptions } from '../types';

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
    const length = Buffer.alloc(4);
    length.writeUInt32BE(0);
    return length;
  }

  private createPsdLayerAndMaskInfo(layers: Layer[], width: number, height: number): Buffer {
    const layerRecords: Buffer[] = [];
    
    layers.forEach((layer) => {
      const top = height - layer.y - layer.height;
      const bottom = height - layer.y;
      const left = layer.x;
      const right = layer.x + layer.width;
      
      const layerRecord = Buffer.alloc(28);
      layerRecord.writeInt32BE(top, 0);
      layerRecord.writeInt32BE(left, 4);
      layerRecord.writeInt32BE(bottom, 8);
      layerRecord.writeInt32BE(right, 12);
      layerRecord.writeUInt16BE(0, 16);
      layerRecord.writeUInt16BE(0, 18);
      layerRecord.writeUInt32BE(0, 20);
      layerRecord.writeUInt32BE(0, 24);
      
      layerRecords.push(layerRecord);
    });

    const layerCount = Buffer.alloc(2);
    layerCount.writeUInt16BE(layers.length, 0);
    
    const layerInfoSize = Buffer.alloc(4);
    const totalSize = 2 + layerRecords.reduce((sum, buf) => sum + buf.length, 0) + 4;
    layerInfoSize.writeUInt32BE(totalSize, 0);
    
    return Buffer.concat([layerInfoSize, layerCount, ...layerRecords, Buffer.alloc(4)]);
  }

  private createPsdImageData(width: number, height: number, layers: Layer[]): Buffer {
    const rawData: Buffer[] = [];
    
    for (let y = 0; y < height; y++) {
      rawData.push(Buffer.from([0]));
      
      for (let x = 0; x < width; x++) {
        let r = 255, g = 255, b = 255, a = 0;
        
        const layer = layers.find(l => 
          x >= l.x && x < l.x + l.width && 
          y >= l.y && y < l.y + l.height
        );
        
        if (layer && layer.visible) {
          const layerX = x - layer.x;
          const layerY = y - layer.y;
          const gradient = (layerX + layerY) / (layer.width + layer.height);
          r = Math.round(200 + gradient * 55);
          g = Math.round(180 + gradient * 75);
          b = Math.round(220 - gradient * 20);
          a = Math.round((layer.opacity / 100) * 255);
        }
        
        rawData.push(Buffer.from([r, g, b, a]));
      }
    }
    
    const rleData = this.rleEncode(Buffer.concat(rawData));
    const length = Buffer.alloc(4);
    length.writeUInt32BE(rleData.length, 0);
    
    return Buffer.concat([length, rleData]);
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
}