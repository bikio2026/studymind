# StudyMind — Guía de Estudio Interactiva desde PDFs

**Version actual**: v0.3 (Fase 2)

## Qué es
App web que toma un PDF, detecta su estructura, y genera una guía de estudio interactiva por tema con capas de relevancia, explicaciones mejoradas, y autoevaluación. Persistencia local con IndexedDB y biblioteca de documentos.

## Stack
- Vite 7 + React 19 + JavaScript + Tailwind v4 (CSS-based)
- Zustand 5 (estado global)
- IndexedDB (persistencia local)
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
  hooks/
    usePDFParser.js             — Extracción de texto de PDF
    useLLMStream.js             — Streaming SSE multi-provider (Claude/Groq)
    useDocumentAnalysis.js      — Detección de estructura via LLM
    useStudyGuide.js            — Generación de guías (usa studyStore)
    useChat.js                  — Lógica de chat socrático multi-turn
  lib/
    db.js                       — Wrapper IndexedDB (documents, structures, topics, progress, chatHistory)
    pdfExtractor.js             — Wrapper de pdfjs-dist
    promptBuilder.js            — Prompts para estructura y guía de estudio
    chunkProcessor.js           — Split de textos largos + fuzzy matching por sección
    textUtils.js                — Utilidades de texto
  components/
    Library.jsx                 — Vista biblioteca (pantalla inicial)
    PDFUploader.jsx             — Drag & drop de PDF
    ProcessingStatus.jsx        — Progreso del pipeline (3 fases)
    LLMSelector.jsx             — Selector de provider/modelo
    DocumentOutline.jsx         — Sidebar con estructura del documento
    StudyGuide.jsx              — Vista principal de la guía
    TopicCard.jsx               — Card por tema (resumen, conceptos, explicación, quiz, chat)
    QuizSection.jsx             — Autoevaluación interactiva
    ChatSection.jsx             — Chat socrático por tema (streaming, persistente)
    RelevanceFilter.jsx         — Filtro por capa de relevancia
  App.jsx                       — Routing biblioteca vs estudio + pipeline
  main.jsx                      — Entry point React
  index.css                     — Tailwind v4 theme
server/index.js                 — API proxy local
api/
  _shared.js                    — Config, system prompts, CORS
  analyze-claude.js             — Endpoint Claude (Vercel)
  analyze-groq.js               — Endpoint Groq (Vercel)
  health.js                     — Health check proveedores
```

## Pipeline de procesamiento
1. **Parseo PDF** — pdfjs-dist extrae texto página por página (client-side)
2. **Detección de estructura** — LLM analiza texto muestreado y devuelve JSON con secciones
3. **Generación de guías** — Para cada sección, LLM genera guía con:
   - Clasificación de relevancia (core / supporting / detail)
   - Resumen conceptual
   - Conceptos clave
   - Explicación expandida (mejorada vs. original)
   - Conexiones entre temas
   - Preguntas de autoevaluación
4. **Persistencia** — Cada topic se guarda en IDB a medida que se genera

## Persistencia (IndexedDB)
| Store | Key | Contenido |
|-------|-----|-----------|
| documents | id (UUID) | fileName, fileSize, totalPages, fullText, processedAt, status |
| structures | documentId | title, author, sections[] |
| topics | documentId_sectionId | sectionTitle, level, relevance, summary, keyConcepts, etc. |
| progress | documentId_topicId | studied, quizScores[], resets[] |
| chatHistory | documentId_topicId | messages[{role, content, timestamp}], updatedAt |

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
| 3 | Referencias cruzadas y al texto fuente | Pendiente |
| 4 | Niveles de profundidad y progreso avanzado | Pendiente |
| 5 | Rutas de aprendizaje | Pendiente |
| 6 | Roles y multi-usuario | Pendiente |

---

## Changelog

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
