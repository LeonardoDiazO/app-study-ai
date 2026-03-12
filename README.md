# StudyAI

> **MVP — Fase 1** · Convierte cualquier PDF en un curso interactivo completo, impulsado por Google Gemini AI.

StudyAI toma tus materiales de estudio (PDFs) y genera automáticamente un curso estructurado con módulos, mapas mentales interactivos, diagramas de flujo, extracción de contenido visual, quizzes, flashcards, un chatbot tutor y un examen final — todo corriendo en el navegador, sin backend propio.

> **Este es un MVP de primera fase.** No existe autenticación de usuarios, ni base de datos, ni backend. Todo funciona en el navegador del usuario con su propia API Key de Gemini. Las fases siguientes están documentadas como Issues abiertos — la comunidad es bienvenida a contribuir, proponer y dar feedback.

---

## Por qué Gemini

StudyAI usa **Google Gemini 2.5 Flash** como único proveedor de IA, y la razón es técnica y específica: Gemini es el modelo con mejor soporte nativo para la **lectura multimodal de PDFs**. A diferencia de otros modelos que requieren extracción previa de texto (OCR, parsers), Gemini recibe el PDF completo como documento binario y lo "ve" como lo vería un lector humano — incluyendo tablas, gráficas, diagramas, imágenes y la estructura visual de las páginas. Esto hace posible la extracción de contenido visual que otros modelos no pueden hacer sin pipelines adicionales.

El tier gratuito (10 RPM, 500 RPD) es suficiente para generar cursos. Cada usuario usa su propia API Key — StudyAI no opera con una clave centralizada en esta fase.

---

## Estado actual — MVP Fase 1

| Área | Estado |
|---|---|
| Generación de cursos desde PDF | ✅ Funcionando |
| Mapas mentales interactivos | ✅ Funcionando |
| Diagramas de flujo | ✅ Funcionando |
| Extracción de contenido visual | ✅ Funcionando |
| Quizzes + Examen Final | ✅ Funcionando |
| Flashcards con sistema Leitner | ✅ Funcionando |
| Chatbot tutor IA | ✅ Funcionando |
| Notas por módulo | ✅ Funcionando |
| Práctica de código | ✅ Funcionando |
| Progreso por módulo | ✅ Funcionando |
| Múltiples cursos (hasta 3 slots) | ✅ Funcionando |
| Tema claro / oscuro | ✅ Funcionando |
| Autenticación de usuarios | ❌ Fase 2 |
| Backend / base de datos | ❌ Fase 2 |
| Sincronización entre dispositivos | ❌ Fase 2 |
| Cuota compartida / planes de pago | ❌ Fase 3 |

---

## Características

- **PDF → Curso** — Sube hasta 3 PDFs (máx. 100 páginas c/u) y obtén un curso completo en minutos
- **Módulos adaptativos** — La cantidad de módulos escala automáticamente con el tamaño del PDF (2–8 módulos)
- **Extracción visual** — Gemini identifica y describe tablas, gráficas, diagramas e imágenes del PDF
- **Mapas Mentales interactivos** — Zoom, paneo y colapso de nodos con Markmap.js
- **Diagramas de Flujo** — Flowcharts Mermaid.js con relaciones y procesos del contenido
- **Progreso por módulo** — Contenido visto (20%) + quiz (50%) + flashcards dominadas (30%)
- **Quizzes** — 5 preguntas por módulo con explicaciones
- **Examen Final** — 12 preguntas acumulativas de todos los módulos
- **Flashcards** — Repetición espaciada con el sistema de cajas Leitner
- **Chatbot Tutor IA** — Pregunta sobre el contenido del curso en tiempo real
- **Notas** — Escribe y guarda notas por módulo
- **Práctica de código** — Detecta contenido de programación y genera ejercicios prácticos
- **3 cursos en paralelo** — Hasta 3 slots de cursos guardados en localStorage
- **Tema claro / oscuro** — Persistido por sesión; afecta diagramas y toda la UI
- **Resiliencia ante rate limits** — Backoff exponencial con hasta 5 reintentos y contador en vivo
- **Recuperación de generación** — Si falla a mitad, un banner permite reanudar desde el último PDF procesado
- **Multilenguaje** — El contenido se genera en el idioma del documento subido

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| UI Framework | React 19 |
| Lenguaje | TypeScript 5 (strict) |
| Build Tool | Vite 7 |
| Estilos | Tailwind CSS 4 |
| Modelo IA | Google Gemini 2.5 Flash |
| Mapas Mentales | Markmap.js + markmap-lib |
| Diagramas de Flujo | Mermaid.js |
| Estado | React hooks + Context |
| Persistencia | localStorage (cursos) + sessionStorage (API Key en sesión) |
| Proxy | Vercel Serverless Function (`api/gemini.ts`) |

