import { AlertCircle, Check, ChevronLeft, Sparkles, X } from "lucide-react";

const steps = [
  { id: "profile", label: "画像" },
  { id: "upload", label: "上传" },
  { id: "analyzing", label: "分析" },
  { id: "report", label: "报告" },
  { id: "recommendation", label: "推荐" },
];

export function AppFrame({ step, error, onDismissError, children }) {
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-5 text-[#2C2C2C] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-6xl flex-col">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-white px-3 py-1 text-xs font-medium text-[#2D5A4B] shadow-sm">
              <Sparkles size={14} />
              AI Skin Intelligence
            </div>
            <h1 className="font-serifTitle text-3xl leading-tight text-[#2C2C2C] sm:text-4xl">AI 肌肤分析与护肤推荐助手</h1>
          </div>
          <Stepper currentStep={step} />
        </header>

        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#D94F4F]/25 bg-[#D94F4F]/10 px-4 py-3 text-sm text-[#8C2F2F]">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-full p-1 text-[#8C2F2F] transition hover:bg-white/70"
              aria-label="关闭错误提示"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <section className="flex-1 animate-fadeUp">{children}</section>
        <Disclaimer />
      </div>
    </main>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#B8945A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#A7834F] hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E8E3DC] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D5A4B] shadow-sm transition hover:-translate-y-0.5 hover:border-[#B8945A] hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }) {
  return (
    <SecondaryButton onClick={onClick} className="px-4">
      <ChevronLeft size={17} />
      返回
    </SecondaryButton>
  );
}

function Stepper({ currentStep }) {
  const currentIndex = steps.findIndex((item) => item.id === currentStep);

  return (
    <nav className="w-full max-w-xl" aria-label="流程进度">
      <div className="grid grid-cols-5 gap-2">
        {steps.map((item, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <div key={item.id} className="min-w-0">
              <div className={`h-1.5 rounded-full ${done || active ? "bg-[#B8945A]" : "bg-[#E8E3DC]"}`} />
              <div
                className={`mt-2 flex items-center justify-center gap-1 truncate text-xs ${
                  active ? "font-semibold text-[#2D5A4B]" : done ? "text-[#B8945A]" : "text-[#7A7A7A]"
                }`}
              >
                {done ? <Check size={12} /> : null}
                <span className="truncate">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function Disclaimer() {
  return (
    <footer className="mt-6 rounded-2xl border border-[#E8E3DC] bg-white/70 px-4 py-3 text-center text-xs leading-relaxed text-[#7A7A7A]">
      本工具基于 AI 图像分析，仅供参考，不构成医疗诊断。皮肤严重问题请咨询皮肤科医生。
    </footer>
  );
}
