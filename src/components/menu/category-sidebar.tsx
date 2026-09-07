'use client';

import { resolveImageUrl } from '@/lib/image-url';
import { cn } from '@/lib/utils';
import { useCatalogTranslation, useTranslation } from '@/stores/translation-store';
import type { Category } from '@/types';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySidebarProps) {
  const { ct } = useCatalogTranslation();
  const { t } = useTranslation();

  return (
    <aside className="w-48 lg:w-56 bg-background border-r flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">{t('ui.menu.title', 'Menu')}</h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map((category) => {
          const isSelected = category.id === selectedCategoryId;
          const categoryName = ct(category.translations, 'name', category.name);

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                'w-full flex flex-col items-center p-3 rounded-xl transition-all duration-200',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isSelected && 'bg-primary/10 ring-2 ring-primary'
              )}
              aria-selected={isSelected}
              role="tab"
            >
              {/* Category Image */}
              <div
                className={cn(
                  'w-20 h-20 lg:w-24 lg:h-24 rounded-xl overflow-hidden mb-2 transition-transform',
                  isSelected && 'scale-105'
                )}
              >
                {category.imageUrl ? (
                  <img
                    src={resolveImageUrl(category.imageUrl)}
                    alt={categoryName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {categoryName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Category Name */}
              <span
                className={cn(
                  'text-sm font-medium text-center line-clamp-2',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {categoryName}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
