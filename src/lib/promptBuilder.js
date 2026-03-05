// --- Language instruction helpers ---

const LANGUAGE_INSTRUCTIONS = {
  es: 'Escribí en español rioplatense, claro y didáctico.',
  en: 'Write in clear, didactic English.',
  pt: 'Escreva em português claro e didático.',
  fr: 'Écris en français clair et didactique.',
  de: 'Schreibe in klarem, didaktischem Deutsch.',
  it: 'Scrivi in italiano chiaro e didattico.',
}

function getLangInstruction(lang = 'es') {
  return LANGUAGE_INSTRUCTIONS[lang] || LANGUAGE_INSTRUCTIONS.es
}

export function buildStructurePrompt(text, totalPages, pageRange = null) {
  // When processing a partial range with TOC injected
  if (pageRange) {
    const { start, end, originalTotal } = pageRange
    return `Analyze the following text extracted from a PDF of ${originalTotal} pages.
The student selected pages ${start}-${end} (PDF pages) to study.

The TABLE OF CONTENTS (auto-detected) is included, followed by content samples from the selected pages.

Identify the STRUCTURE of sections WITHIN the selected range and return ONLY valid JSON:

{
  "title": "Document title (in the document's original language)",
  "author": null,
  "sections": [
    { "id": 1, "title": "Chapter/section name (original language)", "level": 1, "parentId": null, "bookPage": 120 },
    { "id": 2, "title": "Subsection name (original language)", "level": 2, "parentId": 1, "bookPage": 125 }
  ]
}

RULES:
- Use the table of contents to identify chapters and sections whose content falls WITHIN pages ${start}-${end}.
- PAGE NUMBERING: The page numbers in the TOC are the PRINTED book numbering, which may differ from PDF pages by several pages (cover, credits, etc.). Use your judgment to map them.
- "bookPage": include the PRINTED book page number (from TOC). It's only a visual reference, not used for extraction.
- level 1 = chapter or major part, level 2 = section, level 3 = subsection
- IMPORTANT: Only include sections whose content is in the selected pages. If the TOC mentions chapters outside the range, DO NOT include them.
- DO NOT include structural sections: table of contents, bibliography, glossary, acknowledgments, appendices, index.
- Common chapter labels: Part/Parte, Chapter/Capítulo, Unit, Module, Section, Lesson, Topic, Appendix
- GRANULARITY: Detect individual chapters and sections. Target: 8-25 sections at level 1-2. If you detect fewer than 6, look for internal subdivisions.
- Section titles MUST be in the document's original language, exactly as they appear.
- The JSON must be valid and parseable.

TEXT:
${text}`
  }

  // Full range or no TOC — original behavior
  return `Analyze the following text extracted from a PDF of ${totalPages} pages.

Identify the document STRUCTURE and return ONLY valid JSON:

{
  "title": "Document title (in the document's original language)",
  "author": null,
  "sections": [
    { "id": 1, "title": "Chapter/section name (original language)", "level": 1, "parentId": null, "pageStart": 12, "pageEnd": 45 },
    { "id": 2, "title": "Subsection name (original language)", "level": 2, "parentId": 1, "pageStart": 12, "pageEnd": 25 }
  ]
}

RULES:
HIERARCHICAL STRUCTURE:
- If the book has "Parts" (Part I, Parte I, etc.): level 1 = Part, level 2 = Chapter, level 3 = Section
- If no parts: level 1 = Chapter/Unit/Module, level 2 = Section, level 3 = Subsection
- parentId: reference to the parent section's id (null if level 1)

- Use the table of contents/index if it exists to identify sections
- If there's no formal TOC, infer sections from headings and thematic changes
- If you can infer start and end pages for each section (from TOC or text), include "pageStart" and "pageEnd". Otherwise omit them.
- IMPORTANT: Only include sections whose CONTENT is PRESENT in the provided text. Do not invent sections.
- DO NOT include structural sections without their own content: table of contents, bibliography, glossary, acknowledgments, appendices, index.
- Common chapter labels: Part/Parte/Partie/Teil, Chapter/Capítulo/Chapitre/Kapitel, Unit, Module, Section, Lesson, Topic, Appendix
- GRANULARITY: Detect up to 3 levels of depth. Target: 10-30 total sections including all levels. If you detect fewer than 6, look for internal subdivisions.
- Section titles MUST be in the document's original language, exactly as they appear.
- The JSON must be valid and parseable.

TEXT:
${text}`
}

