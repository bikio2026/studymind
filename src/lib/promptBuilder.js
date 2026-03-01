export function buildStructurePrompt(text, totalPages, pageRange = null) {
  // When processing a partial range with TOC injected
  if (pageRange) {
    const { start, end, originalTotal } = pageRange
    return `Analizá el siguiente texto extraído de un PDF de ${originalTotal} páginas.
El estudiante seleccionó las páginas ${start}-${end} (del PDF) para estudiar.

Se incluye el ÍNDICE del documento (detectado automáticamente) seguido de muestras del contenido de las páginas seleccionadas.

Identificá la ESTRUCTURA de las secciones DENTRO del rango seleccionado y devolvé ÚNICAMENTE un JSON válido:

{
  "title": "Título del documento",
  "author": null,
  "sections": [
    { "id": 1, "title": "Nombre del capítulo/sección", "level": 1, "parentId": null, "bookPage": 120 },
    { "id": 2, "title": "Nombre de subsección", "level": 2, "parentId": 1, "bookPage": 125 }
  ]
}

REGLAS:
- Usá el índice para identificar capítulos y secciones cuyo contenido cae DENTRO del rango de páginas ${start}-${end}.
- NUMERACIÓN: Los números de página del índice son la NUMERACIÓN IMPRESA del libro, que puede diferir de la del PDF en varias páginas (portada, créditos, etc.). Usá tu criterio para mapear.
- "bookPage": incluí el número de página IMPRESO del libro (del índice). Es solo referencia visual, no se usa para extracción.
- level 1 = capítulo o parte principal, level 2 = sección, level 3 = subsección
- IMPORTANTE: Solo incluí secciones cuyo contenido esté en las páginas seleccionadas. Si el índice menciona capítulos fuera del rango, NO los incluyas.
- NO incluyas secciones estructurales: índice, bibliografía, glosario, agradecimientos, apéndices.
- GRANULARIDAD: Detectá capítulos y secciones individuales. Objetivo: entre 8 y 25 secciones de nivel 1-2. Si detectás menos de 6, revisá si hay subdivisiones internas.
- El JSON debe ser válido y parseable

TEXTO:
${text}`
  }

  // Full range or no TOC — original behavior
  return `Analizá el siguiente texto extraído de un PDF de ${totalPages} páginas.

Identificá la ESTRUCTURA del documento y devolvé ÚNICAMENTE un JSON válido:

{
  "title": "Título del documento",
  "author": null,
  "sections": [
    { "id": 1, "title": "Nombre del capítulo/sección", "level": 1, "parentId": null, "pageStart": 12, "pageEnd": 45 },
    { "id": 2, "title": "Nombre de subsección", "level": 2, "parentId": 1, "pageStart": 12, "pageEnd": 25 }
  ]
}

REGLAS:
ESTRUCTURA JERÁRQUICA:
- Si el libro tiene "Partes" (Parte I, Parte II, etc.): level 1 = Parte, level 2 = Capítulo, level 3 = Sección/Apartado
- Si el libro NO tiene partes: level 1 = Capítulo, level 2 = Sección, level 3 = Subsección
- parentId: referencia al id de la sección padre (null si es nivel 1)

- Usá el índice/tabla de contenidos si existe para identificar secciones
- Si no hay índice formal, inferí las secciones por encabezados y cambios temáticos
- Si podés inferir las páginas de inicio y fin de cada sección (del índice o del texto), incluí "pageStart" y "pageEnd". Si no podés determinarlas, omití esos campos.
- IMPORTANTE: Solo incluí secciones cuyo CONTENIDO esté PRESENTE en el texto proporcionado. No inventes secciones.
- NO incluyas secciones estructurales sin contenido propio: índice, bibliografía, glosario, agradecimientos, apéndices.
- GRANULARIDAD: Detectá hasta 3 niveles de profundidad. Objetivo: 10-30 secciones totales incluyendo todos los niveles. Si detectás menos de 6, revisá si hay subdivisiones internas.
- El JSON debe ser válido y parseable

TEXTO:
${text}`
}

