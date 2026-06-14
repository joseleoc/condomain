insert into public.currencies (iso_code, name, symbol, minor_unit)
values 
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('VES', 'Bolívar Soberano', 'Bs.S', 2),
    ('COP', 'Colombian Peso', '$', 0),
	('MXN', 'Mexican Peso', '$', 2)
on conflict (iso_code) do update 
set name = excluded.name, symbol = excluded.symbol, minor_unit = excluded.minor_unit;


-- Poblado inicial de roles de negocio indispensables
insert into public.roles (name, description)
values 
    ('condominium_admin', 'Administrador principal del condominio con control total.'),
    ('admin_operator', 'Operador administrativo encargado de la carga de datos.'),
    ('resident_owner', 'Copropietario residente con acceso a su propia información.')
	('resident_tenant', 'Resident who rents a unit')
on conflict (name) do update set description = excluded.description;