export function buildStudyGuidePrompt(sectionTitle, sectionText, documentTitle, allSectionTitles, truncated = false, language = 'es') {
  const truncNote = truncated
    ? '\nNOTE: Text was truncated due to length. Work with what is available.'
    : ''

  return `Create a study guide for this section. ${getLangInstruction(language)}

DOCUMENT: "${documentTitle}"
SECTION: "${sectionTitle}"
OTHER SECTIONS: ${allSectionTitles.join(' | ')}
${truncNote}
Return ONLY valid JSON:

{
  "relevance": "core",
  "summary": "Conceptual summary in 2-3 clear sentences.",
  "keyConcepts": ["concept 1", "concept 2", "concept 3"],
  "expandedExplanation": "Didactic explanation in 3-5 paragraphs, clearer than the original text. Separate paragraphs with double line breaks.",
  "connections": ["Relationship with 'other section': how they connect"],
  "quiz": [
    { "question": "Conceptual question", "answer": "Clear answer" },
    { "question": "Conceptual question", "answer": "Clear answer" },
    { "question": "Conceptual question", "answer": "Clear answer" }
  ]
}

RELEVANCE criteria:
- "core": Fundamental concept, without this the rest cannot be understood
- "supporting": Reinforces core concepts, important but not essential
- "detail": Examples, particular cases, specific data

IMPORTANT: Base your guide EXCLUSIVELY on the text provided below. Do not add external information or concepts not in the text. If the text is insufficient or irrelevant for the section, respond with:
{ "relevance": "detail", "summary": "", "keyConcepts": [], "expandedExplanation": "", "connections": [], "quiz": [], "insufficientText": true }

SECTION TEXT:
${sectionText}`
}

// --- Multi-pass deep prompts ---

export function buildChunkExtractionPrompt(chunkText, chunkIndex, totalChunks, sectionTitle, language = 'es') {
  return `You are analyzing part ${chunkIndex + 1} of ${totalChunks} of the text for section "${sectionTitle}".

Your task is to EXTRACT key points from this fragment. Do not summarize: identify and list what the text says.

Return ONLY valid JSON:

{
  "concepts": ["concept 1: brief definition", "concept 2: brief definition"],
  "arguments": ["central argument or reasoning presented"],
  "definitions": ["term — formal definition from the text"],
  "examples": ["description of the example and what it illustrates"],
  "formulas": ["formula or model and what it represents"],
  "rawNotes": "Synthesis of 400-600 words covering EVERYTHING this fragment explains. Include important details, not just generalities."
}

RULES:
- ONLY extract what is EXPLICITLY in the text. Do not add external knowledge.
- If there are no formulas, return empty array. Same for each field.
- "definitions" are formal definitions the text provides, not your inferences.
- "examples" includes both numerical examples and illustrative cases.
- "rawNotes" is the most important: must capture the substance of the fragment in enough detail for someone who hasn't read the original to understand what it says.
- ${getLangInstruction(language)}

TEXT (part ${chunkIndex + 1}/${totalChunks}):
${chunkText}`
}