export function buildStudyGuidePrompt(sectionTitle, sectionText, documentTitle, allSectionTitles, truncated = false) {
  const truncNote = truncated
    ? '\nNOTA: El texto fue recortado por ser muy extenso. Trabajá con lo disponible.'
    : ''

  return `Creá una guía de estudio para esta sección.

DOCUMENTO: "${documentTitle}"
SECCIÓN: "${sectionTitle}"
OTRAS SECCIONES: ${allSectionTitles.join(' | ')}
${truncNote}
Devolvé ÚNICAMENTE un JSON válido:

{
  "relevance": "core",
  "summary": "Resumen conceptual en 2-3 oraciones claras.",
  "keyConcepts": ["concepto 1", "concepto 2", "concepto 3"],
  "expandedExplanation": "Explicación didáctica de 3-5 párrafos, más clara que el texto original. Separar párrafos con doble salto de línea.",
  "connections": ["Relación con 'otra sección': cómo se conectan"],
  "quiz": [
    { "question": "Pregunta conceptual", "answer": "Respuesta clara" },
    { "question": "Pregunta conceptual", "answer": "Respuesta clara" },
    { "question": "Pregunta conceptual", "answer": "Respuesta clara" }
  ]
}

CRITERIOS de "relevance":
- "core": Concepto fundamental, sin esto no se entiende el resto
- "supporting": Refuerza conceptos core, importante pero no esencial
- "detail": Ejemplos, casos particulares, datos específicos

IMPORTANTE: Basá tu guía EXCLUSIVAMENTE en el texto proporcionado abajo. No agregues información externa ni conceptos que no estén en el texto. Si el texto es insuficiente o irrelevante para la sección, respondé con:
{ "relevance": "detail", "summary": "", "keyConcepts": [], "expandedExplanation": "", "connections": [], "quiz": [], "insufficientText": true }

TEXTO DE LA SECCIÓN:
${sectionText}`
}

// --- Multi-pass deep prompts ---

export function buildChunkExtractionPrompt(chunkText, chunkIndex, totalChunks, sectionTitle) {
  return `Estás analizando la parte ${chunkIndex + 1} de ${totalChunks} del texto de la sección "${sectionTitle}".

Tu tarea es EXTRAER los puntos clave de este fragmento. No resumas: identificá y listá lo que el texto dice.

Devolvé ÚNICAMENTE un JSON válido:

{
  "concepts": ["concepto 1: breve definición", "concepto 2: breve definición"],
  "arguments": ["argumento o razonamiento central presentado"],
  "definitions": ["término — definición formal del texto"],
  "examples": ["descripción del ejemplo y qué ilustra"],
  "formulas": ["fórmula o modelo y qué representa"],
  "rawNotes": "Síntesis de 400-600 palabras cubriendo TODO lo que este fragmento explica. Incluí los detalles importantes, no solo generalidades."
}

REGLAS:
- SOLO extraé lo que está EXPLÍCITAMENTE en el texto. No agregues conocimiento externo.
- Si no hay fórmulas, devolvé array vacío. Lo mismo para cada campo.
- "definitions" son definiciones formales que el texto da, no inferencias tuyas.
- "examples" incluye tanto ejemplos numéricos como casos ilustrativos.
- "rawNotes" es lo más importante: debe capturar la sustancia del fragmento con suficiente detalle para que alguien que no leyó el original entienda qué dice.
- Escribí en español.

TEXTO (parte ${chunkIndex + 1}/${totalChunks}):
${chunkText}`
}

