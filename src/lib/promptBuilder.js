export function buildStructurePrompt(text, totalPages) {
  return `Analizá el siguiente texto extraído de un PDF de ${totalPages} páginas.

Identificá la ESTRUCTURA del documento y devolvé ÚNICAMENTE un JSON válido:

{
  "title": "Título del documento",
  "author": null,
  "sections": [
    { "id": 1, "title": "Nombre del capítulo/sección", "level": 1, "parentId": null },
    { "id": 2, "title": "Nombre de subsección", "level": 2, "parentId": 1 }
  ]
}

REGLAS:
- level 1 = capítulo o parte principal, level 2 = sección, level 3 = subsección
- Usá el índice/tabla de contenidos si existe
- Si no hay índice formal, inferí las secciones por encabezados y cambios temáticos
- Incluí TODAS las secciones que identifiques (mínimo las principales)
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

TEXTO DE LA SECCIÓN:
${sectionText}`
}