---

## Cómo funciona

Al hacer clic en **Generar Curso**:

1. Valida páginas y tamaño de cada PDF en el cliente (antes de enviar nada)
2. Convierte cada PDF a base64 y lo envía a Gemini a través del proxy Vercel
3. Gemini lee el documento completo (texto + imágenes + tablas) y devuelve JSON con:
   - Títulos, resúmenes y conceptos clave por módulo
   - Descripciones de elementos visuales (tablas, gráficas, diagramas, figuras)
   - Markdown para el mapa mental (Markmap.js)
   - Sintaxis Mermaid para el diagrama de flujo
   - 5 preguntas de quiz con explicaciones por módulo
   - Ejercicios de código si el contenido es de programación
4. Una segunda solicitud genera el examen final de 12 preguntas
5. Todo se guarda en `localStorage` — sin re-solicitudes al navegar

Una pausa de 7 segundos entre llamadas respeta el límite de 10 RPM. Los errores 429 activan backoff exponencial (`delay × 2^intento`, tope 3 min) con contador en vivo.

---

## Privacidad y Seguridad

| Dato | Recorrido | Almacenamiento |
|---|---|---|
| **API Key** | Navegador → Proxy Vercel → Google | `sessionStorage` · se borra al cerrar la pestaña |
| **Contenido PDF** | Navegador → Proxy Vercel → Google Gemini | Nunca almacenado en ningún servidor |
| **Datos del curso** | Solo tu navegador | `localStorage` · nunca sale de tu dispositivo |

> El proxy Vercel solo reenvía peticiones — no guarda ningún dato. Al aceptar el aviso de privacidad en la app, el usuario reconoce que su API Key y PDFs pasan por este proxy antes de llegar a Google.

---

## Prerequisitos

- **Node.js** `>= 18.x`
- **npm** `>= 9.x`
- Una **Gemini API Key** gratuita

```bash
node -v && npm -v
```

---

## Obtener una Gemini API Key

1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Inicia sesión con cualquier cuenta de Google
3. Clic en **"Create API key"** → **"Create API key in new project"**
4. Copia la clave — empieza con `AIzaSy...`

> La app detecta automáticamente la key si la copias al portapapeles y vuelves a la pestaña. También hay un checkbox "Recordar en este navegador" para no ingresarla cada sesión.

---

## Despliegue Local

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/StudyAI.git
cd StudyAI
npm install
```

### 2. Configurar entorno (opcional)

Para desarrollo sin ingresar la key en la UI, crea `.env.local`:

```bash
# .env.local — NO se sube a git (está en .gitignore)
VITE_USE_OPERATOR_KEY=true
GEMINI_API_KEY=AIzaSy...
```

Sin este archivo, la app funciona normalmente pidiendo la key al usuario.

### 3. Iniciar

```bash
npm run dev
# → http://localhost:5173
```

El proxy de desarrollo de Vite intercepta `/api/gemini` y reenvía a Gemini directamente. No se necesita `vercel dev`.

---

## Despliegue en Producción (Vercel)

### Modo key del usuario (por defecto)

1. Conecta el repo en [vercel.com/new](https://vercel.com/new)
2. No agregues variables de entorno
3. Deploy — la UI pedirá la key a cada usuario

### Modo operator key (demo interna / staging)

En Vercel → **Settings → Environment Variables**:

| Variable | Valor | Scope |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` | Production, Preview |
| `VITE_USE_OPERATOR_KEY` | `true` | Production, Preview |

Hacer **Redeploy** tras guardar las variables.

---

## Modos de API Key

```
VITE_USE_OPERATOR_KEY=false  →  UI muestra campo de key  →  proxy usa Bearer token del cliente
VITE_USE_OPERATOR_KEY=true   →  UI oculta campo de key   →  proxy usa GEMINI_API_KEY (env var)
```

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR y proxy a Gemini |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Preview del build en local |
| `npm run lint` | ESLint en todo el proyecto |

---

## Estructura del proyecto

