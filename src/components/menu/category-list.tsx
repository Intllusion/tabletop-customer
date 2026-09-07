'use client';

import { resolveImageUrl } from '@/lib/image-url';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsKioskMode } from '@/hooks';
import type { Category } from '@/types';

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryListProps) {
  const isKiosk = useIsKioskMode();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected category into view
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedCategoryId]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-16 z-40 bg-background border-b"
    >
      <ScrollArea className="w-full whitespace-nowrap">
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Menu categories"
          className={cn(
            'flex gap-2 p-4',
            isKiosk ? 'gap-3' : 'gap-2'
          )}
        >
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <Button
                key={category.id}
                ref={isSelected ? selectedRef : null}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`category-panel-${category.id}`}
                variant={isSelected ? 'default' : 'outline'}
                size={isKiosk ? 'lg' : 'default'}
                className={cn(
                  'flex-shrink-0 touch-target',
                  isKiosk && 'text-base px-6'
                )}
                onClick={() => onSelectCategory(category.id)}
              >
                {category.imageUrl && (
                  <img
                    src={resolveImageUrl(category.imageUrl)}
                    alt=""
                    aria-hidden="true"
                    className="w-5 h-5 rounded object-cover mr-2"
                  />
                )}
                {category.name}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </nav>
  );
}
