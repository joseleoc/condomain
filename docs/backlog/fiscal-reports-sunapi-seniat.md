# Requerimiento Futuro: Reportes Fiscales y Legales (SUNAPI / SENIAT)

**Estado**: 🚫 FUERA DE SCOPE — Feature de Transacciones Financieras (MVP)  
**Prioridad**: Alta (obligación legal)  
**Fecha de identificación**: 26 de junio de 2026  
**Relacionado con**: [Financial Transactions Feature](../proposals/financial-transactions-feature.md)

---

## Contexto Legal

En Venezuela, los condominios tienen obligaciones fiscales y legales específicas ante dos organismos:

### SUNAPI (Superintendencia de la Propiedad Horizontal)

- Los condominios deben registrar sus estatutos
- Deben presentar estados financieros anuales
- Deben mantener libros contables oficiales:
  - Libro Diario
  - Libro Mayor
  - Balance de Comprobación

### SENIAT (Servicio Nacional Integrado de Administración Aduanera y Tributaria)

- Los condominios deben emitir facturas por las alícuotas cobradas
- Deben llevar libros de ventas (aunque estén exentos de IVA)
- Deben presentar declaraciones informativas anuales

---

## Descripción del Requerimiento

Implementar generación automática de reportes oficiales que permita:

1. **Libros contables oficiales** en formatos estándar
2. **Estados financieros completos** (Balance General, Estado de Resultados)
3. **Formatos específicos SUNAPI** para presentación anual
4. **Formatos específicos SENIAT** (libro de ventas, declaraciones)
5. **Exportación** en múltiples formatos (Excel, PDF)

---

## Alternativas Consideradas

### Opción A: Sin reportes fiscales (solo contabilidad interna)
- ✅ Simple de implementar
- ❌ Administrador sigue preparando reportes manualmente
- ❌ No cumple completamente con obligaciones legales

### Opción B: Reportes básicos (formatos estándar) ⭐ RECOMENDADO
- ✅ Cumple con requisitos contables básicos (Libro Diario, Mayor, Balance)
- ✅ Formatos estándar para todos los condominios
- ✅ Exportación a Excel/PDF
- ❌ No incluye formatos específicos SUNAPI/SENIAT

### Opción C: Reportes completos (formatos oficiales)
- ✅ Cumplimiento legal completo
- ✅ Generación automática de todos los formatos
- ✅ Diferenciador competitivo
- ❌ Implementación compleja (múltiples formatos)
- ❌ Los formatos pueden cambiar (mantenimiento continuo)

### Opción D: Reportes configurables (plantillas personalizables)
- ✅ Flexibilidad para diferentes necesidades
- ✅ Administrador adapta formatos
- ❌ Implementación más compleja (sistema de plantillas)
- ❌ Posible inconsistencia entre condominios

### Opción E: Diferida (post-MVP) ⭐ DECISIÓN ACTUAL
- ✅ MVP más rápido y simple
- ✅ Aprendes del uso real antes de invertir
- ❌ Administradores siguen con trabajo manual

---

## Decisión Actual

**Opción E (Diferida)** — Fuera de scope del MVP actual.

**Justificación**:
1. **MVP primero**: El MVP se enfoca en registro de transacciones y trazabilidad contable.
2. **Base de datos primero**: Una vez que los datos están estructurados correctamente, generar reportes es más fácil.
3. **Formatos cambiantes**: Los formatos SUNAPI/SENIAT pueden cambiar. Es mejor entenderlos después de tener usuarios reales.
4. **Solución temporal viable**: Administradores pueden exportar datos a Excel y preparar reportes manualmente.

---

## Reportes a Implementar (Futuro)

### Libros Contables Obligatorios

#### Libro Diario
- Listado cronológico de todas las transacciones
- Cada asiento muestra: fecha, descripción, cuentas afectadas, débitos, créditos
- Filtros por rango de fechas, tipo de transacción, estado

#### Libro Mayor
- Movimientos de cada cuenta contable individual
- Saldo inicial, movimientos del período, saldo final
- Drill-down desde Balance de Comprobación