```
├── api/
│   └── gemini.ts              # Proxy Vercel — reenvía a Gemini, gestiona API key
│
├── src/
│   ├── components/
│   │   ├── ChatBot/           # Chatbot tutor IA
│   │   ├── ConceptMap/        # Mapa mental Markmap con fallback SVG legacy
│   │   ├── FlowDiagram/       # Diagrama de flujo Mermaid.js
│   │   ├── FlashcardDeck/     # Flashcards con sistema de cajas Leitner
│   │   ├── NotesPanel/        # Editor de notas por módulo
│   │   ├── Practice/          # Ejercicios de código
│   │   └── Quiz/              # Quiz con explicaciones
│   ├── constants/             # Claves de storage, límites
│   ├── context/
│   │   ├── CourseContext.tsx  # Estado global multi-curso + persistencia
│   │   └── ThemeContext.tsx   # Tema claro/oscuro
│   ├── hooks/
│   │   ├── useCourse.ts       # Acceso al CourseContext
│   │   ├── useFlashcards.ts   # Lógica de cajas Leitner
│   │   └── useStorage.ts
│   ├── services/
│   │   ├── ai/gemini.ts       # Integración Gemini 2.5 Flash + backoff
│   │   └── storage.ts         # Abstracción localStorage / Tauri
│   ├── types/                 # Tipos TypeScript (course, flashcard, courseSlot…)
│   ├── utils/
│   │   ├── buildCards.ts
│   │   ├── extractPageCount.ts    # Parser de páginas PDF sin dependencias
│   │   └── moduleProgress.ts      # Cálculo de progreso por módulo
│   ├── views/                 # Vistas completas (Upload, Dashboard, Module, Exam…)
│   ├── App.tsx                # Routing y orquestación de estado
│   └── main.tsx               # Entry point
│
├── .env.local                 # Variables locales (en .gitignore)
├── .env.example               # Plantilla documentada
├── vite.config.ts             # Proxy dev + chunking producción
└── vercel.json                # Headers de seguridad + SPA rewrite
```

---

## Límites del MVP

| Límite | Valor | Motivo |
|---|---|---|
| Máx. PDFs por curso | 3 | Límite de tokens de Gemini por request |
| Máx. páginas por PDF | 100 | Costo de tokens y tiempo de respuesta |
| Máx. tamaño por PDF | 3 MB | Límite del body en Vercel Hobby (4.5 MB) |
| Máx. cursos guardados | 3 slots | localStorage · sin backend |
| Módulos por curso | 2–8 | Adaptativo según páginas del PDF |

---

## Rate Limit y Contingencia

Gemini 2.5 Flash tier gratuito: **10 RPM, 500 RPD**.

| Capa | Mecanismo |
|---|---|
| Proactiva | Pausa de 7 s entre cada llamada |
| Reactiva | 5 reintentos con backoff exponencial (`delay × 2^intento`, tope 3 min) |
| Cuota diaria | Detecta agotamiento RPD y muestra "Vuelve mañana" |
| Recuperación | Banner naranja permite reanudar desde el último PDF completado |

---

## Progreso por Módulo

| Actividad | Peso |
|---|---|
| Contenido visto | 20% |
| Puntuación del quiz | hasta 50% |
| Flashcards dominadas (≥ caja 3) | hasta 30% |

---

## Limitaciones conocidas del MVP

- Requiere conexión a internet (PDFs van a Google vía proxy)
- Sin autenticación — los cursos solo existen en el navegador actual
- Máximo 3 cursos almacenados (sin backend)
- La recuperación de generación es en memoria — recargar durante la generación pierde el progreso parcial
- Las imágenes reales de los PDFs no se muestran — se muestran como descripciones de IA
- 500 requests/día en tier gratuito — uso intensivo puede alcanzar el límite

---

## Roadmap — Issues abiertos

Las siguientes fases están pensadas para crecer con ayuda de la comunidad. Cada issue describe qué se necesita, por qué importa y los criterios de aceptación básicos. Si quieres contribuir o dar feedback, abre una discusión en el issue correspondiente.

---

### Issue #1 — `feat` · Autenticación con Google OAuth

**Fase:** 2 · **Prioridad:** Alta

**Descripción:**
Actualmente no hay autenticación. Cada usuario usa su propia API Key de Gemini, lo que genera fricción (obtener la key, ingresarla, recordarla). El objetivo es permitir que el usuario inicie sesión con su cuenta de Google y que la app use el token OAuth para hacer llamadas a Gemini bajo la cuota del propio usuario — sin que StudyAI maneje claves propias.

