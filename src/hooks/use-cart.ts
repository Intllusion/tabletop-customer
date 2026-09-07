import { useCartStore, useCartItemCount, useCartTotal } from '@/stores/cart-store';
import type { CartItemModifier, MenuItem, ItemVariant } from '@/types';

/**
 * Convenience hook for cart operations
 */
export function useCart() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateNotes = useCartStore((state) => state.updateNotes);
  const clearCart = useCartStore((state) => state.clearCart);

  const itemCount = useCartItemCount();
  const isEmpty = items.length === 0;

  return {
    items,
    itemCount,
    isEmpty,
    total,
    addItem,
    updateQuantity,
    removeItem,
    updateNotes,
    clearCart,
  };
}

/**
 * Helper to add a menu item to cart
 */
export function useAddToCart() {
  const addItem = useCartStore((state) => state.addItem);

  return (
    item: MenuItem,
    quantity: number,
    variant?: ItemVariant,
    modifiers: CartItemModifier[] = [],
    notes?: string,
    storeId?: string
  ) => {
    if (!storeId) {
      console.error('useAddToCart: storeId is required');
      return;
    }

    const unitPrice = item.basePrice + (variant?.priceAdjustment || 0);

    addItem({
      itemId: item.id,
      itemName: item.name,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity,
      unitPrice,
      notes,
      modifiers,
    }, storeId);
  };
}

// Re-export for convenience
export { useCartItemCount, useCartTotal };
