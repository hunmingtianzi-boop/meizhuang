import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 7860);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const systemPrompt = `你是专业皮肤分析师。请分析用户上传的面部图片，输出严格 JSON，不要输出任何多余文字。

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

function getProviderConfig() {
  const dashScopeKey = process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY || "";
  const explicitOpenAIKey = process.env.OPENAI_API_KEY || "";
  const legacyKey = process.env.ANTHROPIC_API_KEY || "";

  return buildProviderConfig({ provider: undefined, model: undefined }, { dashScopeKey, explicitOpenAIKey, legacyKey });
}

function buildProviderConfig(selection = {}, keys = {}) {
  const dashScopeKey = keys.dashScopeKey ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_API_KEY ?? "";
  const explicitOpenAIKey = keys.explicitOpenAIKey ?? process.env.OPENAI_API_KEY ?? "";
  const legacyKey = keys.legacyKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const requestedProvider = selection.provider;

  if (requestedProvider === "alibaba" || (!requestedProvider && dashScopeKey)) {
    return {
      provider: "alibaba",
      key: dashScopeKey,
      model: selection.model || process.env.ALIBABA_MODEL || "qwen-vl-plus",
      keyFormatOk: dashScopeKey.startsWith("sk-"),
    };
  }

  if (requestedProvider === "anthropic" || (!requestedProvider && legacyKey.startsWith("sk-ant-"))) {
    return {
      provider: "anthropic",
      key: legacyKey,
      model: selection.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      keyFormatOk: legacyKey.startsWith("sk-ant-"),
    };
  }

  const openAIKey = explicitOpenAIKey || (legacyKey.startsWith("sk-") ? legacyKey : "");
  if (requestedProvider === "openai" || (!requestedProvider && openAIKey)) {
    return {
      provider: "openai",
      key: openAIKey,
      model: selection.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      keyFormatOk: openAIKey.startsWith("sk-"),
    };
  }

  return {
    provider: "none",
    key: "",
    model: "",
    keyFormatOk: false,
  };
}

function extractTextFromAnthropic(data) {
  if (!Array.isArray(data?.content)) return "";
  return data.content
    .map((part) => (part?.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function extractTextFromOpenAI(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  if (!Array.isArray(data?.output)) return "";

  return data.output
    .flatMap((item) => item?.content || [])
    .map((part) => part?.text || part?.refusal || "")
    .filter(Boolean)
    .join("\n");
}

function extractTextFromChatCompletion(data) {
  return data?.choices?.[0]?.message?.content || "";
}

app.post("/api/analyze", async (req, res) => {
  const { image, userProfile, modelConfig } = req.body || {};
  const config = buildProviderConfig(modelConfig);
  if (!config.key) {
    res.json({ error: `${config.provider || "selected"} API key is not configured` });
    return;
  }
  if (!config.keyFormatOk) {
    res.json({ error: "当前配置的 API Key 格式不可识别，真实图片识别未启用" });
    return;
  }

  if (!image?.base64 || !image?.mediaType) {
    res.json({ error: "Missing image.base64 or image.mediaType" });
    return;
  }

  try {
    if (config.provider === "alibaba") {
      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.key}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1500,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `请结合用户画像进行分析，但不要把画像当作图片事实。用户画像：${JSON.stringify(userProfile || {})}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mediaType};base64,${image.base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        res.json({
          error: payload?.error?.message || payload?.message || "Alibaba DashScope request failed",
        });
        return;
      }

      res.json({ provider: "alibaba", model: config.model, text: extractTextFromChatCompletion(payload) });
      return;
    }

    if (config.provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.key}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_output_tokens: 1500,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: systemPrompt }],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `请结合用户画像进行分析，但不要把画像当作图片事实。用户画像：${JSON.stringify(userProfile || {})}`,
                },
                {
                  type: "input_image",
                  image_url: `data:${image.mediaType};base64,${image.base64}`,
                  detail: "high",
                },
              ],
            },
          ],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        res.json({
          error: payload?.error?.message || "OpenAI API request failed",
        });
        return;
      }

      res.json({ provider: "openai", model: config.model, text: extractTextFromOpenAI(payload) });
      return;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `请结合用户画像进行分析，但不要把画像当作图片事实。用户画像：${JSON.stringify(userProfile || {})}`,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.mediaType,
                  data: image.base64,
                },
              },
            ],
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.json({
        error: payload?.error?.message || "Anthropic API request failed",
      });
      return;
    }

    res.json({ provider: "anthropic", model: config.model, text: extractTextFromAnthropic(payload) });
  } catch (error) {
    res.json({ error: error?.message || "Network request failed" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/status", (_req, res) => {
  const configs = {
    alibaba: buildProviderConfig({ provider: "alibaba" }),
    openai: buildProviderConfig({ provider: "openai" }),
    anthropic: buildProviderConfig({ provider: "anthropic" }),
  };
  const config = getProviderConfig();
  res.json({
    provider: config.provider,
    model: config.model,
    hasKey: Boolean(config.key),
    keyFormatOk: config.keyFormatOk,
    providers: Object.fromEntries(
      Object.entries(configs).map(([provider, item]) => [
        provider,
        {
          hasKey: Boolean(item.key),
          keyFormatOk: item.keyFormatOk,
          defaultModel: item.model,
        },
      ])
    ),
  });
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.info(`API proxy listening on http://localhost:${port}`);
});