**Por qué importa:**
- Elimina el paso de obtener y pegar una API Key
- Permite persistir los cursos por cuenta, no por navegador
- Abre la puerta a sincronización entre dispositivos
- Requisito previo para cualquier modelo de negocio (planes, cuotas, etc.)

**Criterios de aceptación:**
- [ ] Login con Google (OAuth 2.0, scope `generativelanguage`)
- [ ] El token del usuario se usa en el proxy para llamadas a Gemini
- [ ] Logout limpia datos de sesión
- [ ] No se almacena el token en localStorage

---

### Issue #2 — `feat` · Backend y persistencia en la nube

**Fase:** 2 · **Prioridad:** Alta

**Descripción:**
Los cursos actualmente se guardan en `localStorage` del navegador — máximo 3, solo en ese dispositivo, se pierden al limpiar el navegador. Se necesita un backend que almacene los cursos por cuenta de usuario.

**Por qué importa:**
- Los usuarios pueden acceder a sus cursos desde cualquier dispositivo
- Elimina el límite de 3 cursos
- Habilita funcionalidades sociales futuras (compartir, colaborar)

**Stack sugerido:** Supabase (PostgreSQL + Auth + Storage) o Firebase — sin servidor propio para mantener costos bajos en etapa inicial.

**Criterios de aceptación:**
- [ ] Cursos guardados en DB vinculados al usuario autenticado
- [ ] CRUD completo de cursos (crear, leer, actualizar, eliminar)
- [ ] Migración automática de cursos en localStorage al primer login
- [ ] Offline fallback: si no hay conexión, usa localStorage como caché

---

### Issue #3 — `feat` · Soporte para múltiples modelos de IA

**Fase:** 2 · **Prioridad:** Media

**Descripción:**
StudyAI está acoplado a Gemini 2.5 Flash. La interfaz `AIProvider` ya existe en el código (`src/services/ai/types.ts`) pensada para soportar múltiples proveedores. Se necesita implementar adaptadores para otros modelos y permitir al usuario elegir.

**Por qué importa:**
- Gemini es la mejor opción para PDFs hoy, pero el mercado evoluciona
- Usuarios con Claude API o OpenAI podrían preferir esos modelos
- Reduce la dependencia de un solo proveedor

**Modelos candidatos:** Claude 3.5 Sonnet (Anthropic), GPT-4o (OpenAI), Gemini 1.5 Pro (contexto mayor para PDFs largos)

**Criterios de aceptación:**
- [ ] Selector de modelo en la pantalla de subida
- [ ] Adaptador `ClaudeProvider` implementando la interfaz `AIProvider`
- [ ] Adaptador `OpenAIProvider` implementando la interfaz `AIProvider`
- [ ] El prompt se ajusta automáticamente a las capacidades de cada modelo

---

### Issue #4 — `feat` · Planes de pago y cuota gestionada

**Fase:** 3 · **Prioridad:** Media

**Descripción:**
En el MVP cada usuario usa su propia API Key con cuota personal de Google. Para crecer a un producto SaaS, StudyAI necesita gestionar su propia cuota de Gemini y ofrecer planes (free, pro, etc.) con distintos límites de uso.

**Por qué importa:**
- Elimina completamente la necesidad de que los usuarios tengan una API Key
- Permite monetizar el producto
- Necesario para alcanzar usuarios no técnicos

**Criterios de aceptación:**
- [ ] Plan free: X cursos/mes con límites de páginas
- [ ] Plan pro: cursos ilimitados, PDFs más grandes
- [ ] Integración con Stripe (pagos)
- [ ] Dashboard de uso por usuario
- [ ] La app nunca expone la API Key del operador al cliente

---

### Issue #5 — `feat` · Algoritmo de repetición espaciada real (SRS)

**Fase:** 3 · **Prioridad:** Media

**Descripción:**
Las flashcards usan el sistema de cajas Leitner (básico), pero no hay un calendario de revisiones. El usuario no sabe cuándo revisar cada tarjeta. Se necesita implementar un algoritmo SRS real (SM-2 o FSRS) con fechas de revisión programadas.

**Por qué importa:**
- La repetición espaciada es el método más efectivo para memorización a largo plazo
- Sin calendario, las flashcards son una herramienta pasiva, no activa