export function buildDeepSynthesisPrompt(sectionTitle, chunkExtracts, documentTitle, allSectionTitles) {
  const extractsText = chunkExtracts.map((ext, i) =>
    `--- FRAGMENTO ${i + 1} ---\nConceptos: ${ext.concepts?.join('; ') || 'ninguno'}\nArgumentos: ${ext.arguments?.join('; ') || 'ninguno'}\nDefiniciones: ${ext.definitions?.join('; ') || 'ninguna'}\nEjemplos: ${ext.examples?.join('; ') || 'ninguno'}\nFórmulas: ${ext.formulas?.join('; ') || 'ninguna'}\nNotas: ${ext.rawNotes || ''}`
  ).join('\n\n')

  return `Sos un tutor universitario experto. A partir de los puntos clave extraídos de TODOS los fragmentos de la sección, creá una guía de estudio PROFUNDA y COMPLETA.

DOCUMENTO: "${documentTitle}"
SECCIÓN: "${sectionTitle}"
OTRAS SECCIONES DEL DOCUMENTO: ${allSectionTitles.join(' | ')}

MATERIAL EXTRAÍDO DE ${chunkExtracts.length} FRAGMENTOS:
${extractsText}

Devolvé ÚNICAMENTE un JSON válido:

{
  "relevance": "core",
  "summary": "Resumen ejecutivo en 3-4 oraciones que capture la esencia.",
  "keyConcepts": [
    { "term": "nombre del concepto", "definition": "definición clara y completa" }
  ],
  "deepExplanation": "Explicación profunda y estructurada (ver instrucciones abajo).",
  "definitions": [
    { "term": "término", "definition": "definición formal" }
  ],
  "connections": ["Relación con 'otra sección': cómo se conectan"]
}

INSTRUCCIONES PARA "deepExplanation":
- Extensión: 1500-3000 palabras. Esto NO es un resumen, es una EXPLICACIÓN TUTORIAL completa.
- Usá sub-títulos con formato "## Subtítulo" para organizar el contenido en bloques temáticos.
- Para cada concepto principal:
  1. Explicalo conceptualmente (¿qué es? ¿por qué importa?)
  2. Si hay fórmulas/modelos, explicá paso a paso qué representa cada componente
  3. Si hay ejemplos en el material, incluílos y explicá qué demuestran
  4. Conectá con el concepto anterior/siguiente para dar coherencia
- Usá analogías cuando ayuden a construir intuición.
- Separar párrafos con doble salto de línea.
- Escribí en español rioplatense, claro y didáctico.
- TODO el contenido debe provenir del material extraído. No inventes información.

CRITERIOS de "relevance":
- "core": Concepto fundamental, sin esto no se entiende el resto del documento
- "supporting": Refuerza conceptos core, importante pero no esencial
- "detail": Ejemplos, casos particulares, datos específicos`
}

export function buildQuizFromSynthesisPrompt(sectionTitle, deepExplanation, allSectionTitles) {
  return `A partir de la siguiente explicación profunda de la sección "${sectionTitle}", generá un quiz de autoevaluación y las conexiones con otras secciones.

EXPLICACIÓN:
${deepExplanation}

OTRAS SECCIONES: ${allSectionTitles.join(' | ')}

Devolvé ÚNICAMENTE un JSON válido:

{
  "quiz": [
    { "question": "Pregunta conceptual que evalúe comprensión profunda", "answer": "Respuesta completa y clara" },
    { "question": "Pregunta aplicada (caso práctico o ejemplo)", "answer": "Respuesta con razonamiento" }
  ],
  "connections": ["Relación con 'otra sección': explicación de cómo se conectan"]
}

REGLAS:
- Generá entre 5 y 8 preguntas.
- Mix obligatorio: al menos 3 conceptuales + 2 de aplicación/razonamiento.
- Las preguntas conceptuales evalúan COMPRENSIÓN, no memorización de datos.
- Las preguntas de aplicación plantean un escenario y piden analizar/predecir.
- Las respuestas deben ser completas (3-5 oraciones), explicando el razonamiento.
- Las conexiones deben referir a secciones del mismo documento, indicando la relación específica.
- Escribí en español.`
}
