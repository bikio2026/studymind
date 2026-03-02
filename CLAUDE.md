# StudyMind — Guía de Estudio Interactiva desde PDFs

**Version actual**: v0.9

## Qué es
App web que toma un PDF, detecta su estructura, y genera una guía de estudio interactiva por tema con capas de relevancia, explicaciones mejoradas, y autoevaluación. Persistencia server-side con SQLite (@libsql/client, compatible Turso) y biblioteca de documentos.

## Stack
- Vite 7 + React 19 + JavaScript + Tailwind v4 (CSS-based)
- Zustand 5 (estado global)
- SQLite server-side (@libsql/client, compatible Turso)
- pdfjs-dist (parseo PDF client-side)
- LLM multi-provider: Claude API (Haiku/Sonnet), Groq (Llama 3.3 70B)

## Puertos
- **3057**: Frontend (Vite)
- **3058**: API proxy (Node.js HTTP)

## Comandos
```bash
npm run dev      # Frontend + API juntos
npm run client   # Solo frontend
npm run server   # Solo API proxy
npm run build    # Build producción
```

## Arquitectura
```
src/
  stores/
    documentStore.js            — Zustand: biblioteca de documentos
    studyStore.js               — Zustand: estructura + topics generados
    progressStore.js            — Zustand: progreso del estudiante
    chatStore.js                — Zustand: historial de chat por topic
    themeStore.js               — Zustand: tema visual activo (persistido localStorage)
  hooks/
    usePDFParser.js             — Extracción de texto de PDF
    useLLMStream.js             — Streaming SSE multi-provider (Claude/Groq)
    useDocumentAnalysis.js      — Detección de estructura via LLM (+ parser TOC local)
    useStudyGuide.js            — Generación de guías estándar (1 call, secciones cortas)
    useDeepStudyGuide.js        — Pipeline multi-pass profundo (3 passes, secciones largas)
    useChat.js                  — Lógica de chat socrático multi-turn
  lib/
    db.js                       — Fetch wrapper para API SQLite (misma interfaz que antes)
    connectionParser.js         — Parseo y enriquecimiento de conexiones LLM (strings y objetos)
    pdfExtractor.js             — Wrapper de pdfjs-dist
    promptBuilder.js            — Prompts para estructura y guía de estudio
    chunkProcessor.js           — Split de textos largos + fuzzy matching por sección
    textUtils.js                — Utilidades de texto + parser TOC + detección offset páginas
    themes.js                   — 4 temas visuales (midnight, forest, warm, academic)
  components/
    Library.jsx                 — Vista biblioteca (pantalla inicial)
    PDFUploader.jsx             — Drag & drop de PDF
    ProcessingStatus.jsx        — Progreso del pipeline (3 fases)
    LLMSelector.jsx             — Selector de provider/modelo
    DocumentOutline.jsx         — Sidebar con estructura del documento
    StudyGuide.jsx              — Vista principal de la guía
    TopicCard.jsx               — Card por tema (resumen, conceptos, explicación, quiz, chat)
    QuizSection.jsx             — Autoevaluación interactiva (modo self)
    FreeTextQuizSection.jsx     — Quiz texto libre evaluado por LLM
    BookCoverageBar.jsx         — Barra de cobertura SVG tipo torrent
    ChatSection.jsx             — Chat socrático por tema (streaming, persistente)
    ThemeSelector.jsx           — Dropdown selector de tema visual
    RelevanceFilter.jsx         — Filtro por capa de relevancia
  App.jsx                       — Routing biblioteca vs estudio + pipeline
  main.jsx                      — Entry point React
  index.css                     — Tailwind v4 theme
server/index.js                 — API proxy local
lib/
  database.cjs                  — Módulo SQLite (@libsql/client, local file o Turso remoto)
api/
  _shared.js                    — Config, system prompts, CORS
  analyze-claude.js             — Endpoint Claude (Vercel)
  analyze-groq.js               — Endpoint Groq (Vercel)
  db.js                         — Endpoint SQLite serverless (CRUD vía action router)
  health.js                     — Health check proveedores
```

