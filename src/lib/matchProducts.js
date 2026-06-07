const BUDGET_LIMITS = {
  "100元以内": 100,
  "100-300元": 300,
  "300-500元": 500,
  "500元以上": 99999,
  不限: 99999,
};

const SKIN_TYPE_ALIASES = {
  油皮: ["油性", "油皮", "混合性", "多种肤质"],
  干皮: ["干性", "干皮", "中性", "多种肤质"],
  混合皮: ["混合性", "混合皮", "油性", "多种肤质"],
  敏感皮: ["敏感性", "敏感皮", "干性", "多种肤质"],
  中性皮: ["中性", "多种肤质"],
};

const ALLERGY_TERMS = {
  酒精: ["酒精", "乙醇"],
  香精: ["香精", "香料"],
  防腐剂: ["防腐剂"],
  硅油: ["硅油", "聚二甲基硅氧烷"],
  果酸: ["果酸", "AHA"],
  无已知过敏: [],
};

export const CONFLICTS = [
  {
    a: ["视黄醇", "A醇", "retinol"],
    b: ["果酸", "水杨酸", "AHA", "BHA"],
    tip: "A 醇与酸类不建议同一时段叠加，建议分开早晚使用。",
  },
  {
    a: ["维生素C", "VC", "抗坏血酸"],
    b: ["烟酰胺"],
    tip: "高浓度 VC 与烟酰胺叠加可能影响耐受，建议分时段使用。",
  },
  {
    a: ["酒精"],
    b: [],
    tip: "推荐组合中含酒精相关提示，敏感肌请先做局部耐受测试。",
  },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(text, terms) {
  return terms.some((term) => text.toLowerCase().includes(String(term).toLowerCase()));
}

function hasAllergy(product, allergies) {
  const text = product.ingredientsText || "";
  return (allergies || [])
    .filter((allergy) => allergy !== "无已知过敏")
    .some((allergy) => includesAny(text, ALLERGY_TERMS[allergy] || [allergy]));
}

function skinTypeScore(product, analysisSkinType) {
  const allowed = SKIN_TYPE_ALIASES[analysisSkinType] || [analysisSkinType, "多种肤质"];
  return product.suitableSkinTypes.some((skinType) => allowed.includes(skinType)) ? 10 : 0;
}

function generateReason(product, matchedTags, analysis) {
  const issues = (analysis.issues || [])
    .slice(0, 2)
    .map((issue) => issue.type)
    .join("、");

  if (!matchedTags.length) {
    return `适合${analysis.skinType || "当前肤质"}的日常护理，评分和口碑表现稳定。`;
  }

  return `针对${issues || "当前"}问题，${product.brand}这款产品覆盖${matchedTags.join("、")}需求，并适合放在${product.usageStep}步骤中使用。`;
}

function scoreProducts(analysisResult, userProfile, products, respectBudget) {
  const demandTags = unique((analysisResult.issues || []).flatMap((issue) => issue.tags || []));
  const maxPrice = respectBudget ? BUDGET_LIMITS[userProfile.budget] || 99999 : 99999;

  return products
    .filter((product) => product.price <= maxPrice)
    .map((product) => {
      const matchedTags = (product.tags || []).filter((tag) => demandTags.includes(tag));
      const allergyHit = hasAllergy(product, userProfile.allergies);
      const score =
        matchedTags.length * 20 +
        skinTypeScore(product, analysisResult.skinType) +
        Math.min(product.rating, 5) * 2 -
        (allergyHit ? 50 : 0);

      return {
        product,
        score,
        matchedTags,
        allergyHit,
        reason: generateReason(product, matchedTags, analysisResult),
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);
}

function capByCategory(scored) {
  const byCategory = {};
  scored.forEach((result) => {
    const category = result.product.category || "其他";
    if (!byCategory[category]) byCategory[category] = [];
    if (byCategory[category].length < 2) byCategory[category].push(result);
  });

  return Object.values(byCategory)
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function matchProducts(analysisResult, userProfile, products) {
  const strict = capByCategory(scoreProducts(analysisResult, userProfile, products, true));
  if (strict.length) {
    return { recommendations: strict, usedFallback: false };
  }

  const fallback = capByCategory(scoreProducts(analysisResult, userProfile, products, false)).slice(0, 6);
  return { recommendations: fallback, usedFallback: true };
}

export function detectConflicts(recommendations) {
  const allText = recommendations
    .map(({ product }) => `${product.keyIngredients.join(" ")} ${product.description} ${product.contraindications.join(" ")}`)
    .join(" ");

  return CONFLICTS.filter((conflict) => {
    const hasA = includesAny(allText, conflict.a);
    const hasB = conflict.b.length ? includesAny(allText, conflict.b) : true;
    return hasA && hasB;
  });
}

export function buildRoutine(recommendations) {
  const byStep = {};
  recommendations.forEach(({ product }) => {
    const step = normalizeStep(product.usageStep || product.category);
    if (!byStep[step]) byStep[step] = product;
  });

  return {
    morning: ["洁面", "化妆水", "精华", "眼霜", "乳液", "面霜", "防晒"].map((step) => ({
      step,
      product: byStep[step],
    })),
    evening: ["卸妆", "洁面", "化妆水", "精华", "眼霜", "乳液", "面霜"].map((step) => ({
      step,
      product: byStep[step],
    })),
  };
}

function normalizeStep(step) {
  if (!step) return "其他";
  if (step.includes("化妆水")) return "化妆水";
  if (step.includes("精华")) return "精华";
  if (step.includes("洁面")) return "洁面";
  if (step.includes("卸妆")) return "卸妆";
  if (step.includes("眼霜")) return "眼霜";
  if (step.includes("乳液")) return "乳液";
  if (step.includes("面霜")) return "面霜";
  if (step.includes("防晒") || step.includes("隔离")) return "防晒";
  return step;
}
