import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, CartItemModifier } from '@/types';

interface CartState {
  storeId: string | null;
  items: CartItem[];

  /**
   * What the cart comes to. Menu prices include VAT, so this is the price.
   *
   * There used to be `subtotal`, `taxRate` and `taxAmount` here, splitting the
   * total at a hardcoded 17%. Three things were wrong with that at once.
   *
   * The rate was a second copy of a number the server also holds, and the two
   * had drifted - Israeli VAT has been 18% since January 2025. The split was
   * being *added* to the menu price rather than extracted from it, so a 12.00
   * coffee was shown at checkout as 14.04 while the server charged 12.00. And
   * showing VAT as an addition is the wrong way round here anyway: the
   * displayed price has to include it.
   *
   * The server computes net and tax when it prices the order and returns both
   * on the response. That is the copy a receipt has to agree with, so it is
   * the only copy. The order screen reads those server figures and is correct.
   */
  total: number;

  // Actions
  setStore: (storeId: string) => void;
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>, storeId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  updateNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
}

// Generate a unique ID for cart items
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Calculate item total price
function calculateItemTotal(item: Pick<CartItem, 'unitPrice' | 'quantity' | 'modifiers'>): number {
  const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
  return (item.unitPrice + modifiersTotal) * item.quantity;
}

// What the cart comes to. Menu prices include VAT, so nothing is added.
function recalculateTotals(items: CartItem[]) {
  return { total: items.reduce((sum, item) => sum + item.totalPrice, 0) };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      items: [],
      total: 0,

      setStore: (storeId) => {
        const currentStoreId = get().storeId;
        // If switching to a different store, clear the cart
        if (currentStoreId && currentStoreId !== storeId) {
          set({
            storeId,
            items: [],
            total: 0,
          });
        } else {
          set({ storeId });
        }
      },

      addItem: (itemData, storeId) => {
        const { items, storeId: currentStoreId } = get();

        // If adding to a different store, clear cart first
        if (currentStoreId && currentStoreId !== storeId) {
          set({
            storeId,
            items: [],
            total: 0,
          });
        } else if (!currentStoreId) {
          set({ storeId });
        }

        const currentItems = currentStoreId !== storeId ? [] : items;

        // Check if same item with same variant and modifiers exists
        const existingIndex = currentItems.findIndex(
          (existing) =>
            existing.itemId === itemData.itemId &&
            existing.variantId === itemData.variantId &&
            JSON.stringify(existing.modifiers.map(m => m.id).sort()) ===
            JSON.stringify(itemData.modifiers.map(m => m.id).sort())
        );

        let newItems: CartItem[];

        if (existingIndex >= 0) {
          // Update quantity of existing item
          newItems = currentItems.map((item, index) => {
            if (index === existingIndex) {
              const newQuantity = item.quantity + itemData.quantity;
              return {
                ...item,
                quantity: newQuantity,
                totalPrice: calculateItemTotal({ ...item, quantity: newQuantity }),
              };
            }
            return item;
          });
        } else {
          // Add new item
          const newItem: CartItem = {
            ...itemData,
            id: generateId(),
            totalPrice: calculateItemTotal(itemData),
          };
          newItems = [...currentItems, newItem];
        }

        const totals = recalculateTotals(newItems);
        set({ items: newItems, ...totals });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        const { items } = get();
        const newItems = items.map((item) => {
          if (item.id === cartItemId) {
            return {
              ...item,
              quantity,
              totalPrice: calculateItemTotal({ ...item, quantity }),
            };
          }
          return item;
        });

        const totals = recalculateTotals(newItems);
        set({ items: newItems, ...totals });
      },

      removeItem: (cartItemId) => {
        const { items } = get();
        const newItems = items.filter((item) => item.id !== cartItemId);
        const totals = recalculateTotals(newItems);
        set({ items: newItems, ...totals });
      },

      updateNotes: (cartItemId, notes) => {
        const { items } = get();
        const newItems = items.map((item) => {
          if (item.id === cartItemId) {
            return { ...item, notes };
          }
          return item;
        });
        set({ items: newItems });
      },

      clearCart: () => {
        set({
          items: [],
          total: 0,
        });
      },

    }),
    {
      name: 'kiosk-cart',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        storeId: state.storeId,
        items: state.items,
      }),
    }
  )
);

// Selector hooks
export const useCartItemCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

export const useCartTotal = () =>
  useCartStore((state) => state.total);
