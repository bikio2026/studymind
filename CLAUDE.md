# StudyMind — Guía de Estudio Interactiva desde PDFs

## Qué es
App web que toma un PDF, detecta su estructura, y genera una guía de estudio interactiva por tema con capas de relevancia, explicaciones mejoradas, y autoevaluación.

## Stack
- Vite 7 + React 19 + JavaScript + Tailwind v4 (CSS-based)
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
  hooks/
    usePDFParser.js           — Extracción de texto de PDF
    useLLMStream.js           — Streaming SSE multi-provider (Claude/Groq)
    useDocumentAnalysis.js    — Detección de estructura via LLM
    useStudyGuide.js          — Estado principal (idle->parsing->analyzing->generating->ready)
    useProgress.js            — Persistencia de progreso (localStorage)
  lib/
    pdfExtractor.js           — Wrapper de pdfjs-dist
    promptBuilder.js          — Prompts para estructura y guía de estudio
    chunkProcessor.js         — Split de textos largos + extracción por sección
    textUtils.js              — Utilidades de texto
  components/
    PDFUploader.jsx           — Drag & drop de PDF
    ProcessingStatus.jsx      — Progreso del pipeline (3 fases)
    LLMSelector.jsx           — Selector de provider/modelo
    DocumentOutline.jsx       — Sidebar con estructura del documento
    StudyGuide.jsx            — Vista principal de la guía
    TopicCard.jsx             — Card por tema (resumen, conceptos, explicación, quiz)
    QuizSection.jsx           — Autoevaluación interactiva
    RelevanceFilter.jsx       — Filtro por capa de relevancia
  App.jsx                     — Orquestador principal
  main.jsx                    — Entry point React
  index.css                   — Tailwind v4 theme
server/index.js               — API proxy local
api/
  _shared.js                  — Config, system prompts, CORS
  analyze-claude.js           — Endpoint Claude (Vercel)
  analyze-groq.js             — Endpoint Groq (Vercel)
  health.js                   — Health check proveedores
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

## Capas de relevancia
| Capa | Color | Significado |
|------|-------|-------------|
| core | amber | Concepto fundamental, sin esto no se entiende el resto |
| supporting | blue | Refuerza conceptos core, importante pero no esencial |
| detail | gray | Ejemplos, casos particulares, datos específicos |

## Providers LLM
- **Claude**: Requiere `ANTHROPIC_API_KEY` en .env. Modelos: Haiku 4.5 (rápido), Sonnet 4 (mejor calidad).
- **Groq**: Requiere `GROQ_API_KEY` en .env. Modelo: Llama 3.3 70B.

## System Prompts
- **structure**: Detección de estructura del documento (respuesta JSON)
- **studyGuide**: Generación de guía por sección (respuesta JSON)
- **summary**: Síntesis de texto (respuesta libre)

## localStorage Keys
| Key | Uso |
|-----|-----|
| `studymind-llm-provider` | Provider LLM seleccionado |
| `studymind-llm-model` | Modelo LLM seleccionado |
| `studymind-progress` | Progreso de estudio por documento |

## Deploy
- Vercel (auto-deploy)
- Serverless Functions en `api/`
- PDF parsing es 100% client-side (no sube archivos al server)
