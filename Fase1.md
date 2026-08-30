# Fase 1

## Avance actual

El proyecto ya cuenta con una base sólida para iniciar el desarrollo del MVP de poker para jugar con amigos.

### Lo que ya tienes implementado
- Proyecto inicial creado con Next.js y TypeScript.
- Estructura base del frontend reorganizada en componentes y utilidades.
- Pantalla principal con flujo de bienvenida, creación de mesa y unión a sala.
- Diseño visual inicial de la interfaz de poker con vista de mesa.
- Mejoras en el flujo de usuario con mensajes de ayuda, estados más claros y navegación entre pantallas.
- Adaptación inicial del diseño para pantallas móviles.
- Integración base preparada con Supabase mediante clientes para navegador y servidor.
- Variables de entorno de desarrollo configuradas para conectar con Supabase.
- Esquema SQL inicial preparado para tablas de salas, jugadores, partidas y acciones.
- README con el roadmap general del proyecto y la visión del MVP.

### Estado general
El proyecto está en una etapa de prototipo funcional visual y de arquitectura preparada para integrar backend real, con una base sólida para avanzar hacia salas persistentes, jugadores y partidas sincronizadas.

---

## Objetivo de la Fase 1

Llegar a una base estable donde el proyecto pueda:
- arrancar correctamente,
- mostrar una experiencia de usuario clara,
- preparar la arquitectura para integrar Supabase,
- dejar listo el camino para implementar salas, jugadores y partidas reales.

---

## Plan de acciones para completar la Fase 1

### 1. Consolidar la estructura del proyecto
- Organizar mejor los componentes del frontend.
- Separar la lógica de la interfaz.
- Crear carpetas claras para:
  - componentes,
  - páginas,
  - servicios,
  - utilidades,
  - tipos.

### 2. Mejorar la experiencia de flujo actual
- Reforzar la navegación entre pantalla de inicio, sala y mesa.
- Añadir estados más claros para:
  - crear mesa,
  - unirse a una sala,
  - entrar a la partida,
  - salir de la mesa.
- Mejorar los mensajes de error y confirmación.
- Diseñar la experiencia para móvil como prioridad, asegurando que la interfaz sea usable en pantallas pequeñas.

### 3. Preparar la base para Supabase
- Instalar y configurar el cliente de Supabase.
- Crear variables de entorno para desarrollo.
- Definir la estructura de tablas necesarias.
- Preparar el proyecto para recibir datos reales desde el backend.
- Validar la conexión con Supabase y dejar la arquitectura lista para persistir salas y partidas.

### 4. Definir la lógica de negocio mínima
- Crear un modelo de sala.
- Crear un modelo de jugador.
- Definir el estado inicial de una partida.
- Preparar la lógica para repartir cartas y controlar turnos básicos.

### 5. Preparar el despliegue base
- Verificar que el proyecto compile correctamente.
- Hacer pruebas locales.
- Preparar el entorno para despliegue en Vercel.
- Mantener las variables de entorno seguras tanto en desarrollo como en producción.

---

## Requisitos para considerar la Fase 1 completada

La Fase 1 se dará por completada cuando:
- el proyecto pueda ejecutarse de forma estable,
- el flujo de bienvenida y sala funcione sin errores,
- exista una base preparada para conectar Supabase,
- la arquitectura esté organizada para escalar al MVP completo,
- la interfaz sea usable y responsive en móvil,
- el proyecto esté listo para pasar a la implementación real del backend y juego.

---

## Posibles mejoras

### Mejoras inmediatas
- Añadir validaciones más fuertes en formularios.
- Mejorar el diseño responsive para móvil con enfoque en pantallas pequeñas.
- Ajustar botones, formularios y distribución de contenido para una experiencia cómoda en smartphones.
- Añadir transiciones suaves entre pantallas.
- Implementar carga de estados con mejor feedback visual.

### Mejoras de producto
- Añadir perfiles de usuario.
- Permitir múltiples jugadores en la misma sala.
- Mostrar fichas y saldo realista.
- Implementar un sistema de mensajes o chat simple.
- Añadir sonidos o animaciones de partidas.

### Mejoras técnicas
- Separar la lógica del juego en servicios reutilizables.
- Crear hooks personalizados para manejo de estado.
- Preparar el proyecto para pruebas automáticas.
- Añadir logging y manejo de errores más robusto.

---

## Resumen

La Fase 1 no consiste en terminar el juego completo, sino en dejar una base sólida, limpia y escalable para avanzar hacia un MVP real de poker con amigos. El punto clave ahora es convertir el prototipo visual en una arquitectura preparada para backend, partidas reales y despliegue profesional.
