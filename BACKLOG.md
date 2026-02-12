# Backlog - Infinity World

Backlog de tareas ordenado por prioridad. Cada tarea es lo suficientemente concreta para ser implementada en una sesión.

---

## Fase 1: Menú Principal y Navegación

### 1.1 Crear pantalla de menú principal
- Pantalla HTML/CSS que se muestra al abrir la app (antes de cargar el mundo 3D)
- Botones: "Acceder al Mundo", "Mis Parcelas", "Tienda", "Ajustes"
- Diseño mobile-first acorde al tema visual existente (dark theme)
- El canvas 3D NO se carga hasta que el jugador pulse "Acceder al Mundo"

### 1.2 Pantalla "Mis Parcelas"
- Lista de parcelas del jugador con coordenadas (x, y)
- Estado vacío: mensaje "No tienes parcelas. Compra tu primera parcela en la Tienda"
- Cada parcela es clickeable para entrar directamente al mundo centrado en ella
- Botón de volver al menú principal

### 1.3 Pantalla de Ajustes (estructura básica)
- Pantalla con secciones placeholder: Sonido, Gráficos, Cuenta
- Toggle de sonido on/off
- Botón de cerrar sesión (placeholder)
- Botón de volver al menú principal

### 1.4 Navegación entre pantallas
- Sistema de routing simple entre: Menú → Mundo / Parcelas / Tienda / Ajustes
- Transiciones suaves entre pantallas
- Botón de volver al menú desde el mundo 3D (icono en HUD)

---

## Fase 2: Infraestructura Backend

### 2.1 Docker Compose para servicios
- `docker-compose.yml` en la raíz del proyecto
- Servicios: PostgreSQL 16 + PostGIS 3.4, Redis 7
- Volúmenes persistentes para datos de BD
- Variables de entorno configurables
- Documentar comandos en CLAUDE.md (`docker compose up -d`, etc.)

### 2.2 Conexión a PostgreSQL desde el backend
- Instalar y configurar driver PostgreSQL (pg + @types/pg)
- Pool de conexiones con configuración desde .env
- Módulo `db.ts` centralizado para obtener conexiones
- Health check que verifique conexión a BD
- Manejo de errores de conexión y reconexión

### 2.3 Sistema de migraciones
- Instalar herramienta de migraciones (node-pg-migrate o similar)
- Script npm: `npm run migrate:up`, `npm run migrate:down`, `npm run migrate:create`
- Migración inicial: crear tablas `players`, `parcels`, `placed_objects`, `placeable_objects`, `player_inventory`
- Habilitar extensión PostGIS en la BD
- Índices espaciales en tabla `parcels` (columna geometry con PostGIS)

### 2.4 Repositorios PostgreSQL - Player y Parcel
- Implementar `PgPlayerRepository` siguiendo la interfaz `IPlayerRepository`
- Implementar `PgParcelRepository` siguiendo la interfaz `IParcelRepository`
- Query espacial con PostGIS para `findInArea(x, y, radius)`
- Factory o config para elegir entre repositorios Memory vs Pg según entorno

### 2.5 Repositorios PostgreSQL - PlacedObject y PlaceableObject
- Implementar `PgPlacedObjectRepository` siguiendo la interfaz existente
- Implementar `PgPlaceableObjectRepository` siguiendo la interfaz existente
- Queries con JOINs para cargar objetos de una parcela con sus datos de catálogo

### 2.6 Configuración de Redis
- Conectar Redis desde el backend (ioredis)
- Módulo `redis.ts` centralizado
- Uso inicial: caché de sesiones y datos frecuentes
- Health check que verifique conexión a Redis

### 2.7 Autenticación básica
- Registro simple: nombre + contraseña (bcrypt para hash)
- Login: devuelve JWT token
- Middleware Express para validar JWT en rutas protegidas
- Endpoints: POST /auth/register, POST /auth/login, GET /auth/me
- Guardar jugador en tabla `players` al registrarse con monedas iniciales

