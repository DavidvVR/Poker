# Fase 4

## Avance actual

La fase 3 dejó una base sólida para jugar partidas de poker en tiempo real con salas, turnos, rondas, showdown y reinicio de mano. La fase 4 apunta a convertir esa base en una experiencia más completa, con reglas más realistas, mejor feedback de producto y una arquitectura más preparada para crecer.

**Estado: completada.** La mesa ya incorpora apuestas, estados de jugador, ayuda contextual, resumen de mano, dealer rotativo, ciegas dinámicas, resolución del showdown y una experiencia responsive para móvil.

### Lo que ya quedó implementado
- Proyecto base creado con Next.js y TypeScript.
- Arquitectura de salas, partidas y acciones conectada a Supabase.
- Flujo de creación de salas y acceso a mesas reales.
- Persistencia de partidas, turnos y estado de la mano.
- Lógica básica de rondas, apuestas y showdown.
- UI funcional de mesa con tablero, cartas, bote y mensajes de ronda.
- Reinicio de mano con estado real en Supabase.
- Rotación de dealer y asignación de ciegas pequeña/grande en cada mano.
- Conservación de stacks, cobro de ciegas y reparto del bote a uno o varios ganadores.
- Validación de turno tanto en la interfaz como en el servidor.
- Panel final de mano con resultado, bote y acceso directo a una nueva mano.
- Diseño de mesa optimizado para controles táctiles y pantallas móviles.
- Build validado correctamente con Next.js.

### Estado general
La fase 4 se enfoca en llevar el producto de un MVP funcional a una experiencia más completa, con mayor realismo de juego, mejor claridad para el usuario y una base más sólida para futuras mejoras.

---

## Objetivo de la Fase 4

Llegar a una versión más madura del juego donde el proyecto pueda:
- gestionar reglas de poker más cercanas a una partida real,
- ofrecer una experiencia de mesa más clara y profesional,
- mejorar la lógica de apuestas y resolución de manos,
- preparar la app para futuras mejoras de producto y escalabilidad.

---

## Plan de acciones para completar la Fase 4

### 1. Mejorar la lógica de juego
- Reforzar el flujo de apuestas para que sea más realista y menos lineal.
- Definir una resolución de manos más clara y consistente.
- Incorporar estados de jugador más ricos, como call, raise, fold, check y all-in.
- Preparar la lógica para soportar blinds y botones en futuras iteraciones.

### 2. Mejorar la experiencia de mesa
- Mostrar mejor el estado de cada jugador con fichas, turno y acciones recientes.
- Añadir mensajes de turno, ronda y acciones disponibles con mayor claridad.
- Hacer que la interfaz se sienta más cercana a una mesa de poker real.
- Mejorar la legibilidad en móvil y la coherencia visual general.

### 3. Reforzar la persistencia y sincronización
- Ampliar el modelo de estado para cubrir acciones más detalladas de la mano.
- Asegurar que los cambios de ronda, turnos y resultados se reflejen de forma consistente.
- Reducir brechas entre la UI y el estado real guardado en Supabase.

### 4. Preparar la base para producto
- Estructurar mejor la lógica del juego para que sea más fácil extenderla.
- Separar aún más la lógica de poker del componente visual.
- Crear una base más estable para futuras reglas, modos y mejoras de UX.

---

## Lo que ya se tiene

- Base funcional para crear y entrar a salas.
- Partidas persistentes y sincronizadas con Supabase.
- Registro de acciones básicas del juego.
- Mesa funcional con turnos, rondas y showdown.
- Feedback visual de ronda y fin de mano.
- Diseño base de la experiencia de juego.

---

## Trabajo posterior a la Fase 4

### Próximas extensiones
- Modelar apuestas por calle con contribuciones individuales completas.
- Incorporar side pots para múltiples jugadores all-in.
- Añadir autenticación real y reconexión de sesiones.
- Ampliar la evaluación de manos y los casos límite de Texas Hold'em.

### Pendientes de producto
- Hacer que la mesa se vea más profesional y menos provisional.
- Mostrar mejor el estado de los jugadores y la acción en curso.
- Mejorar la claridad de la información relevante en cada ronda.
- Fortalecer la sensación de juego en tiempo real.

### Pendientes técnicos
- Crear una capa de lógica de poker más robusta y mantenible.
- Ampliar la persistencia para soportar estados más completos.
- Preparar la app para evolucionar hacia reglas más completas.

---

## Requisitos para considerar la Fase 4 completada

La Fase 4 se dará por completada cuando:
- la lógica de juego sea más realista y coherente,
- la experiencia de mesa se vea más clara y profesional,
- los estados de la partida se reflejen de forma consistente,
- el proyecto esté preparado para avanzar hacia una versión más completa de producto.

---

## Posibles mejoras

### Mejoras inmediatas
- Añadir mejor feedback visual de turnos y apuestas.
- Mostrar ganador y resumen de la mano de forma más elegante.
- Mejorar la experiencia en móvil.
- Incorporar estados más ricos para cada jugador.

### Mejoras de producto
- Implementar un sistema de fichas más realista.
- Añadir un chat simple en la mesa.
- Mostrar ranking de jugadores y manos.
- Refactorizar la UI para una apariencia más pulida.

### Mejoras técnicas
- Integrar una lógica de poker más avanzada o una librería especializada.
- Añadir pruebas para la lógica del juego.
- Mejorar la escalabilidad y la consistencia de la sincronización.

---

## Resumen

La Fase 4 está completada: el proyecto pasó de una mesa funcional a una experiencia coherente con roles, ciegas, turnos protegidos, stacks persistentes, resultados visibles y soporte responsive. Las reglas avanzadas, como side pots y apuestas completas por calle, quedan como evolución de la siguiente fase.
