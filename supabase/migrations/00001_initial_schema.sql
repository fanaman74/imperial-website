-- ═══════════════════════════════════════════════════════════════════
-- Restaurant Imperial — Complete Database Schema
-- Creates all tables, RLS policies, indexes, and seed data
-- ═══════════════════════════════════════════════════════════════════

-- ─── Categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ─── Category Translations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_category_translations (
  category_id  BIGINT NOT NULL REFERENCES imperial_categories(id) ON DELETE CASCADE,
  locale       TEXT   NOT NULL CHECK (locale IN ('fr', 'nl', 'en')),
  name         TEXT   NOT NULL DEFAULT '',
  PRIMARY KEY (category_id, locale)
);

-- ─── Menu Items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id     BIGINT NOT NULL REFERENCES imperial_categories(id) ON DELETE CASCADE,
  num             TEXT,
  price_restaurant NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_takeaway   NUMERIC(10,2),
  active          BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  featured_image  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ─── Item Translations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_item_translations (
  item_id     BIGINT NOT NULL REFERENCES imperial_items(id) ON DELETE CASCADE,
  locale      TEXT   NOT NULL CHECK (locale IN ('fr', 'nl', 'en')),
  name        TEXT   NOT NULL DEFAULT '',
  description TEXT   NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, locale)
);

