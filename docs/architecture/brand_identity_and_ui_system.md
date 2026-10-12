# VOKO — Identidad Visual y Sistema de Diseño UI/UX
**Versión:** 1.0.0 — Hito 0  
**Especialidad:** Diseño de Producto SaaS Moderno  

---

## 1. Estado del Activo de Marca (Logotipo)

En la inspección técnica realizada en el Hito 0 sobre el directorio de trabajo y el entorno del sistema:
- **Estado Actual:** El usuario indicó en el prompt maestro *"Voy a adjuntar el logotipo de Voko al mensaje inicial"*, sin embargo, el archivo del logotipo no fue transferido físicamente al workspace en esta primera interacción.
- **Acción Preventiva de Seguridad de Marca:** En estricto cumplimiento de la regla *"No inventes un logotipo alternativo ni alteres el original para hacerlo encajar en la interfaz. No inventes colores de marca antes de analizar el adjunto"*, **no se generará ningún logotipo artificial alternativo**.
- **Procedimiento Acordado:**
  1. Se reserva la ubicación oficial del asset: `apps/web/public/brand/voko-logo.svg` (o `.png`) y su variante para fondo oscuro `voko-logo-dark.svg`.
  2. Se define una arquitectura de tokens CSS y variables de Tailwind completamente parametrizadas.
  3. En la sección de decisiones y preguntas del informe final del Hito 0, se solicita al usuario que coloque el archivo del logotipo en el directorio o proporcione su ruta para calibrar los colores primarios y secundarios exactos en el Hito 1.

---

## 2. Dirección Visual y Principios de Diseño

Voko debe transmitir:
- **Confianza y Solidez:** Estructuras limpias, jerarquía tipográfica rigurosa, contraste accesible (WCAG AA mínimo de 4.5:1 para texto normal).
- **Simplicidad y Agilidad:** Cero fricción para que un cliente reserve en menos de 3 pasos (Servicio -> Fecha/Hora -> Confirmación).
- **Profesionalismo SaaS:** Paleta sobria, bordes sutiles, microinteracciones fluidas pero contenidas, sin saturación visual.
- **Evitaciones Estrictas:** Sin gradientes estridentes, sin sombras pesadas, sin emojis utilizados como sustitutos de iconos SVG profesionales (usaremos `Lucide React`).

---

## 3. Sistema de Tokens de Diseño (CSS Custom Properties & Tailwind)

### 3.1. Tipografía
- **Fuente Principal:** `Inter`, `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Fuente Numérica / Horarios:** `Inter` con `font-feature-settings: "tnum"` (números tabulares para alineación perfecta de horas y precios).
- **Escala Modular:**
  - `text-xs`: 12px (0.75rem) — Badges, leyendas, metadatos.
  - `text-sm`: 14px (0.875rem) — Textos secundarios, inputs, celdas de tabla.
  - `text-base`: 16px (1rem) — Texto de párrafo y lectura principal.
  - `text-lg`: 18px (1.125rem) — Títulos de tarjetas y subtítulos.
  - `text-xl`: 20px (1.25rem) — Títulos de sección.
  - `text-2xl`: 24px (1.5rem) — Títulos de página y diálogos modales.
  - `text-3xl`: 30px (1.875rem) — Títulos de portada / landing pública.

### 3.2. Paleta de Colores Neutros y Semánticos
```css
:root {
  /* Marca (Parametrizada para sincronizar con el logotipo en cuanto se reciba) */
  --brand-primary: #1E40AF;       /* Azul marino corporativo sobrio (provisional) */
  --brand-primary-hover: #1D4ED8;
  --brand-accent: #3B82F6;
  --brand-surface: #F8FAFC;

  /* Neutros (Slate Palette) */
  --text-main: #0F172A;          /* Slate 900 */
  --text-muted: #64748B;         /* Slate 500 */
  --text-subtle: #94A3B8;        /* Slate 400 */
  --border-light: #E2E8F0;       /* Slate 200 */
  --border-focus: #3B82F6;       /* Blue 500 */
  --bg-app: #F8FAFC;             /* Slate 50 */
  --bg-card: #FFFFFF;

  /* Semántica de Estados Operativos */
  --status-pending-bg: #FEF3C7;  /* Amber 100 */
  --status-pending-text: #92400E;/* Amber 800 */

  --status-confirmed-bg: #DCFCE7;/* Green 100 */
  --status-confirmed-text: #166534;/* Green 800 */

  --status-completed-bg: #E0E7FF;/* Indigo 100 */
  --status-completed-text: #3730A3;/* Indigo 800 */

  --status-cancelled-bg: #FEE2E2;/* Red 100 */
  --status-cancelled-text: #991B1B;/* Red 800 */

  --status-noshow-bg: #F1F5F9;   /* Slate 100 */
  --status-noshow-text: #475569; /* Slate 600 */
}
```

### 3.3. Radios y Sombras
- **Border Radius:**
  - Componentes pequeños (badges, chips): `rounded-md` (6px).
  - Inputs, botones y selects: `rounded-lg` (8px).
  - Tarjetas y modales: `rounded-xl` (12px).
- **Sombras:**
  - Tarjeta normal: `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`).
  - Hover / Diálogo elevado: `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`).
  - Desplegable / Menú: `shadow-lg`.

---

## 4. Catálogo de Componentes UI Esenciales (Hitos 1 a 7)

1. **Botones (`Button`):**
   - Variantes: `primary`, `secondary`, `outline`, `ghost`, `destructive`.
   - Estados: `default`, `hover`, `active`, `focus-visible`, `loading` (spinner integrado y deshabilitado), `disabled`.
2. **Campos de Formulario (`Input`, `Select`, `Textarea`):**
   - Etiqueta clara (`<label>`), indicador de obligatorio, texto de ayuda y mensaje de error reactivo (`<p role="alert">`).
3. **Selector de Fecha y Franjas Horarias (`TimeSlotPicker`):**
   - Cuadrícula de botones con chips para cada slot disponible (ej. "09:30").
   - Estados: disponible (clickable), seleccionado (resaltado con color primario), no disponible / ocupado (deshabilitado con opacidad baja).
4. **Tarjetas de Turno (`AppointmentCard`):**
   - Encabezado con hora y fecha destacadas.
   - Badge semántico de estado.
   - Datos del cliente o profesional, servicio y sucursal.
   - Menú de acciones (confirmar, reprogramar, cancelar, ver historial).
5. **Componentes de Feedback y Estados:**
   - `LoadingSkeleton`: Animación de carga sutil para listas y tablas mientras consulta la API.
   - `EmptyState`: Mensaje claro, ilustración o icono sobrio y botón de acción principal cuando no hay turnos ni servicios creados.
   - `ErrorBanner`: Alerta accesible para fallos de red o de autorización.
