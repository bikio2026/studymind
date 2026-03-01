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
- level 1 = capítulo o parte principal, level 2 = sección, level 3 = subsección
- Usá el índice/tabla de contenidos si existe para identificar secciones
- Si no hay índice formal, inferí las secciones por encabezados y cambios temáticos
- Si podés inferir las páginas de inicio y fin de cada sección (del índice o del texto), incluí "pageStart" y "pageEnd". Si no podés determinarlas, omití esos campos.
- IMPORTANTE: Solo incluí secciones cuyo CONTENIDO esté PRESENTE en el texto proporcionado. Si el índice menciona capítulos o secciones que NO aparecen en el texto extraído, NO los incluyas. No inventes secciones.
- NO incluyas secciones estructurales sin contenido propio como: índice, tabla de contenidos, bibliografía, glosario, agradecimientos, apéndices.
- GRANULARIDAD: Detectá capítulos y secciones individuales, no solo las partes o divisiones principales del libro. Si el libro tiene "Parte I" que contiene capítulos 1, 2 y 3, incluí TANTO la parte como los capítulos individuales. Objetivo: entre 8 y 25 secciones de nivel 1-2 para un libro típico. Si detectás menos de 6, revisá si hay subdivisiones internas que debas incluir.
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