-- ─── Reservations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_reservations (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guests           INTEGER NOT NULL,
  date             TEXT NOT NULL,
  time             TEXT NOT NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL,
  phone            TEXT,
  special_requests TEXT,
  locale           TEXT NOT NULL DEFAULT 'fr',
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Orders (Takeaway) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_orders (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Event Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_event_requests (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  event_type  TEXT NOT NULL,
  event_date  TEXT,
  guests      INTEGER,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── OTP Codes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_otps (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL,
  code_hash  TEXT,
  attempts   INTEGER NOT NULL DEFAULT 0,
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Admin Sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imperial_admin_sessions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_imperial_items_category_active_sort
  ON imperial_items (category_id, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_imperial_item_translations_item_locale
  ON imperial_item_translations (item_id, locale);

CREATE INDEX IF NOT EXISTS idx_imperial_category_translations_cat_locale
  ON imperial_category_translations (category_id, locale);

CREATE INDEX IF NOT EXISTS idx_imperial_otps_email_used_created
  ON imperial_otps (email, used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imperial_admin_sessions_token_hash
  ON imperial_admin_sessions (token_hash);

CREATE INDEX IF NOT EXISTS idx_imperial_reservations_created
  ON imperial_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imperial_orders_created
  ON imperial_orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imperial_event_requests_created
  ON imperial_event_requests (created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE imperial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperial_admin_sessions ENABLE ROW LEVEL SECURITY;

-- Public can read active menu data
CREATE POLICY "Public can read categories" ON imperial_categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read category translations" ON imperial_category_translations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read active items" ON imperial_items
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Public can read item translations" ON imperial_item_translations
  FOR SELECT TO anon USING (true);

-- Public can create reservations, orders, event requests, OTPs
CREATE POLICY "Public can create reservations" ON imperial_reservations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can create orders" ON imperial_orders
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can create event requests" ON imperial_event_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can create OTPs" ON imperial_otps
  FOR INSERT TO anon WITH CHECK (true);

-- Public can update OTPs (needed for marking used + incrementing attempts)
CREATE POLICY "Public can update OTPs" ON imperial_otps
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Public can read OTPs (needed for verify flow)
CREATE POLICY "Public can read OTPs" ON imperial_otps
  FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- Seed Data — Categories
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO imperial_categories (sort_order) VALUES
  (1),  -- Entrées
  (2),  -- Dim Sum
  (3),  -- Canard
  (4),  -- Plats Thaï
  (5),  -- Wok
  (6),  -- Ti-Pan
  (7),  -- Riz & Nouilles
  (8),  -- Desserts
  (9)   -- Boissons
ON CONFLICT DO NOTHING;

-- Category translations (FR / NL / EN)
INSERT INTO imperial_category_translations (category_id, locale, name) VALUES
  -- Entrées
  (1, 'fr', 'Entrées'),        (1, 'nl', 'Voorgerechten'),     (1, 'en', 'Starters'),
  -- Dim Sum
  (2, 'fr', 'Dim Sum'),        (2, 'nl', 'Dim Sum'),           (2, 'en', 'Dim Sum'),
  -- Canard
  (3, 'fr', 'Canard'),         (3, 'nl', 'Eend'),              (3, 'en', 'Duck'),
  -- Plats Thaï
  (4, 'fr', 'Plats Thaï'),     (4, 'nl', 'Thaise Gerechten'),   (4, 'en', 'Thai Dishes'),
  -- Wok
  (5, 'fr', 'Wok'),            (5, 'nl', 'Wok'),               (5, 'en', 'Wok'),
  -- Ti-Pan
  (6, 'fr', 'Ti-Pan'),         (6, 'nl', 'Ti-Pan'),            (6, 'en', 'Ti-Pan'),
  -- Riz & Nouilles
  (7, 'fr', 'Riz & Nouilles'), (7, 'nl', 'Rijst & Noedels'),    (7, 'en', 'Rice & Noodles'),
  -- Desserts
  (8, 'fr', 'Desserts'),       (8, 'nl', 'Desserts'),          (8, 'en', 'Desserts'),
  -- Boissons
  (9, 'fr', 'Boissons'),       (9, 'nl', 'Dranken'),           (9, 'en', 'Beverages')
ON CONFLICT (category_id, locale) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Seed Data — Sample Menu Items
-- ═══════════════════════════════════════════════════════════════════

-- Entrées
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (1, '1', 6.50, 6.50, true, false, 1),
  (1, '2', 7.00, 7.00, true, false, 2),
  (1, '3', 8.50, 8.50, true, false, 3);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (1, 'fr', 'Rouleaux de printemps', '2 pièces — crevettes, menthe, vermicelles'),
  (1, 'nl', 'Loempia', '2 stuks — garnalen, munt, glasmie'),
  (1, 'en', 'Spring Rolls', '2 pieces — shrimp, mint, vermicelli'),
  (2, 'fr', 'Raviolis frits', '6 pièces — porc et crevettes'),
  (2, 'nl', 'Gebakken dumplings', '6 stuks — varken en garnalen'),
  (2, 'en', 'Fried Dumplings', '6 pieces — pork and shrimp'),
  (3, 'fr', 'Soupe wonton', 'Raviolis chinois, bouillon parfumé'),
  (3, 'nl', 'Wontonsoep', 'Chinese dumplings, geurige bouillon'),
  (3, 'en', 'Wonton Soup', 'Chinese dumplings, fragrant broth');

-- Dim Sum
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (2, '10', 9.00, 9.00, true, true, 1),
  (2, '11', 8.50, 8.50, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (4, 'fr', 'Dim Sum assortis', 'Sélection du chef — vapeur'),
  (4, 'nl', 'Gemengde Dim Sum', 'Selectie van de chef — gestoomd'),
  (4, 'en', 'Assorted Dim Sum', 'Chef selection — steamed'),
  (5, 'fr', 'Baozi porc', 'Brioches vapeur au porc'),
  (5, 'nl', 'Baozi varken', 'Gestoomde broodjes met varken'),
  (5, 'en', 'Pork Baozi', 'Steamed pork buns');

-- Canard
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (3, '20', 18.50, 18.50, true, true, 1),
  (3, '21', 16.00, 16.00, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (6, 'fr', 'Canard laqué de Pékin', 'Demi-canard, sauce hoisin, crêpes'),
  (6, 'nl', 'Pekingeend', 'Halve eend, hoisinsaus, pannenkoekjes'),
  (6, 'en', 'Peking Duck', 'Half duck, hoisin sauce, pancakes'),
  (7, 'fr', 'Canard au curry rouge', 'Curry thaï, lait de coco, légumes'),
  (7, 'nl', 'Eend rode curry', 'Thaise curry, kokosmelk, groenten'),
  (7, 'en', 'Red Curry Duck', 'Thai curry, coconut milk, vegetables');

-- Plats Thaï
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (4, '30', 14.50, 14.50, true, false, 1),
  (4, '31', 13.50, 13.50, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (8, 'fr', 'Pad Thaï', 'Nouilles de riz, crevettes, cacahuètes'),
  (8, 'nl', 'Pad Thai', 'Rijstnoedels, garnalen, pinda'),
  (8, 'en', 'Pad Thai', 'Rice noodles, shrimp, peanuts'),
  (9, 'fr', 'Tom Kha Kai', 'Soupe au lait de coco et poulet'),
  (9, 'nl', 'Tom Kha Kai', 'Kokossoep met kip'),
  (9, 'en', 'Tom Kha Kai', 'Coconut soup with chicken');

-- Wok
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (5, '40', 15.00, 15.00, true, false, 1),
  (5, '41', 16.50, 16.50, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (10, 'fr', 'Crevettes sautées au gingembre', 'Gingembre, oignons nouveaux, sauce soja'),
  (10, 'nl', 'Garnalen met gember', 'Gember, lente-ui, sojasaus'),
  (10, 'en', 'Ginger Shrimp Stir-fry', 'Ginger, spring onion, soy sauce'),
  (11, 'fr', 'Bœuf au poivre noir', 'Wok, oignons, sauce au poivre'),
  (11, 'nl', 'Zwarte peper rundvlees', 'Wok, ui, pepersaus'),
  (11, 'en', 'Black Pepper Beef', 'Wok, onion, pepper sauce');

-- Ti-Pan
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (6, '50', 22.00, 22.00, true, true, 1);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (12, 'fr', 'Ti-Pan Impérial', 'Plateau pour 2 personnes — assortiment varié'),
  (12, 'nl', 'Ti-Pan Imperial', 'Schaal voor 2 personen — gevarieerde selectie'),
  (12, 'en', 'Imperial Ti-Pan', 'Platter for 2 people — assorted selection');

-- Riz & Nouilles
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (7, '60', 4.50, 4.50, true, false, 1),
  (7, '61', 12.00, 12.00, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (13, 'fr', 'Riz nature', 'Riz blanc vapeur'),
  (13, 'nl', 'Witte rijst', 'Gestoomde witte rijst'),
  (13, 'en', 'Steamed Rice', 'White steamed rice'),
  (14, 'fr', 'Nouilles sautées', 'Au choix: poulet, bœuf ou crevettes'),
  (14, 'nl', 'Gebakken noedels', 'Naar keuze: kip, rund of garnalen'),
  (14, 'en', 'Fried Noodles', 'Choice of: chicken, beef or shrimp');

-- Desserts
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (8, '70', 5.50, 5.50, true, false, 1);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (15, 'fr', 'Beignets de banane', 'Banane, miel, glace vanille'),
  (15, 'nl', 'Bananenfritters', 'Banaan, honing, vanille-ijs'),
  (15, 'en', 'Banana Fritters', 'Banana, honey, vanilla ice cream');

-- Boissons
INSERT INTO imperial_items (category_id, num, price_restaurant, price_takeaway, active, is_featured, sort_order) VALUES
  (9, '80', 2.50, 2.50, true, false, 1),
  (9, '81', 3.00, 3.00, true, false, 2);

INSERT INTO imperial_item_translations (item_id, locale, name, description) VALUES
  (16, 'fr', 'Thé jasmin', 'Thé chinois au jasmin'),
  (16, 'nl', 'Jasmijnthee', 'Chinese jasmijnthee'),
  (16, 'en', 'Jasmine Tea', 'Chinese jasmine tea'),
  (17, 'fr', 'Bière Tsingtao', 'Bière chinoise 33cl'),
  (17, 'nl', 'Tsingtao bier', 'Chinees bier 33cl'),
  (17, 'en', 'Tsingtao Beer', 'Chinese beer 33cl');

-- Update featured_image for featured items
UPDATE imperial_items SET featured_image = 'https://images.pexels.com/photos/8400055/pexels-photo-8400055.jpeg?auto=compress&cs=tinysrgb&w=600'
  WHERE id = 4; -- Dim Sum assortis

UPDATE imperial_items SET featured_image = 'https://images.pexels.com/photos/2284166/pexels-photo-2284166.jpeg?auto=compress&cs=tinysrgb&w=600'
  WHERE id = 6; -- Canard laqué

UPDATE imperial_items SET featured_image = 'https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg?auto=compress&cs=tinysrgb&w=600'
  WHERE id = 12; -- Ti-Pan Impérial
