import rawProducts from "../../jd_skincare_products(1).json";

const CONCERN_TO_TAGS = {
  干燥缺水: ["补水"],
  出油: ["控油"],
  痘痘: ["祛痘", "消炎"],
  闭口: ["祛痘", "去角质"],
  痘印: ["祛痘", "修护"],
  色斑: ["美白", "提亮"],
  暗沉: ["美白", "提亮"],
  细纹: ["抗老", "紧致"],
  松弛: ["抗老", "紧致"],
  屏障受损: ["修护", "舒缓"],
  泛红敏感: ["修护", "舒缓"],
  黑头: ["去角质"],
  毛孔粗大: ["缩毛孔"],
  日常护理: ["修护"],
};

const CATEGORY_TO_TAGS = {
  防晒: ["防晒"],
  "隔离/妆前": ["防晒"],
  洁面: ["控油"],
  清洁护理: ["去角质"],
  卸妆: ["修护"],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function parseProductDatabase(jsonText) {
  const parsed = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
  if (!Array.isArray(parsed)) return [];

  return parsed.map((product, index) => {
    const concerns = product.target_concerns || [];
    const category = product.category || product.usage_step || "其他";
    const concernTags = concerns.flatMap((concern) => CONCERN_TO_TAGS[concern] || []);
    const categoryTags = CATEGORY_TO_TAGS[category] || [];

    return {
      id: product.product_id || `product-${index}`,
      name: product.name || "未命名商品",
      brand: product.brand || "未知品牌",
      category,
      price: Number(product.price) || 0,
      volume: product.volume || "",
      rating: Number(product.rating) || 0,
      keyIngredients: product.key_ingredients || [],
      suitableSkinTypes: product.suitable_skin_types || [],
      concerns,
      contraindications: product.contraindications || [],
      usageStep: product.usage_step || category,
      usageTime: product.usage_time || [],
      description: product.description || "",
      tags: unique([...concernTags, ...categoryTags]),
      ingredientsText: [
        ...(product.key_ingredients || []),
        ...(product.contraindications || []),
        product.description || "",
      ].join(" "),
    };
  });
}

export const productDatabase = parseProductDatabase(rawProducts);
