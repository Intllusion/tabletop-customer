'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useIsKioskMode } from '@/hooks';
import { useTranslation } from '@/stores/translation-store';
import { Separator } from '@/components/ui/separator';

export function OrderSummary() {
  const isKiosk = useIsKioskMode();
  const { t } = useTranslation();
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);

  return (
    <div className="space-y-4">
      <h3 className={cn(
        'font-semibold',
        isKiosk ? 'text-xl' : 'text-lg'
      )}>
        {t('checkout.order_summary', 'Order Summary')}
      </h3>

      {/* Item list */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className={cn(
                  'font-medium text-muted-foreground',
                  isKiosk && 'text-lg'
                )}>
                  {item.quantity}x
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'font-medium truncate',
                    isKiosk && 'text-lg'
                  )}>
                    {item.itemName}
                  </p>
                  {item.variantName && (
                    <p className="text-sm text-muted-foreground">
                      {item.variantName}
                    </p>
                  )}
                  {item.modifiers.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {item.modifiers.map(m => m.name).join(', ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <span className={cn(
              'font-medium shrink-0',
              isKiosk && 'text-lg'
            )}>
              {formatCurrency(item.totalPrice)}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Totals
        *
        * One number, because there is only one. Menu prices include VAT, so a
        * Subtotal and Tax line above the total were not a breakdown of it -
        * they were 17% added on top of a price that already contained 18%.
        * A 12.00 coffee was quoted here at 14.04 and charged at 12.00.
        *
        * The VAT split is a real thing and it belongs on the receipt, where
        * the server computes it. Not here, where it was invented. */}
      <div className="space-y-2">
        <div className={cn(
          'flex justify-between font-bold',
          isKiosk ? 'text-xl' : 'text-lg'
        )}>
          <span>{t('cart.total', 'Total')}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('cart.vat_included', 'VAT included')}
        </p>
      </div>
    </div>
  );
}