## Pipeline de procesamiento
1. **Parseo PDF** — pdfjs-dist extrae texto página por página (client-side)
2. **Detección TOC** — Parser local regex busca páginas de índice (keywords + dot-leaders + short-num patterns)
3. **Detección de estructura** — Si TOC parser extrae ≥5 entradas: usa directo (sin LLM). Fallback: LLM con budget 12K tokens.
4. **Generación de guías** — Modo automático según tamaño de sección:
   - **Estándar** (<12K chars): 1 llamada LLM (como antes)
   - **Multi-pass** (≥12K chars): 3 passes:
     - Pass 1 (Haiku): Extracción de puntos clave por chunk (~8K tokens c/u)
     - Pass 2 (Sonnet, 16K output): Síntesis profunda (1500-3000 palabras, sub-secciones con ##)
     - Pass 3 (Haiku): Quiz 5-8 preguntas + conexiones
5. **Persistencia** — Cada topic se guarda en SQLite (vía API /api/db) a medida que se genera

## Persistencia (SQLite — @libsql/client)

Local: `file:./data/studymind.db` | Producción: Turso remoto (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)

| Tabla | PK | Contenido |
|-------|-----|-----------|
| documents | id (UUID) | fileName, contentHash, processedAt, book_id, data (JSON blob) |
| structures | document_id | data (JSON: title, author, sections[]) |
| topics | id (docId_sectionId) | document_id, data (JSON: sectionTitle, relevance, summary, etc.) |
| progress | id (docId_topicId) | document_id, data (JSON: studied, quizScores[], resets[]) |
| page_data | document_id | data (JSON: texto extraído por página) |
| chat_history | id (docId_topicId) | document_id, data (JSON: messages[]), updated_at |
| books | id (UUID) | content_hash (UNIQUE), file_name, total_pages, structure (JSON), created_at |

## Capas de relevancia
| Capa | Color | Significado |
|------|-------|-------------|
| core | amber | Concepto fundamental, sin esto no se entiende el resto |
| supporting | blue | Refuerza conceptos core, importante pero no esencial |
| detail | gray | Ejemplos, casos particulares, datos específicos |

## Providers LLM
- **Claude**: Requiere `ANTHROPIC_API_KEY` en .env. Modelos: Haiku 4.5 (rápido), Sonnet 4 (mejor calidad).
- **Groq**: Requiere `GROQ_API_KEY` en .env. Modelo: Llama 3.3 70B.

## Deploy
- **URL**: https://studymind-eight.vercel.app
- Vercel con Serverless Functions en `api/`
- PDF parsing es 100% client-side (no sube archivos al server)
- Requiere environment variables en Vercel para API keys

## Roadmap
Plan completo en `/Users/andresbiscione/.claude/plans/nested-greeting-whisper.md`

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Persistencia y Biblioteca | ✅ Completada |
| 2 | Chat Conversacional (tutor socrático) | ✅ Completada |
| 3 | Referencias cruzadas y al texto fuente | ✅ Completada |
| 4 | Niveles de profundidad y progreso avanzado | ✅ Completada |
| 5 | Rutas de aprendizaje | ✅ Completada |
| 6 | Quiz texto libre + Importación incremental de libros | ✅ Completada |
| 7 | Roles y multi-usuario | Pendiente |

---

## Changelog

### v0.9 — Quiz Texto Libre + Importación Incremental de Libros (2026-03-02)
- **Quiz texto libre**: El estudiante escribe su respuesta y el LLM la evalúa (score 0-100, feedback constructivo)
- Toggle "Autoevaluación / Texto libre" por tema, persistido en localStorage
- Nuevo system prompt `quizEval` + `buildQuizEvaluationPrompt()` con rúbrica comprensión conceptual
- **Entidad Book**: tabla `books` agrupa múltiples imports parciales del mismo PDF por contentHash
- Columna `book_id` en `documents` para vincular documentos a libros
- **BookCoverageBar**: barra SVG tipo torrent que muestra cobertura de secciones procesadas vs pendientes
- 3 variantes de barra: compact (Library), expanded (StudyGuide), interactive (PageRangeDialog)
- **Ampliar cobertura**: botón para subir el mismo PDF y procesar secciones adicionales
- Validación de hash: confirma que el PDF subido es el mismo libro
- PageRangeDialog con barra interactiva: click en sección pendiente auto-selecciona rango
- **Conexiones cross-import**: topics de distintos imports del mismo libro pueden conectarse
- ConnectionLink muestra badge "Otro import" con navegación al documento correcto
- **Vista unificada de libro**: DocumentOutline muestra TODAS las secciones del libro (procesadas y no procesadas)
- Secciones no procesadas aparecen grises con badge "No procesada"
- 2 nuevos componentes: FreeTextQuizSection.jsx, BookCoverageBar.jsx
- 5 nuevas operaciones DB: getBookByHash, getBook, saveBook, getBookDocuments, getBookTopics

### v0.8 — SQLite Migration + Estabilidad (2026-03-02)
- Migración de IndexedDB a SQLite server-side (@libsql/client, compatible Turso)
- Nuevo endpoint /api/db (serverless) + lib/database.cjs (módulo compartido)
- src/lib/db.js reescrito como fetch wrapper (misma interfaz, cero cambios en stores)
- Fix crash al abrir "Conexiones con otros temas" (LLM devolvía objetos en vez de strings)
- Fix browser freeze: cap 50K chars en extracción de texto por sección
- Fix documentos incompletos: loadFromDB mantiene structure sin topics, permite resume
- Pantalla "Sin datos" mejorada con botón Eliminar documento
- detectPageOffset mejorado: prueba TODAS las entradas + partial matching
- Filtro de secciones por rango cambiado a overlap-based
- Guard en StudyGuide: activeTopic inválido cae al primer tema disponible

### v0.7 — Contenido Profundo Multi-Pass, Sidebar Jerárquico, Temas Visuales (2026-03-01)
- Pipeline multi-pass para secciones largas (≥12K chars): 3 passes (Haiku→Sonnet→Haiku)
- Explicaciones profundas de 1500-3000 palabras con sub-secciones (##), ejemplos, fórmulas
- keyConcepts enriquecidos ({term, definition}) + definiciones formales separadas
- Quiz 5-8 preguntas (conceptuales + aplicación) generado desde la síntesis profunda
- Parser TOC local (regex) — evita LLM para detectar estructura cuando el índice es parseable
- Detección de offset páginas libro vs PDF
- Sidebar con árbol colapsable 3 niveles (Parte→Capítulo→Sección)
- Mastery agregado para nodos contenedor (weakest link)
- 4 temas visuales: Midnight (default), Forest, Warm, Academic (light)
- Selector dropdown con swatches de color, persistido en localStorage
- TopicCard con renderizado profundo: DeepExplanationRenderer, KeyConceptsRenderer, DefinitionsBox
- ProcessingStatus con progreso por pass ("Extrayendo 2/4..." → "Sintetizando..." → "Quiz...")

### v0.6 — Fase 5: Rutas de Aprendizaje (2026-03-01)
- Algoritmo de learning path: ordena topics por relevancia (core → supporting → detail)
- Recomendación inteligente del próximo tema basada en mastery (sin empezar → visto → aprendiendo → dominado)
- Vista "Ruta" en sidebar con tabs (Índice / Ruta) alternables
- Barras de progreso por fase (Fundamentos / Refuerzo / Profundización)
- Nodos de path con dots de mastery y navegación directa
- Sugerencia post-quiz: "Siguiente tema recomendado" aparece al completar quiz
- Celebración cuando todos los temas están dominados/experto
- Nuevos componentes: LearningPath, NextTopicSuggestion, learningPath.js

### v0.5 — Fase 4: Niveles de Profundidad y Progreso Avanzado (2026-03-01)
- Selector de profundidad por tema: Resumen / Intermedio / Completo (oculta/muestra contenido progresivamente)
- Sistema de mastery: 5 niveles (Sin empezar → Visto → Aprendiendo → Dominado → Experto) basado en quiz scores
- Cálculo de proficiencia ponderado (últimos scores pesan más)
- Mastery rings en DocumentOutline (anillos SVG coloreados por nivel)
- Barra de progreso stacked por nivel de mastery en sidebar
- Dashboard de progreso colapsable con stats: % dominio, proficiencia promedio, intentos de quiz
- Breakdown visual de mastery por tema con barras horizontales
- Proficiency helper (`src/lib/proficiency.js`): cálculos centralizados, constantes, stats documento

### v0.4 — Fase 3: Referencias Cruzadas y Texto Fuente (2026-03-01)
- Conexiones clickeables: parseo de nombres de sección desde strings de conexión + fuzzy matching
- Click en conexión navega directamente al topic relacionado
- Visor de texto fuente del PDF por sección con carga lazy desde IndexedDB
- Badge de confianza (Alta/Media/Baja) según método de extracción del texto
- Cache en memoria para evitar recargas del texto fuente
- Nuevos componentes: ConnectionLink, SourceTextViewer, connectionParser
- `normalizeText` exportado de chunkProcessor para reutilización

### v0.3 — Fase 2: Chat Conversacional / Tutor Socrático (2026-03-01)
- Chat socrático per-topic con streaming en tiempo real
- Multi-turn: historial de conversación enviado al LLM (últimos 20 mensajes)
- Contexto automático: resumen, conceptos clave y explicación del tema inyectados
- System prompt socrático: guía con preguntas, no da respuestas directas
- Persistencia de chat en IndexedDB (IDB v3, store chatHistory)
- Modelos eficientes por defecto: Haiku 4.5 (Claude), Llama 3.1 8B (Groq)
- Cancel streaming y limpiar historial
- Endpoints multi-turn backward-compatible (campo messages[] opcional)
- Nuevo chatStore (Zustand), useChat hook, ChatSection component

### v0.2 — Fase 1: Persistencia y Biblioteca (2026-02-28)
- IndexedDB para persistir documentos, estructuras, topics y progreso
- Zustand stores: documentStore, studyStore, progressStore
- Vista Biblioteca como pantalla inicial con grilla de documentos
- Migración de App.jsx de hooks/props a Zustand global
- Fuzzy matching de 4 niveles para extracción de texto por sección
- Regeneración individual por sección
- Deploy a Vercel: https://studymind-eight.vercel.app

### v0.1 — MVP (2026-02-27)
- Parseo PDF client-side con pdfjs-dist
- Detección de estructura via LLM
- Generación de guías con capas de relevancia
- Multi-provider: Claude (Haiku/Sonnet) + Groq (Llama 3.3 70B)
- Streaming SSE