#### Balance de Comprobación
- Listado de todas las cuentas con saldos débitos y créditos
- Validación: suma(débitos) = suma(créditos)
- Filtros por período, tipo de cuenta

### Estados Financieros

#### Balance General (Estado de Situación Financiera)
- Activos, Pasivos, Patrimonio
- Comparativo período actual vs anterior
- Gráficos de composición

#### Estado de Resultados (Pérdidas y Ganancias)
- Ingresos, Egresos, Resultado del período
- Desglose por categoría contable
- Comparativo vs presupuesto (si aplica)

### Formatos Específicos

#### SUNAPI
- Formato de estados financieros para presentación anual
- Datos del condominio (estatutos, junta directiva)
- Firmas requeridas (administrador, contador, fiscal)

#### SENIAT
- Libro de ventas (aunque exento de IVA)
- Formato de declaración informativa anual
- Resumen de ingresos por período

---

## Criterios de Aceptación (Futuros)

### Reportes Básicos (Opción B recomendada como primer paso)
- [ ] Generación de Libro Diario con filtros de fecha
- [ ] Generación de Libro Mayor por cuenta
- [ ] Generación de Balance de Comprobación
- [ ] Exportación a Excel (todos los reportes)
- [ ] Exportación a PDF (todos los reportes)

### Estados Financieros
- [ ] Balance General con comparativo período anterior
- [ ] Estado de Resultados con desglose por categoría
- [ ] Gráficos de composición (activos, pasivos, ingresos, egresos)
- [ ] Drill-down desde resumen a detalle

### Formatos Oficiales (Opción C como evolución)
- [ ] Formato SUNAPI para presentación anual
- [ ] Formato SENIAT (libro de ventas)
- [ ] Declaración informativa anual
- [ ] Campos configurables para datos del condominio

### Consideraciones Técnicas
- [ ] Servicio de generación de reportes (abstracción común)
- [ ] Motor de plantillas (Excel, PDF)
- [ ] Caché de reportes (evitar recálculo para períodos históricos)
- [ ] Permisos: quién puede generar y exportar reportes
- [ ] Auditoría: registro de quién generó qué reporte y cuándo

---

## Dependencias

Este requerimiento depende de:
- ✅ Feature de Transacciones Financieras (este MVP)
- ✅ Plan de Cuentas (Chart of Accounts)
- ✅ Saldos Mensuales Acumulados (Account Monthly Balances)
- [ ] Presupuestos anuales (para comparativo presupuesto vs real)
- [ ] Definición de formatos oficiales vigentes (SUNAPI/SENIAT)

---

## Priorización

**Prioridad Alta** porque:
1. Es una **obligación legal** de los condominios
2. Reduce significativamente el trabajo manual del administrador
3. Garantiza cumplimiento legal consistente
4. Es un diferenciador competitivo importante

**Pero fuera del MVP actual** porque:
1. El MVP se enfoca en registro y trazabilidad contable
2. Los formatos oficiales pueden cambiar — es mejor definirlos con usuarios reales
3. La solución temporal (exportar a Excel) es viable aunque manual
4. Necesitas primero tener datos estructurados correctamente

---

## Próximos Pasos

1. Completar MVP de Transacciones Financieras
2. Implementar reportes financieros básicos internos (dashboard)
3. Investigar formatos oficiales vigentes (SUNAPI/SENIAT)
4. **Luego**: Implementar reportes básicos (Opción B: Libro Diario, Mayor, Balance)
5. **Futuro**: Evaluar evolución a reportes completos (Opción C: formatos oficiales)

---

## Notas Adicionales

- Considerar integración con **contadores externos** (exportar en formato que contadores puedan importar)
- Evaluar si se necesita **firma digital** o **sellos de tiempo** para validez legal
- Investigar si SUNAPI ofrece API o formatos digitales estandarizados
- Considerar **historial de formatos** (si el formato cambia, poder regenerar reportes antiguos con el formato vigente en su momento)

---

**Fecha estimada de implementación**: Post-MVP (después de completar dashboard financiero básico)
