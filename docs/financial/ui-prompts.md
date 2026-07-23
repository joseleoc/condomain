# UI Generation Prompts - Módulo Financiero Condomain

## Descripción General

Este documento contiene prompts detallados para generar las interfaces de usuario del módulo financiero usando herramientas como Google Stitch, v0, o similares.

**Stack Técnico**: Angular 20 + Ionic 8 + Capacitor 8
**Sistema de Diseño**: Ionic CSS variables, color primario #ff8200 (naranja)
**Patrón**: Container-Presentational, componentes standalone
**Idioma**: Textos directos en español (sin i18n)

---

## Módulo 1: Gestión de Cuentas (Billeteras)

### Pantalla 1.1: Dashboard de Cuentas

**Archivo**: `wallets.page.html`

#### ¿Qué es esta pantalla?

Es la pantalla principal del módulo financiero donde el administrador del condominio puede ver un resumen de todas las cuentas (billeteras) del condominio y sus saldos actuales. Funciona como un "home" financiero similar a apps como TimelyBills o Mint.

#### ¿Para qué sirve?

- **Visualización rápida**: Ver el balance total del condominio de un vistazo
- **Gestión de cuentas**: Acceder a cada cuenta para ver detalles o editar
- **Acciones rápidas**: Crear nuevas transacciones (ingresos, egresos, transferencias)
- **Monitoreo**: Seguimiento de ingresos y egresos del mes actual

#### ¿Qué hace el usuario aquí?

1. **Al entrar**: Ve el balance total del condominio y las tarjetas de resumen (ingresos/egresos del mes)
2. **Revisa las cuentas**: Desplaza la lista de cuentas para ver el saldo de cada una
3. **Selecciona una cuenta**: Toca una cuenta para ver su detalle o editarla
4. **Crea transacciones**: Toca el botón flotante (+) para crear un nuevo ingreso, egreso o transferencia
5. **Actualiza**: Desliza hacia abajo para refrescar los datos

#### Prompt para Generación

```
Create a financial dashboard page for a condominium management app using Ionic 8.

PURPOSE: Main financial screen showing all condominium accounts (wallets) and their balances.

LAYOUT STRUCTURE:
- Header with title "Finanzas" and back button
- Scrollable content area

COMPONENTS:

1. SUMMARY CARDS SECTION (top, horizontal scroll on mobile):
   - Card 1: "Balance Total" 
     * Display total amount across all accounts in base currency
     * Large, bold font (2em)
     * Primary color (#ff8200)
   - Card 2: "Ingresos del Mes"
     * Display sum of all income transactions this month
     * Green accent color
     * Medium font (1.5em)
   - Card 3: "Egresos del Mes"
     * Display sum of all expense transactions this month
     * Red accent color
     * Medium font (1.5em)
   - Use ion-card with ion-card-content
   - Cards should have subtle shadow and border-radius 12px

2. ACCOUNTS LIST SECTION:
   - Section header: "Cuentas" with "Ver todas" link (right-aligned)
   - List of account cards (ion-item with custom styling):
     * Left: Icon circle (48px diameter, rounded)
       - bank: business-outline icon
       - cash: cash-outline icon
       - wallet: wallet-outline icon
       - credit: card-outline icon
       - investment: trending-up-outline icon
     * Middle:
       - Account name (bold, 1.1em)
       - Institution name (small, gray, 0.9em)
     * Right:
       - Balance amount (large, 1.2em, font-weight 600)
       - Currency code (small, gray, 0.8em)
   - Each item clickable, navigates to account detail page
   - Items separated by subtle border-bottom

3. QUICK ACTIONS (bottom-right):
   - ion-fab button with "add" icon
   - Opens action sheet with three options:
     * "Nuevo Ingreso" (green icon: arrow-down-circle)
     * "Nuevo Egreso" (red icon: arrow-up-circle)
     * "Nueva Transferencia" (blue icon: swap-horizontal)

STATES TO HANDLE:

- LOADING STATE:
  * Show ion-spinner centered in content area
  * Hide all other content

- EMPTY STATE (no accounts created):
  * Large ion-icon "wallet-outline" (64px, gray)
  * Message: "No hay cuentas creadas" (centered, gray)
  * Subtitle: "Crea tu primera cuenta para comenzar" (small, gray)
  * Button: "Crear cuenta" (primary color)

- ERROR STATE:
  * Large ion-icon "alert-circle-outline" (64px, danger color)
  * Message: "Error al cargar las cuentas" (centered, danger)
  * Button: "Reintentar" (secondary)

STYLING REQUIREMENTS:
- Use --ion-color-primary (#ff8200) for accents and primary actions
- Balance amounts: font-size 1.2em, font-weight 600, right-aligned
- Cards: border-radius 12px, box-shadow: 0 2px 8px rgba(0,0,0,0.1)
- List items: padding 12px 16px, border-bottom: 1px solid var(--ion-color-light)
- Icon circles: width 48px, height 48px, border-radius 50%, background: var(--ion-color-light)

RESPONSIVE BEHAVIOR:
- Mobile (<768px): Single column, full width
- Tablet (768px-1024px): Two columns for summary cards
- Desktop (>1024px): Max-width 600px, centered

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

### Pantalla 1.2: Formulario de Cuenta (Modal)

**Archivo**: `wallet-form-modal.component.html`

#### ¿Qué es esta pantalla?

Es un modal que permite crear una nueva cuenta (billetera) o editar una existente. Las cuentas representan los lugares donde el condominio tiene dinero: bancos, efectivo, billeteras digitales, etc.

#### ¿Para qué sirve?

- **Crear cuenta**: Registrar una nueva cuenta bancaria, de efectivo, etc.
- **Editar cuenta**: Modificar el nombre, tipo, institución o saldo de una cuenta existente
- **Configurar cuenta**: Establecer el tipo de cuenta, moneda e ícono para identificación visual

#### ¿Qué hace el usuario aquí?

1. **Abre el modal**: Desde el dashboard o lista de cuentas
2. **Completa el formulario**: Ingresa el nombre, selecciona tipo, moneda, etc.
3. **Ve validaciones**: Los campos requeridos muestran errores si están vacíos
4. **Guarda**: Toca "Guardar" para crear o actualizar la cuenta
5. **Cancela**: Toca "Cancelar" para cerrar sin guardar

#### Prompt para Generación

```
Create a wallet creation/edit modal for a condominium management app using Ionic 8.

