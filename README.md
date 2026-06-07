---
title: AI 肌肤分析与护肤推荐助手
sdk: docker
app_file: Dockerfile
emoji: 💆
colorFrom: green
colorTo: yellow
pinned: false
license: apache-2.0
short_description: AI 肌肤图像分析与个性化护肤品推荐应用
---

# AI 肌肤分析与护肤推荐助手

一个面向 AI 创业营编程挑战赛的 React/Vite 满分取向作品。核心流程覆盖用户画像、图片上传、AI 肌肤分析、报告展示、商品匹配、成分冲突提醒和早晚护肤方案。

## 功能覆盖

- 用户画像：肤质、年龄、预算、过敏史。
- 图片上传：点击上传、拖拽上传、JPG/PNG/WEBP 校验、5MB 限制、预览、内置测试图片。
- AI 分析：默认走 `/api/analyze` 后端代理。阿里百炼使用 DashScope OpenAI 兼容接口；OpenAI key 使用 OpenAI Responses API 视觉输入；Anthropic `sk-ant-` key 仍兼容 Anthropic Messages API。
- 演示稳定性：没有 API Key、网络异常或 API 返回异常时，自动启用本地兜底分析，保证流程可完整演示。
- 商品推荐：解析 `jd_skincare_products(1).json` 的 297 条商品，做标签映射、预算过滤、肤质加分、过敏扣分、品类去重和 Top 8 排序。
- 加分项：过敏警告、成分冲突 Banner、早晚护肤流程自动填入推荐商品。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 Vite 输出的本地地址，通常是 `http://localhost:5173`。后端代理默认监听 `http://localhost:8787`。

如果要启用真实 API，优先配置 `.env` 中的 `DASHSCOPE_API_KEY`。没有 Key 时应用仍可通过兜底分析跑通完整演示。

## 构建与生产启动

```bash
npm run build
npm start
```

`npm start` 会启动同一个 Express 服务：既提供 `/api/analyze`，也会在 `dist/` 存在时托管前端静态文件。

## 可选前端直连模式

默认不建议使用前端直连，因为容易遇到 CORS 和密钥暴露问题。只有在平台明确注入密钥并允许跨域时，才设置：

```env
VITE_ENABLE_DIRECT_ANTHROPIC=true
VITE_ANTHROPIC_API_KEY=your_browser_available_key
```

## ModelScope Studio 部署

1. 在 ModelScope 创建 Studio，SDK 选择 `Docker`，参考 [Creating and Building Studios](https://www.modelscope.cn/docs/studios/create)。
2. Docker 创空间需要阿里云账号绑定与实名认证；服务端口必须为 `7860`。
3. 将本项目文件上传到 Studio 仓库。
4. 在环境变量中配置 `DASHSCOPE_API_KEY`，可选配置 `ALIBABA_MODEL`，默认 `qwen-vl-plus`。
5. 在 Studio 设置页点击 Launch/Publish Now 手动启动部署。

API 相关说明可参考 [API 推理介绍](https://modelscope.cn/docs/model-service/API-Inference/intro)。

## 演示路径

1. 首页填写画像，点击“开始分析”。
2. 上传面部照片，或点击“使用测试图片”。
3. 点击“分析肌肤”，等待三段式进度动画。
4. 查看评分、肤质、问题列表、优点和综合评价。
5. 点击“查看推荐产品”，查看分品类商品卡和早晚护理流程。

## 免责声明

本工具基于 AI 图像分析，仅供参考，不构成医疗诊断。皮肤严重问题请咨询皮肤科医生。
