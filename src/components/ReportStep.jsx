import { ArrowRight, BadgeCheck, Info, Sparkles, ThumbsUp } from "lucide-react";
import { BackButton, PrimaryButton } from "./Layout.jsx";

const severityClass = {
  轻微: "bg-[#F6E8B5] text-[#806013]",
  中等: "bg-[#F8D3B2] text-[#934E18]",
  严重: "bg-[#F5C2C2] text-[#8C2F2F]",
};

export function ReportStep({ analysis, source, warning, onRecommend, onBack }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
        <div className="mb-4 rounded-2xl bg-[#EAF2EF] px-4 py-3 text-sm leading-6 text-[#2D5A4B]">
          AI 分析结果仅作参考，个体差异可能影响准确性。
        </div>
        {source === "fallback" ? (
          <div className="mb-4 rounded-2xl bg-[#E8914A]/10 px-4 py-3 text-sm leading-6 text-[#8C4B18]">
            {warning || "真实 API 暂不可用，当前展示演示兜底报告。"}
          </div>
        ) : null}
        <ScoreRing score={analysis.overallScore} />
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="rounded-full bg-[#EAF2EF] px-4 py-2 text-sm font-semibold text-[#2D5A4B]">{analysis.skinType}</span>
          <span className="rounded-full bg-[#FAF8F5] px-4 py-2 text-sm text-[#7A7A7A]">综合评分</span>
        </div>
        <p className="mt-5 text-center text-sm leading-7 text-[#7A7A7A]">{analysis.summary}</p>
      </section>

      <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
        <h2 className="font-serifTitle text-3xl text-[#2D5A4B]">肌肤报告</h2>

        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D5A4B]">
            <Info size={18} />
            重点问题
          </div>
          <div className="grid gap-3">
            {analysis.issues.map((issue) => (
              <article key={`${issue.type}-${issue.area}`} className="rounded-[16px] border border-[#E8E3DC] bg-[#FAF8F5] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#2C2C2C]">{issue.type}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass[issue.severity] || severityClass.中等}`}>{issue.severity}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7A7A7A]">{issue.area}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#7A7A7A]">{issue.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {issue.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#EAF2EF] px-3 py-1 text-xs font-medium text-[#2D5A4B]">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D5A4B]">
            <ThumbsUp size={18} />
            正向反馈
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.positives.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-2xl bg-[#EAF2EF] px-4 py-3 text-sm text-[#2D5A4B]">
                <BadgeCheck size={16} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <BackButton onClick={onBack} />
          <PrimaryButton onClick={onRecommend}>
            查看推荐产品
            <ArrowRight size={17} />
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function ScoreRing({ score }) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="mx-auto flex w-full max-w-xs items-center justify-center">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#E8E3DC" strokeWidth="12" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#B8945A"
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Sparkles className="mb-2 text-[#B8945A]" size={24} />
          <span className="font-serifTitle text-5xl text-[#2D5A4B]">{score}</span>
          <span className="text-sm text-[#7A7A7A]">/ 10</span>
        </div>
      </div>
    </div>
  );
}