PURPOSE: Form to create a new account (wallet) or edit an existing one. Accounts represent where the condominium holds money (banks, cash, digital wallets).

LAYOUT STRUCTURE:
- ion-modal with full height on mobile, 80% height on desktop
- ion-header with title and close button
- ion-content with scrollable form
- ion-footer with action buttons

HEADER:
- Title: "Nueva Cuenta" (create mode) or "Editar Cuenta" (edit mode)
- Close button (ion-icon close-outline) on the right

FORM FIELDS (ion-list with ion-item):

1. ACCOUNT NAME (required):
   - ion-input with label "Nombre de la cuenta"
   - Placeholder: "ej. Banco Mercantil USD"
   - Validation: required, min 3 characters
   - Error message: "El nombre es requerido (mínimo 3 caracteres)"

2. ACCOUNT TYPE (required):
   - ion-select with label "Tipo de cuenta"
   - Options with icons:
     * bank - "Cuenta Bancaria" (icon: business-outline)
     * cash - "Efectivo" (icon: cash-outline)
     * wallet - "Billetera Digital" (icon: wallet-outline)
     * credit - "Crédito" (icon: card-outline)
     * investment - "Inversión" (icon: trending-up-outline)
   - Show icon + text for each option in the select
   - Error message: "Selecciona un tipo de cuenta"

3. CURRENCY (required):
   - ion-select with label "Moneda"
   - Options from currencies table: USD, VES, EUR, etc.
   - Show currency code + symbol (e.g., "USD - $")
   - Error message: "Selecciona una moneda"

4. INSTITUTION NAME (optional):
   - ion-input with label "Institución"
   - Placeholder: "ej. Banco Mercantil"
   - No validation required

5. INITIAL BALANCE (optional):
   - ion-input type="number" with label "Saldo inicial"
   - Placeholder: "0.00"
   - Validation: >= 0
   - Error message: "El saldo no puede ser negativo"

6. ICON (optional):
   - ion-select with label "Ícono"
   - Grid of ion-icon options (24 common icons)
   - Show preview of selected icon

7. COLOR (optional):
   - ion-select with label "Color"
   - Color swatches (8 predefined colors)
   - Show preview of selected color

FOOTER BUTTONS:
- "Cancelar" button (secondary, left-aligned)
- "Guardar" button (primary, right-aligned)
- Disable "Guardar" button if form is invalid

VALIDATION BEHAVIOR:
- Show error messages below fields in red (danger color)
- Real-time validation on blur (when user leaves field)
- Disable "Guardar" button until all required fields are valid
- Show inline error messages, not alerts

STATES:

- CREATE MODE:
  * Empty form
  * Title: "Nueva Cuenta"
  * All fields editable

- EDIT MODE:
  * Pre-filled form with existing data
  * Title: "Editar Cuenta"
  * All fields editable except account type (disabled)

- LOADING STATE:
  * Show ion-spinner on "Guardar" button
  * Disable all buttons
  * Text: "Guardando..."

- SUCCESS STATE:
  * Close modal automatically
  * Show toast notification: "Cuenta creada correctamente" (green)
  * Refresh accounts list in background

- ERROR STATE:
  * Keep modal open
  * Show toast notification: "Error al guardar. Inténtalo de nuevo." (red)
  * Re-enable buttons

STYLING:
- Form fields: padding 12px 16px
- Error messages: color var(--ion-color-danger), font-size 0.85em, margin-top 4px
- Buttons: padding 12px 24px, border-radius 8px
- Modal: border-radius 12px 12px 0 0 on mobile, 12px on desktop

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Módulo 2: Gestión de Categorías

### Pantalla 2.1: Lista de Categorías

**Archivo**: `categories.page.html`

#### ¿Qué es esta pantalla?

Es la pantalla donde el administrador puede ver y gestionar todas las categorías de ingresos y egresos del condominio. Las categorías permiten clasificar las transacciones (ej. "Electricidad", "Alícuotas", "Mantenimiento").

#### ¿Para qué sirve?

- **Visualizar categorías**: Ver todas las categorías organizadas por tipo (ingresos/egresos)
- **Navegar jerarquía**: Ver categorías padre e hijas en estructura de árbol
- **Gestionar categorías**: Crear, editar o eliminar categorías (excepto las del sistema)
- **Identificar categorías del sistema**: Las categorías predefinidas tienen un ícono de candado y no se pueden modificar

#### ¿Qué hace el usuario aquí?

1. **Cambia entre tabs**: Selecciona "Ingresos" o "Egresos" para ver categorías de ese tipo
2. **Ve grupos de categorías**: Cada categoría padre muestra sus hijas en una cuadrícula
3. **Identifica categorías del sistema**: Ve el ícono de candado en categorías que no se pueden editar
4. **Crea nueva categoría**: Toca el botón flotante (+) para crear una categoría
5. **Edita categoría**: Toca una categoría (si no es del sistema) para editarla
6. **Elimina categoría**: Desliza o mantiene presionado para eliminar (si no es del sistema)

#### Prompt para Generación

