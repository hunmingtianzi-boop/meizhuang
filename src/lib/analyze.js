const SYSTEM_PROMPT = `你是专业皮肤分析师。请分析用户上传的面部图片，输出严格 JSON，不要输出任何多余文字。

判断规则：
1. 如非有效人脸正面照（模糊/非人脸/多人/极端光线），返回 { "isValidFace": false, "reason": "..." }
2. 如为有效人脸，返回以下完整结构：
{
  "isValidFace": true,
  "skinType": "油皮|干皮|混合皮|敏感皮|中性皮",
  "overallScore": 7,
  "issues": [
    {
      "type": "问题名称，如痘痘/干燥/暗沉/毛孔粗大/色斑/细纹/敏感泛红",
      "severity": "轻微|中等|严重",
      "area": "T区|脸颊|全脸|额头|下巴|眼周",
      "description": "一句面向用户的友好描述",
      "tags": ["控油", "祛痘", "消炎"]
    }
  ],
  "positives": ["皮肤弹性好", "肤色均匀"],
  "summary": "两到三句综合评价，语气专业但亲切"
}

tags 的可选值为：控油、补水、祛痘、消炎、美白、提亮、抗老、紧致、修护、舒缓、防晒、去角质、缩毛孔。`;

const VALID_TAGS = new Set(["控油", "补水", "祛痘", "消炎", "美白", "提亮", "抗老", "紧致", "修护", "舒缓", "防晒", "去角质", "缩毛孔"]);

export async function analyzeSkin(uploadedImage, userProfile, modelConfig) {
  try {
    const text = shouldUseDirectMode()
      ? await callAnthropicDirect(uploadedImage, userProfile)
      : await callProxy(uploadedImage, userProfile, modelConfig);
    return { analysis: normalizeAnalysis(parseAnalysisText(text), userProfile), source: "api" };
  } catch (error) {
    return {
      analysis: createFallbackAnalysis(userProfile),
      source: "fallback",
      warning: toFriendlyFallbackWarning(error),
    };
  }
}

export function parseAnalysisText(text) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("API 返回内容不是有效 JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeAnalysis(raw, userProfile) {
  if (!raw || raw.isValidFace === false) {
    return {
      isValidFace: false,
      reason: raw?.reason || "未检测到清晰的单人正面人脸，请重新上传照片。",
    };
  }

  const issues = Array.isArray(raw.issues) ? raw.issues : [];
  return {
    isValidFace: true,
    skinType: normalizeSkinType(raw.skinType || userProfile.skinType),
    overallScore: clampNumber(raw.overallScore, 1, 10, 7),
    issues: issues.length ? issues.map(normalizeIssue) : createFallbackAnalysis(userProfile).issues,
    positives: Array.isArray(raw.positives) && raw.positives.length ? raw.positives.slice(0, 4) : ["肤色整体较均匀", "皮肤状态具备良好改善空间"],
    summary:
      raw.summary ||
      "整体肌肤状态较稳定，当前护理重点应放在屏障维稳和针对性改善上。建议保持温和清洁、规律保湿和白天防晒。",
  };
}

function normalizeIssue(issue) {
  const tags = Array.isArray(issue.tags) ? issue.tags.filter((tag) => VALID_TAGS.has(tag)) : [];
  return {
    type: issue.type || "肌肤状态波动",
    severity: ["轻微", "中等", "严重"].includes(issue.severity) ? issue.severity : "中等",
    area: issue.area || "全脸",
    description: issue.description || "该区域建议以温和修护和规律护理为主。",
    tags: tags.length ? tags : ["修护", "补水"],
  };
}

function normalizeSkinType(value) {
  const text = String(value || "");
  if (text.includes("油")) return "油皮";
  if (text.includes("干")) return "干皮";
  if (text.includes("混")) return "混合皮";
  if (text.includes("敏")) return "敏感皮";
  return "中性皮";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function shouldUseDirectMode() {
  return import.meta.env.VITE_ENABLE_DIRECT_ANTHROPIC === "true" && Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY);
}

