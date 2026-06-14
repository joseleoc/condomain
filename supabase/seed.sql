insert into public.currencies (iso_code, name, symbol, minor_unit)
values 
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('VES', 'Bolívar Soberano', 'Bs.S', 2),
    ('COP', 'Colombian Peso', '$', 0),
	('MXN', 'Mexican Peso', '$', 2)
on conflict (iso_code) do update 
set name = excluded.name, symbol = excluded.symbol, minor_unit = excluded.minor_unit;
