'use client';

import { resolveImageUrl } from '@/lib/image-url';
import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VariantSelector } from './variant-selector';
import { ModifierGroupSelector } from './modifier-group';
import { QuantitySelector } from './quantity-selector';
import { useIsKioskMode, useAddToCart } from '@/hooks';
import { useTranslation, useCatalogTranslation } from '@/stores/translation-store';
import { toast } from 'sonner';
import type { MenuItem, ItemVariant, Modifier, CartItemModifier } from '@/types';

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

export function ItemDetailModal({ item, isOpen, onClose, storeId }: ItemDetailModalProps) {
  const isKiosk = useIsKioskMode();
  const addToCart = useAddToCart();
  const { t } = useTranslation();
  const { ct } = useCatalogTranslation();

  // Local state
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Set<string>>>(new Map());
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      // Auto-select first available variant if there are variants
      if (item.variants.length > 0) {
        const firstAvailable = item.variants.find(v => v.isAvailable);
        setSelectedVariant(firstAvailable || null);
      } else {
        setSelectedVariant(null);
      }

      // Reset modifiers - pre-select required single-select groups
      const initialModifiers = new Map<string, Set<string>>();
      item.modifierGroups.forEach(group => {
        initialModifiers.set(group.id, new Set());
      });
      setSelectedModifiers(initialModifiers);

      setQuantity(1);
      setNotes('');
    }
  }, [item]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!item) return 0;

    let price = item.basePrice;

    // Add variant price adjustment
    if (selectedVariant) {
      price += selectedVariant.priceAdjustment;
    }

    // Add modifier prices
    item.modifierGroups.forEach(group => {
      const groupSelections = selectedModifiers.get(group.id) || new Set();
      group.modifiers.forEach(modifier => {
        if (groupSelections.has(modifier.id)) {
          price += modifier.price;
        }
      });
    });

    return price * quantity;
  }, [item, selectedVariant, selectedModifiers, quantity]);

  // Unit price (without quantity)
  const unitPrice = useMemo(() => {
    if (!item) return 0;

    let price = item.basePrice;
    if (selectedVariant) {
      price += selectedVariant.priceAdjustment;
    }
    item.modifierGroups.forEach(group => {
      const groupSelections = selectedModifiers.get(group.id) || new Set();
      group.modifiers.forEach(modifier => {
        if (groupSelections.has(modifier.id)) {
          price += modifier.price;
        }
      });
    });
    return price;
  }, [item, selectedVariant, selectedModifiers]);

  // Check if selection is valid
  const isValid = useMemo(() => {
    if (!item) return false;

    // Check variant selection
    if (item.variants.length > 0 && !selectedVariant) {
      return false;
    }

    // Check required modifier groups (minSelections > 0 means required)
    for (const group of item.modifierGroups) {
      if (group.minSelections > 0) {
        const selections = selectedModifiers.get(group.id) || new Set();
        if (selections.size < group.minSelections) {
          return false;
        }
      }
    }

    return true;
  }, [item, selectedVariant, selectedModifiers]);

  // Handle modifier toggle
  const handleModifierToggle = (groupId: string, modifier: Modifier, maxSelections: number) => {
    setSelectedModifiers(prev => {
      const newMap = new Map(prev);
      const groupSelections = new Set(newMap.get(groupId) || []);

      if (groupSelections.has(modifier.id)) {
        // Remove selection
        groupSelections.delete(modifier.id);
      } else {
        // Add selection
        if (maxSelections === 1) {
          // Radio behavior - clear others
          groupSelections.clear();
        }
        groupSelections.add(modifier.id);
      }

      newMap.set(groupId, groupSelections);
      return newMap;
    });
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!item || !isValid) return;

    // Build modifiers list
    const cartModifiers: CartItemModifier[] = [];
    item.modifierGroups.forEach(group => {
      const groupSelections = selectedModifiers.get(group.id) || new Set();
      group.modifiers.forEach(modifier => {
        if (groupSelections.has(modifier.id)) {
          cartModifiers.push({
            id: modifier.id,
            name: modifier.name,
            price: modifier.price,
          });
        }
      });
    });

    addToCart(
      item,
      quantity,
      selectedVariant || undefined,
      cartModifiers,
      notes || undefined,
      storeId
    );

    toast.success(t('message.added_to_cart', 'Added to cart'));
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col max-h-[90vh] h-[90vh] p-0 overflow-hidden',
          isKiosk ? 'sm:max-w-xl' : 'sm:max-w-lg'
        )}
        showCloseButton={false}
      >
        {/* Header with image */}
        <div className="relative">
          {/* Use galleryImages[0] if available, otherwise fall back to imageUrl */}
          {(item.galleryImages && item.galleryImages.length > 0) || item.imageUrl ? (
            <img
              src={resolveImageUrl(item.galleryImages?.[0] || item.imageUrl)}
              alt={ct(item.translations, 'name', item.name)}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <span className="text-6xl text-muted-foreground/30">
                {ct(item.translations, 'name', item.name).charAt(0)}
              </span>
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 end-2 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Title and description */}
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle className={cn(isKiosk ? 'text-2xl' : 'text-xl')}>
            {ct(item.translations, 'name', item.name)}
          </DialogTitle>
          {item.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {ct(item.translations, 'description', item.description)}
            </p>
          )}
          <p className={cn(
            'font-semibold text-primary',
            isKiosk ? 'text-xl' : 'text-lg'
          )}>
            {item.variants.length > 0
              ? `${t('item.from_price', 'From')} ${formatCurrency(item.basePrice)}`
              : formatCurrency(item.basePrice)}
          </p>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 py-4">
            {/* Variant selector */}
            {item.variants.length > 0 && (
              <>
                <VariantSelector
                  variants={item.variants}
                  selectedVariantId={selectedVariant?.id || null}
                  onSelect={setSelectedVariant}
                  basePrice={item.basePrice}
                  displayType={item.variantDisplayType}
                />
                <Separator />
              </>
            )}

            {/* Modifier groups */}
            {item.modifierGroups.map((group, index) => (
              <div key={group.id}>
                <ModifierGroupSelector
                  group={group}
                  selectedModifierIds={selectedModifiers.get(group.id) || new Set()}
                  onToggle={(modifier) =>
                    handleModifierToggle(group.id, modifier, group.maxSelections)
                  }
                />
                {index < item.modifierGroups.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}

            {/* Special instructions */}
            <div className="space-y-2">
              <label className={cn(
                'font-semibold',
                isKiosk ? 'text-lg' : 'text-base'
              )}>
                {t('item.special_instructions', 'Special Instructions')}
              </label>
              <Input
                placeholder={t('item.special_instructions_placeholder', 'Add a note (allergies, preferences, etc.)')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className={isKiosk ? 'h-12 text-base' : ''}
              />
            </div>
          </div>
        </div>

        {/* Footer with quantity and add button */}
        <div className="border-t p-4 space-y-4 bg-background">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('item.quantity', 'Quantity')}</span>
            <QuantitySelector
              quantity={quantity}
              onChange={setQuantity}
              min={1}
              max={99}
            />
          </div>

          <Button
            size={isKiosk ? 'lg' : 'default'}
            className="w-full touch-target"
            disabled={!isValid}
            onClick={handleAddToCart}
          >
            {t('button.add_to_cart', 'Add to Cart')} - {formatCurrency(totalPrice)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
