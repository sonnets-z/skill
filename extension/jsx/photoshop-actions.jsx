function getActiveDocumentInfo() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return { success: false, message: '没有打开的文档' };
        }
        
        var layers = [];
        for (var i = 0; i < doc.layers.length; i++) {
            var layer = doc.layers[i];
            layers.push({
                name: layer.name,
                id: layer.id.toString(),
                type: getLayerType(layer),
                visible: layer.visible,
                locked: layer.locked,
                opacity: Math.round(layer.opacity * 100),
                x: layer.bounds[0],
                y: layer.bounds[1],
                width: layer.bounds[2] - layer.bounds[0],
                height: layer.bounds[3] - layer.bounds[1]
            });
        }
        
        return {
            success: true,
            message: '获取文档信息成功',
            document: {
                name: doc.name,
                width: doc.width,
                height: doc.height,
                resolution: doc.resolution,
                mode: doc.mode.toString(),
                colorProfile: doc.colorProfileName
            },
            layers: layers,
            layerCount: doc.layers.length
        };
    } catch (e) {
        return { success: false, message: '获取文档信息失败: ' + e.message };
    }
}

function getLayerType(layer) {
    if (layer.typename === 'ArtLayer') {
        if (layer.kind === LayerKind.TEXT) return 'text';
        if (layer.kind === LayerKind.SHAPE) return 'shape';
        if (layer.kind === LayerKind.BACKGROUND) return 'background';
        return 'image';
    }
    if (layer.typename === 'LayerSet') return 'group';
    if (layer.typename === 'AdjustmentLayer') return 'adjustment';
    return 'other';
}

function selectLayer(layerId) {
    try {
        var doc = app.activeDocument;
        var layer = doc.layers.getByName(decodeURIComponent(layerId));
        layer.selected = true;
        return { success: true, message: '图层已选中' };
    } catch (e) {
        return { success: false, message: '选中图层失败: ' + e.message };
    }
}

function createLayerMask() {
    try {
        var doc = app.activeDocument;
        if (!doc.activeLayer) {
            return { success: false, message: '请先选择一个图层' };
        }
        
        if (doc.activeLayer.hasLayerMask) {
            return { success: false, message: '图层已有蒙版' };
        }
        
        doc.activeLayer.layerMaskEnabled = true;
        return { success: true, message: '蒙版已创建' };
    } catch (e) {
        return { success: false, message: '创建蒙版失败: ' + e.message };
    }
}

function applyCutoutSelection(selectionData) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return { success: false, message: '没有打开的文档' };
        }
        
        var selection = doc.selection;
        selection.deselect();
        
        var bounds = selectionData.bounds;
        var maskData = selectionData.maskData;
        
        if (bounds) {
            var x = bounds.x || 0;
            var y = bounds.y || 0;
            var w = bounds.width || doc.width;
            var h = bounds.height || doc.height;
            
            selection.select(Rectangle(y, x, h, w));
        }
        
        if (maskData && doc.activeLayer) {
            if (!doc.activeLayer.hasLayerMask) {
                doc.activeLayer.layerMaskEnabled = true;
            }
            
            var mask = doc.activeLayer.layerMask;
            mask.applyBitmap(maskData, OffsetRect(0, 0));
        }
        
        return { success: true, message: '选区已应用' };
    } catch (e) {
        return { success: false, message: '应用选区失败: ' + e.message };
    }
}

function createSmartObject() {
    try {
        var doc = app.activeDocument;
        if (!doc.activeLayer) {
            return { success: false, message: '请先选择一个图层' };
        }
        
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
        desc.putReference(charIDToTypeID('null'), ref);
        
        executeAction(charIDToTypeID('Mk  '), desc, DialogModes.NO);
        
        return { success: true, message: '智能对象已创建' };
    } catch (e) {
        return { success: false, message: '创建智能对象失败: ' + e.message };
    }
}

function applyHighPassFilter(radius) {
    try {
        var doc = app.activeDocument;
        if (!doc.activeLayer) {
            return { success: false, message: '请先选择一个图层' };
        }
        
        var desc = new ActionDescriptor();
        desc.putUnitDouble(charIDToTypeID('Rads'), charIDToTypeID('Pxl '), radius || 2);
        
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
        desc.putReference(charIDToTypeID('null'), ref);
        
        executeAction(charIDToTypeID('HghP'), desc, DialogModes.NO);
        
        return { success: true, message: '高反差保留已应用' };
    } catch (e) {
        return { success: false, message: '应用高反差保留失败: ' + e.message };
    }
}

function saveAsPsd(filePath) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return { success: false, message: '没有打开的文档' };
        }
        
        var file = new File(filePath);
        
        var options = new PhotoshopSaveOptions();
        options.embedColorProfile = true;
        options.alphaChannels = true;
        options.layers = true;
        options.annotations = true;
        options.spotColors = true;
        
        doc.saveAs(file, options, true, Extension.LOWERCASE);
        
        return { success: true, message: 'PSD文件已保存' };
    } catch (e) {
        return { success: false, message: '保存PSD失败: ' + e.message };
    }
}

