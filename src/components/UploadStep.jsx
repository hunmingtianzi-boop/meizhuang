import { Camera, Eye, EyeOff, ImagePlus, KeyRound, RotateCcw, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { fileToUploadedImage, urlToUploadedImage } from "../lib/analyze.js";
import { SAMPLE_FACE_IMAGE } from "../data/sampleImages.js";
import { getProvider, MODEL_PROVIDERS } from "../data/modelOptions.js";
import { BackButton, PrimaryButton, SecondaryButton } from "./Layout.jsx";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function UploadStep({
  uploadedImage,
  onImageChange,
  onAnalyze,
  onBack,
  apiStatus,
  modelConfig,
  onModelConfigChange,
  userApiKey,
  onUserApiKeyChange,
}) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  async function handleFile(file) {
    setLocalError("");
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("仅支持 JPG、PNG、WEBP 图片。");
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError("图片大小不能超过 5MB，请压缩后重新上传。");
      return;
    }
    onImageChange(await fileToUploadedImage(file));
  }

  async function useSampleImage() {
    setLoadingSample(true);
    setLocalError("");
    try {
      onImageChange(await urlToUploadedImage(SAMPLE_FACE_IMAGE, "skin_01"));
    } catch {
      setLocalError("测试图片读取失败，请手动上传一张面部照片。");
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <section
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={`flex min-h-[420px] flex-col items-center justify-center rounded-[16px] border border-dashed p-6 text-center shadow-soft transition ${
          dragging ? "border-[#B8945A] bg-[#EAF2EF]" : "border-[#E8E3DC] bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        {uploadedImage ? (
          <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-[16px] border border-[#E8E3DC] bg-[#FAF8F5]">
              <img src={uploadedImage.previewUrl} alt="已上传的面部预览" className="h-80 w-full object-cover" />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <SecondaryButton onClick={() => inputRef.current?.click()}>
                <RotateCcw size={17} />
                重新选择
              </SecondaryButton>
              <PrimaryButton onClick={onAnalyze}>
                <Camera size={17} />
                分析肌肤
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-full bg-[#EAF2EF] p-5 text-[#2D5A4B]">
              <UploadCloud size={38} />
            </div>
            <h2 className="font-serifTitle text-3xl text-[#2D5A4B]">上传清晰正面照</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#7A7A7A]">
              点击选择或直接拖拽图片到此区域。前端只校验格式和大小，人脸有效性由后续模型判断。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <PrimaryButton onClick={() => inputRef.current?.click()}>
                <ImagePlus size={17} />
                点击上传
              </PrimaryButton>
              <SecondaryButton onClick={useSampleImage} disabled={loadingSample}>
                <Camera size={17} />
                {loadingSample ? "读取中..." : "使用测试图片"}
              </SecondaryButton>
            </div>
          </>
        )}

        {localError ? <p className="mt-5 rounded-full bg-[#D94F4F]/10 px-4 py-2 text-sm text-[#D94F4F]">{localError}</p> : null}
      </section>

      <aside className="rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
        <h3 className="font-serifTitle text-2xl text-[#2D5A4B]">拍摄建议</h3>
        <ModelSelector
          modelConfig={modelConfig}
          onChange={onModelConfigChange}
          apiStatus={apiStatus}
          userApiKey={userApiKey}
          onUserApiKeyChange={onUserApiKeyChange}
        />
        <ApiStatus status={apiStatus} modelConfig={modelConfig} userApiKey={userApiKey} />
        <div className="mt-5 grid gap-3 text-sm text-[#2C2C2C]">
          {["正脸面对镜头，尽量露出额头和脸颊", "自然光或均匀室内光，避免强逆光", "单人照片，避免滤镜、厚重妆容和遮挡", "支持 JPEG、PNG、WEBP，最大 5MB"].map((item) => (
            <div key={item} className="rounded-2xl bg-[#FAF8F5] px-4 py-3">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-8">
          <BackButton onClick={onBack} />
        </div>
      </aside>
    </div>
  );
}

function ModelSelector({ modelConfig, onChange, apiStatus, userApiKey, onUserApiKeyChange }) {
  const provider = getProvider(modelConfig?.provider);
  const selectedProviderStatus = apiStatus?.providers?.[provider.id];
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="mt-5 rounded-[16px] border border-[#E8E3DC] bg-[#FAF8F5] p-4">
      <div className="mb-3 text-sm font-semibold text-[#2D5A4B]">模型选择</div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-xs font-medium text-[#7A7A7A]">
          供应商
          <select
            value={provider.id}
            onChange={(event) => {
              const nextProvider = getProvider(event.target.value);
              onChange({ provider: nextProvider.id, model: nextProvider.models[0].id });
            }}
            className="min-h-11 rounded-2xl border border-[#E8E3DC] bg-white px-3 text-sm font-semibold text-[#2C2C2C] outline-none focus:border-[#B8945A]"
          >
            {MODEL_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-[#7A7A7A]">
          模型
          <select
            value={modelConfig?.model || provider.models[0].id}
            onChange={(event) => onChange({ provider: provider.id, model: event.target.value })}
            className="min-h-11 rounded-2xl border border-[#E8E3DC] bg-white px-3 text-sm font-semibold text-[#2C2C2C] outline-none focus:border-[#B8945A]"
          >
            {provider.models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-[#7A7A7A]">
          <span className="inline-flex items-center gap-1">
            <KeyRound size={13} />
            自带 API Key
          </span>
          <div className="flex min-h-11 overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white focus-within:border-[#B8945A]">
            <input
              value={userApiKey}
              onChange={(event) => onUserApiKeyChange(event.target.value)}
              type={showKey ? "text" : "password"}
              autoComplete="off"
              placeholder="可选；留空则使用平台环境变量"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#2C2C2C] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="flex w-11 items-center justify-center text-[#7A7A7A] transition hover:text-[#2D5A4B]"
              aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
            >
              {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#7A7A7A]">
        API Key 只保存在当前页面内存中，用于本次分析请求；刷新页面后会清空。
      </p>
      {!userApiKey && selectedProviderStatus?.hasKey === false ? (
        <p className="mt-3 text-xs leading-5 text-[#8C4B18]">当前供应商没有配置 API Key，分析会转为演示兜底。</p>
      ) : null}
    </div>
  );
}

function ApiStatus({ status, modelConfig, userApiKey }) {
  let text = "正在检查真实模型连接状态...";
  let classes = "bg-[#EAF2EF] text-[#2D5A4B]";

  if (status) {
    const selectedProvider = modelConfig?.provider || status.provider;
    const selectedStatus = status.providers?.[selectedProvider] || status;
    if (userApiKey) {
      const providerLabel = getProvider(selectedProvider).label;
      text = `将使用你输入的 API Key 调用：${providerLabel} / ${modelConfig?.model || selectedStatus.defaultModel || status.model}`;
      classes = "bg-[#EAF2EF] text-[#2D5A4B]";
    } else if (!selectedStatus.hasKey) {
      text = "当前供应商未配置 API Key：分析会使用演示兜底报告。";
      classes = "bg-[#E8914A]/10 text-[#8C4B18]";
    } else if (!selectedStatus.keyFormatOk) {
      text = "当前密钥格式不可识别：不会进行真实图片识别。";
      classes = "bg-[#D94F4F]/10 text-[#8C2F2F]";
    } else {
      const providerLabel = getProvider(selectedProvider).label;
      text = `将尝试调用真实模型：${providerLabel} / ${modelConfig?.model || selectedStatus.defaultModel || status.model}`;
      classes = "bg-[#EAF2EF] text-[#2D5A4B]";
    }
  }

  return <div className={`mt-5 rounded-2xl px-4 py-3 text-sm leading-6 ${classes}`}>{text}</div>;
}
