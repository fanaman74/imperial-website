alter table imperial_orders
  add column if not exists payment_method text not null default 'cash',
  add column if not exists stripe_payment_intent_id text;