### 2.8 Seeders de catálogo y datos iniciales
- Script de seeding que inserte el catálogo de objetos en la BD
- Marcar cuáles son gratuitos y cuáles premium con sus precios
- Crear datos iniciales de prueba (parcelas del mundo)
- Ejecutable como comando: `npm run seed`

### 2.9 Middleware de errores y logging
- Middleware global de errores en Express (captura excepciones, devuelve JSON consistente)
- Logger básico (winston o pino) con niveles: error, warn, info, debug
- Log de requests HTTP (método, ruta, status, duración)
- Formato diferente para desarrollo (legible) vs producción (JSON)

---

## Fase 3: Sistema de Economía y Monedas

### 3.1 Modelo de monedas en backend
- Añadir campo `coins` al modelo Player (migración)
- Endpoints REST: GET /players/:id/balance, POST /players/:id/coins (añadir/gastar)
- Validación de saldo suficiente antes de cualquier compra
- Transacciones atómicas para evitar race conditions

### 3.2 Mostrar monedas en el frontend
- Reemplazar el sistema actual de gold/gems por un sistema unificado de monedas
- Mostrar saldo de monedas en el HUD del mundo y en el menú principal
- Animación al ganar/gastar monedas

### 3.3 Sistema de compra de parcelas
- Definir precio de parcelas (puede variar según distancia al centro)
- Endpoint backend: POST /parcels/buy (valida saldo, asigna parcela)
- En el frontend: al tocar una parcela sin dueño, mostrar opción de compra con precio
- Diálogo de confirmación antes de comprar
- El jugador empieza con 0 parcelas + monedas iniciales para comprar la primera

---

## Fase 4: Catálogo Ampliado de Edificios y Objetos

### 4.1 Definir estructura de datos del catálogo
- Modelo `PlaceableObject` con campos: id, nombre, categoría, época, tamaño (w×h), precio en monedas, esGratis, descripción, meshType
- Tabla/colección en backend con el catálogo completo
- Endpoint GET /catalog para obtener todos los objetos disponibles

### 4.2 Catálogo época Medieval (15-20 objetos)
- Edificios: Castillo (5×5), Torre de vigilancia (2×2), Herrería (3×3), Casa de madera (2×2), Muralla de piedra (1×1), Taberna (3×2), Iglesia medieval (3×4), Granero (3×3)
- Decoración: Pozo de agua (1×1), Carreta (2×1), Barril (1×1), Antorcha (1×1), Establo (3×2)
- Naturaleza: Roble grande (2×2), Arbusto silvestre (1×1)
- Mezcla de gratuitos y premium

### 4.3 Catálogo época Colonial/Clásica (15-20 objetos)
- Edificios: Mansión colonial (4×4), Molino de viento (2×2), Granja (3×3), Puente de piedra (4×1), Ayuntamiento (4×3), Biblioteca (3×3), Mercado (3×2)
- Decoración: Fuente clásica (2×2), Farola de gas (1×1), Banco de hierro (1×1), Reloj de sol (1×1), Arco decorativo (2×1)
- Naturaleza: Jardín formal (2×2), Seto recortado (1×1), Ciprés (1×1)
- Mezcla de gratuitos y premium

### 4.4 Catálogo época Industrial (15-20 objetos)
- Edificios: Fábrica (4×3), Estación de tren (5×2), Almacén industrial (3×3), Chimenea (1×1), Puente de hierro (5×1), Central eléctrica (3×3), Depósito de agua (2×2)
- Decoración: Farola eléctrica (1×1), Buzón (1×1), Señal de tráfico (1×1), Cañón decorativo (1×1)
- Vehículos/Objetos: Vagón de tren (2×1), Grúa (2×2)
- Naturaleza: Parque urbano (3×3), Árbol podado (1×1)
- Mezcla de gratuitos y premium

