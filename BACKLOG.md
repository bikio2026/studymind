# Backlog — StudyMind
> Última actualización: 2026-03-08

## Pedagógico / Tutor
- [ ] Inyectar contenido del tutor en TopicCard — que las observaciones/foco generado lleguen al estudiante (conceptos clave, quiz, explicación profunda)
- [ ] Definir dónde aparece el "Foco del tutor" dentro del TopicCard (sección nueva? dentro de conceptos clave?)
- [ ] Permitir al tutor agregar contenido al quiz desde el panel de observaciones
- [ ] Permitir al tutor agregar contenido a la explicación profunda desde observaciones
- [~] Ruta de estudio en 3 fases — implementada pero apagada por defecto. Necesita repensar: cada fase debería mostrar contenido incremental, pero el contenido actual es ya resumido
- [ ] Lectura no lineal — concepto discutido, pendiente definir cómo implementar (¿connection map interactivo como punto de entrada?)
- [ ] Gráficos generados por LLM — botón para generar gráficos ad-hoc en temas sin gráfico del catálogo

## Quiz / Evaluación
- [x] Quiz persistence — respuestas se guardan automáticamente (2026-03-05)
- [x] Botón "Reiniciar quiz" para limpiar respuestas guardadas (2026-03-05)
- [x] Pre-reading questions: 5-7 preguntas + respuestas interactivas con feedback LLM (2026-03-05)

## UI / UX
- [x] Connection map: botón en toolbar abre modal fullscreen (2026-03-05)
- [x] Settings: eliminado textarea de tutor notes, agregado link a Tutor Observations (2026-03-05)
- [ ] `beforeunload` warning cuando se está procesando (evitar cierre accidental)

## Infraestructura
- [ ] Deploy producción con Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN en Vercel)
- [ ] Tag v1.0 + changelog cuando features pedagógicas estén estables

## Completados (v0.12)
- [x] Quiz persistence (2026-03-05)
- [x] Pre-reading questions mejoradas (2026-03-05)
- [x] Ruta de estudio flexible — sin bloqueo (2026-03-05)
- [x] Tutor Observations — modal interactivo dual (2026-03-05)
- [x] Connection map fullscreen (2026-03-05)
- [x] Settings limpio (2026-03-05)
- [x] Fix crash LearningPath phaseStats (2026-03-05)
- [x] learningPath default OFF (2026-03-08)
