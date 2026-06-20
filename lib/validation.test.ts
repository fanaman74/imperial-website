import { describe, it, expect } from 'vitest';
import {
  otpSendSchema,
  otpVerifySchema,
  reservationSchema,
  eventContactSchema,
  adminLoginSchema,
  statusUpdateSchema,
  menuItemSchema,
  emailSchema,
  LOCALES,
  RESERVATION_STATUSES,
  ORDER_STATUSES,
  EVENT_REQUEST_STATUSES,
  EVENT_TYPES,
  authenticatedOrderSchema,
  authenticatedReservationSchema,
} from './validation';

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('test+tag@restaurant.be').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(emailSchema.safeParse('a@').success).toBe(false);
  });

  it('trims and lowercases', () => {
    const result = emailSchema.safeParse('  User@Example.COM  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('user@example.com');
  });

  it('rejects emails over 254 chars', () => {
    expect(emailSchema.safeParse('a'.repeat(250) + '@x.co').success).toBe(false);
  });
});

describe('otpSendSchema', () => {
  it('accepts email with optional name', () => {
    expect(otpSendSchema.safeParse({ email: 'user@test.com' }).success).toBe(true);
    expect(otpSendSchema.safeParse({ email: 'user@test.com', name: 'Jean' }).success).toBe(true);
  });

  it('rejects missing email', () => {
    expect(otpSendSchema.safeParse({ name: 'Jean' }).success).toBe(false);
  });
});

describe('otpVerifySchema', () => {
  const validItems = [{ id: '1', name: 'Noodles', quantity: 2, price: 12.5 }];

  it('accepts valid order', () => {
    expect(otpVerifySchema.safeParse({
      email: 'user@test.com',
      code: '123456',
      items: validItems,
      total: 25,
    }).success).toBe(true);
  });

  it('rejects code with wrong length', () => {
    expect(otpVerifySchema.safeParse({
      email: 'user@test.com',
      code: '12345',
      items: validItems,
      total: 25,
    }).success).toBe(false);
  });

  it('rejects empty items array', () => {
    expect(otpVerifySchema.safeParse({
      email: 'user@test.com',
      code: '123456',
      items: [],
      total: 0,
    }).success).toBe(false);
  });

  it('rejects negative total', () => {
    expect(otpVerifySchema.safeParse({
      email: 'user@test.com',
      code: '123456',
      items: validItems,
      total: -5,
    }).success).toBe(false);
  });

  it('rejects quantity > 99', () => {
    expect(otpVerifySchema.safeParse({
      email: 'user@test.com',
      code: '123456',
      items: [{ ...validItems[0], quantity: 100 }],
      total: 25,
    }).success).toBe(false);
  });
});

describe('reservationSchema', () => {
  const valid = {
    guests: 4,
    date: '2026-07-15',
    time: '19:00',
    firstName: 'Jean',
    email: 'jean@test.com',
    code: '123456',
  };

  it('accepts valid reservation', () => {
    expect(reservationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects guests > 50', () => {
    expect(reservationSchema.safeParse({ ...valid, guests: 51 }).success).toBe(false);
  });

  it('rejects guests < 1', () => {
    expect(reservationSchema.safeParse({ ...valid, guests: 0 }).success).toBe(false);
  });

  it('rejects invalid locale', () => {
    expect(reservationSchema.safeParse({ ...valid, locale: 'de' }).success).toBe(false);
  });

  it('accepts valid locale', () => {
    expect(reservationSchema.safeParse({ ...valid, locale: 'nl' }).success).toBe(true);
  });
});

describe('eventContactSchema', () => {
  const valid = {
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'jean@test.com',
    event_type: 'birthday',
    code: '123456',
  };

  it('accepts valid event request', () => {
    expect(eventContactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid event_type', () => {
    expect(eventContactSchema.safeParse({ ...valid, event_type: 'party' }).success).toBe(false);
  });

  it('accepts guests as number or string', () => {
    expect(eventContactSchema.safeParse({ ...valid, guests: 20 }).success).toBe(true);
    expect(eventContactSchema.safeParse({ ...valid, guests: '20' }).success).toBe(true);
  });
});

describe('adminLoginSchema', () => {
  it('requires password', () => {
    expect(adminLoginSchema.safeParse({ password: 'secret' }).success).toBe(true);
    expect(adminLoginSchema.safeParse({ password: '' }).success).toBe(false);
    expect(adminLoginSchema.safeParse({}).success).toBe(false);
  });
});

describe('statusUpdateSchema', () => {
  it('accepts valid status update', () => {
    expect(statusUpdateSchema.safeParse({ id: 1, status: 'confirmed' }).success).toBe(true);
    expect(statusUpdateSchema.safeParse({ id: 'abc', status: 'pending' }).success).toBe(true);
  });

  it('rejects empty status', () => {
    expect(statusUpdateSchema.safeParse({ id: 1, status: '' }).success).toBe(false);
  });
});

describe('menuItemSchema', () => {
  it('accepts valid menu item', () => {
    expect(menuItemSchema.safeParse({
      category_id: 1,
      price_restaurant: 15.5,
      active: true,
    }).success).toBe(true);
  });

  it('accepts nullable fields', () => {
    expect(menuItemSchema.safeParse({
      category_id: 1,
      num: null,
      price_takeaway: null,
      featured_image: null,
    }).success).toBe(true);
  });
});

describe('authenticatedOrderSchema', () => {
  it('accepts valid order without code', () => {
    const result = authenticatedOrderSchema.safeParse({
      customerName: 'Alice',
      items: [{ id: 'a', name: 'Spring Rolls', quantity: 2, price: 7.5 }],
      total: 15,
    });
    expect(result.success).toBe(true);
  });
  it('rejects empty items', () => {
    const result = authenticatedOrderSchema.safeParse({
      customerName: 'Alice',
      items: [],
      total: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('authenticatedReservationSchema', () => {
  it('accepts valid reservation without code', () => {
    const result = authenticatedReservationSchema.safeParse({
      guests: 2,
      date: '2026-07-01',
      time: '19:00',
      firstName: 'Alice',
      email: 'alice@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('constants', () => {
  it('LOCALES contains fr, nl, en', () => {
    expect(LOCALES).toEqual(['fr', 'nl', 'en']);
  });

  it('status arrays are non-empty', () => {
    expect(RESERVATION_STATUSES.length).toBeGreaterThan(0);
    expect(ORDER_STATUSES.length).toBeGreaterThan(0);
    expect(EVENT_REQUEST_STATUSES.length).toBeGreaterThan(0);
    expect(EVENT_TYPES.length).toBeGreaterThan(0);
  });
});
