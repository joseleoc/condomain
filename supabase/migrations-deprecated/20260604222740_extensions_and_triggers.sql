-- Habilitar extensión para generar UUIDs aleatorios v4 si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función reutilizable para actualizar el campo updated_at de manera automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';