"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_PROVIDERS = void 0;
exports.AI_PROVIDERS = [
    {
        name: '阿里云通义万相',
        provider: 'aliyun',
        capabilities: ['图像分割', '主体分割', '语义分割', '商品分割'],
        maxImageSize: 4096,
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    {
        name: '腾讯云智绘',
        provider: 'tencent',
        capabilities: ['图像分割', '人像分割', '物品分割', '语义分割'],
        maxImageSize: 4096,
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    {
        name: '百度文心一格',
        provider: 'baidu',
        capabilities: ['图像分割', '人像分割', '车辆分割', '商品分割'],
        maxImageSize: 4096,
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    {
        name: '智谱AI',
        provider: 'zhipu',
        capabilities: ['图像分割', '语义分割', '实例分割'],
        maxImageSize: 2048,
        supportedFormats: ['jpg', 'jpeg', 'png']
    },
    {
        name: '字节豆包',
        provider: 'doubao',
        capabilities: ['图像分割', '主体识别', '语义分割'],
        maxImageSize: 4096,
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    }
];
