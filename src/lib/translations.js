// StudyMind i18n — ES/EN translations dictionary
// ~190 strings organized by component/section

export const translations = {
  es: {
    // Common
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.open': 'Abrir',
    'common.rename': 'Renombrar',
    'common.retry': 'Reintentar',
    'common.reset': 'Reiniciar',
    'common.back': 'Volver',
    'common.pages': 'pág.',
    'common.of': 'de',
    'common.loading': 'Cargando...',
    'common.processing': 'Procesando...',

    // Time
    'time.justNow': 'Hace un momento',
    'time.minutesAgo': 'Hace {n} min',
    'time.hoursAgo': 'Hace {n}h',

    // Library
    'library.title': 'Tu biblioteca',
    'library.document': 'documento',
    'library.documents': 'documentos',
    'library.newPdf': 'Nuevo PDF',
    'library.uploadPdf': 'Subir PDF',
    'library.ready': 'Listo',
    'library.incomplete': 'Incompleto',
    'library.processing': 'Procesando',
    'library.book': 'Libro',
    'library.trash': 'Papelera',
    'library.trashEmpty': 'La papelera está vacía',
    'library.restore': 'Restaurar',
    'library.permanentDelete': 'Eliminar definitivamente',
    'library.emptyTrash': 'Vaciar papelera',
    'library.emptyTrashConfirm': '¿Eliminar definitivamente {n} documento(s)?',
    'library.expiresIn': 'Expira en {n} día(s)',
    'library.expiresToday': 'Expira hoy',
    'library.deletedAt': 'Eliminado {date}',
    'library.movedToTrash': 'Movido a la papelera',

    // Upload
    'upload.title': 'Subí tu primer PDF',
    'upload.titleSmall': 'Subí tu PDF',
    'upload.instructions': 'Arrastrá el archivo acá o hacé click para seleccionarlo',
    'upload.subtext': 'Libros de texto, apuntes, papers — cualquier PDF con texto',
    'upload.howItWorks': 'Cómo funciona',
    'upload.step1': 'Subís un PDF y se extrae todo el texto',
    'upload.step2': 'La IA detecta la estructura y los temas',
    'upload.step3': 'Se genera una guía interactiva por tema',
    'upload.pdfOnly': 'Solo se aceptan archivos PDF',
    'upload.tooLarge': 'El archivo es demasiado grande (máx 100 MB)',
    'upload.mismatch': 'Este PDF no coincide con el libro original. Asegurate de subir el mismo archivo.',

    // Processing
    'processing.extracting': 'Extrayendo texto del PDF',
    'processing.analyzing': 'Detectando estructura del documento',
    'processing.generating': 'Generando guías de estudio',
    'processing.topic': 'Procesando:',
    'processing.stop': 'Detener procesamiento',
    'processing.nOfTotal': '{current} de {total}',
    'processing.pageRange': 'Páginas {start}–{end} de {total}',

    // Stop dialog
    'stop.title': 'Procesamiento detenido',
    'stop.generated': 'Se generaron {generated} de {total} temas',
    'stop.keep': 'Guardar parcial',
    'stop.keepDesc': 'Ver los {n} temas ya generados',
    'stop.resume': 'Seguir procesando',
    'stop.resumeDesc': 'Cancelar la detención y continuar',
    'stop.delete': 'Borrar todo',
    'stop.deleteDesc': 'Eliminar el documento y empezar de nuevo',

    // Cancel dialog
    'cancel.title': '¿Cancelar procesamiento?',
    'cancel.description': 'El documento se está procesando. Si cancelás, podrás guardar lo generado hasta el momento o borrar todo.',
    'cancel.continue': 'Seguir',
    'cancel.confirm': 'Sí, cancelar',

    // Duplicate dialog
    'duplicate.title': 'Documento duplicado',
    'duplicate.subtitle': 'Este PDF ya fue procesado antes',
    'duplicate.existing': 'Procesamientos existentes:',
    'duplicate.unknownModel': 'Modelo desconocido',
    'duplicate.processAgain': 'Procesar y vincular al libro',
    'duplicate.processIndependent': 'Procesar como independiente',

    // Page range
    'pageRange.title': 'Configuración',
    'pageRange.subtitle': 'Páginas y modelo de IA',
    'pageRange.totalPages': 'páginas totales',
    'pageRange.range': 'Rango de páginas del PDF',
    'pageRange.from': 'Desde',
    'pageRange.to': 'Hasta',
    'pageRange.pdfPageNote': 'Usá los números de página del PDF, no los del libro impreso.',
    'pageRange.all': 'Todo',
    'pageRange.first50': 'Primeras 50',
    'pageRange.first100': 'Primeras 100',
    'pageRange.first150': 'Primeras 150',
    'pageRange.aiModel': 'Modelo de IA',
    'pageRange.groqWarning': 'Groq tiene un límite de 12K tokens/min (tier gratuito). Con muchas páginas puede fallar.',
    'pageRange.contentLanguage': 'Idioma del contenido generado',
    'pageRange.detected': '(detectado)',
    'pageRange.detectedLangNote': 'El idioma original del documento parece ser {lang}.',
    'pageRange.tocConfig': 'Configuración del índice',
    'pageRange.tocAuto': 'Detección automática',
    'pageRange.tocManual': 'Indicar manualmente',
    'pageRange.tocPages': 'Págs.',
    'pageRange.tocTo': 'a',
    'pageRange.tocNone': 'Sin índice',
    'pageRange.tocHelp': 'Si tu libro tiene un índice al inicio o al final, indicá las páginas para mejorar la detección de capítulos.',
    'pageRange.pages': '{n} páginas',
    'pageRange.pagesOfTotal': '{n} de {total} páginas',
    'pageRange.process': 'Procesar {n} pág{s}.',
    'pageRange.clickPending': 'Hacé click en las secciones pendientes para seleccionarlas.',
    'pageRange.fastEconomical': 'Rápido y económico',
    'pageRange.higherQuality': 'Mayor calidad',
    'pageRange.fastFreeTier': 'Rápido, tier gratuito',
    'pageRange.ultraFast': 'Ultra rápido',

    // Study guide
    'guide.outline': 'Índice',
    'guide.path': 'Ruta',
    'guide.graph': 'Grafo',
    'guide.intro': 'Introducción',
    'guide.openSidebar': 'Abrir índice',
    'guide.closeSidebar': 'Cerrar índice',
    'guide.incomplete': 'Documento incompleto: {current} de {total} temas generados',
    'guide.resume': 'Continuar procesando',
    'guide.expandCoverage': 'Ampliar cobertura',
    'guide.progressDashboard': 'Dashboard de progreso',
    'guide.noTopicsFilter': 'No hay temas con este nivel de relevancia',
    'guide.viewAll': 'Ver todos',
    'guide.selectTopic': 'Seleccioná un tema del panel lateral',
    'guide.backToLibrary': 'Volver a biblioteca',

    // Connection graph
    'graph.noConnections': 'No hay conexiones entre temas para visualizar',
    'graph.topics': 'temas',
    'relevance.core': 'Central',
    'relevance.supporting': 'Soporte',
    'relevance.detail': 'Detalle',

    // Book intro
    'intro.untitled': 'Sin título',
    'intro.pages': 'páginas',
    'intro.topics': 'temas',
    'intro.overview': 'Resumen general',
    'intro.generateSummary': 'Generar introducción',
    'intro.tableOfContents': 'Tabla de contenidos',

    // Topic card
    'topic.coreConcept': 'Concepto Central',
    'topic.supportConcept': 'Concepto de Soporte',
    'topic.detail': 'Detalle',
    'topic.markStudied': 'Marcar estudiado',
    'topic.lowConfidence': 'El texto de esta sección se extrajo por coincidencia aproximada. El contenido podría no ser completamente preciso.',
    'topic.sourceText': 'Texto Original del PDF',
    'topic.keyConcepts': 'Conceptos Clave',
    'topic.formalDefinitions': 'Definiciones Formales',
    'topic.deepExplanation': 'Explicación Profunda',
    'topic.chunksAnalyzed': '{n} fragmentos analizados',
    'topic.expandedExplanation': 'Explicación Expandida',
    'topic.connections': 'Conexiones con otros temas',
    'topic.quiz': 'Quiz ({n} preguntas)',
    'topic.selfAssessment': 'Autoevaluación',
    'topic.freeText': 'Texto libre',
    'topic.usesApi': 'Usa API',
    'topic.socraticTutor': 'Tutor Socrático',
    'topic.translating': 'Traduciendo a {lang}...',
    'topic.translateError': 'Error al traducir: {error}',

    // Document outline
    'outline.bookSections': 'Secciones del libro',
    'outline.thisImport': 'Temas de este import',
    'outline.processingTopics': 'Procesando temas...',
    'outline.general': 'General',
    'outline.mastered': 'Dominados',
    'outline.masteredPct': '% dominado',
    'outline.unprocessed': 'No procesada',
    'outline.otherImport': 'Otro import',
    'outline.expandToProcess': "Usá 'Ampliar cobertura' para procesar esta sección",
    'outline.processedOtherImport': 'Procesada en otro import',
    'outline.sectionsCount': '{n} de {total} secciones',

    // Relevance filter
    'filter.all': 'Todos',
    'filter.core': 'Centrales',
    'filter.supporting': 'Soporte',
    'filter.detail': 'Detalles',

    // Quiz
    'quiz.showAnswer': 'Ver respuesta',
    'quiz.knew': 'Lo sabía',
    'quiz.didntKnow': 'No lo sabía',
    'quiz.correct': 'Correcto',
    'quiz.toReview': 'A repasar',
    'quiz.result': 'Resultado:',

    // Free text quiz
    'freeQuiz.correct': 'Correcto',
    'freeQuiz.partial': 'Parcial',
    'freeQuiz.incorrect': 'Incorrecto',
    'freeQuiz.placeholder': 'Escribí tu respuesta...',
    'freeQuiz.charCount': 'caracteres (mín. 10)',
    'freeQuiz.evaluating': 'Evaluando...',
    'freeQuiz.evaluate': 'Evaluar',
    'freeQuiz.showModelAnswer': 'Ver respuesta modelo',
    'freeQuiz.hideModelAnswer': 'Ocultar respuesta modelo',
    'freeQuiz.evaluated': '{n} de {total} preguntas evaluadas',
    'freeQuiz.result': 'Resultado: {score}%',
    'freeQuiz.average': '(promedio de {n} preguntas)',
    'freeQuiz.invalidResponse': 'Respuesta inválida del evaluador',
    'freeQuiz.evalError': 'Error al evaluar la respuesta',

    // Hybrid quiz
    'hybrid.writeAnswer': 'Escribir respuesta',
    'hybrid.revealAnswer': 'Ver respuesta',

    // Chat
    'chat.placeholder': 'Escribí tu pregunta...',
    'chat.emptyState': 'Preguntale lo que quieras sobre este tema. Te voy a guiar para que llegues a la respuesta.',
    'chat.cancel': 'Cancelar',
    'chat.send': 'Enviar',
    'chat.clear': 'Limpiar chat',

    // Source text
    'source.highMatch': 'Coincidencia alta',
    'source.mediumMatch': 'Coincidencia media',
    'source.lowMatch': 'Coincidencia baja',
    'source.loading': 'Cargando texto fuente...',
    'source.empty': 'No se encontró texto fuente para esta sección en el PDF original.',
    'source.error': 'Error al cargar el texto fuente. Intentá recargar la página.',
    'source.disclaimer': 'Texto extraído directamente del PDF. Puede contener artefactos de formato.',

    // Coverage bar
    'coverage.label': 'Cobertura: {n} de {total} secciones',
    'coverage.processed': 'Procesada',
    'coverage.pending': 'Pendiente',
    'coverage.clickToProcess': 'Click para procesar',
    'coverage.clickToSelect': 'Click para seleccionar',
    'coverage.clickToDeselect': 'Click para deseleccionar',
    'coverage.selectAllPending': 'Seleccionar todas las pendientes',
    'coverage.clearSelection': 'Limpiar selección',
    'coverage.sectionsSelected': '{n} secciones seleccionadas',
    'coverage.includesGap': 'El rango incluye secciones intermedias no seleccionadas',

    // PDF storage
    'pdf.saveToServer': 'Guardar PDF en el servidor',
    'pdf.saveToServerNote': 'Accedé al PDF desde otros dispositivos',
    'pdf.download': 'Descargar PDF',
    'pdf.link': 'Vincular PDF',
    'pdf.linkSuccess': 'PDF vinculado correctamente',
    'pdf.linkMismatch': 'El PDF no corresponde a este libro',
    'pdf.downloading': 'Descargando...',
    'pdf.autoLoaded': 'PDF cargado automáticamente',

    // Progress dashboard
    'progress.title': 'Progreso del documento',
    'progress.mastery': 'Dominio',
    'progress.proficiency': 'Proficiencia',
    'progress.quizzes': 'Quizzes',
    'progress.attempts': 'intentos',
    'progress.masteryByTopic': 'Nivel de dominio por tema',
    'progress.topics': 'temas',

    // Next topic
    'nextTopic.completed': '¡Completaste todos los temas!',
    'nextTopic.completedDesc': 'Todos los temas están dominados o en nivel experto.',
    'nextTopic.recommended': 'Siguiente tema recomendado',

    // Connection links
    'connection.goToTopic': 'Ir al tema',
    'connection.otherImport': 'Otro import',

    // Learning path
    'path.nextRecommended': 'Próximo recomendado',
    'path.fundamentals': 'Fundamentos',
    'path.reinforcement': 'Refuerzo',
    'path.deepening': 'Profundización',
    'path.nextUnstarted': 'Siguiente tema {phase} sin empezar',
    'path.tryQuiz': 'Ya lo viste, probá el quiz para afianzar',
    'path.needsReview': 'Necesita repaso — intentá mejorar el quiz',
    'path.canImprove': 'Dominado — un repaso más para ser experto',

    // Mastery levels
    'mastery.sin-empezar': 'Sin empezar',
    'mastery.visto': 'Visto',
    'mastery.aprendiendo': 'Aprendiendo',
    'mastery.dominado': 'Dominado',
    'mastery.experto': 'Experto',

    // Depth levels
    'depth.resumen': 'Resumen',
    'depth.resumen.desc': 'Vista rápida: solo el resumen',
    'depth.intermedio': 'Intermedio',
    'depth.intermedio.desc': 'Resumen + conceptos clave + conexiones',
    'depth.completo': 'Completo',
    'depth.completo.desc': 'Todo el contenido incluyendo explicación expandida',

    // Theme
    'theme.changeTheme': 'Cambiar tema visual',

    // Loading
    'loading.timeout': 'La carga está tardando más de lo esperado. El documento podría tener datos corruptos.',
    'loading.backToLibrary': 'Volver a la biblioteca',

    // App
    'app.processingError': 'Error en el procesamiento',
    'app.noStudyData': 'Sin datos de estudio',
    'app.noStudyDataDesc': 'Este documento se guardó pero no tiene guías generadas. Podés volver a procesarlo o eliminarlo.',
    'app.deleteDocument': 'Eliminar documento',
    'app.notAvailable': '(no disponible)',

    // Common (additions)
    'common.add': 'Agregar',

    // Feature settings
    'features.title': 'Configuración',
    'features.pedagogical': 'Herramientas pedagógicas',
    'features.helpButton': 'Botón "No entiendo"',
    'features.helpButtonDesc': 'Botón contextual para explicaciones alternativas',
    'features.preReadingQuestions': 'Preguntas previas',
    'features.preReadingQuestionsDesc': 'Preguntas guía antes de estudiar cada tema',
    'features.bloomBadges': 'Niveles Bloom en quiz',
    'features.bloomBadgesDesc': 'Clasificar preguntas por nivel cognitivo',
    'features.learningPath': 'Ruta de estudio por fases',
    'features.learningPathDesc': 'Organizar el estudio en Panorama → Profundización → Consolidación',
    'features.defaults': 'Valores por defecto',
    'features.defaultQuizMode': 'Modo de quiz',
    'features.quizSelf': 'Autoevaluación',
    'features.quizFreetext': 'Texto libre',
    'features.quizHybrid': 'Híbrido',
    'features.defaultDepth': 'Nivel de profundidad',
    'features.tutorNotes': 'Anotaciones del tutor',
    'features.tutorNotesDesc': 'Observaciones para personalizar las respuestas de la IA',
    'features.tutorNotesPlaceholder': 'Ej: Se traba con conceptos verbales. Entiende bien lo matemático. Necesita más analogías.',
    'features.saveNotes': 'Guardar',
    'features.saved': 'Guardado',

    // Pre-reading questions
    'preReading.title': 'Antes de estudiar, pensá...',
    'preReading.empty': 'Aún no hay preguntas previas para este tema.',
    'preReading.generate': 'Generar preguntas',
    'preReading.addOwn': 'Agregar tu propia pregunta',
    'preReading.addPlaceholder': '¿Qué te gustaría saber sobre este tema?',

    // Bloom's taxonomy
    'bloom.recall': 'Recordar',
    'bloom.understand': 'Comprender',
    'bloom.apply': 'Aplicar',
    'bloom.analyze': 'Analizar',

    // Help button
    'topic.helpButton': 'No entiendo',
    'topic.helpMessage': 'No entiendo este tema. ¿Podés explicármelo de una forma más simple, con una analogía o un ejemplo cotidiano?',

    // Study phases (3-phase learning path)
    'studyPhase.panorama': 'Panorama',
    'studyPhase.panorama.desc': 'Leé los resúmenes de todos los temas para tener el mapa mental',
    'studyPhase.deep': 'Profundización',
    'studyPhase.deep.desc': 'Estudiá cada tema en profundidad con el libro',
    'studyPhase.consolidation': 'Consolidación',
    'studyPhase.consolidation.desc': 'Quiz y chat socrático para fijar el conocimiento',
    'studyPhase.current': 'Actual',
    'studyPhase.topics': 'Temas',
  },

  en: {
    // Common
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.open': 'Open',
    'common.rename': 'Rename',
    'common.retry': 'Retry',
    'common.reset': 'Reset',
    'common.back': 'Back',
    'common.pages': 'pg.',
    'common.of': 'of',
    'common.loading': 'Loading...',
    'common.processing': 'Processing...',

    // Time
    'time.justNow': 'Just now',
    'time.minutesAgo': '{n} min ago',
    'time.hoursAgo': '{n}h ago',

    // Library
    'library.title': 'Your library',
    'library.document': 'document',
    'library.documents': 'documents',
    'library.newPdf': 'New PDF',
    'library.uploadPdf': 'Upload PDF',
    'library.ready': 'Ready',
    'library.incomplete': 'Incomplete',
    'library.processing': 'Processing',
    'library.book': 'Book',
    'library.trash': 'Trash',
    'library.trashEmpty': 'Trash is empty',
    'library.restore': 'Restore',
    'library.permanentDelete': 'Delete permanently',
    'library.emptyTrash': 'Empty trash',
    'library.emptyTrashConfirm': 'Permanently delete {n} document(s)?',
    'library.expiresIn': 'Expires in {n} day(s)',
    'library.expiresToday': 'Expires today',
    'library.deletedAt': 'Deleted {date}',
    'library.movedToTrash': 'Moved to trash',

    // Upload
    'upload.title': 'Upload your first PDF',
    'upload.titleSmall': 'Upload your PDF',
    'upload.instructions': 'Drag the file here or click to select it',
    'upload.subtext': 'Textbooks, notes, papers — any PDF with text',
    'upload.howItWorks': 'How it works',
    'upload.step1': 'Upload a PDF and all text is extracted',
    'upload.step2': 'AI detects the structure and topics',
    'upload.step3': 'An interactive study guide is generated per topic',
    'upload.pdfOnly': 'Only PDF files are accepted',
    'upload.tooLarge': 'File is too large (max 100 MB)',
    'upload.mismatch': "This PDF doesn't match the original book. Make sure to upload the same file.",

    // Processing
    'processing.extracting': 'Extracting text from PDF',
    'processing.analyzing': 'Detecting document structure',
    'processing.generating': 'Generating study guides',
    'processing.topic': 'Processing:',
    'processing.stop': 'Stop processing',
    'processing.nOfTotal': '{current} of {total}',
    'processing.pageRange': 'Pages {start}–{end} of {total}',

    // Stop dialog
    'stop.title': 'Processing stopped',
    'stop.generated': '{generated} of {total} topics generated',
    'stop.keep': 'Keep partial',
    'stop.keepDesc': 'View the {n} topics already generated',
    'stop.resume': 'Continue processing',
    'stop.resumeDesc': 'Cancel the stop and keep going',
    'stop.delete': 'Delete all',
    'stop.deleteDesc': 'Delete the document and start over',

    // Cancel dialog
    'cancel.title': 'Cancel processing?',
    'cancel.description': "The document is being processed. If you cancel, you can save what's been generated so far or delete everything.",
    'cancel.continue': 'Continue',
    'cancel.confirm': 'Yes, cancel',

    // Duplicate dialog
    'duplicate.title': 'Duplicate document',
    'duplicate.subtitle': 'This PDF was processed before',
    'duplicate.existing': 'Existing imports:',
    'duplicate.unknownModel': 'Unknown model',
    'duplicate.processAgain': 'Process and link to book',
    'duplicate.processIndependent': 'Process as independent',

    // Page range
    'pageRange.title': 'Configuration',
    'pageRange.subtitle': 'Pages and AI model',
    'pageRange.totalPages': 'total pages',
    'pageRange.range': 'PDF page range',
    'pageRange.from': 'From',
    'pageRange.to': 'To',
    'pageRange.pdfPageNote': 'Use the PDF page numbers, not the printed book page numbers.',
    'pageRange.all': 'All',
    'pageRange.first50': 'First 50',
    'pageRange.first100': 'First 100',
    'pageRange.first150': 'First 150',
    'pageRange.aiModel': 'AI Model',
    'pageRange.groqWarning': 'Groq has a 12K tokens/min limit (free tier). May fail with many pages.',
    'pageRange.contentLanguage': 'Generated content language',
    'pageRange.detected': '(detected)',
    'pageRange.detectedLangNote': 'The original document language appears to be {lang}.',
    'pageRange.tocConfig': 'Table of contents config',
    'pageRange.tocAuto': 'Auto-detect',
    'pageRange.tocManual': 'Set manually',
    'pageRange.tocPages': 'Pg.',
    'pageRange.tocTo': 'to',
    'pageRange.tocNone': 'No TOC',
    'pageRange.tocHelp': 'If your book has a table of contents at the beginning or end, specify the pages to improve chapter detection.',
    'pageRange.pages': '{n} pages',
    'pageRange.pagesOfTotal': '{n} of {total} pages',
    'pageRange.process': 'Process {n} pg{s}.',
    'pageRange.clickPending': 'Click on pending sections to select them.',
    'pageRange.fastEconomical': 'Fast and economical',
    'pageRange.higherQuality': 'Higher quality',
    'pageRange.fastFreeTier': 'Fast, free tier',
    'pageRange.ultraFast': 'Ultra fast',

    // Study guide
    'guide.outline': 'Outline',
    'guide.path': 'Path',
    'guide.graph': 'Graph',
    'guide.intro': 'Introduction',
    'guide.openSidebar': 'Open sidebar',
    'guide.closeSidebar': 'Close sidebar',
    'guide.incomplete': 'Incomplete document: {current} of {total} topics generated',
    'guide.resume': 'Continue processing',
    'guide.expandCoverage': 'Expand coverage',
    'guide.progressDashboard': 'Progress dashboard',
    'guide.noTopicsFilter': 'No topics at this relevance level',
    'guide.viewAll': 'View all',
    'guide.selectTopic': 'Select a topic from the side panel',
    'guide.backToLibrary': 'Back to library',

    // Connection graph
    'graph.noConnections': 'No connections between topics to visualize',
    'graph.topics': 'topics',
    'relevance.core': 'Core',
    'relevance.supporting': 'Supporting',
    'relevance.detail': 'Detail',

    // Book intro
    'intro.untitled': 'Untitled',
    'intro.pages': 'pages',
    'intro.topics': 'topics',
    'intro.overview': 'Overview',
    'intro.generateSummary': 'Generate introduction',
    'intro.tableOfContents': 'Table of contents',

    // Topic card
    'topic.coreConcept': 'Core Concept',
    'topic.supportConcept': 'Supporting Concept',
    'topic.detail': 'Detail',
    'topic.markStudied': 'Mark as studied',
    'topic.lowConfidence': 'The text for this section was extracted by approximate matching. The content may not be completely accurate.',
    'topic.sourceText': 'Original PDF Text',
    'topic.keyConcepts': 'Key Concepts',
    'topic.formalDefinitions': 'Formal Definitions',
    'topic.deepExplanation': 'Deep Explanation',
    'topic.chunksAnalyzed': '{n} chunks analyzed',
    'topic.expandedExplanation': 'Expanded Explanation',
    'topic.connections': 'Connections to other topics',
    'topic.quiz': 'Quiz ({n} questions)',
    'topic.selfAssessment': 'Self-assessment',
    'topic.freeText': 'Free text',
    'topic.usesApi': 'Uses API',
    'topic.socraticTutor': 'Socratic Tutor',
    'topic.translating': 'Translating to {lang}...',
    'topic.translateError': 'Translation error: {error}',

    // Document outline
    'outline.bookSections': 'Book sections',
    'outline.thisImport': 'Topics in this import',
    'outline.processingTopics': 'Processing topics...',
    'outline.general': 'General',
    'outline.mastered': 'Mastered',
    'outline.masteredPct': '% mastered',
    'outline.unprocessed': 'Not processed',
    'outline.otherImport': 'Other import',
    'outline.expandToProcess': "Use 'Expand coverage' to process this section",
    'outline.processedOtherImport': 'Processed in another import',
    'outline.sectionsCount': '{n} of {total} sections',

    // Relevance filter
    'filter.all': 'All',
    'filter.core': 'Core',
    'filter.supporting': 'Supporting',
    'filter.detail': 'Details',

    // Quiz
    'quiz.showAnswer': 'Show answer',
    'quiz.knew': 'I knew it',
    'quiz.didntKnow': "Didn't know",
    'quiz.correct': 'Correct',
    'quiz.toReview': 'To review',
    'quiz.result': 'Result:',

    // Free text quiz
    'freeQuiz.correct': 'Correct',
    'freeQuiz.partial': 'Partial',
    'freeQuiz.incorrect': 'Incorrect',
    'freeQuiz.placeholder': 'Write your answer...',
    'freeQuiz.charCount': 'characters (min. 10)',
    'freeQuiz.evaluating': 'Evaluating...',
    'freeQuiz.evaluate': 'Evaluate',
    'freeQuiz.showModelAnswer': 'Show model answer',
    'freeQuiz.hideModelAnswer': 'Hide model answer',
    'freeQuiz.evaluated': '{n} of {total} questions evaluated',
    'freeQuiz.result': 'Result: {score}%',
    'freeQuiz.average': '(average of {n} questions)',
    'freeQuiz.invalidResponse': 'Invalid evaluator response',
    'freeQuiz.evalError': 'Error evaluating the answer',

    // Hybrid quiz
    'hybrid.writeAnswer': 'Write answer',
    'hybrid.revealAnswer': 'Reveal answer',

    // Chat
    'chat.placeholder': 'Type your question...',
    'chat.emptyState': "Ask anything about this topic. I'll guide you to find the answer.",
    'chat.cancel': 'Cancel',
    'chat.send': 'Send',
    'chat.clear': 'Clear chat',

    // Source text
    'source.highMatch': 'High match',
    'source.mediumMatch': 'Medium match',
    'source.lowMatch': 'Low match',
    'source.loading': 'Loading source text...',
    'source.empty': 'No source text found for this section in the original PDF.',
    'source.error': 'Error loading source text. Try reloading the page.',
    'source.disclaimer': 'Text extracted directly from the PDF. May contain formatting artifacts.',

    // Coverage bar
    'coverage.label': 'Coverage: {n} of {total} sections',
    'coverage.processed': 'Processed',
    'coverage.pending': 'Pending',
    'coverage.clickToProcess': 'Click to process',
    'coverage.clickToSelect': 'Click to select',
    'coverage.clickToDeselect': 'Click to deselect',
    'coverage.selectAllPending': 'Select all pending',
    'coverage.clearSelection': 'Clear selection',
    'coverage.sectionsSelected': '{n} sections selected',
    'coverage.includesGap': 'Range includes unselected sections in between',

    // PDF storage
    'pdf.saveToServer': 'Save PDF to server',
    'pdf.saveToServerNote': 'Access PDF from other devices',
    'pdf.download': 'Download PDF',
    'pdf.link': 'Link PDF',
    'pdf.linkSuccess': 'PDF linked successfully',
    'pdf.linkMismatch': 'This PDF does not match this book',
    'pdf.downloading': 'Downloading...',
    'pdf.autoLoaded': 'PDF loaded automatically',

    // Progress dashboard
    'progress.title': 'Document progress',
    'progress.mastery': 'Mastery',
    'progress.proficiency': 'Proficiency',
    'progress.quizzes': 'Quizzes',
    'progress.attempts': 'attempts',
    'progress.masteryByTopic': 'Mastery level by topic',
    'progress.topics': 'topics',

    // Next topic
    'nextTopic.completed': 'You completed all topics!',
    'nextTopic.completedDesc': 'All topics are mastered or at expert level.',
    'nextTopic.recommended': 'Next recommended topic',

    // Connection links
    'connection.goToTopic': 'Go to topic',
    'connection.otherImport': 'Other import',

    // Learning path
    'path.nextRecommended': 'Next recommended',
    'path.fundamentals': 'Fundamentals',
    'path.reinforcement': 'Reinforcement',
    'path.deepening': 'Deep dive',
    'path.nextUnstarted': 'Next {phase} topic not started',
    'path.tryQuiz': "You've seen this, try the quiz to solidify",
    'path.needsReview': 'Needs review — try to improve the quiz',
    'path.canImprove': 'Mastered — one more review to become expert',

    // Mastery levels
    'mastery.sin-empezar': 'Not started',
    'mastery.visto': 'Seen',
    'mastery.aprendiendo': 'Learning',
    'mastery.dominado': 'Mastered',
    'mastery.experto': 'Expert',

    // Depth levels
    'depth.resumen': 'Summary',
    'depth.resumen.desc': 'Quick view: summary only',
    'depth.intermedio': 'Intermediate',
    'depth.intermedio.desc': 'Summary + key concepts + connections',
    'depth.completo': 'Complete',
    'depth.completo.desc': 'Full content including expanded explanation',

    // Theme
    'theme.changeTheme': 'Change visual theme',

    // Loading
    'loading.timeout': 'Loading is taking longer than expected. The document may have corrupt data.',
    'loading.backToLibrary': 'Back to library',

    // App
    'app.processingError': 'Processing error',
    'app.noStudyData': 'No study data',
    'app.noStudyDataDesc': 'This document was saved but has no generated guides. You can reprocess it or delete it.',
    'app.deleteDocument': 'Delete document',
    'app.notAvailable': '(not available)',

    // Common (additions)
    'common.add': 'Add',

    // Feature settings
    'features.title': 'Settings',
    'features.pedagogical': 'Pedagogical tools',
    'features.helpButton': '"I don\'t understand" button',
    'features.helpButtonDesc': 'Contextual button for alternative explanations',
    'features.preReadingQuestions': 'Pre-reading questions',
    'features.preReadingQuestionsDesc': 'Guiding questions before studying each topic',
    'features.bloomBadges': 'Bloom levels in quiz',
    'features.bloomBadgesDesc': 'Classify questions by cognitive level',
    'features.learningPath': 'Phased study path',
    'features.learningPathDesc': 'Organize study in Overview → Deep dive → Consolidation',
    'features.defaults': 'Defaults',
    'features.defaultQuizMode': 'Quiz mode',
    'features.quizSelf': 'Self-assessment',
    'features.quizFreetext': 'Free text',
    'features.quizHybrid': 'Hybrid',
    'features.defaultDepth': 'Depth level',
    'features.tutorNotes': 'Tutor annotations',
    'features.tutorNotesDesc': 'Observations to personalize AI responses',
    'features.tutorNotesPlaceholder': 'E.g.: Struggles with verbal concepts. Good with math. Needs more analogies.',
    'features.saveNotes': 'Save',
    'features.saved': 'Saved',

    // Pre-reading questions
    'preReading.title': 'Before studying, think about...',
    'preReading.empty': 'No pre-reading questions for this topic yet.',
    'preReading.generate': 'Generate questions',
    'preReading.addOwn': 'Add your own question',
    'preReading.addPlaceholder': 'What would you like to know about this topic?',

    // Bloom's taxonomy
    'bloom.recall': 'Recall',
    'bloom.understand': 'Understand',
    'bloom.apply': 'Apply',
    'bloom.analyze': 'Analyze',

    // Help button
    'topic.helpButton': "I don't understand",
    'topic.helpMessage': "I don't understand this topic. Can you explain it in a simpler way, with an analogy or an everyday example?",

    // Study phases (3-phase learning path)
    'studyPhase.panorama': 'Overview',
    'studyPhase.panorama.desc': 'Read summaries of all topics to build a mental map',
    'studyPhase.deep': 'Deep dive',
    'studyPhase.deep.desc': 'Study each topic in depth with the book',
    'studyPhase.consolidation': 'Consolidation',
    'studyPhase.consolidation.desc': 'Quiz and Socratic chat to solidify knowledge',
    'studyPhase.current': 'Current',
    'studyPhase.topics': 'Topics',
  },
}