### 4.5 Catálogo época Moderna (15-20 objetos)
- Edificios: Rascacielos pequeño (3×3), Centro comercial (5×4), Hospital (4×3), Estadio (6×6), Casa moderna (3×2), Gasolinera (3×2), Comisaría (3×3)
- Decoración: Parada de bus (2×1), Semáforo (1×1), Contenedor (1×1), Escultura abstracta (1×1), Piscina (3×2)
- Vehículos/Objetos: Helipuerto (2×2), Antena parabólica (1×1)
- Naturaleza: Palmera (1×1), Jardín zen (2×2)
- Mezcla de gratuitos y premium

### 4.6 Catálogo época Futurista (15-20 objetos)
- Edificios: Torre de energía (2×2), Cúpula habitable (4×4), Estación espacial mini (3×3), Laboratorio cuántico (3×3), Hangar de naves (4×3), Reactor de fusión (3×3), Módulo residencial (2×3)
- Decoración: Holograma proyector (1×1), Teletransportador (1×1), Robot guardián (1×1), Cristal energético (1×1)
- Vehículos/Objetos: Nave estacionada (2×2), Dron de carga (1×1)
- Naturaleza: Árbol bioluminiscente (1×1), Jardín hidropónico (2×2)
- Mezcla de gratuitos y premium

### 4.7 Generación procedural de meshes por época
- Crear funciones que generen meshes placeholder para cada edificio usando primitivas de Babylon.js
- Paleta de colores por época (medieval=marrón/piedra, futurista=neón/metálico, etc.)
- Cada edificio debe ser visualmente distinguible aunque sea placeholder

---

## Fase 5: Tienda

### 5.1 Pantalla de tienda - estructura y navegación
- Pantalla accesible desde menú principal y desde el HUD en el mundo
- Tabs/filtros: por época (Medieval, Colonial, Industrial, Moderna, Futurista)
- Sub-filtros: Edificios, Decoración, Naturaleza
- Indicador de "Gratis" vs precio en monedas

### 5.2 Cards de objetos en la tienda
- Card para cada objeto: icono/preview, nombre, tamaño, época, precio
- Estado: Disponible (gratis), Comprable (con precio), Ya comprado (desbloqueado)
- Botón de compra con confirmación
- Objetos gratuitos marcados claramente

### 5.3 Lógica de desbloqueo de objetos
- Backend: modelo de inventario del jugador (objetos desbloqueados)
- Endpoint POST /shop/buy/:objectId
- Validar saldo, descontar monedas, añadir a inventario
- Los objetos gratuitos se desbloquean automáticamente
- En el panel de construcción (edit mode), solo mostrar objetos desbloqueados

### 5.4 Sección de parcelas en la tienda
- Lista de parcelas disponibles para comprar
- Mapa mini mostrando parcelas disponibles cerca del jugador
- Precio variable según distancia al centro (más lejos = más barato o más caro, por decidir)
- Compra directa desde la tienda

---

## Fase 6: Conexión Frontend-Backend (Colyseus)

### 6.1 Cliente Colyseus en frontend
- Instalar y configurar colyseus.js en el frontend
- Conectar al servidor al entrar al mundo
- Manejar estados de conexión (conectando, conectado, desconectado, reconectando)
- Indicador visual de estado de conexión en el HUD

### 6.2 Definir WorldRoom en Colyseus (backend)
- Crear la Room principal con esquema de estado (Schema de Colyseus)
- Estado sincronizado: parcelas visibles, edificios por parcela, jugadores online
- Handlers: onJoin, onLeave, onMessage
- Mensajes: requestParcels, placeBuild, moveBuild, deleteBuild, buyParcel

### 6.3 Sincronización de parcelas
- Al moverse por el mundo, solicitar parcelas al servidor (reemplazar datos mock)
- El servidor envía parcelas con sus edificios al cliente
- Actualizar Grid y BuildingManager con datos del servidor
- Carga/descarga dinámica sincronizada