export function buildDeepSynthesisPrompt(sectionTitle, chunkExtracts, documentTitle, allSectionTitles, language = 'es') {
  const extractsText = chunkExtracts.map((ext, i) =>
    `--- FRAGMENT ${i + 1} ---\nConcepts: ${ext.concepts?.join('; ') || 'none'}\nArguments: ${ext.arguments?.join('; ') || 'none'}\nDefinitions: ${ext.definitions?.join('; ') || 'none'}\nExamples: ${ext.examples?.join('; ') || 'none'}\nFormulas: ${ext.formulas?.join('; ') || 'none'}\nNotes: ${ext.rawNotes || ''}`
  ).join('\n\n')

  return `You are an expert university tutor. From the key points extracted from ALL fragments of the section, create a DEEP and COMPLETE study guide. ${getLangInstruction(language)}

DOCUMENT: "${documentTitle}"
SECTION: "${sectionTitle}"
OTHER SECTIONS: ${allSectionTitles.join(' | ')}

EXTRACTED MATERIAL FROM ${chunkExtracts.length} FRAGMENTS:
${extractsText}

Return ONLY valid JSON:

{
  "relevance": "core",
  "summary": "Executive summary in 3-4 sentences capturing the essence.",
  "keyConcepts": [
    { "term": "concept name", "definition": "clear and complete definition" }
  ],
  "deepExplanation": "Deep and structured explanation (see instructions below).",
  "definitions": [
    { "term": "term", "definition": "formal definition" }
  ],
  "connections": ["Relationship with 'other section': how they connect"]
}

INSTRUCTIONS FOR "deepExplanation":
- Length: 1500-3000 words. This is NOT a summary, it's a COMPLETE TUTORIAL EXPLANATION.
- Use sub-headings with "## Subtitle" format to organize content into thematic blocks.
- For each main concept:
  1. Explain it conceptually (what is it? why does it matter?)
  2. If there are formulas/models, explain step by step what each component represents
  3. If there are examples in the material, include them and explain what they demonstrate
  4. Connect with the previous/next concept for coherence
- Use analogies when they help build intuition.
- Separate paragraphs with double line breaks.
- ALL content must come from the extracted material. Do not invent information.

RELEVANCE criteria:
- "core": Fundamental concept, without this the rest of the document cannot be understood
- "supporting": Reinforces core concepts, important but not essential
- "detail": Examples, particular cases, specific data`
}

export function buildQuizFromSynthesisPrompt(sectionTitle, deepExplanation, allSectionTitles, language = 'es') {
  return `From the following deep explanation of the section "${sectionTitle}", generate a self-assessment quiz and connections with other sections. ${getLangInstruction(language)}

EXPLANATION:
${deepExplanation}

OTHER SECTIONS: ${allSectionTitles.join(' | ')}

Return ONLY valid JSON:

{
  "quiz": [
    { "question": "...", "answer": "...", "bloomLevel": "recall" },
    { "question": "...", "answer": "...", "bloomLevel": "understand" },
    { "question": "...", "answer": "...", "bloomLevel": "apply" },
    { "question": "...", "answer": "...", "bloomLevel": "analyze" }
  ],
  "connections": ["Relationship with 'other section': explanation of how they connect"],
  "preReadingQuestions": ["Pre-reading question to activate prior knowledge before studying"]
}

RULES:
- Generate 5-8 quiz questions.
- Each question MUST include "bloomLevel": one of "recall", "understand", "apply", "analyze".
  - recall: Remembering facts, definitions, or formulas
  - understand: Explaining concepts in own words, interpreting meaning
  - apply: Using concepts in new situations or practical cases
  - analyze: Breaking down, comparing, evaluating, or creating new connections
- Required mix: at least 1 recall + 2 understand + 1 apply + 1 analyze.
- Answers should be complete (3-5 sentences), explaining the reasoning.
- Connections should refer to sections in the same document, indicating the specific relationship.
- Generate 5-7 preReadingQuestions: questions to think about BEFORE studying this topic. They activate prior knowledge and direct attention. Examples: "Why do you think...?", "What would happen if...?", "How does this relate to...?"
- ${getLangInstruction(language)}`
}

export function buildQuizEvaluationPrompt(question, modelAnswer, userAnswer, topicContext, language = 'es') {
  return `Evaluate the student's answer to this quiz question. ${getLangInstruction(language)}

TOPIC CONTEXT:
Section: "${topicContext.sectionTitle}"
Summary: ${topicContext.summary}

QUESTION: ${question}

MODEL ANSWER (reference): ${modelAnswer}

STUDENT'S ANSWER: ${userAnswer}

Return ONLY valid JSON:

{
  "score": 75,
  "classification": "partial",
  "feedback": "Constructive explanation in 2-3 sentences."
}

RUBRIC:
- score: 0-100. Evaluate CONCEPTUAL COMPREHENSION, not exact vocabulary or wording.
- classification: "correct" (≥80), "partial" (40-79), "incorrect" (<40)
- feedback: Constructive. Mention what was right and what was missing or incorrect. If the student showed partial understanding, acknowledge it.

EVALUATION CRITERIA:
- Does it demonstrate understanding of the central concept? (40% weight)
- Does it include key elements from the model answer? (30%)
- Is the reasoning correct, even if using different words? (20%)
- Are there factual errors or important confusions? (10% penalty)

IMPORTANT:
- An answer can be correct even if it uses different words than the model answer.
- If the answer is very short but conceptually correct, high score with feedback suggesting expansion.
- If the answer is long but confused or incorrect, low score with clear feedback.
- Don't be condescending. Be direct and useful.`
}

