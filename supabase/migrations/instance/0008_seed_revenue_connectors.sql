-- Phase 5A — Revenue connector config on registry projects

update ai_company.project_connector_configs c
set config = coalesce(c.config, '{}'::jsonb) || '{"revenueSource":"foodtruck-supabase-events","reportingDays":30,"currency":"ILS","avgTransactionValue":329,"monthlySubscriptionFee":199}'::jsonb
from ai_company.project_definitions p
where c.project_id = p.id and p.slug = 'foodtruck-il';

update ai_company.project_connector_configs c
set config = coalesce(c.config, '{}'::jsonb) || '{"revenueSource":"mock-revenue","reportingDays":30,"currency":"USD","totalRevenue":4200,"recurringRevenue":2800,"transactionCount":14}'::jsonb
from ai_company.project_definitions p
where c.project_id = p.id and p.slug = 'lab-os';

update ai_company.project_connector_configs c
set config = coalesce(c.config, '{}'::jsonb) || '{"revenueSource":"mock-revenue","reportingDays":30,"currency":"USD","totalRevenue":1850,"recurringRevenue":1200,"transactionCount":6}'::jsonb
from ai_company.project_definitions p
where c.project_id = p.id and p.slug = 'inventory-engine';

update ai_company.project_connector_configs c
set config = coalesce(c.config, '{}'::jsonb) || '{"revenueSource":"mock-revenue","reportingDays":30,"currency":"ILS","totalRevenue":0,"recurringRevenue":0,"transactionCount":0}'::jsonb
from ai_company.project_definitions p
where c.project_id = p.id and p.slug = 'burgerstop';