**Criterios de aceptación:**
- [ ] Algoritmo SM-2 o FSRS implementado
- [ ] Cada flashcard tiene una fecha de próxima revisión
- [ ] Dashboard "Para revisar hoy" en el inicio
- [ ] Notificaciones opcionales (si se implementa PWA)
- [ ] Las fechas se persisten en backend (Issue #2)

---

### Issue #6 — `feat` · Exportar curso como PDF / slides

**Fase:** 3 · **Prioridad:** Baja

**Descripción:**
Los usuarios quieren poder llevarse el curso generado fuera de la app — como apuntes en PDF, presentación de slides o documento de estudio offline.

**Criterios de aceptación:**
- [ ] Exportar módulo como PDF con resumen, conceptos clave y mapa mental
- [ ] Exportar curso completo como PDF
- [ ] Exportar flashcards como Anki deck (`.apkg`)
- [ ] Exportar como Markdown (para Obsidian, Notion, etc.)

---

### Issue #7 — `feat` · PWA y modo offline parcial

**Fase:** 3 · **Prioridad:** Baja

**Descripción:**
La app es una SPA pero no es una PWA instalable. Los cursos ya generados están en localStorage, lo que significa que técnicamente funcionan offline — pero la app no se puede instalar ni tiene service worker para caching.

**Criterios de aceptación:**
- [ ] Manifest y service worker (Vite PWA plugin)
- [ ] App instalable en móvil y desktop
- [ ] Los cursos ya generados son accesibles offline
- [ ] Las nuevas generaciones requieren conexión (no offline)

---

### Issue #8 — `feat` · Compartir cursos y colaboración

**Fase:** 4 · **Prioridad:** Baja

**Descripción:**
Actualmente los cursos son privados al navegador. No hay forma de compartir un curso generado con otra persona o trabajar en equipo.

**Criterios de aceptación:**
- [ ] Generar link público de solo lectura para un curso
- [ ] El receptor puede abrirlo sin cuenta y sin generar de nuevo
- [ ] Opcional: fork del curso a la cuenta propia
- [ ] Opcional: notas colaborativas en módulos compartidos

---

### Issue #9 — `improvement` · Mejorar extracción de imágenes reales del PDF

**Fase:** 2 · **Prioridad:** Media

**Descripción:**
Actualmente las imágenes, gráficas y tablas del PDF se muestran como descripciones de texto generadas por IA. Gemini puede ver las imágenes, pero no las extrae como archivos para mostrarlas en la UI.

**Por qué importa:**
- El usuario ve "Descripción: gráfica de barras mostrando X" en lugar de la imagen real
- Para documentos con mucho contenido visual, esto es una limitación significativa

**Criterios de aceptación:**
- [ ] Extraer imágenes del PDF client-side (pdf.js o similar)
- [ ] Mostrar la imagen real junto a la descripción de IA
- [ ] Las imágenes se almacenan en IndexedDB (no localStorage — demasiado pesado)
- [ ] Fallback a descripción de texto si la imagen no se puede extraer

---

### Issue #10 — `improvement` · Analytics de aprendizaje

**Fase:** 3 · **Prioridad:** Baja

**Descripción:**
No hay forma de ver el progreso histórico de aprendizaje — cuánto tiempo se estudió, qué módulos cuestan más, evolución de scores en quizzes.

**Criterios de aceptación:**
- [ ] Dashboard de estadísticas: tiempo estudiado, scores promedio, flashcards revisadas
- [ ] Gráfica de progreso por semana
- [ ] "Módulos más difíciles" basado en scores del quiz
- [ ] Requiere Issue #2 (backend) para datos históricos

---

## Contribuir

### 1. Fork y clonar

```bash
git clone https://github.com/tu-usuario/StudyAI.git
cd StudyAI
npm install
```

### 2. Crear una rama

```bash
git checkout -b feat/nombre-de-tu-feature
git checkout -b fix/nombre-del-bug
```

### 3. Antes de hacer commit

```bash
npm run build   # 0 errores TypeScript
npm run lint    # 0 warnings
```

### 4. Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: refactorización sin cambio funcional
docs:     cambios en documentación
style:    cambios de formato/estilo sin lógica
chore:    tareas de mantenimiento
```

### 5. Pull Request

Incluir en la descripción: qué hace, por qué es necesario, capturas para cambios de UI, y el issue relacionado (`Closes #N`).

---

## Licencia

MIT — libre para usar, modificar y distribuir.

---

*StudyAI es un proyecto en desarrollo activo. El feedback de la comunidad es fundamental para decidir qué construir en las siguientes fases. Si usaste la app, abre un issue con tu experiencia.*
