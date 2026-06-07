import { AlertTriangle, ArrowRight, BadgeCheck, RotateCcw, ShieldAlert, ShoppingBag, Sparkles } from "lucide-react";
import { buildRoutine, detectConflicts } from "../lib/matchProducts.js";
import { BackButton, PrimaryButton } from "./Layout.jsx";

export function RecommendationStep({ recommendations, usedFallback, userProfile, onBack, onRestart }) {
  const grouped = groupByCategory(recommendations);
  const conflicts = detectConflicts(recommendations);
  const routine = buildRoutine(recommendations);

  return (
    <div className="space-y-5">
      {usedFallback ? (
        <Banner tone="warning" icon={<AlertTriangle size={18} />} text="在当前预算内没有找到足够高匹配商品，已展示不受预算限制的高评分兜底推荐。" />
      ) : null}
      {conflicts.map((conflict) => (
        <Banner key={conflict.tip} tone="danger" icon={<ShieldAlert size={18} />} text={conflict.tip} />
      ))}

      <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#B8945A]">Product Match</p>
            <h2 className="font-serifTitle text-3xl text-[#2D5A4B]">个性化产品推荐</h2>
            <p className="mt-3 text-sm text-[#7A7A7A]">预算：{userProfile.budget || "不限"} · 过敏关注：{(userProfile.allergies || []).join("、") || "无"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <BackButton onClick={onBack} />
            <PrimaryButton onClick={onRestart}>
              <RotateCcw size={17} />
              重新开始
            </PrimaryButton>
          </div>
        </div>
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="rounded-[16px] border border-[#E8E3DC] bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="text-[#B8945A]" size={20} />
            <h3 className="font-serifTitle text-2xl text-[#2D5A4B]">{category}</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <ProductCard key={item.product.id} item={item} index={index} />
            ))}
          </div>
        </section>
      ))}

      <RoutineCard title="早间护肤流程" items={routine.morning} />
      <RoutineCard title="晚间护肤流程" items={routine.evening} />
    </div>
  );
}

function ProductCard({ item, index }) {
  const { product } = item;
  return (
    <article
      className="rounded-[16px] border border-[#E8E3DC] bg-[#FAF8F5] p-4 shadow-sm"
      style={{ animation: `fadeUp 0.42s ease-out ${index * 80}ms both` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#B8945A]">{product.brand}</p>
          <h4 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#2C2C2C]">{product.name}</h4>
        </div>
        <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#2D5A4B]">¥{product.price.toFixed(0)}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(item.matchedTags.length ? item.matchedTags : product.tags.slice(0, 2)).map((tag) => (
          <span key={tag} className="rounded-full bg-[#EAF2EF] px-3 py-1 text-xs font-medium text-[#2D5A4B]">
            {tag}
          </span>
        ))}
        <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7A7A7A]">评分 {product.rating.toFixed(1)}</span>
      </div>
      {item.allergyHit ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#E8914A]/15 px-3 py-2 text-xs leading-5 text-[#8C4B18]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          检测到可能与过敏史相关的成分或禁忌，请先做局部测试。
        </div>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[#7A7A7A]">{item.reason}</p>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#9A8F83]">{product.keyIngredients.join("、") || product.description}</p>
    </article>
  );
}

function RoutineCard({ title, items }) {
  return (
    <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-[#B8945A]" size={20} />
        <h3 className="font-serifTitle text-2xl text-[#2D5A4B]">{title}</h3>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-stretch">
        {items.map((item, index) => (
          <div key={`${title}-${item.step}`} className="flex min-w-0 flex-1 items-center gap-3 lg:min-w-[150px]">
            <div className="min-h-[96px] min-w-0 flex-1 rounded-[16px] border border-[#E8E3DC] bg-[#FAF8F5] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2D5A4B]">
                <BadgeCheck size={15} />
                {item.step}
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-[#7A7A7A]">{item.product?.name || "可选"}</p>
            </div>
            {index < items.length - 1 ? <ArrowRight className="hidden shrink-0 text-[#B8945A] lg:block" size={18} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Banner({ icon, text, tone }) {
  const classes =
    tone === "danger"
      ? "border-[#D94F4F]/20 bg-[#D94F4F]/10 text-[#8C2F2F]"
      : "border-[#E8914A]/20 bg-[#E8914A]/10 text-[#8C4B18]";
  return (
    <div className={`flex items-start gap-3 rounded-[16px] border px-4 py-3 text-sm leading-6 ${classes}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function groupByCategory(recommendations) {
  return recommendations.reduce((groups, item) => {
    const key = item.product.category || "其他";
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}