```
Create a categories management page for a condominium management app using Ionic 8.

PURPOSE: Display and manage income/expense categories. Categories classify transactions (e.g., "Electricity", "Fees", "Maintenance"). System categories are read-only.

LAYOUT STRUCTURE:
- Header with title "Categorías" and back button
- ion-segment with two tabs: "Ingresos" | "Egresos"
- Scrollable content area with category groups

TAB BEHAVIOR:
- Default tab: "Egresos" (expenses)
- Switching tabs filters categories by type
- Tab indicator slides smoothly between options

CATEGORY GROUPS DISPLAY:

For each parent category, show:

1. PARENT HEADER (ion-item-divider):
   - Left: Icon circle (40px diameter, colored background)
     * Icon from category.icon property
     * Background color from category.color property
   - Middle: Parent category name (bold, 1.1em)
   - Right: If system category, show lock icon (ion-icon name="lock-closed", small, gray)

2. CHILDREN GRID (below parent header):
   - ion-grid with ion-col size="4" (3 columns on mobile, 4 on tablet)
   - Each child category card:
     * ion-card with padding 8px
     * Icon circle (48px diameter, centered)
       - Icon from category.icon
       - Background color from category.color
     * Category name (small, 0.9em, centered, text-align center)
     * If system category: small lock badge (top-right corner, absolute positioning)
   - Cards are clickable (navigate to edit modal if not system)

INTERACTIONS:

- TAP ON CATEGORY CARD:
  * If system category: Show alert "Categoría del sistema - No se puede modificar"
  * If user category: Open edit modal with category data pre-filled

- LONG PRESS ON CATEGORY CARD (user categories only):
  * Show action sheet with options:
    - "Editar" (ion-icon create-outline)
    - "Eliminar" (ion-icon trash-outline, danger color)
  * Confirm deletion with alert: "¿Eliminar esta categoría?"

- SWIPE LEFT ON CATEGORY CARD (user categories only):
  * Reveal "Editar" and "Eliminar" buttons
  * Same behavior as long press

EMPTY STATE:
- Large ion-icon "folder-open-outline" (64px, gray, centered)
- Message: "No hay categorías creadas" (centered, gray, 1.1em)
- Subtitle: "Crea tu primera categoría para clasificar transacciones" (small, gray)
- Button: "Crear categoría" (primary color, centered)

FAB BUTTON:
- ion-fab (bottom-right, vertical="bottom", horizontal="end")
- Button with "add" icon
- Opens category form modal

STYLING:
- Icon circles: width 48px, height 48px, border-radius 50%
- Category cards: border-radius 8px, padding 8px, margin 4px
- Parent headers: background var(--ion-color-light), padding 12px 16px
- Children grid: gap 8px between cards
- Lock badge: position absolute, top 4px, right 4px, font-size 0.7em

RESPONSIVE:
- Mobile (<768px): 2 columns for children grid
- Tablet (768px-1024px): 3 columns
- Desktop (>1024px): 4 columns, max-width 800px centered

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

### Pantalla 2.2: Formulario de Categoría (Modal)

**Archivo**: `category-form-modal.component.html`

#### ¿Qué es esta pantalla?

Es un modal para crear una nueva categoría o editar una existente. Permite definir el nombre, tipo (ingreso/egreso), categoría padre (para jerarquía), ícono y color.

#### ¿Para qué sirve?

- **Crear categoría**: Definir una nueva categoría para clasificar transacciones
- **Crear subcategoría**: Establecer jerarquía padre-hijo (máximo 2 niveles)
- **Personalizar**: Asignar ícono y color para identificación visual
- **Editar categoría**: Modificar propiedades de categorías de usuario (no del sistema)

#### ¿Qué hace el usuario aquí?

1. **Selecciona tipo**: Elige entre "Ingreso" o "Egreso" (no editable en modo edición)
2. **Ingresa nombre**: Escribe el nombre de la categoría
3. **Selecciona padre** (opcional): Elige una categoría padre del mismo tipo
4. **Personaliza**: Selecciona ícono y color
5. **Guarda**: Toca "Guardar" para crear o actualizar
6. **Cancela**: Toca "Cancelar" para cerrar sin guardar

#### Prompt para Generación

```
Create a category creation/edit modal for a condominium management app using Ionic 8.

PURPOSE: Form to create a new category or edit an existing one. Categories classify transactions as income or expense. Supports 2-level hierarchy (parent → children).

LAYOUT STRUCTURE:
- ion-modal with full height on mobile, 80% height on desktop
- ion-header with title and close button
- ion-content with scrollable form
- ion-footer with action buttons

HEADER:
- Title: "Nueva Categoría" (create mode) or "Editar Categoría" (edit mode)
- Close button (ion-icon close-outline) on the right

FORM FIELDS:

1. CATEGORY NAME (required):
   - ion-input with label "Nombre"
   - Placeholder: "ej. Electricidad"
   - Validation: required, min 3 characters
   - Error message: "El nombre es requerido (mínimo 3 caracteres)"

2. CATEGORY TYPE (required, disabled in edit mode):
   - ion-segment with two options: "Ingreso" | "Egreso"
   - Icons: arrow-down (income, green), arrow-up (expense, red)
   - In edit mode: segment is disabled (ion-segment disabled property)
   - Error message: "Selecciona un tipo"

3. PARENT CATEGORY (optional):
   - ion-select with label "Categoría padre"
   - Options: root categories (parent_id = null) of the same type
   - Special first option: "Sin padre (categoría raíz)"
   - If creating subcategory: show only roots of same type
   - Help text: "Las subcategorías agrupan transacciones relacionadas"

4. ICON (optional):
   - ion-select with label "Ícono"
   - Grid of ion-icon options (32 common icons)
   - Show preview of selected icon (48px circle with icon)
   - Icons organized by category: finance, utilities, maintenance, etc.

