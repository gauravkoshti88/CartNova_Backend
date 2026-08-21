const GUEST_CART_KEY = "gshop_guest_cart";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export const getGuestCart = () => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);

    if (!stored) {
      return {
        items: [],
        expiresAt: null,
      };
    }

    const cart = JSON.parse(stored);

    // Expired
    if (cart.expiresAt && Date.now() > cart.expiresAt) {
      localStorage.removeItem(GUEST_CART_KEY);

      return {
        items: [],
        expiresAt: null,
      };
    }

    return cart;
  } catch (error) {
    return {
      items: [],
      expiresAt: null,
    };
  }
};

export const saveGuestCart = (items) => {
  const cart = {
    items,
    expiresAt: Date.now() + ONE_WEEK,
  };

  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));

  return cart;
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};
