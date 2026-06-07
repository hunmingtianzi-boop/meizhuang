import { Loader2, ScanFace } from "lucide-react";
import { useEffect, useState } from "react";

const messages = ["正在读取图片...", "AI 正在分析您的肌肤状态...", "生成个性化报告中..."];

export function AnalyzingStep() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => Math.min(messages.length - 1, current + 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF2EF] text-[#2D5A4B]">
          <ScanFace size={46} />
        </div>
        <h2 className="font-serifTitle text-3xl text-[#2D5A4B]">正在生成肌肤报告</h2>
        <p className="mt-4 flex items-center justify-center gap-2 text-[#7A7A7A]">
          <Loader2 className="animate-spin" size={18} />
          {messages[index]}
        </p>
        <div className="mt-8 grid gap-3">
          {messages.map((message, stepIndex) => (
            <div key={message} className="overflow-hidden rounded-full bg-[#F1ECE5]">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  stepIndex <= index ? "w-full bg-[#B8945A]" : "w-0 bg-[#B8945A]"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