5. COLOR (optional):
   - ion-select with label "Color"
   - Color swatches (8 predefined colors):
     * Primary (#ff8200), Success (green), Danger (red), Warning (yellow)
     * Secondary (blue), Medium (gray), Light (light gray), Dark (dark gray)
   - Show preview of selected color (48px circle with color)

FOOTER BUTTONS:
- "Cancelar" button (secondary, left-aligned)
- "Guardar" button (primary, right-aligned)
- Disable "Guardar" button if form is invalid

SYSTEM CATEGORY PROTECTION:
- If editing system category (is_system = true):
  * Show warning banner at top: ion-item with color="warning"
    - Icon: lock-closed-outline
    - Text: "Categoría del sistema - No se puede modificar"
  * Disable all form fields (ion-input disabled, ion-select disabled)
  * Hide "Guardar" button (only show "Cerrar" button)
  * Form is read-only view

VALIDATION BEHAVIOR:
- Show error messages below fields in red (danger color)
- Real-time validation on blur
- Disable "Guardar" until all required fields are valid
- Prevent creating 3rd level (if parent already has parent, show error)

STATES:

- CREATE MODE:
  * Empty form
  * Title: "Nueva Categoría"
  * All fields editable

- EDIT MODE (user category):
  * Pre-filled form with existing data
  * Title: "Editar Categoría"
  * Type segment disabled
  * All other fields editable

- EDIT MODE (system category):
  * Pre-filled form with existing data
  * Title: "Editar Categoría"
  * Warning banner visible
  * All fields disabled
  * Only "Cerrar" button visible

- LOADING STATE:
  * Show ion-spinner on "Guardar" button
  * Disable all buttons
  * Text: "Guardando..."

- SUCCESS STATE:
  * Close modal automatically
  * Show toast: "Categoría creada correctamente" (green)
  * Refresh categories list in background

- ERROR STATE:
  * Keep modal open
  * Show toast: "Error al guardar" (red)
  * Re-enable buttons

STYLING:
- Form fields: padding 12px 16px
- Error messages: color var(--ion-color-danger), font-size 0.85em, margin-top 4px
- Warning banner: background var(--ion-color-warning), padding 12px 16px
- Buttons: padding 12px 24px, border-radius 8px
- Modal: border-radius 12px 12px 0 0 on mobile, 12px on desktop

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Módulo 3: Transacciones

### Pantalla 3.1: Lista de Transacciones

**Archivo**: `transactions.page.html`

#### ¿Qué es esta pantalla?

Es la pantalla donde el administrador puede ver todas las transacciones financieras del condominio (ingresos, egresos y transferencias) con filtros por tipo, fecha y cuenta.

#### ¿Para qué sirve?

- **Historial financiero**: Ver todas las transacciones en orden cronológico
- **Filtrar y buscar**: Encontrar transacciones específicas por tipo, fecha o cuenta
- **Gestionar transacciones**: Editar o eliminar transacciones pendientes
- **Monitorear estado**: Ver qué transacciones están pendientes de aprobación

#### ¿Qué hace el usuario aquí?

1. **Ve la lista**: Desplaza la lista de transacciones ordenadas por fecha
2. **Filtra por tipo**: Selecciona "Todas", "Ingresos", "Egresos" o "Transferencias"
3. **Filtra por fecha**: Selecciona un rango de fechas
4. **Filtra por cuenta**: Selecciona una cuenta específica
5. **Toca una transacción**: Ve el detalle completo
6. **Desliza una transacción**: Edita o elimina (si está pendiente)
7. **Actualiza**: Desliza hacia abajo para refrescar

#### Prompt para Generación

```
Create a transactions list page for a condominium management app using Ionic 8.

PURPOSE: Display all financial transactions (income, expenses, transfers) with filtering capabilities. Users can view history, filter by type/date/account, and manage pending transactions.

LAYOUT STRUCTURE:
- Header with title "Transacciones" and back button
- Filter bar (horizontal scroll on mobile)
- Scrollable content area with transaction list

FILTER BAR:

1. TYPE SEGMENT (ion-segment, horizontal scroll):
   - Options: "Todas" | "Ingresos" | "Egresos" | "Transferencias"
   - Icons: 
     * Todas: list-outline
     * Ingresos: arrow-down-circle (green)
     * Egresos: arrow-up-circle (red)
     * Transferencias: swap-horizontal (blue)
   - Active tab highlighted with primary color

2. DATE RANGE FILTER (ion-datetime, modal presentation):
   - Button with calendar icon
   - Opens date range picker
   - Display selected range as text: "1 Jun - 30 Jun 2026"
   - Quick options: "Este Mes", "Mes Anterior", "Este Año"

3. ACCOUNT FILTER (ion-select):
   - Button with filter icon
   - Options: all accounts + "Todlas las cuentas"
   - Show account icon + name

TRANSACTION LIST (ion-list):

Each transaction item (ion-item with custom styling):

- LEFT: Icon circle (40px diameter)
  * Income: arrow-down-circle (green background)
  * Expense: arrow-up-circle (red background)
  * Transfer: swap-horizontal (blue background)

- MIDDLE:
  * Category name or "Transferencia" (bold, 1em)
  * Description (small, gray, 0.9em, truncated with ellipsis)
  * Date (small, gray, 0.85em, format: "DD MMM YYYY")

- RIGHT:
  * Amount (large, 1.1em, font-weight 600)
    - Income: green color
    - Expense: red color
    - Transfer: blue color
  * Currency code (small, gray, 0.8em)
  * Status badge (if not completed):
    - "Pendiente" (yellow badge, ion-badge)
    - "Anulada" (gray badge, strikethrough on amount)

SWIPE ACTIONS (ion-item-sliding):
- Swipe left reveals:
  * "Editar" button (secondary, ion-icon create-outline)
  * "Eliminar" button (danger, ion-icon trash-outline)
- Only available for transactions with status = 'pending'

EMPTY STATE:
- Large ion-icon "receipt-outline" (64px, gray, centered)
- Message: "No hay transacciones" (centered, gray, 1.1em)
- Subtitle: "Crea tu primera transacción para comenzar" (small, gray)
- Button: "Crear transacción" (primary color, centered)

FAB BUTTON:
- ion-fab (bottom-right)
- Button with "add" icon
- Opens transaction form modal

INTERACTIONS:

- TAP ON TRANSACTION:
  * Navigate to transaction detail page
  * Show full details, accounting entries, approval info

- SWIPE LEFT ON PENDING TRANSACTION:
  * Reveal "Editar" and "Eliminar" buttons
  * Edit: opens edit modal (only if status = 'pending')
  * Delete: shows confirmation alert "¿Eliminar esta transacción?"

- PULL TO REFRESH:
  * ion-refresher at top of list
  * Refreshes transaction list
  * Shows loading spinner

FILTERING BEHAVIOR:
- Type filter: immediate, no button needed
- Date filter: apply button to confirm range
- Account filter: apply button to confirm selection
- Clear all filters: "Limpiar filtros" button

STYLING:
- Transaction items: padding 12px 16px, border-bottom: 1px solid var(--ion-color-light)
- Amount: font-family monospace, right-aligned
- Status badge: ion-badge with appropriate color, font-size 0.75em
- Icon circles: width 40px, height 40px, border-radius 50%

RESPONSIVE:
- Mobile: full width, single column
- Tablet/Desktop: max-width 600px, centered

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, filters, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Módulo 4: Formularios de Transacciones

### Pantalla 4.1: Formulario de Ingreso/Egreso

**Archivo**: `transaction-form-modal.component.html`

#### ¿Qué es esta pantalla?

Es un modal para crear un nuevo ingreso o egreso. El usuario especifica el monto, la cuenta (billetera), la categoría, la fecha y una descripción.

#### ¿Para qué sirve?

- **Registrar ingreso**: Cuando el condominio recibe dinero (ej. pago de alícuota)
- **Registrar egreso**: Cuando el condominio gasta dinero (ej. pago de electricidad)
- **Clasificar transacción**: Asignar categoría para reportes y seguimiento
- **Multi-moneda**: Registrar transacciones en diferentes monedas con tasa de cambio

#### ¿Qué hace el usuario aquí?

1. **Selecciona tipo**: Elige entre "Ingreso" o "Egreso"
2. **Ingresa monto**: Escribe el monto de la transacción
3. **Selecciona moneda**: Elige la moneda (USD, VES, EUR, etc.)
4. **Ingresa tasa de cambio** (si aplica): Si la moneda es diferente a la base
5. **Selecciona cuenta**: Elige la billetera de destino (ingreso) o origen (egreso)
6. **Selecciona categoría**: Elige la categoría del tipo seleccionado
7. **Selecciona fecha**: Elige la fecha de la transacción
8. **Escribe descripción**: Describe el propósito de la transacción
9. **Ingresa número de referencia** (opcional): Número de transferencia, factura, etc.
10. **Guarda**: Toca "Guardar" para crear la transacción

#### Prompt para Generación

```
Create a transaction creation modal for a condominium management app using Ionic 8.

PURPOSE: Form to create a new income or expense transaction. Users specify amount, account, category, date, and description. Supports multi-currency with exchange rate.

LAYOUT STRUCTURE:
- ion-modal with full height on mobile, 80% height on desktop
- ion-header with title and close button
- ion-content with scrollable form
- ion-footer with action buttons

HEADER:
- Title: "Nuevo Ingreso" or "Nuevo Egreso" (dynamic based on selected type)
- Close button (ion-icon close-outline) on the right

FORM FIELDS:

1. TRANSACTION TYPE (required):
   - ion-segment with two options: "Ingreso" | "Egreso"
   - Icons: arrow-down (income, green), arrow-up (expense, red)
   - Disabled in edit mode (if transaction already created)
   - Changing type updates available categories

2. AMOUNT (required):
   - ion-input type="number" with label "Monto"
   - Placeholder: "0.00"
   - Large font size (1.5em), bold
   - Validation: > 0
   - Error message: "El monto debe ser mayor a 0"
   - Show currency symbol based on selected currency

3. CURRENCY (required):
   - ion-select with label "Moneda"
   - Options from currencies table: USD, VES, EUR, etc.
   - Show currency code + symbol (e.g., "USD - $")
   - Changing currency may show/hide exchange rate field

4. EXCHANGE RATE (conditional, required if currency != base currency):
   - ion-input type="number" with label "Tasa de cambio"
   - Placeholder: "1.0000"
   - Show only if selected currency is different from condominium base currency
   - Validation: > 0
   - Error message: "La tasa de cambio debe ser mayor a 0"
   - Help text: "1 [selected currency] = [rate] [base currency]"

5. WALLET ACCOUNT (required):
   - ion-select with label "Cuenta"
   - Options: list of wallets with current balance
   - Show: icon + name + balance (e.g., "💼 Banco Mercantil - $5,000.00")
   - For income: show all wallets
   - For expense: show only wallets with balance > 0
   - Error message: "Selecciona una cuenta"

6. CATEGORY (required):
   - ion-select with label "Categoría"
   - Options: categories of selected type (income/expense)
   - Grouped by parent category (ion-select-option with group label)
   - Show: icon + name
   - Error message: "Selecciona una categoría"

7. DATE (required):
   - ion-datetime with label "Fecha"
   - Default: today
   - Format: YYYY-MM-DD
   - Max: today (cannot create future transactions)
   - Error message: "Selecciona una fecha"

8. DESCRIPTION (required):
   - ion-textarea with label "Descripción"
   - Placeholder: "ej. Pago de electricidad enero 2026"
   - Rows: 3
   - Validation: required, min 10 characters
   - Error message: "La descripción es requerida (mínimo 10 caracteres)"

9. REFERENCE NUMBER (optional):
   - ion-input with label "Número de referencia"
   - Placeholder: "ej. TRF-2026-001234"
   - No validation required

FOOTER BUTTONS:
- "Cancelar" button (secondary, left-aligned)
- "Guardar" button (primary, right-aligned)
- Disable "Guardar" button if form is invalid

VALIDATION BEHAVIOR:
- Show error messages below fields in red (danger color)
- Real-time validation on blur
- Disable "Guardar" until all required fields are valid
- Validate amount > 0, date <= today, description >= 10 chars

DYNAMIC BEHAVIOR:
- Changing transaction type:
  * Updates available categories (income vs expense)
  * Updates title ("Nuevo Ingreso" vs "Nuevo Egreso")
- Changing currency:
  * Shows/hides exchange rate field
  * Updates currency symbol in amount field
- Selecting account:
  * For expense: validate sufficient balance
  * Show warning if balance < amount

STATES:

- CREATE MODE:
  * Empty form
  * Title: "Nuevo Ingreso" or "Nuevo Egreso"
  * All fields editable

- EDIT MODE (only if status = 'pending'):
  * Pre-filled form with existing data
  * Title: "Editar Transacción"
  * Type segment disabled
  * All other fields editable

- LOADING STATE:
  * Show ion-spinner on "Guardar" button
  * Disable all buttons
  * Text: "Guardando..."

- SUCCESS STATE:
  * Close modal automatically
  * Show toast: "Transacción creada correctamente" (green)
  * Refresh transactions list in background

- ERROR STATE:
  * Keep modal open
  * Show toast: "Error al guardar" (red)
  * Re-enable buttons

STYLING:
- Amount field: font-size 1.5em, font-weight 600, text-align right
- Form fields: padding 12px 16px
- Error messages: color var(--ion-color-danger), font-size 0.85em, margin-top 4px
- Buttons: padding 12px 24px, border-radius 8px
- Modal: border-radius 12px 12px 0 0 on mobile, 12px on desktop

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

### Pantalla 4.2: Formulario de Transferencia

**Archivo**: `transfer-form-modal.component.html`

#### ¿Qué es esta pantalla?

Es un modal para crear una transferencia entre dos cuentas (billeteras) del condominio. Por ejemplo, transferir dinero del banco a la caja chica.

#### ¿Para qué sirve?

- **Transferir fondos**: Mover dinero entre cuentas del condominio
- **Registrar movimiento**: Documentar transferencias para auditoría
- **Multi-moneda**: Transferir entre cuentas de diferentes monedas con tasa de cambio

#### ¿Qué hace el usuario aquí?

1. **Ingresa monto**: Escribe el monto a transferir
2. **Selecciona moneda**: Elige la moneda de la transferencia
3. **Selecciona cuenta origen**: Elige de qué cuenta sale el dinero
4. **Selecciona cuenta destino**: Elige a qué cuenta llega el dinero
5. **Selecciona fecha**: Elige la fecha de la transferencia
6. **Escribe descripción**: Describe el propósito de la transferencia
7. **Guarda**: Toca "Transferir" para crear la transferencia

#### Prompt para Generación

```
Create a transfer creation modal for a condominium management app using Ionic 8.

PURPOSE: Form to create a transfer between two accounts (wallets). Transfers move money from one account to another within the condominium.

LAYOUT STRUCTURE:
- ion-modal with full height on mobile, 80% height on desktop
- ion-header with title and close button
- ion-content with scrollable form
- ion-footer with action buttons

HEADER:
- Title: "Nueva Transferencia"
- Close button (ion-icon close-outline) on the right

FORM FIELDS:

1. AMOUNT (required):
   - ion-input type="number" with label "Monto"
   - Placeholder: "0.00"
   - Large font size (1.5em), bold
   - Validation: > 0
   - Error message: "El monto debe ser mayor a 0"

2. CURRENCY (required):
   - ion-select with label "Moneda"
   - Options from currencies table: USD, VES, EUR, etc.
   - Show currency code + symbol

3. EXCHANGE RATE (conditional, required if currency != base currency):
   - ion-input type="number" with label "Tasa de cambio"
   - Placeholder: "1.0000"
   - Show only if selected currency is different from condominium base currency
   - Validation: > 0

4. FROM ACCOUNT (required):
   - ion-select with label "Cuenta origen"
   - Options: wallets with balance > 0
   - Show: icon + name + current balance (e.g., "💼 Banco Mercantil - $5,000.00")
   - Validation: must have sufficient balance for transfer
   - Error message: "Selecciona una cuenta origen"
   - Error message: "Saldo insuficiente" (if balance < amount)

5. TO ACCOUNT (required):
   - ion-select with label "Cuenta destino"
   - Options: all wallets EXCEPT selected source account
   - Show: icon + name + current balance
   - Validation: cannot be same as source account
   - Error message: "Selecciona una cuenta destino"
   - Error message: "La cuenta destino no puede ser la misma que la origen"

6. DATE (required):
   - ion-datetime with label "Fecha"
   - Default: today
   - Format: YYYY-MM-DD
   - Max: today

7. DESCRIPTION (required):
   - ion-textarea with label "Descripción"
   - Placeholder: "ej. Transferencia a caja chica"
   - Rows: 3
   - Validation: required, min 10 characters

FOOTER BUTTONS:
- "Cancelar" button (secondary, left-aligned)
- "Transferir" button (primary, right-aligned)
- Disable "Transferir" button if form is invalid

VALIDATION BEHAVIOR:
- Show error messages below fields in red
- Real-time validation on blur
- Disable "Transferir" until all required fields are valid
- Validate: amount > 0, from != to, sufficient balance

DYNAMIC BEHAVIOR:
- Selecting "From Account":
  * Update available "To Account" options (exclude selected)
  * Show balance preview
  * Warning if amount > 50% of balance: "Estás transfiriendo más del 50% del saldo"
- Selecting "To Account":
  * Show balance preview
- Changing currency:
  * Shows/hides exchange rate field

CONFIRMATION DIALOG (before submitting):
- Title: "Confirmar Transferencia"
- Message: "¿Transferir $[amount] [currency] de [from account] a [to account]?"
- Buttons: "Cancelar" and "Confirmar"
- Show exchange rate if applicable

STATES:

- LOADING STATE:
  * Show ion-spinner on "Transferir" button
  * Disable all buttons
  * Text: "Transferiendo..."

- SUCCESS STATE:
  * Close modal automatically
  * Show toast: "Transferencia creada correctamente" (green)
  * Refresh accounts and transactions lists

- ERROR STATE:
  * Keep modal open
  * Show toast: "Error al transferir" (red)
  * Re-enable buttons

STYLING:
- Amount field: font-size 1.5em, font-weight 600, text-align right
- Account options: show balance in smaller font, gray color
- Warning messages: color var(--ion-color-warning), font-size 0.9em
- Form fields: padding 12px 16px
- Buttons: padding 12px 24px, border-radius 8px

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, placeholders, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Módulo 5: Aprobación y Conciliación

### Pantalla 5.1: Lista de Aprobaciones Pendientes

**Archivo**: `approval.page.html`

#### ¿Qué es esta pantalla?

Es la pantalla donde el administrador puede ver todas las transacciones pendientes de aprobación y aprobarlas o anularlas.

#### ¿Para qué sirve?

- **Revisar transacciones**: Ver todas las transacciones que esperan aprobación
- **Aprobar transacciones**: Confirmar que las transacciones son correctas
- **Anular transacciones**: Rechazar transacciones incorrectas o fraudulentas
- **Control financiero**: Mantener control sobre los movimientos de dinero

#### ¿Qué hace el usuario aquí?

1. **Ve la lista**: Desplaza la lista de transacciones pendientes
2. **Revisa detalles**: Toca una transacción para ver más información
3. **Aprueba**: Desliza hacia la derecha o toca "Aprobar" para confirmar
4. **Anula**: Desliza hacia la izquierda o toca "Anular" para rechazar (debe dar razón)
5. **Ve resumen**: Ve el total pendiente y cantidad de transacciones

#### Prompt para Generación

```
Create a transaction approval page for a condominium management app using Ionic 8.

PURPOSE: Display pending transactions awaiting approval. Admins can approve (confirm) or void (reject) transactions. This is a control mechanism to ensure all transactions are reviewed before affecting account balances.

LAYOUT STRUCTURE:
- Header with title "Aprobaciones Pendientes" and back button
- Badge showing count of pending transactions (ion-badge, primary color)
- Scrollable content area with pending transactions list

SUMMARY SECTION (top):
- ion-card with summary information:
  * "Total Pendiente": $X,XXX.XX (large, bold, primary color)
  * "Transacciones Pendientes": X (medium, gray)
  * "Más Antigua": [date] (small, gray)
  * Card has subtle shadow and border-radius 12px

PENDING TRANSACTIONS LIST (ion-list):

Each pending transaction (ion-item-sliding):

- LEFT: Icon circle (40px diameter)
  * Income: arrow-down-circle (green background)
  * Expense: arrow-up-circle (red background)
  * Transfer: swap-horizontal (blue background)

- MIDDLE:
  * Category name or "Transferencia" (bold, 1em)
  * Amount (large, 1.2em, font-weight 600, colored by type)
  * Date and description (small, gray, 0.9em)
  * Wallet name (small, gray, 0.85em)

- RIGHT: Status badge "Pendiente" (yellow ion-badge)

SWIPE ACTIONS (ion-item-options):

- SWIPE RIGHT (approve):
  * "Aprobar" button (success color, green)
  * Icon: checkmark-circle
  * Shows confirmation dialog: "¿Aprobar esta transacción de $[amount]?"
  * On confirm: transaction status changes to 'completed', balance updates

- SWIPE LEFT (void):
  * "Anular" button (danger color, red)
  * Icon: close-circle
  * Shows reason dialog: "¿Por qué anulas esta transacción?" with textarea (required)
  * On confirm: transaction status changes to 'voided', reversal created if needed

EMPTY STATE:
- Large ion-icon "checkmark-circle-outline" (64px, success color, centered)
- Message: "No hay transacciones pendientes" (centered, 1.1em)
- Subtitle: "Todas las transacciones han sido aprobadas" (small, gray)
- Button: "Ver todas las transacciones" (secondary, navigates to transactions list)

LOADING STATE:
- ion-spinner centered in content area
- Text: "Cargando transacciones pendientes..."

ERROR STATE:
- Large ion-icon "alert-circle-outline" (64px, danger color)
- Message: "Error al cargar las transacciones" (centered, danger)
- Button: "Reintentar" (secondary)

INTERACTIONS:

- TAP ON TRANSACTION:
  * Navigate to transaction detail page
  * Show full details, accounting entries, approval info

- SWIPE RIGHT (approve):
  * Reveal "Aprobar" button
  * Confirmation dialog appears
  * On confirm: success toast, refresh list

- SWIPE LEFT (void):
  * Reveal "Anular" button
  * Reason dialog appears with textarea
  * On confirm: success toast, refresh list

- PULL TO REFRESH:
  * ion-refresher at top of list
  * Refreshes pending transactions

CONFIRMATION DIALOGS:

- APPROVE DIALOG:
  * Title: "Aprobar Transacción"
  * Message: "¿Aprobar esta transacción de $[amount] [currency]?"
  * Details: category, account, date
  * Buttons: "Cancelar" and "Aprobar" (success)

- VOID DIALOG:
  * Title: "Anular Transacción"
  * Message: "¿Por qué anulas esta transacción?"
  * Textarea: required, min 10 characters
  * Placeholder: "Ej. Monto incorrecto, transacción duplicada..."
  * Buttons: "Cancelar" and "Anular" (danger)
  * Warning: "Esta acción creará una transacción de reversa"

STYLING:
- Transaction items: padding 12px 16px, border-bottom: 1px solid var(--ion-color-light)
- Amount: font-family monospace, right-aligned
- Status badge: ion-badge with warning color
- Swipe buttons: full height, icon + text
- Responsive: max-width 600px on desktop

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, dialogs, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Módulo 6: Reportes Financieros

### Pantalla 6.1: Menú de Reportes

**Archivo**: `reports.page.html`

#### ¿Qué es esta pantalla?

Es la pantalla principal de reportes donde el administrador puede seleccionar qué tipo de reporte financiero generar: libros contables legales o estados financieros.

#### ¿Para qué sirve?

- **Acceder a reportes**: Punto de entrada para todos los reportes financieros
- **Generar reportes legales**: Libro Diario, Libro Mayor, Balance de Comprobación
- **Generar estados financieros**: Balance General, Estado de Resultados
- **Exportar datos**: Descargar reportes en PDF o Excel

#### ¿Qué hace el usuario aquí?

1. **Selecciona rango de fechas**: Elige el período del reporte
2. **Selecciona tipo de reporte**: Toca un reporte de la lista
3. **Ve el reporte**: Navega a la pantalla del reporte seleccionado
4. **Exporta**: Toca el botón de exportar para descargar PDF/Excel

#### Prompt para Generación

```
Create a financial reports menu page for a condominium management app using Ionic 8.

PURPOSE: Main entry point for all financial reports. Users can select report type, date range, and generate legal books or financial statements required by law.

LAYOUT STRUCTURE:
- Header with title "Reportes Financieros" and back button
- Scrollable content area with report categories

DATE RANGE SELECTOR (top, ion-card):
- "Desde" ion-datetime (default: first day of current month)
- "Hasta" ion-datetime (default: today)
- Quick filter buttons (ion-segment):
  * "Este Mes"
  * "Mes Anterior"
  * "Este Año"
  * "Año Anterior"
- Selected range displayed as text: "1 Jun 2026 - 30 Jun 2026"

LEGAL REPORTS SECTION:

- Section header: "Libros Contables" (ion-item-divider, bold)
- Subtitle: "Requeridos por la Ley de Propiedad Horizontal" (small, gray)

Report cards (ion-card, clickable, border-left 4px solid primary):

1. LIBRO DIARIO:
   - Icon: book-outline (large, 32px, primary color)
   - Title: "Libro Diario" (bold, 1.1em)
   - Description: "Registro cronológico de todas las transacciones" (small, gray)
   - Badge: "Legal" (ion-badge, primary color)
   - Tap: navigate to journal report view

2. LIBRO MAYOR:
   - Icon: list-outline (large, 32px, primary color)
   - Title: "Libro Mayor" (bold, 1.1em)
   - Description: "Movimiento detallado por cuenta contable" (small, gray)
   - Badge: "Legal" (ion-badge, primary color)
   - Tap: navigate to account selector, then general ledger view

3. BALANCE DE COMPROBACIÓN:
   - Icon: calculator-outline (large, 32px, primary color)
   - Title: "Balance de Comprobación" (bold, 1.1em)
   - Description: "Verificación de que débitos = créditos" (small, gray)
   - Badge: "Legal" (ion-badge, primary color)
   - Tap: navigate to trial balance report view

FINANCIAL STATEMENTS SECTION:

- Section header: "Estados Financieros" (ion-item-divider, bold)
- Subtitle: "Para análisis y toma de decisiones" (small, gray)

Report cards (ion-card, clickable, border-left 4px solid secondary):

4. BALANCE GENERAL:
   - Icon: pie-chart-outline (large, 32px, secondary color)
   - Title: "Balance General" (bold, 1.1em)
   - Description: "Activos, Pasivos y Patrimonio del condominio" (small, gray)
   - Badge: "Financiero" (ion-badge, secondary color)
   - Tap: navigate to balance sheet report view

5. ESTADO DE RESULTADOS:
   - Icon: trending-up-outline (large, 32px, secondary color)
   - Title: "Estado de Resultados" (bold, 1.1em)
   - Description: "Ingresos y Egresos del período" (small, gray)
   - Badge: "Financiero" (ion-badge, secondary color)
   - Tap: navigate to income statement report view

EXPORT SECTION (bottom, ion-card):
- Title: "Exportar Reportes" (bold)
- Two buttons (ion-grid, 2 columns):
  * "Exportar PDF" (ion-icon print-outline, full width button)
  * "Exportar Excel" (ion-icon document-text-outline, full width button)
- Buttons disabled until report is generated

INTERACTIONS:

- TAP ON REPORT CARD:
  * Navigate to report view with selected date range
  * Report loads with data for selected period

- CHANGE DATE RANGE:
  * Update quick filter buttons state
  * Apply to all reports

- TAP EXPORT BUTTON:
  * Generate downloadable file
  * Show loading spinner
  * Success: toast "Reporte exportado correctamente"
  * Error: toast "Error al exportar"

STYLING:
- Report cards: padding 16px, margin-bottom 12px, border-radius 8px
- Icons: 32px diameter, colored circle background
- Badges: ion-badge with appropriate color, font-size 0.75em
- Section headers: background var(--ion-color-light), padding 12px 16px
- Date selector: ion-card with padding 16px

RESPONSIVE:
- Mobile: single column, full width
- Tablet/Desktop: 2 columns for report cards, max-width 800px centered

TEXT USAGE:
- Use direct Spanish text for all UI elements
- All labels, descriptions, and messages in Spanish
- No translation pipes or i18n keys
```

---

## Notas de Uso

1. **Copia el prompt** de la pantalla que quieres generar
2. **Pégalo en tu herramienta** (Google Stitch, v0, etc.)
3. **Ajusta el styling** según tu sistema de diseño específico
4. **Genera el código** e intégralo en tu proyecto Angular
5. **Prueba en múltiples dispositivos** (mobile, tablet, desktop)

## Componentes Ionic Comunes

- `ion-header`, `ion-content`, `ion-footer`
- `ion-card`, `ion-card-content`, `ion-card-header`
- `ion-item`, `ion-item-divider`, `ion-item-sliding`
- `ion-input`, `ion-textarea`, `ion-select`, `ion-datetime`
- `ion-button`, `ion-fab`, `ion-fab-button`
- `ion-icon`, `ion-badge`, `ion-spinner`
- `ion-list`, `ion-refresher`
- `ion-segment`, `ion-segment-button`
- `ion-grid`, `ion-row`, `ion-col`

## Esquema de Colores

- Primary: `#ff8200` (naranja)
- Success: `--ion-color-success` (verde)
- Danger: `--ion-color-danger` (rojo)
- Warning: `--ion-color-warning` (amarillo)
- Secondary: `--ion-color-secondary` (azul)
- Light: `--ion-color-light` (gris claro)

## Breakpoints Responsivos

- Mobile: < 768px (1 columna)
- Tablet: 768px - 1024px (2 columnas)
- Desktop: > 1024px (max-width 1200px centrado)
