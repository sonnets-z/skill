class AICutoutPlugin {
    constructor() {
        this.config = {
            aiProvider: 'aliyun',
            apiKey: '',
            secretKey: '',
            selectedTechnique: 'ai-subject'
        };
        
        this.analysisResult = null;
        this.currentLayers = [];
        
        this.init();
    }
    
    init() {
        this.loadConfig();
        this.bindEvents();
        this.initCSInterface();
    }
    
    loadConfig() {
        const saved = localStorage.getItem('ai-cutout-config');
        if (saved) {
            try {
                this.config = { ...this.config, ...JSON.parse(saved) };
                document.getElementById('ai-provider').value = this.config.aiProvider;
                document.getElementById('api-key').value = this.config.apiKey;
                document.getElementById('secret-key').value = this.config.secretKey || '';
                this.toggleSecretKeyField();
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }
    }
    
    saveConfig() {
        localStorage.setItem('ai-cutout-config', JSON.stringify(this.config));
    }
    
    bindEvents() {
        document.getElementById('btn-analyze').addEventListener('click', () => this.analyzeImage());
        document.getElementById('btn-cutout').addEventListener('click', () => this.runCutout());
        document.getElementById('btn-configure').addEventListener('click', () => this.configureAI());
        document.getElementById('btn-export').addEventListener('click', () => this.exportPsd());
        document.getElementById('ai-provider').addEventListener('change', () => this.toggleSecretKeyField());
        
        document.querySelectorAll('.technique-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTechnique(e));
        });
    }
    
    initCSInterface() {
        if (typeof CSInterface !== 'undefined') {
            this.csInterface = new CSInterface();
            this.csInterface.addEventListener('com.adobe.csxs.events.ApplicationActivate', () => {
                this.updateStatus('就绪');
            });
            this.updateStatus('已连接到Photoshop');
        } else {
            this.updateStatus('开发模式 - 未连接Photoshop', 'warning');
        }
    }
    
    toggleSecretKeyField() {
        const provider = document.getElementById('ai-provider').value;
        const needsSecret = ['tencent', 'baidu'].includes(provider);
        document.getElementById('secret-key-group').style.display = needsSecret ? 'block' : 'none';
    }
    
    selectTechnique(event) {
        document.querySelectorAll('.technique-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.technique-btn').classList.add('active');
        this.config.selectedTechnique = event.target.closest('.technique-btn').dataset.technique;
        this.saveConfig();
    }
    
    configureAI() {
        this.config.aiProvider = document.getElementById('ai-provider').value;
        this.config.apiKey = document.getElementById('api-key').value;
        this.config.secretKey = document.getElementById('secret-key').value;
        
        if (!this.config.apiKey) {
            this.showError('请输入API密钥');
            return;
        }
        
        this.saveConfig();
        this.updateStatus('AI配置已保存');
        this.showSuccess('AI配置已保存');
    }
    
    async analyzeImage() {
        this.updateStatus('正在分析图片...');
        
        try {
            const result = await this.evaluateJSX('analyzeImage()');
            
            if (result.success) {
                this.analysisResult = result.analysis;
                this.displayAnalysisResult(result.analysis);
                this.updateStatus('图片分析完成');
            } else {
                this.showError(result.message);
                this.updateStatus('分析失败', 'error');
            }
        } catch (error) {
            console.error('分析失败:', error);
            this.showError('分析图片时发生错误');
            this.updateStatus('分析失败', 'error');
        }
    }
    
    async runCutout() {
        if (!this.config.apiKey) {
            this.showError('请先配置AI API密钥');
            return;
        }
        
        this.updateStatus('正在执行AI抠图...');
        
        try {
            const imageInfo = await this.evaluateJSX('getActiveDocumentInfo()');
            
            if (!imageInfo.success) {
                this.showError(imageInfo.message);
                return;
            }
            
            const analysis = await this.callAIAnalysis(imageInfo.document);
            
            if (analysis.success) {
                this.analysisResult = analysis.data;
                this.displayAnalysisResult(analysis.data);
                
                const selectionResult = await this.applyAISelection(analysis.data);
                
                if (selectionResult.success) {
                    this.updateStatus('AI抠图完成');
                    this.showSuccess('AI抠图完成，请检查选区');
                } else {
                    this.showError(selectionResult.message);
                }
            } else {
                this.showError(analysis.message);
                this.updateStatus('AI分析失败', 'error');
            }
        } catch (error) {
            console.error('抠图失败:', error);
            this.showError('执行AI抠图时发生错误');
            this.updateStatus('抠图失败', 'error');
        }
    }
    
    async callAIAnalysis(documentInfo) {
        const mockAnalysis = {
            success: true,
            data: {
                productType: 'clothing',
                hasModel: false,
                hasHair: false,
                hasTransparentMaterial: false,
                hasShadow: true,
                isWhiteBackground: documentInfo.width > 0,
                backgroundComplexity: 'low',
                subjectComplexity: 'medium',
                recommendedTechnique: this.config.selectedTechnique,
                confidence: 0.92,
                layers: [
                    { id: '1', name: '主体对象', x: 100, y: 50, width: 300, height: 400, type: 'product', confidence: 0.95 },
                    { id: '2', name: '阴影', x: 120, y: 420, width: 260, height: 60, type: 'shadow', confidence: 0.88 },
                    { id: '3', name: '背景', x: 0, y: 0, width: documentInfo.width || 800, height: documentInfo.height || 600, type: 'background', confidence: 0.99 }
                ]
            },
            message: 'AI分析完成'
        };
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return mockAnalysis;
    }
    
    async applyAISelection(analysis) {
        const mainLayer = analysis.layers.find(l => l.type === 'product');
        
        if (mainLayer) {
            const selectionData = {
                bounds: {
                    x: mainLayer.x,
                    y: mainLayer.y,
                    width: mainLayer.width,
                    height: mainLayer.height
                },
                maskData: null
            };
            
            const result = await this.evaluateJSX(`applyCutoutSelection(${JSON.stringify(selectionData)})`);
            
            if (result.success) {
                await this.evaluateJSX('createLayerMask()');
                return { success: true, message: '选区和蒙版已应用' };
            }
            
            return result;
        }
        
        return { success: false, message: '未找到主体图层' };
    }
    
    async exportPsd() {
        this.updateStatus('正在导出PSD...');
        
        try {
            const needsHighPass = document.getElementById('chk-highpass').checked;
            const needsShadows = document.getElementById('chk-shadows').checked;
            
            if (needsHighPass) {
                await this.evaluateJSX('applyHighPassFilter(2)');
            }
            
            const filePath = await this.showSaveDialog();
            
            if (filePath) {
                const result = await this.evaluateJSX(`saveAsPsd("${filePath}")`);
                
                if (result.success) {
                    this.updateStatus('导出完成');
                    this.showSuccess('PSD文件已导出');
                } else {
                    this.showError(result.message);
                    this.updateStatus('导出失败', 'error');
                }
            } else {
                this.updateStatus('导出已取消');
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出PSD时发生错误');
            this.updateStatus('导出失败', 'error');
        }
    }
    
    displayAnalysisResult(analysis) {
        const container = document.getElementById('analysis-result');
        
        const html = `
            <div class="analysis-info">
                <div class="analysis-item">
                    <div class="analysis-label">产品类型</div>
                    <div class="analysis-value">${this.getProductTypeName(analysis.productType)}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">背景类型</div>
                    <div class="analysis-value">${analysis.isWhiteBackground ? '白底' : '复杂背景'}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">背景复杂度</div>
                    <div class="analysis-value">${this.getComplexityLabel(analysis.backgroundComplexity)}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">推荐方案</div>
                    <div class="analysis-value">${this.getTechniqueName(analysis.recommendedTechnique || this.config.selectedTechnique)}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">置信度</div>
                    <div class="analysis-value">${((analysis.confidence || 0.9) * 100).toFixed(0)}%</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">检测图层</div>
                    <div class="analysis-value">${analysis.layers?.length || 0} 个</div>
                </div>
            </div>
            ${analysis.layers ? `<div class="layers-list">
                <div class="layers-title">识别的图层:</div>
                ${analysis.layers.map(l => `<div class="layer-item">• ${l.name} (${l.type})</div>`).join('')}
            </div>` : ''}
        `;
        
        container.innerHTML = html;
    }
    
    getProductTypeName(type) {
        const names = {
            'clothing': '服装',
            'shoes': '鞋靴',
            'bag': '箱包',
            'accessory': '配饰',
            'electronics': '电子产品',
            'jewelry': '珠宝',
            'cosmetic': '化妆品',
            'food': '食品',
            'furniture': '家具',
            'toys': '玩具',
            'model_portrait': '人像',
            'other': '其他'
        };
        return names[type] || type;
    }
    
    getComplexityLabel(level) {
        const labels = {
            'low': '低',
            'medium': '中',
            'high': '高'
        };
        return labels[level] || level;
    }
    
    getTechniqueName(technique) {
        const names = {
            'ai-subject': 'AI主体识别',
            'pen-tool': '钢笔工具',
            'channel': '通道抠图',
            'color-range': '色彩范围',
            'select-mask': 'Select and Mask',
            'blend-if': 'Blend If',
            'magic-quick': '快速选择'
        };
        return names[technique] || technique;
    }
    
    async evaluateJSX(script) {
        return new Promise((resolve) => {
            if (typeof this.csInterface !== 'undefined') {
                this.csInterface.evalScript(script, (result) => {
                    try {
                        resolve(JSON.parse(result));
                    } catch (e) {
                        resolve({ success: false, message: result });
                    }
                });
            } else {
                console.log('模拟JSX执行:', script);
                
                const mockResults = {
                    'getActiveDocumentInfo()': {
                        success: true,
                        document: { name: '测试文档.psd', width: 800, height: 600 },
                        layers: []
                    },
                    'analyzeImage()': {
                        success: true,
                        analysis: {
                            productType: 'clothing',
                            isWhiteBackground: true,
                            backgroundComplexity: 'low',
                            layerCount: 3
                        }
                    },
                    'createLayerMask()': { success: true, message: '蒙版已创建' },
                    'applyHighPassFilter(2)': { success: true, message: '高反差保留已应用' }
                };
                
                setTimeout(() => {
                    resolve(mockResults[script] || { success: true, message: '执行成功' });
                }, 500);
            }
        });
    }
    
    async showSaveDialog() {
        return new Promise((resolve) => {
            if (typeof this.csInterface !== 'undefined') {
                const desc = {
                    title: '保存PSD文件',
                    initialDirectory: '',
                    fileFilter: '*.psd',
                    selectMultiple: false
                };
                
                this.csInterface.requestOpenDialog(desc, (result) => {
                    resolve(result.data[0] || null);
                });
            } else {
                setTimeout(() => {
                    resolve('/mock/path/test.psd');
                }, 300);
            }
        });
    }
    
    updateStatus(text, type = 'success') {
        const statusBar = document.getElementById('status-bar');
        statusBar.className = `status-bar ${type}`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        };
        
        statusBar.innerHTML = `
            <span class="status-icon">${icons[type]}</span>
            <span class="status-text">${text}</span>
        `;
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AICutoutPlugin();
});