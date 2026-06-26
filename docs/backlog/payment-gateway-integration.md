# Requerimiento Futuro: Integración con Pasarelas de Pago

**Estado**: 🚫 FUERA DE SCOPE — Feature de Transacciones Financieras (MVP)  
**Prioridad**: Media-Alta (diferenciador competitivo)  
**Fecha de identificación**: 26 de junio de 2026  
**Relacionado con**: [Financial Transactions Feature](../proposals/financial-transactions-feature.md)

---

## Contexto

Actualmente, cuando un propietario paga su alícuota:
1. Hace el pago manualmente (transferencia bancaria, efectivo, Zelle, Pago Móvil, etc.)
2. Envía el comprobante al administrador (WhatsApp, email, presencial)
3. Administrador registra manualmente el pago en el sistema

**Problema**: Este proceso es manual, propenso a errores, y requiere que el administrador esté pendiente de comprobantes.

**Posible solución**: Integrar pasarelas de pago para que los propietarios paguen directamente desde la app, y el sistema registre automáticamente la transacción.

---

## Descripción del Requerimiento

Implementar integración con pasarelas de pago que permita:

1. **Pago directo desde la app** por parte del propietario
2. **Registro automático** de la transacción en el sistema
3. **Confirmación inmediata** al propietario
4. **Conciliación semi-automática** con el estado de cuenta bancario

---

## Alternativas Consideradas

### Opción A: Sin integración (registro manual)
- ✅ Simple de implementar
- ❌ Trabajo manual repetitivo para el administrador
- ❌ Propenso a errores

### Opción B: Integración básica (solo registro automático) ⭐ RECOMENDADO
- ✅ Reduce trabajo manual del administrador
- ✅ Propietario tiene confirmación inmediata
- ✅ Registro automático (menos errores)
- ✅ Administrador mantiene control (debe aprobar)
- ❌ Complejidad técnica (integración con APIs de pago)
- ❌ Costos de pasarela (comisiones por transacción)

### Opción C: Integración completa (pago + conciliación automática)
- ✅ Automatización completa
- ❌ Muy complejo de implementar
- ❌ Requiere integración bancaria (ver conciliación bancaria)
- ❌ Costos altos

### Opción D: Integración selectiva (solo algunos métodos)
- ✅ Balance entre automatización y realidad
- ✅ Enfoca esfuerzos en métodos con APIs confiables
- ❌ Experiencia fragmentada (algunos métodos automáticos, otros manuales)

### Opción E: Diferida (post-MVP) ⭐ DECISIÓN ACTUAL
- ✅ MVP más rápido y simple
- ✅ Aprendes del uso real antes de invertir
- ❌ Propietarios y administradores siguen con proceso manual

---

## Decisión Actual

**Opción E (Diferida)** — Fuera de scope del MVP actual.

**Justificación**:
1. **Realidad venezolana**: Muchos métodos de pago (Zelle, efectivo, transferencias personales) no tienen APIs públicas.
2. **MVP primero**: No bloquear el lanzamiento por integración compleja.
3. **Costos**: Las pasarelas cobran comisiones. Necesitas validar si los propietarios están dispuestos a pagarlas.
4. **Aprendizaje**: Una vez que el sistema esté en uso, entenderás mejor qué métodos de pago son más comunes.

---

## Métodos de Pago en Venezuela (Contexto)

### Métodos con posible integración API
- **Pago Móvil** (interbancario) — depende de disponibilidad de API bancaria
- **Tarjetas de crédito/débito** — Stripe, PayPal, PagoFX
- **Binance Pay / Cripto** — APIs disponibles

### Métodos sin integración API (registro manual)
- **Zelle** — no tiene API pública, solo confirmación por comprobante
- **Efectivo** — inherently manual
- **Transferencias bancarias personales** — sin API estandarizada
- **Cheques** — inherently manual

---

## Criterios de Aceptación (Futuros)

### Integración Básica (Opción B recomendada)
- [ ] Propietario puede pagar alícuota desde la app
- [ ] Sistema muestra métodos de pago disponibles por condominio
- [ ] Pasarela procesa el pago y notifica al sistema
- [ ] Sistema crea FinancialTransaction automáticamente (estado: `pending`)
- [ ] Propietario recibe confirmación inmediata
- [ ] Administrador ve el pago en lista de pendientes de conciliación
- [ ] Administrador concilia y aprueba (flujo normal)

### Integración Selectiva (Opción D alternativa)
- [ ] Integrar solo con 1-2 métodos principales (ej. Pago Móvil, Tarjetas)
- [ ] Métodos no integrados siguen flujo manual (comprobante + registro manual)
- [ ] UI muestra claramente qué métodos son automáticos vs manuales

### Consideraciones Técnicas
- [ ] Servicio de integración con pasarela (abstracción para soportar múltiples proveedores)
- [ ] Webhooks para recibir notificaciones de pago
- [ ] Manejo de errores y reintentos
- [ ] Idempotencia (evitar doble registro)
- [ ] Auditoría: registrar origen del pago (manual vs automático)
- [ ] Configuración por condominio (qué métodos acepta cada condominio)

### Consideraciones de Negocio
- [ ] Modelo de comisiones: ¿quién paga la comisión de la pasarela? (condominio, propietario, o absorbida por la plataforma)
- [ ] Términos y condiciones de uso
- [ ] Política de reembolsos
- [ ] Cumplimiento normativo (LC/FT si aplica)

---

## Dependencias

Este requerimiento depende de:
- ✅ Feature de Transacciones Financieras (este MVP)
- ✅ Portal del Propietario (para que puedan pagar)
- ✅ Conciliación bancaria (para validar pagos automáticos)
- [ ] Definición de modelo de comisiones
- [ ] Evaluación de proveedores de pasarela disponibles en Venezuela

---

## Priorización

**Prioridad Media-Alta** porque:
1. Es un **diferenciador competitivo** importante
2. Reduce significativamente el trabajo manual del administrador
3. Mejora la experiencia del propietario
4. Automatiza el proceso más repetitivo (cobro de alícuotas)

**Pero fuera del MVP actual** porque:
1. El MVP se enfoca en registro y trazabilidad contable
2. La realidad venezolana limita las opciones de integración
3. Necesitas validar el modelo de negocio (comisiones) antes de implementar
4. El registro manual funciona como solución temporal

---

## Próximos Pasos

1. Completar MVP de Transacciones Financieras
2. Implementar Portal del Propietario
3. Evaluar proveedores de pasarela disponibles en Venezuela
4. Definir modelo de comisiones con el negocio
5. **Luego**: Implementar integración básica (Opción B recomendada)
6. **Futuro**: Evaluar evolución a integración selectiva (Opción D)

---

## Proveedores a Evaluar (Venezuela)

- **PagoFX**: Pasarela venezolana, soporta Pago Móvil y tarjetas
- **Stripe**: Internacional, requiere entidad legal fuera de Venezuela
- **PayPal**: Internacional, comisiones altas
- **Binance Pay**: Cripto, creciente adopción en Venezuela
- **PlacetoPay**: Regional, soporta múltiples métodos

---

**Fecha estimada de implementación**: Post-MVP (después de completar portal del propietario)
