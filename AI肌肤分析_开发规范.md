# AI 肌肤分析与护肤产品推荐助手 — 开发规范

> 版本：v1.0 | 比赛时长：3 小时 | 分工：模型识别 / 前端 / 数据匹配

---

## 目录

1. [项目整体架构](#1-项目整体架构)
2. [模块分工与职责边界](#2-模块分工与职责边界)
3. [模块一：模型识别](#3-模块一模型识别)
4. [模块二：前端](#4-模块二前端)
5. [模块三：数据匹配](#5-模块三数据匹配)
6. [接口契约（模块间通信规范）](#6-接口契约模块间通信规范)
7. [错误处理规范](#7-错误处理规范)
8. [代码规范](#8-代码规范)
9. [时间分配建议](#9-时间分配建议)
10. [免责声明要求](#10-免责声明要求)

---

## 1. 项目整体架构

```
用户上传图片
      │
      ▼
┌─────────────┐     base64 图片 + prompt      ┌──────────────────┐
│   前端模块   │ ───────────────────────────▶ │  模型识别模块     │
│  (UI层)     │                               │  (Anthropic API) │
│             │ ◀─────────────────────────── │                  │
└─────────────┘     结构化肌肤分析报告 JSON    └──────────────────┘
      │
      │ 肌肤分析结果
      ▼
┌─────────────┐     问题标签 + 肤质类型        ┌──────────────────┐
│   前端模块   │ ───────────────────────────▶ │  数据匹配模块     │
│  (展示层)   │                               │  (本地 JSON DB)  │
│             │ ◀─────────────────────────── │                  │
└─────────────┘     推荐产品列表 + 推荐理由    └──────────────────┘
```

**技术选型（推荐）**

| 层级 | 推荐方案 | 备注 |
|------|----------|------|
| 前端 | React + Tailwind CSS（单文件 Artifact）| 快速交付，无需配置 |
| 模型识别 | Anthropic claude-sonnet-4 多模态 API | 支持图片输入 |
| 数据匹配 | 纯 JS 内存计算 | 无需后端，直接消费 JSON |

---

## 2. 模块分工与职责边界

### 2.1 分工总览

| 模块 | 负责人 | 核心输出 | 对外依赖 |
|------|--------|----------|----------|
| 模型识别 | 成员 A | `SkinAnalysisResult` JSON 对象 | Anthropic API |
| 前端 | 成员 B | 可操作的 Web 界面 | 模型识别模块、数据匹配模块 |
| 数据匹配 | 成员 C | `ProductRecommendation[]` 列表 | 产品数据库 JSON |

### 2.2 职责边界说明

- **模型识别**：只负责将图片转换为结构化肌肤报告，不涉及 UI 渲染，不做产品推荐逻辑。
- **前端**：负责用户交互流程编排，调用识别和匹配两个模块，不包含业务逻辑算法。
- **数据匹配**：只消费肌肤分析结果 + 产品数据库，不调用 API，不操作 DOM。

---

## 3. 模块一：模型识别

### 3.1 功能职责

接收用户上传的面部图片（base64 格式），调用多模态大模型，输出结构化肌肤分析报告。

### 3.2 输入规格

```typescript
interface AnalysisInput {
  imageBase64: string;   // base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  userProfile?: {
    age?: number;           // 可选，加分项
    skinType?: string;      // 可选，如"油皮"/"干皮"/"混油"
    allergies?: string[];   // 可选，过敏史
  };
}
```

### 3.3 输出规格（`SkinAnalysisResult`）

```typescript
interface SkinAnalysisResult {
  isValidFace: boolean;          // 是否为有效人脸图片
  invalidReason?: string;        // 无效时的原因说明

  skinType: "油皮" | "干皮" | "混合皮" | "敏感皮" | "中性皮" | "未知";

  issues: SkinIssue[];           // 检测到的肌肤问题列表

  overallScore: number;          // 综合肌肤评分 1-10（10 最佳）
  summary: string;               // 一段自然语言总结，面向用户展示
}

interface SkinIssue {
  type: string;                  // 问题类型，如"痘痘"/"干燥"/"毛孔粗大"/"暗沉"
  severity: "轻微" | "中等" | "严重";
  area?: string;                 // 区域，如"T区"/"脸颊"/"全脸"
  description: string;           // 对用户友好的描述
  tags: string[];                // 标签，用于数据匹配，如 ["控油", "祛痘", "消炎"]
}
```

### 3.4 Prompt 模板

```
你是一位专业的皮肤分析助手。请分析以下面部图片，按照 JSON 格式输出肌肤分析报告。

要求：
1. 首先判断图片是否为有效的人脸正面照片
2. 如果不是有效人脸图片（模糊/非人脸/多人/极端光线），将 isValidFace 设为 false 并说明原因
3. 如果是有效图片，识别以下维度：肤质类型、肌肤问题（类型/严重程度/区域/标签）、综合评分
4. tags 字段应包含对应的护肤需求关键词，如"控油"、"补水"、"美白"、"抗老"、"修护"、"防晒"

注意：本工具仅供参考，不构成医疗诊断建议。

请严格按照以下 JSON 格式返回，不要输出任何多余内容：
{
  "isValidFace": true,
  "skinType": "...",
  "issues": [...],
  "overallScore": 7,
  "summary": "..."
}
```

### 3.5 API 调用规范

```javascript
// 模型识别模块标准调用方式
async function analyzeSkin(input: AnalysisInput): Promise<SkinAnalysisResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mediaType,
              data: input.imageBase64
            }
          },
          { type: "text", text: SKIN_ANALYSIS_PROMPT }
        ]
      }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;

  // 解析 JSON，去除可能的 markdown 代码块包裹
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as SkinAnalysisResult;
}
```

### 3.6 异常输入处理

| 场景 | 处理方式 |
|------|----------|
| 非人脸图片 | `isValidFace: false`，提示"请上传正面人脸照片" |
| 图片模糊 | `isValidFace: false`，提示"图片不够清晰，请重新拍摄" |
| 多人照片 | `isValidFace: false`，提示"请上传单人照片" |
| API 超时 | 捕获异常，返回友好错误提示，不崩溃 |
| API 返回非 JSON | try/catch 解析，失败时返回默认错误对象 |

---

## 4. 模块二：前端

### 4.1 功能职责

提供完整的用户交互界面，串联"上传 → 分析 → 查看推荐"完整流程。

### 4.2 页面流程

```
[首页/上传页]
    │ 用户选择图片
    ▼
[图片预览确认页]
    │ 点击"开始分析"
    ▼
[分析中 Loading 页]  ← 调用模型识别模块
    │ 分析完成
    ▼
[肌肤报告页]         ← 展示 SkinAnalysisResult
    │ 自动触发产品匹配
    ▼
[产品推荐页]         ← 展示 ProductRecommendation[]
    │
    ▼
[护肤方案总结页（加分项）]
```

### 4.3 页面组件规范

#### 上传组件 `<ImageUploader />`
- 支持点击上传 + 拖拽上传
- 文件格式限制：`image/jpeg, image/png, image/webp`
- 文件大小限制：`≤ 5MB`，超出提示用户压缩
- 上传后立即在界面显示预览
- 输出：`{ file: File, base64: string, mediaType: string }`

#### 分析加载组件 `<AnalysisLoading />`
- 展示进度动画（模拟步骤：图片上传中 → AI 识别中 → 生成报告）
- 预计等待 5-15 秒，需有视觉反馈防止用户以为卡死

#### 肌肤报告组件 `<SkinReport />`
- 输入：`SkinAnalysisResult`
- 展示：肤质类型、综合评分（可视化进度条）、问题列表（标签+严重程度）、文字总结
- 底部固定"查看推荐产品"按钮

#### 产品卡片组件 `<ProductCard />`
- 展示字段：产品名称、品牌、价格、图片（若有）、推荐理由
- 推荐理由文字高亮显示匹配的肌肤问题关键词

#### 免责声明组件 `<Disclaimer />`
- 页面底部固定展示："本工具仅供参考，不构成医疗建议，如有严重皮肤问题请咨询皮肤科医生"

### 4.4 状态管理

```typescript
// 全局应用状态（使用 React useState 或简单 context）
interface AppState {
  step: "upload" | "analyzing" | "report" | "recommendation";
  uploadedImage: { base64: string; mediaType: string; previewUrl: string } | null;
  analysisResult: SkinAnalysisResult | null;
  recommendations: ProductRecommendation[] | null;
  error: string | null;
  isLoading: boolean;
}
```

### 4.5 UI 设计规范

| 项目 | 规范 |
|------|------|
| 主色调 | 柔和粉/米白系，体现护肤品调性 |
| 字体 | 系统字体栈，中文优先 |
| 错误状态 | 红色边框 + 错误文字，不直接 alert |
| 加载状态 | skeleton 或 spinner，不能白屏 |
| 移动适配 | 最小宽度 375px，按钮高度 ≥ 44px |

---

## 5. 模块三：数据匹配

### 5.1 功能职责

根据肌肤分析结果，从产品数据库（`jd_skincare_products.json`）中计算匹配分数，返回排序后的推荐产品列表。

### 5.2 输入规格

```typescript
interface MatchInput {
  analysisResult: SkinAnalysisResult;
  budget?: number;            // 可选，用户预算上限（元）
  topN?: number;              // 返回 Top N 个产品，默认 6
}
```

### 5.3 输出规格（`ProductRecommendation`）

```typescript
interface ProductRecommendation {
  product: Product;           // 原始产品数据
  score: number;              // 匹配分数 0-100
  matchedTags: string[];      // 命中的需求标签
  reason: string;             // 推荐理由（面向用户展示）
  category: string;           // 产品品类，如"洁面"/"精华"/"面霜"/"防晒"
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  tags: string[];             // 产品功效标签
  ingredients?: string[];     // 成分列表（加分项用于冲突检测）
  description?: string;
}
```

### 5.4 匹配算法规范

```javascript
function matchProducts(input: MatchInput): ProductRecommendation[] {
  const { analysisResult, budget, topN = 6 } = input;

  // 1. 提取用户需求标签（从所有 issue.tags 合并去重）
  const demandTags = [...new Set(
    analysisResult.issues.flatMap(issue => issue.tags)
  )];

  // 2. 对每个产品计算匹配分
  const scored = products
    .filter(p => !budget || p.price <= budget)  // 预算过滤
    .map(p => {
      const matched = p.tags.filter(t => demandTags.includes(t));
      const score = Math.round((matched.length / Math.max(demandTags.length, 1)) * 100);
      return {
        product: p,
        score,
        matchedTags: matched,
        reason: generateReason(p, matched, analysisResult),  // 生成推荐理由
        category: p.category
      };
    })
    .filter(r => r.score > 0);

  // 3. 排序：分数降序，同分按评分降序
  scored.sort((a, b) => b.score - a.score);

  // 4. 每个品类最多推荐 2 个，避免单品类霸榜
  const result = deduplicateByCategory(scored, 2);

  return result.slice(0, topN);
}

// 生成自然语言推荐理由
function generateReason(
  product: Product,
  matchedTags: string[],
  analysis: SkinAnalysisResult
): string {
  const issues = analysis.issues.map(i => i.type).join("、");
  return `针对您的${issues}问题，该产品含有${matchedTags.join("、")}功效成分，适合${analysis.skinType}使用。`;
}
```

### 5.5 加分项：成分冲突检测

```javascript
// 已知冲突组合（可扩展）
const CONFLICT_RULES = [
  { groupA: ["视黄醇", "A醇", "retinol"], groupB: ["果酸", "水杨酸", "AHA", "BHA"], warning: "A醇与酸类不建议同时使用，建议分开早晚护肤" },
  { groupA: ["维C", "VC"], groupB: ["烟酰胺", "烟酸酰胺"], warning: "维C与烟酰胺叠加可能降低功效" },
];

function detectConflicts(recommendations: ProductRecommendation[]): ConflictWarning[] {
  // 检测推荐产品列表中的成分冲突并返回警告
}
```

### 5.6 数据加载规范

```javascript
// 产品数据库在模块初始化时一次性加载到内存
import productData from './jd_skincare_products.json';
const products: Product[] = productData;  // 直接使用，无需网络请求
```

---

## 6. 接口契约（模块间通信规范）

### 6.1 前端 → 模型识别

```typescript
// 前端调用入口
const result: SkinAnalysisResult = await analyzeSkin({
  imageBase64: "...",
  mediaType: "image/jpeg"
});
```

### 6.2 前端 → 数据匹配

```typescript
// 数据匹配调用入口
const recommendations: ProductRecommendation[] = matchProducts({
  analysisResult: result,
  topN: 6
});
```

### 6.3 数据流时序

```
前端                  模型识别              数据匹配
 │                       │                    │
 │── analyzeSkin() ─────▶│                    │
 │                       │── Anthropic API ──▶│ (等待响应)
 │                       │◀── JSON 响应 ──────│
 │◀── SkinAnalysisResult─│                    │
 │                       │                    │
 │── matchProducts() ────────────────────────▶│
 │◀── ProductRecommendation[] ────────────────│
 │                       │                    │
 │（渲染报告 + 推荐结果）  │                    │
```

---

## 7. 错误处理规范

### 7.1 错误分类

| 错误类型 | 错误码 | 处理方式 | 用户提示 |
|----------|--------|----------|----------|
| 图片格式不支持 | `ERR_FORMAT` | 前端拦截 | "请上传 JPG/PNG 格式图片" |
| 图片超出大小 | `ERR_SIZE` | 前端拦截 | "图片大小不能超过 5MB" |
| 非人脸图片 | `ERR_NO_FACE` | 模型返回 | "未检测到有效人脸，请上传正面照片" |
| API 调用失败 | `ERR_API` | 捕获异常 | "分析服务暂时不可用，请重试" |
| JSON 解析失败 | `ERR_PARSE` | try/catch | "分析结果解析失败，请重试" |
| 无匹配产品 | `ERR_NO_MATCH` | 兜底逻辑 | 展示热门推荐产品（降级方案） |

### 7.2 全局错误边界

```jsx
// 所有异步操作都必须 try/catch，错误统一通过 setError 展示
try {
  setIsLoading(true);
  const result = await analyzeSkin(input);
  setAnalysisResult(result);
} catch (err) {
  setError("分析失败，请检查网络后重试");
} finally {
  setIsLoading(false);
}
```

---

## 8. 代码规范

### 8.1 文件结构（单文件 React Artifact 方案）

```
App.jsx（单文件）
├── 常量与数据
│   ├── SKIN_ANALYSIS_PROMPT
│   └── productDatabase（从 JSON 导入）
├── 工具函数
│   ├── analyzeSkin()
│   ├── matchProducts()
│   └── generateReason()
├── 子组件
│   ├── ImageUploader
│   ├── AnalysisLoading
│   ├── SkinReport
│   ├── ProductCard
│   └── Disclaimer
└── App（主组件，管理状态和流程）
```

### 8.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `SkinReport`, `ProductCard` |
| 函数 | camelCase | `analyzeSkin`, `matchProducts` |
| 常量 | UPPER_SNAKE | `SKIN_ANALYSIS_PROMPT` |
| 接口/类型 | PascalCase | `SkinAnalysisResult` |
| 状态变量 | camelCase | `isLoading`, `analysisResult` |

### 8.3 注释规范

```javascript
// ✅ 模块入口函数必须有说明注释
/**
 * 调用 Anthropic API 分析面部图片
 * @param input 包含 base64 图片和媒体类型
 * @returns 结构化肌肤分析报告
 */
async function analyzeSkin(input) { ... }

// ✅ 复杂逻辑需要行内注释
const score = Math.round((matched.length / Math.max(demandTags.length, 1)) * 100);
// 避免除以零：当需求标签为空时返回 0 分
```

### 8.4 禁止事项

- ❌ 不允许 `console.log` 遗留在最终提交代码中（调试用完即删）
- ❌ 不允许硬编码 API Key（已由平台注入，无需传入）
- ❌ 不允许空 catch 块（必须有错误处理或日志）
- ❌ 不允许直接 `alert()` 展示错误（使用 UI 内的错误提示组件）

---

## 9. 时间分配建议

| 时间段 | 前端 | 模型识别 | 数据匹配 |
|--------|------|----------|----------|
| 0:15 - 0:45 | 搭建页面框架 + 上传组件 | 调通 API 调用 + 测试 Prompt | 解析 JSON + 实现匹配算法 |
| 0:45 - 1:30 | 接入模型识别结果，完成报告页 | 优化 Prompt，处理边界输入 | 完善推荐理由生成逻辑 |
| 1:30 - 2:15 | 接入产品推荐，完成推荐页 | 交付稳定接口，支持联调 | 交付稳定接口，支持联调 |
| 2:15 - 2:40 | 整体走查 + UI 细节优化 | 协助前端联调调试 | 协助前端联调调试 |
| 2:40 - 2:55 | 完整流程测试，修复 Bug | — | — |
| 2:55 - 3:00 | 提交链接 + GitHub | 提交链接 + GitHub | 提交链接 + GitHub |

> ⚠️ 加分项（成分冲突检测、护肤流程生成等）请在核心流程跑通后再做，优先保证主流程稳定。

---

## 10. 免责声明要求

根据赛题评分标准，**产品中必须包含免责声明**，建议在以下位置展示：

1. **页面底部固定栏**（每页可见）
2. **肌肤报告页顶部**（分析结果旁）

**标准免责声明文案：**

> 本工具基于 AI 图像分析，仅供参考，不构成医疗诊断或治疗建议。如有皮肤炎症、过敏等严重问题，请及时咨询皮肤科医生。

---

*文档维护：开发过程中如接口有变更，请及时更新本规范并通知其他模块负责人。*
