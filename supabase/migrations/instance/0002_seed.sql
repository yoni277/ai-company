-- Optional seed for the four Phase 1 mock projects. Idempotent.

insert into projects (slug, name, description, status) values
  ('foodtruck-il',     'FoodTruck-IL',              'Israeli food truck operations platform.',           'healthy'),
  ('lab-os',           'Lab-OS',                    'Laboratory operating system.',                       'at_risk'),
  ('inventory-engine', 'Inventory Management Engine','Generic inventory engine across business lines.',   'healthy'),
  ('whatsapp-engine',  'WhatsApp Platform',         'Customer messaging and automation over WhatsApp.',   'healthy')
on conflict (slug) do nothing;