### 6.4 Sincronizar acciones de construcción
- Al colocar/mover/rotar/eliminar un edificio → enviar mensaje al servidor
- Servidor valida la acción (posición libre, tiene el objeto desbloqueado, etc.)
- Servidor confirma → cliente aplica cambio
- Servidor rechaza → cliente revierte la acción con feedback

### 6.5 Persistencia de estado del jugador
- Al conectar, cargar: monedas, parcelas, inventario de objetos desbloqueados
- Al desconectar, guardar estado
- Recuperar estado al reconectar
- Token JWT se envía en el handshake de Colyseus para identificar al jugador

---

## Fase 7: Mejoras Visuales del Mundo

### 7.1 Terreno del mundo mejorado
- Diferentes texturas de suelo para parcelas propias vs ajenas vs sin dueño
- Bordes visuales claros entre parcelas
- Mini-etiqueta flotante con nombre del dueño al acercarse a una parcela ajena

### 7.2 Skybox y ambiente
- Skybox con cielo (día)
- Iluminación mejorada con sombras básicas
- Niebla en la distancia para disimular el borde de carga

### 7.3 Indicadores en el mundo
- Marcadores visuales de "parcela disponible" en parcelas sin dueño
- Icono de precio flotante sobre parcelas comprables
- Efecto visual al comprar una parcela (animación de desbloqueo)

---

## Fase 8: Funcionalidades Secundarias

### 8.1 Sistema de notificaciones in-game
- Cola de notificaciones (compra exitosa, nuevo edificio, parcela adquirida)
- Toast mejorado con iconos y tipos (éxito, error, info)
- Historial de notificaciones accesible desde el menú

### 8.2 Tutorial / Onboarding
- Secuencia guiada para nuevos jugadores:
  1. "Bienvenido a Infinity World"
  2. "Compra tu primera parcela"
  3. "Entra en modo edición"
  4. "Coloca tu primer edificio"
- Tooltips contextuales en la primera vez que se usa cada función

### 8.3 Perfil del jugador
- Pantalla con: nombre, monedas, número de parcelas, número de edificios
- Estadísticas básicas
- Accesible desde menú principal

### 8.4 Sistema de sonido básico
- Sonidos para: colocar edificio, eliminar, comprar, abrir menú, error
- Música de fondo ambiental
- Controles de volumen en Ajustes

---

## Fase 9: Optimización y Polish

### 9.1 LOD (Level of Detail) para el mundo
- Edificios lejanos se renderizan como cajas simples
- Parcelas lejanas muestran solo el suelo sin detalles
- Frustum culling y occlusion culling

### 9.2 Caché y carga optimizada
- Cachear datos de parcelas ya visitadas
- Precargar parcelas en la dirección de movimiento
- Lazy loading de meshes pesados

### 9.3 Performance mobile
- Ajustes de calidad gráfica (bajo/medio/alto)
- Reducir partículas y sombras en modo bajo
- Limitar FPS en background
- Testing en dispositivos reales

---

## Fase 10: Multijugador Visible

### 10.1 Ver otros jugadores en el mundo
- Avatares simples (capsule mesh con nombre flotante)
- Posición sincronizada en tiempo real vía Colyseus
- Indicador de jugadores cercanos

### 10.2 Ver construcciones de otros jugadores
- Al pasar por parcelas ajenas, ver sus edificios (solo lectura)
- Diferenciación visual: parcela propia (editable) vs ajena (solo vista)

### 10.3 Interacciones sociales básicas
- Tocar un jugador para ver su perfil
- Lista de jugadores online

---

## Notas

- Cada tarea de catálogo (4.2 a 4.6) incluye definir los datos Y crear los meshes placeholder
- Las fases no son estrictamente secuenciales; algunas tareas de distintas fases pueden hacerse en paralelo
- El sistema de obtención de monedas (misiones, logros, etc.) se definirá más adelante
- Los modelos 3D definitivos (GLB) reemplazarán los meshes procedurales cuando estén disponibles
