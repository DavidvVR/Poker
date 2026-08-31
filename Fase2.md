# Fase 2

## Avance actual

El proyecto ya pasó de una base visual a un MVP funcional conectado a Supabase. Se logró integrar la creación y entrada a salas reales, la gestión básica de jugadores en sala, la creación de partidas desde una sala activa y el registro de acciones de juego en base de datos.

### Lo que ya quedó implementado
- Proyecto inicial creado con Next.js y TypeScript.
- Frontend reorganizado en componentes reutilizables.
- Flujo visual de bienvenida, creación de sala, acceso a una mesa y lobby.
- Diseño responsive para móvil y escritorio.
- Integración inicial con Supabase mediante clientes para navegador y servidor.
- Variables de entorno de desarrollo configuradas.
- Esquema SQL preparado para perfiles, salas, jugadores, partidas y acciones.
- API routes para crear salas, unir jugadores, iniciar partidas y registrar acciones.
- Persistencia real de salas, jugadores y partidas en Supabase.
- Build validado correctamente con Next.js.

### Estado general
La fase 2 ya avanzó bastante: el proyecto cuenta con un flujo funcional de salas y partidas persistentes, aunque aún falta reforzar la sincronización, la gestión completa de turnos y la experiencia de juego más completa.

---

## Objetivo de la Fase 2

Llegar a una versión funcional del MVP donde el proyecto pueda:
- crear salas reales desde la interfaz,
- registrar jugadores dentro de una sala,
- iniciar partidas y mantener su estado en Supabase,
- registrar acciones básicas del juego,
- preparar la base para turnos, apuestas y progreso real del poker.

---

## Progreso actual por bloque

### 1. Integrar la creación de salas con Supabase [Completado en parte]
- [x] Conectar el flujo de crear mesa con inserciones reales en rooms.
- [x] Generar un código único de sala.
- [x] Guardar el anfitrión como host_id.
- [x] Mostrar el estado de la sala desde la base de datos.
- [ ] Añadir validaciones adicionales y manejo más robusto de errores.

### 2. Gestionar jugadores dentro de la sala [Completado en parte]
- [x] Permitir que un usuario se una a una sala existente.
- [x] Insertar registros en room_players.
- [x] Mostrar la lista de jugadores en la sala.
- [x] Mantener estados de listo/espera en la UI.
- [ ] Mejorar la sincronización entre usuarios y la experiencia al entrar o salir.

### 3. Crear el modelo de partida real [Completado en parte]
- [x] Definir el inicio de una partida desde una sala activa.
- [x] Insertar un registro en games.
- [x] Asociar jugadores a la partida en game_players.
- [x] Guardar un estado inicial de bote, turno y dealer.
- [ ] Ampliar la lógica para rondas completas y evolución del juego.

### 4. Implementar acciones de juego [Completado en parte]
- [x] Registrar acciones básicas como pasar, igualar y retirarse.
- [x] Guardar acciones en game_actions.
- [x] Actualizar el estado del turno y del bote en la lógica inicial.
- [ ] Completar el flujo de apuestas, turnos y rondas de forma más completa.

### 5. Sincronización básica en tiempo real [Pendiente]
- [ ] Usar Realtime de Supabase para refrescar sala y partida.
- [ ] Mostrar cambios de jugadores, turno y estado de la mesa en tiempo real.
- [ ] Reducir la necesidad de recargar la página.

### 6. Mejorar el flujo de la experiencia [En progreso]
- [x] Añadir estados claros para sala abierta y partida iniciada.
- [x] Mejorar los mensajes de error y éxito en varios flujos.
- [x] Asegurar una experiencia fluida en móvil y escritorio.
- [ ] Pulir la experiencia de juego para hacerla más clara y completa.

---

## Lo que ya se tiene

- Base del frontend funcional.
- Base de datos preparada en Supabase.
- Arquitectura para conectar clientes y servidor.
- Diseño visual de la app.
- Flujo de salas y partidas persistentes.
- Build funcionando.

---

## Lo que hace falta para completar la Fase 2

### Pendientes inmediatos
- Completar la sincronización en tiempo real de salas y partidas.
- Mejorar la lógica de turnos y rondas del poker.
- Añadir manejo más robusto de errores y estados de carga.
- Pulir la experiencia del juego para que sea coherente desde el inicio hasta el final de la partida.
- Preparar la app para escalar hacia la lógica completa del poker.

### Pendientes de producto
- Mostrar la lista de jugadores en la sala con mayor claridad.
- Mostrar el estado de la partida de forma más visual.
- Gestionar turnos de forma visible y consistente.
- Mejorar el feedback visual del juego.

### Pendientes técnicos
- Crear servicios más específicos para salas, partidas y acciones.
- Separar aún más la lógica de negocio del componente UI.
- Gestionar errores de red y estados de carga de forma más robusta.
- Preparar la app para escalar hacia la fase completa del poker.

---

## Requisitos para considerar la Fase 2 completada

La Fase 2 se dará por completada cuando:
- se pueda crear una sala real desde la interfaz,
- los jugadores puedan unirse a esa sala,
- la partida se pueda iniciar y guardar en Supabase,
- las acciones del juego queden registradas en base de datos,
- la UI se actualice de forma coherente con el estado real del juego,
- el proyecto esté listo para avanzar hacia reglas completas de poker.

---

## Resumen

La Fase 2 ya no es solo una base técnica: el proyecto consiguió convertir la interfaz visual en un flujo real de salas y partidas conectadas a Supabase. El siguiente paso consiste en reforzar la sincronización y la lógica de juego para que el MVP sea más completo y estable.
