alter table imperial_orders
  add constraint imperial_orders_stripe_payment_intent_id_unique
  unique (stripe_payment_intent_id);
