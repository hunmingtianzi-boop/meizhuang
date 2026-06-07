import { ArrowRight, BadgeCheck, CircleDollarSign, ShieldCheck, UserRound } from "lucide-react";
import { PrimaryButton } from "./Layout.jsx";

const skinTypes = ["油皮", "干皮", "混合皮", "敏感皮", "不确定"];
const ages = ["18岁以下", "18-25岁", "26-35岁", "36-45岁", "45岁以上"];
const budgets = ["100元以内", "100-300元", "300-500元", "500元以上", "不限"];
const allergies = ["酒精", "香精", "防腐剂", "硅油", "果酸", "无已知过敏"];

export function ProfileStep({ value, onChange, onNext }) {
  const ready = value.skinType && value.age && value.budget;

  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  function toggleAllergy(item) {
    const current = value.allergies || [];
    if (item === "无已知过敏") {
      update("allergies", current.includes(item) ? [] : [item]);
      return;
    }
    const withoutNone = current.filter((entry) => entry !== "无已知过敏");
    update("allergies", withoutNone.includes(item) ? withoutNone.filter((entry) => entry !== item) : [...withoutNone, item]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-6 shadow-soft">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#B8945A]">Personal Profile</p>
        <h2 className="font-serifTitle text-3xl text-[#2D5A4B]">先建立你的护肤画像</h2>
        <p className="mt-4 text-sm leading-7 text-[#7A7A7A]">
          画像会参与推荐排序和成分避雷，不会替代图片分析结果。完成基础信息后即可进入上传和 AI 分析。
        </p>
        <div className="mt-6 grid gap-3 text-sm text-[#2C2C2C]">
          <InfoLine icon={<UserRound size={18} />} text="肤质、年龄和预算会影响商品匹配权重" />
          <InfoLine icon={<ShieldCheck size={18} />} text="过敏标签会触发扣分和卡片警告" />
          <InfoLine icon={<BadgeCheck size={18} />} text="后续报告与推荐均可重新开始调整" />
        </div>
      </section>

      <section className="rounded-[16px] border border-[#E8E3DC] bg-white p-5 shadow-soft sm:p-6">
        <OptionGroup title="肤质类型" icon={<UserRound size={18} />} options={skinTypes} value={value.skinType} onSelect={(item) => update("skinType", item)} />
        <OptionGroup title="年龄段" icon={<BadgeCheck size={18} />} options={ages} value={value.age} onSelect={(item) => update("age", item)} />
        <OptionGroup title="护肤预算" icon={<CircleDollarSign size={18} />} options={budgets} value={value.budget} onSelect={(item) => update("budget", item)} />

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D5A4B]">
            <ShieldCheck size={18} />
            过敏史
          </div>
          <div className="flex flex-wrap gap-2">
            {allergies.map((item) => {
              const active = (value.allergies || []).includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleAllergy(item)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active ? "border-[#2D5A4B] bg-[#EAF2EF] text-[#2D5A4B]" : "border-[#E8E3DC] bg-[#FAF8F5] text-[#7A7A7A] hover:border-[#B8945A]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <PrimaryButton onClick={onNext} disabled={!ready}>
            开始分析
            <ArrowRight size={17} />
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function InfoLine({ icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#FAF8F5] px-4 py-3">
      <span className="text-[#B8945A]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function OptionGroup({ title, icon, options, value, onSelect }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D5A4B]">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((item) => {
          const active = value === item;
          return (
            <button
              type="button"
              key={item}
              onClick={() => onSelect(item)}
              className={`min-h-12 rounded-2xl border px-3 text-sm font-medium transition ${
                active ? "border-[#B8945A] bg-[#B8945A] text-white shadow-md" : "border-[#E8E3DC] bg-[#FAF8F5] text-[#2C2C2C] hover:border-[#B8945A]"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
