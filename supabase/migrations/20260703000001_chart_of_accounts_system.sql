-- =========================================================================
-- Migration: Chart of Accounts System (Global Accounting Accounts)
-- Table: chart_of_accounts_system
-- Features: hierarchical tree, i18n support, system seed data, RLS
-- =========================================================================

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

create table if not exists public.chart_of_accounts_system (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references public.chart_of_accounts_system(id) on delete restrict,
    code varchar(50) not null unique,
    name varchar(100) not null,
    name_en varchar(100),
    type varchar(20) not null,
    description text,
    description_en text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint chart_of_accounts_system_type_valid check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
    constraint chart_of_accounts_system_code_not_empty check (char_length(trim(code)) > 0),
    constraint chart_of_accounts_system_name_not_empty check (char_length(trim(name)) > 0)
);

comment on table public.chart_of_accounts_system is 'Global chart of accounts shared by all condominiums. Immutable from condo side.';
comment on column public.chart_of_accounts_system.parent_id is 'Self-referential FK for hierarchical tree structure.';
comment on column public.chart_of_accounts_system.code is 'Unique accounting code (e.g., "5.1.01"). UNIQUE globally.';
comment on column public.chart_of_accounts_system.name is 'Account name in Spanish (default language).';
comment on column public.chart_of_accounts_system.name_en is 'Account name in English (optional).';
comment on column public.chart_of_accounts_system.type is 'Account type: asset, liability, equity, income, expense.';
comment on column public.chart_of_accounts_system.is_active is 'Allows deactivating accounts without deleting them.';


-- =========================================================================
-- 2. AUTOMATED TIMESTAMP TRIGGER
-- =========================================================================

create trigger trg_chart_of_accounts_system_updated_at
    before update on public.chart_of_accounts_system
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- 3. INDEXES
-- =========================================================================

create index if not exists idx_coas_parent_id
    on public.chart_of_accounts_system (parent_id)
    where parent_id is not null;

create index if not exists idx_coas_type
    on public.chart_of_accounts_system (type)
    where is_active = true;

create index if not exists idx_coas_is_active
    on public.chart_of_accounts_system (is_active)
    where is_active = true;


-- =========================================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================================

alter table public.chart_of_accounts_system enable row level security;

-- SELECT: All authenticated users can read (read-only)
drop policy if exists "Users can view system chart of accounts" on public.chart_of_accounts_system;
create policy "Users can view system chart of accounts" on public.chart_of_accounts_system
    for select
    to authenticated
    using (true);

-- SELECT: Anonymous users can also read (for public reports if needed)
drop policy if exists "Anon can view system chart of accounts" on public.chart_of_accounts_system;
create policy "Anon can view system chart of accounts" on public.chart_of_accounts_system
    for select
    to anon
    using (true);

-- NOTE: No INSERT/UPDATE/DELETE policies for authenticated/anon roles.
-- Only platform admins (service_role) can modify system accounts.


-- =========================================================================
-- 5. SEED DATA: 30 System Accounts
-- =========================================================================

-- Level 1: Main account types (5 accounts)
insert into public.chart_of_accounts_system (code, name, name_en, type, description, description_en)
values
    ('1', 'ACTIVOS', 'ASSETS', 'asset', 'Recursos propiedad del condominio', 'Resources owned by the condominium'),
    ('2', 'PASIVOS', 'LIABILITIES', 'liability', 'Obligaciones y deudas del condominio', 'Obligations and debts of the condominium'),
    ('3', 'PATRIMONIO', 'EQUITY', 'equity', 'Patrimonio neto del condominio', 'Net worth of the condominium'),
    ('4', 'INGRESOS', 'INCOME', 'income', 'Dinero recibido', 'Money received'),
    ('5', 'EGRESOS', 'EXPENSES', 'expense', 'Dinero gastado', 'Money spent')
on conflict (code) do nothing;