function toFriendlyFallbackWarning(error) {
  const message = error?.message || "";
  if (message.includes("ANTHROPIC_API_KEY")) {
    return "当前未配置真实 API Key，已启用演示兜底报告，完整流程仍可稳定走通。";
  }
  if (message.includes("OPENAI_API_KEY")) {
    return "当前未配置真实 API Key，已启用演示兜底报告，完整流程仍可稳定走通。";
  }
  if (message.includes("invalid") || message.includes("Incorrect API key")) {
    return "真实 API Key 认证失败，未进行真实图片识别；页面展示的是演示兜底报告。";
  }
  if (message.includes("JSON")) {
    return "AI 返回内容暂时无法解析，已启用演示兜底报告，建议稍后重试真实分析。";
  }
  return "真实 AI 分析暂不可用，已启用演示兜底报告，完整流程仍可稳定走通。";
}

async function callProxy(uploadedImage, userProfile, modelConfig) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      image: {
        base64: uploadedImage.base64,
        mediaType: uploadedImage.mediaType,
      },
      userProfile,
      modelConfig,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "网络连接失败，请检查网络");
  }
  return payload.text;
}

async function callAnthropicDirect(uploadedImage, userProfile) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `用户画像：${JSON.stringify(userProfile)}` },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: uploadedImage.mediaType,
                data: uploadedImage.base64,
              },
            },
          ],
        },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "AI 服务请求失败");
  }
  return (payload.content || []).map((part) => (part.type === "text" ? part.text : "")).join("\n");
}

function createFallbackAnalysis(userProfile) {
  const skinType = normalizeSkinType(userProfile.skinType);
  const baseIssues = {
    油皮: [
      ["出油与毛孔", "中等", "T区", "T 区油脂分泌偏活跃，毛孔视觉存在感稍强。", ["控油", "缩毛孔"]],
      ["闭口痘痘", "轻微", "下巴", "局部有轻微闭口趋势，建议减少厚重叠加。", ["祛痘", "消炎"]],
    ],
    干皮: [
      ["干燥缺水", "中等", "脸颊", "两颊保湿度偏弱，容易出现紧绷和细纹感。", ["补水", "修护"]],
      ["细纹", "轻微", "眼周", "眼周有轻微干纹迹象，适合加强保湿和抗老护理。", ["抗老", "紧致"]],
    ],
    混合皮: [
      ["水油不均", "中等", "T区与脸颊", "T 区偏油而脸颊偏干，建议分区护理。", ["控油", "补水"]],
      ["暗沉", "轻微", "全脸", "肤色亮度略显不足，可加入温和提亮护理。", ["提亮", "美白"]],
    ],
    敏感皮: [
      ["敏感泛红", "中等", "脸颊", "脸颊区域耐受度偏弱，建议优先修护屏障。", ["修护", "舒缓"]],
      ["干燥缺水", "轻微", "全脸", "基础保湿仍需加强，避免过度清洁。", ["补水", "修护"]],
    ],
    中性皮: [
      ["日常维稳", "轻微", "全脸", "整体状态稳定，重点是保持防晒和抗氧化护理。", ["修护", "防晒"]],
      ["轻微暗沉", "轻微", "全脸", "肤色有轻微暗沉趋势，可加入温和提亮产品。", ["提亮", "美白"]],
    ],
  };

  return {
    isValidFace: true,
    skinType,
    overallScore: skinType === "敏感皮" ? 7 : 8,
    issues: (baseIssues[skinType] || baseIssues.中性皮).map(([type, severity, area, description, tags]) => ({
      type,
      severity,
      area,
      description,
      tags,
    })),
    positives: ["肤质基础较好", "局部问题可通过规律护理改善", "适合建立清晰的早晚护理流程"],
    summary:
      "本次演示分析显示肌肤整体状态可控，核心护理应围绕温和清洁、屏障维稳和针对性改善展开。建议选择成分路径清晰、适合当前肤质和预算的产品组合。",
  };
}

export async function fileToUploadedImage(file) {
  const dataUrl = await readAsDataUrl(file);
  const [, base64 = ""] = dataUrl.split(",");
  return {
    base64,
    mediaType: file.type,
    previewUrl: dataUrl,
    name: file.name,
  };
}

export async function urlToUploadedImage(url, name = "测试图片") {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], `${name}.png`, { type: blob.type || "image/png" });
  return fileToUploadedImage(file);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
