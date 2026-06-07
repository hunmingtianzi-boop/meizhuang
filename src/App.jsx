import { useEffect, useMemo, useState } from "react";
import { productDatabase } from "./data/products.js";
import { getProvider } from "./data/modelOptions.js";
import { analyzeSkin } from "./lib/analyze.js";
import { matchProducts } from "./lib/matchProducts.js";
import { AnalyzingStep } from "./components/AnalyzingStep.jsx";
import { AppFrame } from "./components/Layout.jsx";
import { ProfileStep } from "./components/ProfileStep.jsx";
import { RecommendationStep } from "./components/RecommendationStep.jsx";
import { ReportStep } from "./components/ReportStep.jsx";
import { UploadStep } from "./components/UploadStep.jsx";

const initialProfile = {
  skinType: "",
  age: "",
  budget: "",
  allergies: [],
};

export function App() {
  const [step, setStep] = useState("profile");
  const [userProfile, setUserProfile] = useState(initialProfile);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisSource, setAnalysisSource] = useState("");
  const [analysisWarning, setAnalysisWarning] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [usedRecommendationFallback, setUsedRecommendationFallback] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [modelConfig, setModelConfig] = useState({ provider: "alibaba", model: "qwen-vl-plus" });
  const [error, setError] = useState(null);

  const products = useMemo(() => productDatabase, []);

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((response) => response.json())
      .then((status) => {
        if (active) setApiStatus(status);
      })
      .catch(() => {
        if (active) setApiStatus({ hasKey: false, keyFormatOk: false });
      });
    return () => {
      active = false;
    };
  }, []);

  async function runAnalysis() {
    if (!uploadedImage) {
      setError("请先上传图片或使用测试图片。");
      return;
    }

    setError(null);
    setStep("analyzing");
    const minimumLoading = delay(6200);
    const result = await analyzeSkin(uploadedImage, userProfile, modelConfig);
    await minimumLoading;

    if (result.analysis.isValidFace === false) {
      setError(result.analysis.reason || "未检测到有效人脸，请重新上传。");
      setStep("upload");
      return;
    }

    setAnalysisResult(result.analysis);
    setAnalysisSource(result.source);
    setAnalysisWarning(result.warning || "");
    setStep("report");
  }

  function buildRecommendations() {
    const result = matchProducts(analysisResult, userProfile, products);
    setRecommendations(result.recommendations);
    setUsedRecommendationFallback(result.usedFallback);
    setStep("recommendation");
  }

  function restart() {
    setStep("profile");
    setUserProfile(initialProfile);
    setUploadedImage(null);
    setAnalysisResult(null);
    setRecommendations([]);
    setError(null);
    setAnalysisSource("");
    setAnalysisWarning("");
    setUsedRecommendationFallback(false);
  }

  return (
    <AppFrame step={step} error={error} onDismissError={() => setError(null)}>
      {step === "profile" ? (
        <ProfileStep value={userProfile} onChange={setUserProfile} onNext={() => setStep("upload")} />
      ) : null}
      {step === "upload" ? (
        <UploadStep
          uploadedImage={uploadedImage}
          onImageChange={setUploadedImage}
          onAnalyze={runAnalysis}
          onBack={() => setStep("profile")}
          apiStatus={apiStatus}
          modelConfig={modelConfig}
          onModelConfigChange={(nextConfig) => {
            const provider = getProvider(nextConfig.provider);
            setModelConfig({
              provider: provider.id,
              model: nextConfig.model || provider.models[0].id,
            });
          }}
        />
      ) : null}
      {step === "analyzing" ? <AnalyzingStep /> : null}
      {step === "report" && analysisResult ? (
        <ReportStep
          analysis={analysisResult}
          source={analysisSource}
          warning={analysisWarning}
          onRecommend={buildRecommendations}
          onBack={() => setStep("upload")}
        />
      ) : null}
      {step === "recommendation" ? (
        <RecommendationStep
          recommendations={recommendations}
          usedFallback={usedRecommendationFallback}
          userProfile={userProfile}
          onBack={() => setStep("report")}
          onRestart={restart}
        />
      ) : null}
    </AppFrame>
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
