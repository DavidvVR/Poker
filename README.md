# Póker Amigos

Póker Amigos es un proyecto MVP para crear mesas privadas de Texas Hold'em y jugar con amigos desde cualquier dispositivo. La idea es pasar de una demo visual a una experiencia real con salas, jugadores, partidas sincronizadas y backend en Supabase.

## Estado actual

La fase 5 está implementada. La aplicación incluye salas persistentes, sincronización Realtime de lobby y mesa, turnos validados en servidor, apuestas básicas, dealer rotativo, ciegas 10/20, stacks persistentes, reparto del bote, showdown y una mesa responsive para escritorio y móvil.

## Objetivo del MVP

Permitir que un grupo de amigos pueda:
- crear o unirse a una mesa privada,
- entrar con un nombre o autenticación,
- ver otros jugadores en la sala,
- iniciar una partida,
- jugar una mano completa de Texas Hold'em,
- ver turnos, apuestas y ganador,
- desplegar la app en Vercel de forma sencilla.

---

## Stack recomendado

- Frontend: Next.js + TypeScript + React
- Estilos: CSS moderno en archivos locales
- Backend: Supabase (Postgres, Auth, Realtime, Storage)
- Lógica de juego: poker-engine-ts
- Despliegue: Vercel

---

## Roadmap del MVP

### Fase 1: base del proyecto
- Crear y preparar el proyecto en Next.js con TypeScript.
- Definir la estructura de carpetas.
- Preparar el diseño base de la experiencia de usuario.

### Fase 2: conexión con Supabase
- Crear proyecto en Supabase.
- Configurar autenticación.
- Crear tablas para:
  - perfiles,
  - salas,
  - jugadores de sala,
  - partidas,
  - acciones de juego.
- Configurar Row Level Security (RLS).
- Añadir variables de entorno:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

### Fase 3: salas y jugadores
- Permitir crear salas privadas.
- Generar códigos únicos de sala.
- Permitir unirse a una sala con código.
- Gestionar jugadores conectados.
- Mostrar estado de la sala antes de empezar la partida.

### Fase 4: lógica de partida
- Iniciar una partida desde la sala.
- Repartir cartas iniciales.
- Implementar turnos.
- Añadir acciones de juego:
  - pasar,
  - igualar,
  - subir,
  - retirarse.
- Gestionar bote y saldo de fichas ficticias.
- Calcular ganador de la mano.

### Fase 5: sincronización en tiempo real
- [x] Actualizar la lista de jugadores del lobby.
- [x] Abrir la mesa automáticamente para todos al iniciar la partida.
- [x] Sincronizar estado de partida, turnos y bote.
- [x] Mostrar apuestas y acciones recientes.
- [x] Reflejar stacks, estados de jugador y cambios del tablero.
- [x] Mostrar el estado de conexión Realtime.

Consulta [Fase5.md](Fase5.md) para activar las publicaciones necesarias en Supabase y verificar el flujo con varios clientes.

### Fase 6: experiencia de usuario
- Mostrar mensajes de turno y estado.
- Mostrar fichas del jugador actual.
- Añadir un diseño más pulido para la mesa.
- Añadir animaciones sencillas.
- Implementar chat opcional de mesa.

### Fase 7: despliegue en Vercel
- Conectar el repositorio con Vercel.
- Añadir variables de entorno en producción.
- Verificar el build.
- Configurar dominio propio si se desea.
- Probar la app con amigos reales.

---

## Estructura recomendada del proyecto

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  components/
    ui/
    poker/
  lib/
    supabase/
    poker/
  types/
  hooks/
  services/
```

---

## Base de datos recomendada en Supabase

### Tabla: profiles
- id
- full_name
- avatar_url
- created_at

### Tabla: rooms
- id
- code
- host_id
- status
- created_at

### Tabla: room_players
- id
- room_id
- user_id
- seat
- is_ready
- chips
- joined_at

### Tabla: games
- id
- room_id
- current_turn
- dealer_position
- pot
- status
- created_at

### Tabla: game_players
- id
- game_id
- user_id
- hand
- folded
- all_in
- chips
- position

### Tabla: game_actions
- id
- game_id
- user_id
- action
- amount
- created_at

---

## Pasos de implementación recomendados

### 1. Preparar el entorno
```bash
npm install
npm run dev
```

### 2. Configurar Supabase
- Crear proyecto en Supabase.
- Obtener credenciales.
- Añadirlas al archivo `.env.local`.



### 3. Instalar dependencias necesarias
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 4. Implementar la arquitectura incremental
1. Autenticación básica.
2. Crear y unirse a salas.
3. Mostrar jugadores en espera.
4. Iniciar partida.
5. Gestión de turnos y apuestas.
6. Despliegue en Vercel.

---

## Despliegue en Vercel

1. Crear un proyecto en Vercel.
2. Conectar el repositorio de GitHub.
3. Añadir las variables de entorno de Supabase.
4. Ejecutar el despliegue.
5. Probar la app en producción.

---

## Próximos pasos ideales

- Implementar autenticación real con Supabase Auth.
- Añadir apuestas completas por calle y side pots.
- Añadir historial de partidas.
- Añadir ranking y perfiles.

---

## Notas

Este README sirve como guía de referencia para construir el MVP de forma ordenada y escalable. El foco inicial debe ser:
- salas,
- jugadores,
- partida,
- turnos y apuestas,
- sincronización en tiempo real.

Con esta base, el proyecto podrá pasar de una demo visual a una experiencia de poker usable para jugar con amigos.
