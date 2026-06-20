/**
 * Shared menu types used across client and server.
 * Eliminates the type drift that existed when each file defined its own.
 */

export interface MenuItem {
  id: string;
  num: string;
  name: string;
  description: string;
  priceRestaurant: number;
  priceTakeaway: number | null;
}

export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
}

export interface CartItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  quantity: number;
}

/** Admin menu item with translations and full DB fields */
export interface AdminMenuItem {
  id: string;
  category_id: string;
  num: string | null;
  price_restaurant: number;
  price_takeaway: number | null;
  active: boolean;
  is_featured: boolean;
  featured_image: string | null;
  sort_order: number;
  translations: Record<string, { name: string; description: string }>;
}

export interface AdminCategory {
  id: string;
  sort_order: number;
  translations: Record<string, string>;
}