-- Level 2: Subcategories (11 accounts)
insert into public.chart_of_accounts_system (code, name, name_en, type, parent_id, description, description_en)
values
    -- 1. ACTIVOS
    ('1.1', 'Activo Corriente', 'Current Assets', 'asset',
        (select id from chart_of_accounts_system where code = '1'),
        'Recursos líquidos', 'Liquid resources'),
    ('1.2', 'Cuentas por Cobrar', 'Accounts Receivable', 'asset',
        (select id from chart_of_accounts_system where code = '1'),
        'Pagos pendientes de propietarios', 'Pending payments from owners'),

    -- 2. PASIVOS
    ('2.1', 'Pasivo Corriente', 'Current Liabilities', 'liability',
        (select id from chart_of_accounts_system where code = '2'),
        'Obligaciones a corto plazo', 'Short-term obligations'),

    -- 3. PATRIMONIO
    ('3.1', 'Capital del Condominio', 'Condominium Capital', 'equity',
        (select id from chart_of_accounts_system where code = '3'),
        'Patrimonio acumulado', 'Accumulated net worth'),

    -- 4. INGRESOS
    ('4.1', 'Ingresos Ordinarios', 'Ordinary Income', 'income',
        (select id from chart_of_accounts_system where code = '4'),
        'Ingresos regulares (alícuotas)', 'Regular income (fees)'),
    ('4.2', 'Ingresos Extraordinarios', 'Extraordinary Income', 'income',
        (select id from chart_of_accounts_system where code = '4'),
        'Ingresos especiales', 'Special income'),

    -- 5. EGRESOS
    ('5.1', 'Servicios Públicos', 'Public Services', 'expense',
        (select id from chart_of_accounts_system where code = '5'),
        'Servicios básicos', 'Basic utilities'),
    ('5.2', 'Mantenimiento', 'Maintenance', 'expense',
        (select id from chart_of_accounts_system where code = '5'),
        'Reparaciones y mantenimiento', 'Repairs and maintenance'),
    ('5.3', 'Administración', 'Administration', 'expense',
        (select id from chart_of_accounts_system where code = '5'),
        'Gastos administrativos', 'Administrative expenses'),
    ('5.4', 'Gastos Extraordinarios', 'Extraordinary Expenses', 'expense',
        (select id from chart_of_accounts_system where code = '5'),
        'Gastos especiales', 'Special expenses')
on conflict (code) do nothing;

-- Level 3: Specific accounts (14 accounts)
insert into public.chart_of_accounts_system (code, name, name_en, type, parent_id, description, description_en)
values
    -- 1.1 Activo Corriente
    ('1.1.01', 'Caja Chica', 'Petty Cash', 'asset',
        (select id from chart_of_accounts_system where code = '1.1'),
        'Efectivo en oficina', 'Cash on hand'),
    ('1.1.02', 'Banco', 'Bank Account', 'asset',
        (select id from chart_of_accounts_system where code = '1.1'),
        'Cuenta bancaria principal', 'Main bank account'),

    -- 2.1 Pasivo Corriente
    ('2.1.01', 'Fondo de Reserva', 'Reserve Fund', 'liability',
        (select id from chart_of_accounts_system where code = '2.1'),
        'Fondo obligatorio por ley', 'Mandatory reserve fund by law'),
    ('2.1.02', 'Fondo de Prestaciones Sociales', 'Social Benefits Fund', 'liability',
        (select id from chart_of_accounts_system where code = '2.1'),
        'Obligaciones con empleados', 'Employee obligations'),
    ('2.1.03', 'Cuotas Cobradas por Adelantado', 'Fees Collected in Advance', 'liability',
        (select id from chart_of_accounts_system where code = '2.1'),
        'Ingresos no devengados', 'Unearned income'),

    -- 4.1 Ingresos Ordinarios
    ('4.1.01', 'Alícuotas de Condominio', 'Condominium Fees', 'income',
        (select id from chart_of_accounts_system where code = '4.1'),
        'Cuotas de mantenimiento mensual', 'Monthly maintenance fees'),
    ('4.1.02', 'Fondo de Reserva (Aportes)', 'Reserve Fund Contributions', 'income',
        (select id from chart_of_accounts_system where code = '4.1'),
        'Aportes al fondo de reserva', 'Reserve fund contributions'),
    ('4.1.03', 'Multas y Recargos', 'Fines and Late Fees', 'income',
        (select id from chart_of_accounts_system where code = '4.1'),
        'Penalizaciones por pago tardío', 'Late payment penalties'),

    -- 4.2 Ingresos Extraordinarios
    ('4.2.01', 'Cuotas Extraordinarias', 'Extraordinary Fees', 'income',
        (select id from chart_of_accounts_system where code = '4.2'),
        'Cobros especiales únicos', 'One-time special assessments'),
    ('4.2.02', 'Alquiler de Áreas Comunes', 'Common Area Rentals', 'income',
        (select id from chart_of_accounts_system where code = '4.2'),
        'Ingresos por alquiler de amenidades', 'Income from renting amenities'),

    -- 5.1 Servicios Públicos
    ('5.1.01', 'Electricidad', 'Electricity', 'expense',
        (select id from chart_of_accounts_system where code = '5.1'),
        'Facturas de electricidad', 'Electricity bills'),
    ('5.1.02', 'Agua', 'Water', 'expense',
        (select id from chart_of_accounts_system where code = '5.1'),
        'Facturas de agua', 'Water bills'),
    ('5.1.03', 'Gas', 'Gas', 'expense',
        (select id from chart_of_accounts_system where code = '5.1'),
        'Facturas de gas', 'Gas bills'),

    -- 5.2 Mantenimiento
    ('5.2.01', 'Ascensores', 'Elevators', 'expense',
        (select id from chart_of_accounts_system where code = '5.2'),
        'Mantenimiento de ascensores', 'Elevator maintenance')
on conflict (code) do nothing;


-- =========================================================================
-- 6. GRANTS
-- =========================================================================

grant select on public.chart_of_accounts_system to authenticated;
grant select on public.chart_of_accounts_system to anon;
grant all on public.chart_of_accounts_system to service_role;
