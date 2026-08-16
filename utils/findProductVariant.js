export const findProductVariant = (product, variantId) => {
  if (!product?.variants || !variantId) {
    return null;
  }

  return (
    product.variants.find(
      (variant) => String(variant.id) === String(variantId),
    ) || null
  );
};
