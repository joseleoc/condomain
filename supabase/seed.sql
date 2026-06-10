INSERT INTO public.currencies (iso_code, name, symbol) VALUES
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€'),
('VES', 'Bolívar Venezolano', 'Bs'),
('COP', 'Peso Colombiano', '$'),
('MXN', 'Peso Mexicano', '$');


insert into public.roles (name, description)
values
	('condominium_admin', 'Global condominium administrator'),
	('admin_operator', 'Operational administrator for a condominium'),
	('resident_owner', 'Resident who owns a unit'),
	('resident_tenant', 'Resident who rents a unit')
on conflict (name) do update
set
	description = excluded.description,
	updated_at = now();