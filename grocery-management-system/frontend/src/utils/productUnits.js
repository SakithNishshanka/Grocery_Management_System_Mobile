const normalizeCategory = (category = '') => String(category).trim().toLowerCase();

export const getProductUnitLabel = (category) => {
  const normalized = normalizeCategory(category);

  if (['fruits', 'vegetables', 'meat'].includes(normalized)) {
    return 'kg';
  }

  return null;
};

export const getProductUnitText = (category) => {
  const unit = getProductUnitLabel(category);
  if (!unit) return null;
  return `1 ${unit}`;
};
