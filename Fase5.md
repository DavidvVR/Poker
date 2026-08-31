# Fase 5: sincronización en tiempo real

## Estado

Implementación completada en la aplicación. Para activarla en el proyecto remoto, ejecuta una vez el contenido actualizado de `supabase-schema.sql` en el SQL Editor de Supabase.

## Cobertura Realtime

- `room_players`: actualiza la lista de jugadores del lobby.
- `rooms`: refresca el estado general de la sala.
- `games`: sincroniza bote, turno, ronda, dealer, resultado y cartas comunitarias.
- `game_players`: sincroniza stacks, retirados, all-in y cartas repartidas.
- `game_actions`: sincroniza check, call, raise y fold en el historial de la mesa.

## Flujo implementado

- Los invitados detectan cuando el anfitrión crea la partida y entran automáticamente a la mesa.
- Cada evento solicita el estado canónico al API; el cliente no confía en el payload parcial de Realtime.
- Las respuestas antiguas se descartan para evitar que una petición lenta sobrescriba un estado nuevo.
- Lobby y mesa muestran `En vivo`, `Reconectando` o `Desconectado`.
- El resultado del showdown queda persistido para que todos los jugadores vean el mismo mensaje.

## Activación en Supabase

1. Abre **SQL Editor** en el proyecto Supabase.
2. Ejecuta `supabase-schema.sql`.
3. Comprueba en **Database > Publications** que `supabase_realtime` contiene:
   - `rooms`
   - `room_players`
   - `games`
   - `game_players`
   - `game_actions`
4. Abre la aplicación en dos navegadores, entra a la misma sala y verifica que el indicador muestre `En vivo`.

El SQL usa comprobaciones previas, por lo que se puede ejecutar de nuevo sin duplicar tablas en la publicación.

## Criterios de aceptación

- Un jugador nuevo aparece en los demás lobbies sin recargar.
- Al iniciar la partida, todos los jugadores pasan a la mesa.
- Turno, bote, stacks y tablero cambian en todos los clientes.
- Las acciones recientes muestran jugador, acción y cantidad.
- El showdown y el reinicio de mano se reflejan en todos los clientes.