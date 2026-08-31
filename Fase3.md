# Fase 3

## Avance actual

El proyecto ya cuenta con una base funcional de salas, jugadores, partidas, acciones y sincronización conectadas a Supabase. La fase 3 ha avanzado de forma importante y ya se cuenta con un flujo de mesa más cercano a una partida real de poker.

### Lo que ya quedó implementado
- Proyecto inicial creado con Next.js y TypeScript.
- Arquitectura base de frontend y componentes reutilizables.
- Flujo de creación de salas y entrada a mesas reales.
- Integración con Supabase para persistencia y sincronización.
- Mecanismo de partidas, registro de acciones y actualización del estado de la mano.
- Reparto inicial de cartas y persistencia de manos privadas por jugador.
- Gestión básica de turnos, bote, ronda activa y showdown.
- Reinicio de mano con estado real en Supabase.
- Feedback visual de ronda, showdown y nueva mano en la UI.
- Build validado correctamente con Next.js.

### Estado general
La fase 3 ya está en una etapa muy avanzada: el MVP funciona como una mesa de poker con flujo de juego, turnos, rondas y cierre de mano. Lo que sigue es reforzar la lógica de juego y pulir la experiencia para acercarla más a un producto completo.

---

## Objetivo de la Fase 3

Llegar a una versión más completa del juego donde el proyecto pueda:
- gestionar reglas reales de poker de forma visible,
- avanzar entre rondas con mayor coherencia,
- mostrar el estado de la mano de forma más clara,
- preparar la app para una experiencia de juego más cercana al producto final.

---

## Plan de acciones para completar la Fase 3

### 1. Definir la lógica de juego de poker
- Reparto inicial de cartas ya implementado y persistido.
- Orden de turnos definido de forma básica según la mesa.
- Flujo de preflop, flop, turn, river y showdown ya integrado en la lógica.
- Reglas básicas de fold, check, call y raise ya incorporadas en la acción del juego.

### 2. Mejorar el estado de la partida
- El estado actual de la mano ya se guarda en Supabase.
- El bote, turno y ronda activa se muestran en la UI.
- La coherencia entre la partida y la vista del usuario ya se ha mejorado con sincronización y refresh.

### 3. Gestionar la experiencia del jugador
- Las cartas privadas del usuario actual ya se muestran en la mesa.
- El estado de los demás jugadores se refleja de forma visual en la lista de resumen.
- Los mensajes de turno, ronda y resultado ya son visibles mediante banners y feedback.
- Falta refinar aún más los estados de carga y feedback visual para que la experiencia sea más fluida.

### 4. Completar la lógica de rondas y apuestas
- El avance entre rondas ya está incorporado en la lógica del juego.
- El showdown ya se activa al finalizar la mano o cuando quedan pocos jugadores activos.
- Todavía falta una lógica más realista de apuestas y resolución de manos para acercarse más a una partida completa.

### 5. Refinar la sincronización y la experiencia
- La UI ya se alinea con cambios en tiempo real desde Supabase.
- Se redujeron inconsistencias entre sesiones, aunque sigue siendo un área de mejora.
- Falta pulir la experiencia visual y la consistencia de estado en casos más complejos.

---

## Lo que ya se tiene

- Base funcional para crear y entrar a salas.
- Partidas persistentes en Supabase.
- Registro de acciones básicas del juego.
- Sincronización inicial para sala y partida.
- Diseño base de la mesa y flujo de interacción.
- Lógica básica de rondas, turnos y showdown.
- Reinicio de mano con estado persistido.
- Feedback visual de transición de ronda y final de mano.

---

## Lo que hace falta para completar la Fase 3

### Pendientes inmediatos
- Mejorar la lógica de apuestas para que sea más realista y menos lineal.
- Definir mejor la resolución de manos y el ganador final de la mano.
- Añadir más estados de jugador, como blind, call, raise y apuesta activa.
- Pulir la experiencia visual de la mesa con animaciones y mejor legibilidad.

### Pendientes de producto
- Mostrar mejor el estado de los jugadores en la mesa con fichas, turno y acciones recientes.
- Añadir mensajes más claros de turno, ronda y acciones disponibles.
- Hacer la experiencia menos provisional y más cercana a una mesa de poker real.

### Pendientes técnicos
- Crear una capa de lógica de poker más robusta y separada del componente UI.
- Extender la persistencia para cubrir estados más completos de la mano.
- Preparar la app para futuras reglas más completas, como blinds, botones y múltiples rondas de apuestas.

---

## Requisitos para considerar la Fase 3 completada

La Fase 3 se dará por completada cuando:
- el juego pueda repartir cartas, avanzar por rondas y cerrar manos de forma coherente,
- los turnos y apuestas se gestionen de forma más realista,
- la UI refleje de forma consistente el estado real de la mano,
- la experiencia se vea más cercana a un juego de poker funcional,
- el proyecto esté listo para pasar a mejoras de producto y reglas más completas.

---

## Posibles mejoras

### Mejoras inmediatas
- Mejorar el feedback de turno y acciones con estados más ricos.
- Mostrar mejor el ganador de la mano al finalizar.
- Añadir animaciones y estados visuales para cada ronda.
- Reforzar la lógica de apuestas y blinds.

### Mejoras de producto
- Implementar un sistema de fichas más realista.
- Añadir un chat simple en la mesa.
- Mostrar ranking de jugadores y manos.
- Mejorar el diseño de la experiencia en móvil.

### Mejoras técnicas
- Crear un motor de poker propio o integrar una librería más completa.
- Añadir pruebas para la lógica del juego.
- Mejorar la sincronización y la consistencia entre sesiones.

---

## Resumen

La Fase 3 ya ha dejado una base sólida para jugar una partida de poker en tiempo real con salas, turnos, rondas, showdown y reinicio de mano. El objetivo ahora es pulir la lógica de apuestas y la experiencia de mesa para acercarla más a un producto completo.
