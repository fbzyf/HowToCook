export const CATEGORIES = {
  vegetable_dish: { slug: 'vegetable_dish', title: '素菜', icon: '🥬' },
  meat_dish: { slug: 'meat_dish', title: '荤菜', icon: '🍖' },
  aquatic: { slug: 'aquatic', title: '水产', icon: '🐟' },
  breakfast: { slug: 'breakfast', title: '早餐', icon: '🌅' },
  staple: { slug: 'staple', title: '主食', icon: '🍚' },
  'semi-finished': { slug: 'semi-finished', title: '半成品加工', icon: '📦' },
  soup: { slug: 'soup', title: '汤与粥', icon: '🍲' },
  drink: { slug: 'drink', title: '饮料', icon: '🥤' },
  condiment: { slug: 'condiment', title: '酱料和其它材料', icon: '🧂' },
  dessert: { slug: 'dessert', title: '甜品', icon: '🍰' },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export function getCategoryFromPath(filePath: string): CategorySlug | null {
  for (const slug of Object.keys(CATEGORIES) as CategorySlug[]) {
    if (filePath.includes(`/${slug}/`) || filePath.includes(`\\${slug}\\`)) {
      return slug;
    }
  }
  return null;
}

export function getCategoryTitle(slug: CategorySlug): string {
  return CATEGORIES[slug].title;
}
