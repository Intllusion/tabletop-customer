'use client';

import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { useCart, useIsKioskMode, useSession } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from '@/stores/translation-store';
import { formatCurrency } from '@/lib/utils';

export function CartSidebar() {
  const router = useRouter();
  const { store } = useSession();
  const isCartOpen = useUIStore((state) => state.isCartOpen);
  const closeCart = useUIStore((state) => state.closeCart);
  const isKiosk = useIsKioskMode();
  const { t } = useTranslation();

  const {
    items,
    itemCount,
    isEmpty,
    total,
    updateQuantity,
    removeItem,
  } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side="right"
        className={`flex flex-col ${isKiosk ? 'w-[400px] sm:w-[450px]' : 'w-full sm:w-[400px]'}`}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('ui.cart.title', 'Your Cart')}
            {itemCount > 0 && (
              <span className="text-muted-foreground font-normal">
                ({itemCount} {itemCount === 1 ? t('cart.item', 'item') : t('cart.items', 'items')})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">{t('cart.empty', 'Your cart is empty')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('cart.empty_description', 'Add items from the menu to get started')}
            </p>
            <Button className="mt-6" onClick={closeCart}>
              {t('ui.menu.title', 'Menu')}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.itemName}</p>
                        {item.variantName && (
                          <p className="text-sm text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                        {item.modifiers.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            + {item.modifiers.map((m) => m.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <p className="font-medium whitespace-nowrap">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              {/* One number: menu prices include VAT. See order-summary. */}
              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('cart.total', 'Total')}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('cart.vat_included', 'VAT included')}
                </p>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  size={isKiosk ? 'lg' : 'default'}
                  className="w-full touch-target"
                  onClick={() => {
                    closeCart();
                    router.push(`/store/${store?.slug}/checkout`);
                  }}
                >
                  {t('button.checkout', 'Checkout')}
                </Button>
                <Button
                  variant="outline"
                  size={isKiosk ? 'lg' : 'default'}
                  className="w-full"
                  onClick={closeCart}
                >
                  {t('button.continue', 'Continue')}
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
