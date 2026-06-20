import { z } from 'zod';

export const LOCALES = ['fr', 'nl', 'en'] as const;
export const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'] as const;
export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export const EVENT_REQUEST_STATUSES = ['pending', 'contacted', 'confirmed', 'declined'] as const;
export const EVENT_TYPES = ['birthday', 'corporate', 'wedding', 'family', 'catering', 'other'] as const;

export const emailSchema = z.string()
  .transform(s => s.trim().toLowerCase())
  .pipe(z.string().email().max(254));

export const otpSendSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
});

export const cartItemSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).max(9999),
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(30).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
  total: z.number().min(0).max(99999),
  locale: z.enum(LOCALES).optional(),
});

export const reservationSchema = z.object({
  guests: z.number().int().min(1).max(50),
  date: z.string().max(20),
  time: z.string().max(10),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  specialRequests: z.string().max(2000).optional(),
  locale: z.enum(LOCALES).optional(),
  code: z.string().length(6),
});

export const eventContactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  event_type: z.enum(EVENT_TYPES),
  event_date: z.string().max(20).optional(),
  guests: z.union([z.number().int().min(1).max(500), z.string()]).optional(),
  message: z.string().max(5000).optional(),
  code: z.string().length(6),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const statusUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string().min(1).max(50),
});

export const menuItemTranslationSchema = z.object({
  name: z.string().max(200).optional().default(''),
  description: z.string().max(2000).optional().default(''),
});

export const menuItemSchema = z.object({
  category_id: z.union([z.string(), z.number()]),
  num: z.union([z.string(), z.number()]).nullable().optional(),
  price_restaurant: z.union([z.number(), z.string()]).optional(),
  price_takeaway: z.union([z.number(), z.string()]).nullable().optional(),
  active: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  featured_image: z.string().url().max(1000).nullable().optional(),
  sort_order: z.union([z.number(), z.string()]).optional().default(0),
  translations: z.record(z.enum(LOCALES), menuItemTranslationSchema).optional(),
});