// --- Pre-reading question evaluation prompt ---

export function buildPreReadingEvalPrompt(question, studentAnswer, topicSummary, language = 'es') {
  return `A student answered a pre-reading reflection question BEFORE studying a topic. ${getLangInstruction(language)}

TOPIC SUMMARY: ${topicSummary}

PRE-READING QUESTION: ${question}

STUDENT'S ANSWER: ${studentAnswer}

Evaluate the student's pre-existing knowledge and provide guidance for their upcoming reading.

Return ONLY valid JSON:
{
  "feedback": "Brief assessment of what the student already knows and what gaps exist (2-3 sentences)",
  "lookForWhenReading": ["Specific aspect to pay attention to when reading", "Another key point to look for"],
  "connections": ["Related concept or topic that might help understand this better"]
}

RULES:
- This is NOT a quiz evaluation. The student hasn't read the material yet.
- Be encouraging about what they already know, even if partial or wrong.
- "lookForWhenReading": 2-4 concrete, specific things the student should focus on when they read the chapter. These should address gaps in their answer.
- "connections": 1-2 related concepts from economics (or the subject) that could help bridge understanding.
- Be direct and practical. Don't be condescending.
- ${getLangInstruction(language)}`
}

// --- Tutor observation focus prompt ---

export function buildTutorFocusPrompt(observation, topicsSummaries, language = 'es') {
  return `A tutor has made the following observation about a student's difficulty. ${getLangInstruction(language)}

TUTOR'S OBSERVATION: "${observation}"

AVAILABLE TOPICS AND SUMMARIES:
${topicsSummaries.map(t => `- "${t.title}": ${t.summary}`).join('\n')}

Based on this observation, generate focused study material to address the student's specific difficulty.

Return ONLY valid JSON:
{
  "questions": [
    { "question": "Focused question addressing the difficulty", "hint": "Brief hint for the student" }
  ],
  "relevantTopics": ["Topic title 1", "Topic title 2"],
  "miniGuide": "2-3 paragraph explanation that addresses the specific difficulty from an angle the student might understand better. Use analogies and simple language."
}

RULES:
- Generate 3-5 questions that specifically target the observed difficulty.
- Each question should probe a different aspect of the misunderstanding.
- "relevantTopics": List the topic titles (from the available topics) that are most relevant to this difficulty.
- "miniGuide": Write a clear, patient explanation addressing the exact confusion described by the tutor. Use analogies and everyday examples.
- ${getLangInstruction(language)}`
}

// --- Translation prompt for on-demand translation ---

export function buildTranslationPrompt(contentJson, targetLanguage) {
  const langName = { es: 'Spanish (Rioplatense)', en: 'English', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian' }[targetLanguage] || targetLanguage

  return `Translate the following study guide content to ${langName}. Maintain an academic, didactic tone.

Return ONLY valid JSON with the EXACT same structure. Only translate the text values, keep all JSON keys unchanged.

CONTENT TO TRANSLATE:
${JSON.stringify(contentJson, null, 2)}

RULES:
- Translate ALL text values (summary, keyConcepts, expandedExplanation/deepExplanation, quiz questions and answers, connections, definitions).
- Keep JSON keys in English (summary, keyConcepts, etc.) — do NOT translate keys.
- Maintain the same academic tone and clarity.
- For quiz questions and answers, ensure they make sense in the target language.
- If there are technical terms, keep them and add the translation in parentheses if helpful.
- Return valid, parseable JSON only.`
}