function exportLayerAsPng(layerId, outputPath) {
    try {
        var doc = app.activeDocument;
        var layer = doc.layers.getByName(decodeURIComponent(layerId));
        
        if (!layer) {
            return { success: false, message: '未找到指定图层' };
        }
        
        layer.visible = true;
        for (var i = 0; i < doc.layers.length; i++) {
            if (doc.layers[i] !== layer) {
                doc.layers[i].visible = false;
            }
        }
        
        var file = new File(outputPath);
        var options = new ExportOptionsSaveForWeb();
        options.format = SaveDocumentType.PNG;
        options.PNG8 = false;
        options.transparency = true;
        options.interlaced = false;
        
        doc.exportDocument(file, ExportType.SAVEFORWEB, options);
        
        for (var i = 0; i < doc.layers.length; i++) {
            doc.layers[i].visible = true;
        }
        
        return { success: true, message: '图层已导出为PNG' };
    } catch (e) {
        return { success: false, message: '导出图层失败: ' + e.message };
    }
}

function createNewLayer(name) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return { success: false, message: '没有打开的文档' };
        }
        
        var layer = doc.artLayers.add();
        layer.name = name || '新图层';
        
        return { success: true, message: '图层已创建', layer: {
            name: layer.name,
            id: layer.id.toString()
        }};
    } catch (e) {
        return { success: false, message: '创建图层失败: ' + e.message };
    }
}

function duplicateLayer(layerId) {
    try {
        var doc = app.activeDocument;
        var layer = doc.layers.getByName(decodeURIComponent(layerId));
        
        if (!layer) {
            return { success: false, message: '未找到指定图层' };
        }
        
        var duplicated = layer.duplicate();
        duplicated.name = layer.name + ' 副本';
        
        return { success: true, message: '图层已复制', layer: {
            name: duplicated.name,
            id: duplicated.id.toString()
        }};
    } catch (e) {
        return { success: false, message: '复制图层失败: ' + e.message };
    }
}

function deleteLayer(layerId) {
    try {
        var doc = app.activeDocument;
        var layer = doc.layers.getByName(decodeURIComponent(layerId));
        
        if (!layer) {
            return { success: false, message: '未找到指定图层' };
        }
        
        layer.remove();
        
        return { success: true, message: '图层已删除' };
    } catch (e) {
        return { success: false, message: '删除图层失败: ' + e.message };
    }
}

function invertSelection() {
    try {
        app.activeDocument.selection.invert();
        return { success: true, message: '选区已反选' };
    } catch (e) {
        return { success: false, message: '反选失败: ' + e.message };
    }
}

function featherSelection(radius) {
    try {
        app.activeDocument.selection.feather(radius || 1);
        return { success: true, message: '羽化已应用' };
    } catch (e) {
        return { success: false, message: '羽化失败: ' + e.message };
    }
}

function clearSelection() {
    try {
        app.activeDocument.selection.deselect();
        return { success: true, message: '选区已清除' };
    } catch (e) {
        return { success: false, message: '清除选区失败: ' + e.message };
    }
}

function runAction(actionName) {
    try {
        var actions = {
            'pen-tool': runPenToolGuide,
            'ai-subject': runAISubjectSelection,
            'channel': runChannelCutout,
            'color-range': runColorRange,
            'select-mask': runSelectAndMask,
            'blend-if': runBlendIf,
            'magic-quick': runQuickSelection
        };
        
        var action = actions[actionName];
        if (action) {
            return action();
        }
        
        return { success: false, message: '未知的操作: ' + actionName };
    } catch (e) {
        return { success: false, message: '执行操作失败: ' + e.message };
    }
}

function runPenToolGuide() {
    return {
        success: true,
        message: '钢笔工具指南已加载',
        steps: [
            '1. 选择钢笔工具 (P)',
            '2. 沿着物体边缘点击创建锚点',
            '3. 按住Ctrl调整手柄',
            '4. 闭合路径后按Ctrl+Enter转为选区',
            '5. 创建图层蒙版'
        ]
    };
}

function runAISubjectSelection() {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putClass(charIDToTypeID('Seln'));
        desc.putReference(charIDToTypeID('null'), ref);
        desc.putEnumerated(charIDToTypeID('Mthd'), charIDToTypeID('Mthd'), charIDToTypeID('AISb'));
        
        executeAction(charIDToTypeID('Mk  '), desc, DialogModes.NO);
        
        return {
            success: true,
            message: 'AI主体选择已执行',
            steps: [
                'AI主体识别完成',
                '建议进入Select and Mask优化边缘'
            ]
        };
    } catch (e) {
        return {
            success: false,
            message: 'AI主体选择失败: ' + e.message
        };
    }
}

function runChannelCutout() {
    return {
        success: true,
        message: '通道抠图指南已加载',
        steps: [
            '1. 打开通道面板 (F7)',
            '2. 选择对比度最高的通道',
            '3. 复制通道 (Ctrl+J)',
            '4. 调整色阶 (Ctrl+L)增强对比',
            '5. 使用画笔修复缺失区域',
            '6. 按住Ctrl点击通道缩略图载入选区',
            '7. 返回图层面板创建蒙版'
        ]
    };
}

