# Requerimiento Futuro: Presupuestos Anuales

**Estado**: 🚫 FUERA DE SCOPE — Feature de Transacciones Financieras (MVP)  
**Prioridad**: Alta (requerimiento legal)  
**Fecha de identificación**: 26 de junio de 2026  
**Relacionado con**: [Financial Transactions Feature](../proposals/financial-transactions-feature.md)

---

## Contexto Legal

La **Ley de Propiedad Horizontal** exige que el administrador presente un **presupuesto anual** a la asamblea de copropietarios para su aprobación. Este presupuesto estima los ingresos y egresos del condominio para el año siguiente.

---

## Descripción del Requerimiento

Implementar un sistema de presupuestos anuales que permita:

1. **Definir presupuesto anual** por categoría contable
2. **Comparar automáticamente** "presupuesto vs real" durante el año
3. **Alertar proactivamente** cuando se esté excediendo el presupuesto
4. **Generar reportes** de variaciones para la asamblea

---

## Ejemplo Práctico

```
Presupuesto anual aprobado:
- Mantenimiento: $12,000 ($1,000/mes)
- Servicios públicos: $6,000 ($500/mes)
- Administración: $3,600 ($300/mes)

Situación real en junio (50% del año):
- Mantenimiento: $8,000 gastados (67% del presupuesto) ⚠️ ALERTA
- Servicios públicos: $2,800 gastados (47% del presupuesto) ✅ OK
- Administración: $1,800 gastados (50% del presupuesto) ✅ OK
```

---

## Alternativas Consideradas

### Opción A: Sin presupuestos (solo registro de transacciones)
- ❌ No cumple requisito legal
- ❌ No hay control de gastos

### Opción B: Presupuestos básicos (registro + comparación)
- ✅ Cumple requisito legal
- ✅ Comparación automática
- ❌ No hay alertas proactivas

### Opción C: Presupuestos con alertas (control proactivo) ⭐ RECOMENDADO
- ✅ Control proactivo (alertas antes de que sea tarde)
- ✅ Cumple requisito legal
- ✅ Prevención de sobregastos
- ✅ Indicadores visuales (semáforo: verde/amarillo/rojo)
- ❌ Implementación más compleja

### Opción D: Presupuestos con validación (control estricto)
- ✅ Control estricto (no se puede gastar más de lo presupuestado)
- ❌ Muy rígido (emergencias no pueden esperar aprobación)
- ❌ Flujo de trabajo más lento

### Opción E: Presupuestos flexibles (alertas + override)
- ✅ Control proactivo con flexibilidad
- ✅ Emergencias no se bloquean
- ✅ Auditoría clara (override queda registrado)
- ❌ Implementación más compleja

---

## Decisión Recomendada

**Opción C (Presupuestos con alertas)** como implementación inicial.

**Justificación**:
1. **Cumplimiento legal**: La Ley exige presupuesto anual
2. **Control proactivo**: Alertas previenen problemas antes de que sean graves
3. **Sin bloqueos**: No impide registrar gastos (emergencias son reales)
4. **Simplicidad inicial**: Más simple que Opción D o E, pero suficiente para control
5. **Evolución natural**: Puedes agregar override con justificación después

---

## Criterios de Aceptación (Futuros)

### Funcionalidad Básica
- [ ] Administrador puede definir presupuesto anual por categoría contable
- [ ] Sistema permite definir presupuesto total o mensual
- [ ] Sistema compara automáticamente "presupuesto vs real"
- [ ] Reportes muestran variaciones en porcentaje y monto

### Alertas Proactivas
- [ ] Administrador configura umbrales de alerta (ej. 80%, 90%, 100%)
- [ ] Sistema notifica cuando se acerca al límite
- [ ] Indicadores visuales (semáforo: verde/amarillo/rojo)
- [ ] Dashboard financiero muestra estado de presupuestos

### Reportes
- [ ] Reporte de variaciones presupuestarias (mensual, trimestral, anual)
- [ ] Comparativo "presupuesto aprobado vs ejecución real"
- [ ] Exportación a Excel/PDF para asamblea de copropietarios

### Consideraciones Técnicas
- [ ] Tabla `annual_budgets` con campos: account_id, year, budget_amount, created_by, created_at
- [ ] Tabla `budget_alerts` para configuración de umbrales por condominio
- [ ] Servicio de cálculo de variaciones (presupuesto vs transacciones reales)
- [ ] Integración con dashboard financiero existente

---

## Dependencias

Este requerimiento depende de:
- ✅ Feature de Transacciones Financieras (este MVP)
- ✅ Plan de Cuentas (Chart of Accounts)
- ✅ Reportes Financieros Básicos

---

## Priorización

**Alta prioridad** porque:
1. Es un **requerimiento legal** de la Ley de Propiedad Horizontal
2. Los administradores necesitan esto para la asamblea anual
3. Sin esto, el sistema no cumple con obligaciones legales completas

**Pero fuera del MVP actual** porque:
1. El MVP se enfoca en registro de transacciones y trazabilidad
2. Presupuestos son un enhancement posterior
3. Administradores pueden hacer presupuestos en Excel temporalmente

---

## Próximos Pasos

1. Completar MVP de Transacciones Financieras
2. Implementar reportes financieros básicos
3. **Luego**: Implementar sistema de presupuestos anuales (Opción C recomendada)
4. **Futuro**: Evaluar evolución a Opción E (flexible con override)

---

## Notas Adicionales

- Este requerimiento puede integrarse con el **Portal del Propietario** para que copropietarios vean el estado del presupuesto
- Considerar integración con **notificaciones** para alertas de presupuesto
- Evaluar si se necesita **aprobación de asamblea** para modificar presupuestos durante el año

---

**Fecha estimada de implementación**: Post-MVP (después de completar feature de transacciones financieras)