function runColorRange() {
    try {
        var desc = new ActionDescriptor();
        desc.putEnumerated(charIDToTypeID('ClrR'), charIDToTypeID('ClrR'), charIDToTypeID('Saml'));
        desc.putUnitDouble(charIDToTypeID('Fuzz'), charIDToTypeID('Prcn'), 20);
        
        executeAction(charIDToTypeID('ClrR'), desc, DialogModes.NO);
        
        return {
            success: true,
            message: '色彩范围选择已执行',
            steps: [
                '色彩范围对话框已打开',
                '使用吸管工具点击背景',
                '调整模糊度参数'
            ]
        };
    } catch (e) {
        return {
            success: false,
            message: '色彩范围失败: ' + e.message
        };
    }
}

function runSelectAndMask() {
    try {
        executeAction(charIDToTypeID('SelM'), undefined, DialogModes.NO);
        
        return {
            success: true,
            message: 'Select and Mask已打开',
            steps: [
                '使用快速选择工具调整选区',
                '使用精修画笔处理边缘',
                '调整平滑、羽化、对比度参数',
                '使用净化颜色去除边缘杂色'
            ]
        };
    } catch (e) {
        return {
            success: false,
            message: 'Select and Mask失败: ' + e.message
        };
    }
}

function runBlendIf() {
    return {
        success: true,
        message: 'Blend If指南已加载',
        steps: [
            '1. 双击图层打开图层样式',
            '2. 找到Blend If选项',
            '3. 调整本图层和下一图层滑块',
            '4. 按住Alt键分离滑块获得平滑过渡',
            '5. 适合处理透明材质和反光'
        ]
    };
}

function runQuickSelection() {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putClass(charIDToTypeID('Seln'));
        desc.putReference(charIDToTypeID('null'), ref);
        desc.putEnumerated(charIDToTypeID('Mthd'), charIDToTypeID('Mthd'), charIDToTypeID('QckS'));
        
        executeAction(charIDToTypeID('Mk  '), desc, DialogModes.NO);
        
        return {
            success: true,
            message: '快速选择工具已激活',
            steps: [
                '快速选择工具已激活',
                '在主体上拖动创建选区',
                '使用Alt键减去不需要的区域'
            ]
        };
    } catch (e) {
        return {
            success: false,
            message: '快速选择失败: ' + e.message
        };
    }
}

function analyzeImage() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return { success: false, message: '没有打开的文档' };
        }
        
        var analysis = {
            width: doc.width,
            height: doc.height,
            resolution: doc.resolution,
            mode: doc.mode.toString(),
            layerCount: doc.layers.length,
            hasBackground: doc.backgroundLayer !== null,
            hasMasks: false,
            hasSmartObjects: false,
            hasAdjustmentLayers: false,
            estimatedProductType: 'unknown'
        };
        
        for (var i = 0; i < doc.layers.length; i++) {
            var layer = doc.layers[i];
            if (layer.hasLayerMask) analysis.hasMasks = true;
            if (layer.typename === 'SmartObjectLayer') analysis.hasSmartObjects = true;
            if (layer.typename === 'AdjustmentLayer') analysis.hasAdjustmentLayers = true;
        }
        
        var dominantColor = getDominantColor(doc);
        analysis.isWhiteBackground = isWhiteBackground(dominantColor);
        analysis.backgroundComplexity = analysis.isWhiteBackground ? 'low' : 'high';
        
        return {
            success: true,
            message: '图片分析完成',
            analysis: analysis
        };
    } catch (e) {
        return { success: false, message: '图片分析失败: ' + e.message };
    }
}

function getDominantColor(doc) {
    var sample = doc.activeLayer ? doc.activeLayer : doc.backgroundLayer;
    if (!sample) return { r: 255, g: 255, b: 255 };
    
    try {
        var color = sample.pixelData.getPixel(0, 0);
        return { r: color[0], g: color[1], b: color[2] };
    } catch (e) {
        return { r: 255, g: 255, b: 255 };
    }
}

function isWhiteBackground(color) {
    var threshold = 240;
    return color.r > threshold && color.g > threshold && color.b > threshold;
}

function generateCutoutGuide(analysis) {
    var guides = [];
    
    if (analysis.isWhiteBackground) {
        guides.push('检测到白底背景，推荐使用色彩范围或Blend If');
        guides.push('步骤: 选择>色彩范围>点击白色背景>调整容差');
    } else {
        guides.push('检测到复杂背景，推荐使用AI主体识别或钢笔工具');
    }
    
    if (analysis.layerCount > 5) {
        guides.push('文档包含多个图层，建议先整理图层结构');
    }
    
    if (analysis.hasMasks) {
        guides.push('已存在图层蒙版，检查是否需要调整');
    }
    
    return {
        success: true,
        message: '抠图指南已生成',
        guides: guides
    };
}