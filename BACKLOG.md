# Backlog - Infinity World

Backlog de tareas ordenado por prioridad. Cada tarea es lo suficientemente concreta para ser implementada en una sesión.

---

## Fase 1: Menú Principal y Navegación

### 1.1 Crear pantalla de menú principal ✅

- Pantalla HTML/CSS que se muestra al abrir la app (antes de cargar el mundo 3D)
- Botones: "Acceder al Mundo", "Mis Parcelas", "Tienda", "Ajustes"
- Diseño mobile-first acorde al tema visual existente (dark theme)
- El canvas 3D NO se carga hasta que el jugador pulse "Acceder al Mundo"

### 1.2 Pantalla "Mis Parcelas" ✅

- Lista de parcelas del jugador con coordenadas (x, y)
- Estado vacío: mensaje "No tienes parcelas. Compra tu primera parcela en la Tienda"
- Cada parcela es clickeable para entrar directamente al mundo centrado en ella
- Botón de volver al menú principal

### 1.3 Pantalla de Ajustes (estructura básica) ✅

- Pantalla con secciones placeholder: Sonido, Gráficos, Cuenta
- Toggle de sonido on/off
- Botón de cerrar sesión (placeholder)
- Botón de volver al menú principal

### 1.4 Navegación entre pantallas ✅

- Sistema de routing simple entre: Menú → Mundo / Parcelas / Tienda / Ajustes
- Transiciones suaves entre pantallas
- Botón de volver al menú desde el mundo 3D (icono en HUD)

---

## Fase 2: Infraestructura Backend

### 2.1 Docker Compose para servicios ✅

- `docker-compose.yml` en la raíz del proyecto
- Servicios: PostgreSQL 16 + PostGIS 3.4, Redis 7
- Volúmenes persistentes para datos de BD
- Variables de entorno configurables
- Documentar comandos en CLAUDE.md (`docker compose up -d`, etc.)

### 2.2 Conexión a PostgreSQL desde el backend ✅

- Instalar y configurar driver PostgreSQL (pg + @types/pg)
- Pool de conexiones con configuración desde .env
- Módulo `db.ts` centralizado para obtener conexiones
- Health check que verifique conexión a BD
- Manejo de errores de conexión y reconexión

### 2.3 Sistema de migraciones ✅

- Instalar herramienta de migraciones (node-pg-migrate o similar)
- Script npm: `npm run migrate:up`, `npm run migrate:down`, `npm run migrate:create`
- Migración inicial: crear tablas `players`, `parcels`, `placed_objects`, `placeable_objects`, `player_inventory`
- Habilitar extensión PostGIS en la BD
- Índices espaciales en tabla `parcels` (columna geometry con PostGIS)

### 2.4 Repositorios PostgreSQL - Player y Parcel ✅

- Implementar `PgPlayerRepository` siguiendo la interfaz `IPlayerRepository`
- Implementar `PgParcelRepository` siguiendo la interfaz `IParcelRepository`
- Query espacial con PostGIS para `findInArea(x, y, radius)`
- Factory o config para elegir entre repositorios Memory vs Pg según entorno

### 2.5 Actualizar modelos TypeScript para coincidir con BD ✅

- Añadir `coins` al modelo `Player` (la columna ya existe en BD)
- Añadir a `PlaceableObject`: `category`, `era`, `price`, `isFree`, `description`
- Crear modelo `PlayerInventory` (`id`, `playerId`, `objectId`, `unlockedAt`)
- Actualizar `PgPlayerRepository` para leer/escribir `coins`
- Actualizar `IPlaceableObjectRepository` con métodos de filtrado: `findByEra()`, `findByCategory()`, `findFree()`

### 2.6 Repositorios PostgreSQL - PlacedObject, PlaceableObject y PlayerInventory ✅

- Implementar `PgPlacedObjectRepository` siguiendo la interfaz existente
- Implementar `PgPlaceableObjectRepository` con los nuevos campos y filtros
- Crear `IPlayerInventoryRepository`: `findByPlayerId()`, `hasObject()`, `unlock()`, `remove()`
- Implementar `MemoryPlayerInventoryRepository` y `PgPlayerInventoryRepository`
- Queries con JOINs para cargar objetos de una parcela con sus datos de catálogo
- Añadir PlayerInventory a la factory de repositorios

### 2.7 Configuración de Redis ✅

- Conectar Redis desde el backend (ioredis)
- Módulo `redis.ts` centralizado
- Uso inicial: caché de sesiones y datos frecuentes
- Health check que verifique conexión a Redis

### 2.8 Seeders de catálogo y datos iniciales ✅

- Script de seeding que inserte el catálogo de objetos en la BD
- Marcar cuáles son gratuitos y cuáles premium con sus precios
- Crear datos iniciales de prueba (parcelas del mundo)
- Ejecutable como comando: `npm run seed`

### 2.9 Middleware de errores y logging ✅

- Middleware global de errores en Express (captura excepciones, devuelve JSON consistente)
- Logger básico (winston o pino) con niveles: error, warn, info, debug
- Log de requests HTTP (método, ruta, status, duración)
- Formato diferente para desarrollo (legible) vs producción (JSON)

---

## Fase 3: Sistema de Economía y Monedas

### 3.1 Endpoints de monedas en backend ✅

- Endpoints REST: GET /players/:id/balance, POST /players/:id/coins (añadir/gastar)
- Validación de saldo suficiente antes de cualquier compra
- Transacciones atómicas para evitar race conditions
- (Nota: el campo `coins` en Player y BD ya existe desde tareas 2.3 y 2.5)

### 3.2 Mostrar monedas en el frontend ✅

- Reemplazar el sistema actual de gold/gems por un sistema unificado de monedas
- Mostrar saldo de monedas en el HUD del mundo y en el menú principal
- Animación al ganar/gastar monedas

### 3.3 Sistema de compra de parcelas ✅

- Definir precio de parcelas (mismo precio siempre)
- Endpoint backend: POST /parcels/buy (valida saldo, asigna parcela)
- En el frontend: al tocar una parcela sin dueño, mostrar opción de compra con precio
- Diálogo de confirmación antes de comprar
- El jugador empieza con 0 parcelas + monedas iniciales para comprar la primera

---

## Fase 4: Catálogo Ampliado de Edificios y Objetos

### 4.1 Endpoint de catálogo y filtros ✅

- Endpoint GET /catalog con filtros por época, categoría y gratis/premium
- Endpoint GET /catalog/:id para detalle de un objeto
- Endpoint GET /players/:id/inventory para objetos desbloqueados del jugador
- (Nota: el modelo PlaceableObject con campos completos y la tabla ya existen desde tareas 2.3 y 2.5)

### 4.2 Catálogo época Medieval (15-20 objetos) ✅

- Edificios: Castillo (5×5), Torre de vigilancia (2×2), Herrería (3×3), Casa de madera (2×2), Muralla de piedra (1×1), Taberna (3×2), Iglesia medieval (3×4), Granero (3×3)
- Decoración: Pozo de agua (1×1), Carreta (2×1), Barril (1×1), Antorcha (1×1), Establo (3×2)
- Naturaleza: Roble grande (2×2), Arbusto silvestre (1×1)
- Mezcla de gratuitos y premium

### 4.3 Catálogo época Colonial/Clásica (15-20 objetos) ✅

- Edificios: Mansión colonial (4×4), Molino de viento (2×2), Granja (3×3), Puente de piedra (4×1), Ayuntamiento (4×3), Biblioteca (3×3), Mercado (3×2)
- Decoración: Fuente clásica (2×2), Farola de gas (1×1), Banco de hierro (1×1), Reloj de sol (1×1), Arco decorativo (2×1)
- Naturaleza: Jardín formal (2×2), Seto recortado (1×1), Ciprés (1×1)
- Mezcla de gratuitos y premium

### 4.4 Catálogo época Industrial (15-20 objetos) ✅

- Edificios: Fábrica (4×3), Estación de tren (5×2), Almacén industrial (3×3), Chimenea (1×1), Puente de hierro (5×1), Central eléctrica (3×3), Depósito de agua (2×2)
- Decoración: Farola eléctrica (1×1), Buzón (1×1), Señal de tráfico (1×1), Cañón decorativo (1×1)
- Vehículos/Objetos: Vagón de tren (2×1), Grúa (2×2)
- Naturaleza: Parque urbano (3×3), Árbol podado (1×1)
- Mezcla de gratuitos y premium

### 4.5 Catálogo época Moderna (15-20 objetos) ✅

- Edificios: Rascacielos pequeño (3×3), Centro comercial (5×4), Hospital (4×3), Estadio (6×6), Casa moderna (3×2), Gasolinera (3×2), Comisaría (3×3)
- Decoración: Parada de bus (2×1), Semáforo (1×1), Contenedor (1×1), Escultura abstracta (1×1), Piscina (3×2)
- Vehículos/Objetos: Helipuerto (2×2), Antena parabólica (1×1)
- Naturaleza: Palmera (1×1), Jardín zen (2×2)
- Mezcla de gratuitos y premium

### 4.6 Catálogo época Futurista (15-20 objetos) ✅

- Edificios: Torre de energía (2×2), Cúpula habitable (4×4), Estación espacial mini (3×3), Laboratorio cuántico (3×3), Hangar de naves (4×3), Reactor de fusión (3×3), Módulo residencial (2×3)
- Decoración: Holograma proyector (1×1), Teletransportador (1×1), Robot guardián (1×1), Cristal energético (1×1)
- Vehículos/Objetos: Nave estacionada (2×2), Dron de carga (1×1)
- Naturaleza: Árbol bioluminiscente (1×1), Jardín hidropónico (2×2)
- Mezcla de gratuitos y premium

### 4.7 Generación procedural de meshes por época ✅

- Crear funciones que generen meshes placeholder para cada edificio usando primitivas de Babylon.js
- Paleta de colores por época (medieval=marrón/piedra, futurista=neón/metálico, etc.)
- Cada edificio debe ser visualmente distinguible aunque sea placeholder

---

## Fase 5: Tienda

### 5.1 Pantalla de tienda - estructura y navegación ✅

- Pantalla accesible desde menú principal y desde el HUD en el mundo
- Tabs/filtros: por época (Medieval, Colonial, Industrial, Moderna, Futurista)
- Sub-filtros: Edificios, Decoración, Naturaleza
- Indicador de "Gratis" vs precio en monedas

### 5.2 Cards de objetos en la tienda ✅

- Card para cada objeto: icono/preview, nombre, tamaño, época, precio
- Estado: Disponible (gratis), Comprable (con precio), Ya comprado (desbloqueado)
- Botón de compra con confirmación
- Objetos gratuitos marcados claramente

### 5.3 Lógica de desbloqueo de objetos ✅

- Endpoint POST /shop/buy/:objectId (validar saldo, descontar monedas, añadir a inventario)
- Los objetos gratuitos se desbloquean automáticamente al registrarse
- En el panel de construcción (edit mode), solo mostrar objetos desbloqueados
- (Nota: el modelo PlayerInventory y repositorios ya existen desde tarea 2.6)

### 5.4 Sección de parcelas en la tienda ✅

- Lista de parcelas disponibles para comprar
- Mapa mini mostrando parcelas disponibles cerca del jugador
- Precio variable según distancia al centro (más lejos = más barato o más caro, por decidir)
- Compra directa desde la tienda

---

## Fase 5B: Gestión de Parcelas - Mundo Infinito

### 5B.1 Sistema de coordenadas escalable ✅

- Definir convención de coordenadas: enteros con signo (x, y) desde el origen (0, 0)
- Las parcelas solo existen en BD cuando se compran; el mundo vacío es implícito
- Crear tipo `ParcelCoord` con codificación eficiente para claves únicas (ej: `"x:y"` como string, o packed integer para lookups rápidos)
- Evaluar estrategia de indexado en PostgreSQL para coordenadas grandes: índice compuesto `(x, y)` UNIQUE + índice espacial PostGIS `POINT(x, y)` para queries de área
- Documentar límites prácticos del sistema (ej: INT4 soporta ±2 mil millones → más que suficiente)
- Considerar chunk grouping para queries de viewport: agrupar parcelas en chunks de NxN para cargar regiones eficientemente

### 5B.2 Restricción de proximidad en compra de parcelas ✅

- Un jugador solo puede comprar una parcela que esté a máximo 20 parcelas de distancia (Manhattan o Chebyshev, por decidir) de alguna de sus parcelas existentes
- Si el jugador no tiene ninguna parcela, puede comprar cualquiera dentro de un radio de 20 parcelas del origen (0, 0)
- Implementar en backend: endpoint POST /parcels/buy valida la restricción de proximidad antes de permitir la compra
- Query eficiente: dado un punto (x, y) y un playerId, verificar si existe al menos una parcela del jugador a distancia ≤ 20
- Devolver error descriptivo si la parcela está fuera de rango ("Debes tener una parcela cercana para comprar aquí")
- Tests unitarios para los edge cases: primera parcela, parcela en el límite (dist=20), parcela fuera (dist=21), jugador con múltiples parcelas

### 5B.3 Precio dinámico de parcelas por distancia al centro ✅

- Definir fórmula de precio basada en distancia al origen: más cerca del centro → más caro (mayor demanda)
- Fórmula sugerida: `precio = BASE_PRICE + DISTANCE_FACTOR * max(0, MAX_DISTANCE - distancia)` o fórmula logarítmica para que no escale linealmente
- El precio debe ser determinista: dado (x, y), siempre devuelve el mismo precio (calculable tanto en frontend como backend)
- Crear función compartida `calculateParcelPrice(x: number, y: number): number`
- El backend valida el precio al comprar (no confiar en el frontend)

### 5B.4 API de descubrimiento de parcelas ✅

- Endpoint GET /parcels/area?x=0&y=0&radius=10 que devuelva las parcelas compradas dentro de un área
- Endpoint GET /parcels/available?playerId=X que devuelva las posiciones donde el jugador puede comprar (basado en restricción de proximidad 5B.2)
- Optimizar con PostGIS: `ST_DWithin` o bounding box para queries espaciales
- Paginar resultados si el área es muy grande
- Respuesta incluye: parcelas compradas (con dueño) + coordenadas disponibles para compra (sin datos, solo posiciones)

### 5B.5 Actualizar tienda de parcelas con datos dinámicos ✅

- Reemplazar el grid fijo (-3 a 3) de la tienda por parcelas dinámicas basadas en la posición del jugador
- Mostrar parcelas comprables según la restricción de proximidad (solo las que el jugador realmente puede comprar)
- Calcular y mostrar el precio dinámico de cada parcela
- Indicador visual de distancia al origen y a la parcela propia más cercana
- Si el jugador no tiene parcelas, mostrar las disponibles cerca del origen

### 5B.6 Visualización del mundo infinito en frontend ✅

- El mundo no tiene bordes fijos: al moverse, se generan/destruyen parcelas dinámicamente (ya existe parcialmente con ParcelManager)
- Parcelas sin dueño se muestran como terreno vacío (con bioma cuando exista)
- Parcelas compradas se muestran con el indicador del dueño y sus edificios
- Parcelas "comprables" (dentro del radio de 20 del jugador) muestran un indicador sutil de "disponible"
- No se renderizan parcelas más allá del viewport del jugador

---

## Fase 6: Conexión Frontend-Backend (Colyseus)

### 6.1 Cliente Colyseus en frontend ✅

- Instalar y configurar colyseus.js en el frontend
- Conectar al servidor al entrar al mundo
- Manejar estados de conexión (conectando, conectado, desconectado, reconectando)
- Indicador visual de estado de conexión en el HUD

### 6.2 Definir WorldRoom en Colyseus (backend) ✅

- Crear la Room principal con esquema de estado (Schema de Colyseus)
- Estado sincronizado: parcelas visibles, edificios por parcela, jugadores online
- Handlers: onJoin, onLeave, onMessage
- Mensajes: requestParcels, placeBuild, moveBuild, deleteBuild, buyParcel

### 6.3 Sincronización de parcelas ✅

- Al moverse por el mundo, solicitar parcelas al servidor (reemplazar datos mock)
- El servidor envía parcelas con sus edificios al cliente
- Actualizar Grid y BuildingManager con datos del servidor
- Carga/descarga dinámica sincronizada

### 6.4 Sincronizar acciones de construcción ✅

- Al colocar/mover/rotar/eliminar un edificio → enviar mensaje al servidor
- Servidor valida la acción (posición libre, tiene el objeto desbloqueado, etc.)
- Servidor confirma → cliente aplica cambio
- Servidor rechaza → cliente revierte la acción con feedback

### 6.5 Persistencia de estado del jugador ✅

- Al conectar, cargar: monedas, parcelas, inventario de objetos desbloqueados
- Al desconectar, guardar estado
- Recuperar estado al reconectar
- Token JWT se envía en el handshake de Colyseus para identificar al jugador

---

## Fase 7: Mejoras Visuales del Mundo

### 7.1 Terreno del mundo mejorado ✅

- Diferentes texturas de suelo para parcelas propias vs ajenas vs sin dueño
- Bordes visuales claros entre parcelas
- Mini-etiqueta flotante con nombre del dueño al acercarse a una parcela ajena

### 7.2 Skybox y ambiente ✅

- Skybox con cielo (día)
- Iluminación mejorada con sombras básicas
- Niebla en la distancia para disimular el borde de carga

### 7.3 Indicadores en el mundo ✅

- Marcadores visuales de "parcela disponible" en parcelas sin dueño
- Icono de precio flotante sobre parcelas comprables
- Efecto visual al comprar una parcela (animación de desbloqueo)

### 7.4 Sistema de biomas - Algoritmo de generación ✅

- Crear módulo `BiomeGenerator` en el frontend (`src/game/BiomeGenerator.ts`)
- Implementar ruido Simplex/Perlin determinista (librería `simplex-noise` o implementación propia)
- Definir tipos de bioma: Pradera, Bosque, Desierto, Nieve, Montaña, Pantano
- Función pura `getBiome(parcelX, parcelY): BiomeType` que devuelva siempre el mismo bioma para las mismas coordenadas
- Usar múltiples octavas de ruido con escala grande (clusters de ~8-15 parcelas del mismo bioma)
- Aplicar umbrales sobre el ruido para asignar biomas (ej: temperatura + humedad → bioma, estilo Minecraft)
- Seed fija hardcodeada para que todos los jugadores generen el mismo mundo
- Tests unitarios: verificar determinismo (misma entrada = misma salida) y distribución razonable de biomas

### 7.5 Sistema de biomas - Materiales y colores del suelo ✅

- Definir paleta de colores del suelo por bioma:
  - **Pradera**: verde medio (#4a7a2e)
  - **Bosque**: verde oscuro (#2d5a1e)
  - **Desierto**: arena/beige (#c2a645)
  - **Nieve**: blanco azulado (#d8e8f0)
  - **Montaña**: gris piedra (#7a7a6e)
  - **Pantano**: verde oliva oscuro (#3a4a28)
- Integrar `BiomeGenerator` en `ParcelManager.loadParcel()`: obtener bioma y aplicar color correspondiente al material del suelo
- Mantener la diferenciación visual de parcelas con dueño vs sin dueño (el bioma afecta al tono base, la propiedad al brillo/saturación)
- El borde de la parcela también puede tintarse sutilmente según el bioma

### 7.6 Sistema de biomas - Decoración procedural del terreno ✅

- Generar elementos decorativos por bioma de forma determinista sobre cada parcela:
  - **Pradera**: hierba alta dispersa, flores pequeñas, piedras sueltas
  - **Bosque**: árboles (cilindro+esfera), arbustos, troncos caídos, hongos
  - **Desierto**: cactus, dunas pequeñas (meshes de arena elevada), rocas desérticas, huesos
  - **Nieve**: montículos de nieve, pinos nevados, rocas con nieve, cristales de hielo
  - **Montaña**: rocas grandes, piedras apiladas, grietas, minerales visibles
  - **Pantano**: charcos (planos semitransparentes), juncos, troncos podridos, niebla baja
- Usar ruido secundario para posicionar decoraciones (determinista por coordenada de parcela)
- Densidad configurable por bioma (bosque = más denso, desierto = más disperso)
- Las decoraciones se crean/destruyen junto con la parcela (carga/descarga dinámica)
- Las decoraciones NO interfieren con la construcción (son puramente visuales, sin colisión en modo edición)

### 7.7 Sistema de biomas - Transiciones suaves entre biomas ✅

- En parcelas fronterizas (adyacentes a otro bioma), mezclar colores de suelo con interpolación
- Consultar bioma de las 4 parcelas vecinas (N, S, E, O) para determinar si es frontera
- Aplicar gradiente de color en el material (o vertex colors si Babylon.js lo permite fácilmente)
- Las decoraciones en parcelas fronterizas pueden incluir elementos de ambos biomas con menor densidad
- Evitar transiciones bruscas (ej: no pasar de nieve a desierto directamente; el algoritmo de biomas debería usar temperatura/humedad para prevenir esto de forma natural)

---

## Fase 8: Funcionalidades Secundarias

### 8.1 Sistema de notificaciones in-game ✅

- Cola de notificaciones (compra exitosa, nuevo edificio, parcela adquirida)
- Toast mejorado con iconos y tipos (éxito, error, info)
- Historial de notificaciones accesible desde el menú

### 8.2 Tutorial / Onboarding ✅

- Secuencia guiada para nuevos jugadores:
  1. "Bienvenido a Infinity World"
  2. "Compra tu primera parcela"
  3. "Entra en modo edición"
  4. "Coloca tu primer edificio"
- Tooltips contextuales en la primera vez que se usa cada función

### 8.3 Perfil del jugador ✅

- Pantalla con: nombre, monedas, número de parcelas, número de edificios
- Estadísticas básicas
- Accesible desde menú principal

### 8.4 Sistema de sonido básico ✅

- Sonidos para: colocar edificio, eliminar, comprar, abrir menú, error
- Música de fondo ambiental
- Controles de volumen en Ajustes

---

## Fase 9: Optimización y Polish

### 9.1 LOD (Level of Detail) para el mundo ✅

- Edificios lejanos se renderizan como cajas simples
- Parcelas lejanas muestran solo el suelo sin detalles
- Frustum culling y occlusion culling

### 9.2 Caché y carga optimizada ✅

- Cachear datos de parcelas ya visitadas
- Precargar parcelas en la dirección de movimiento
- Lazy loading de meshes pesados

### 9.3 Performance mobile ✅

- Ajustes de calidad gráfica (bajo/medio/alto)
- Reducir partículas y sombras en modo bajo
- Limitar FPS en background
- Testing en dispositivos reales

---

## Fase 10: Multijugador Visible

### 10.1 Ver construcciones de otros jugadores ✅

- Al pasar por parcelas ajenas, ver sus edificios (solo lectura)
- Diferenciación visual: parcela propia (editable) vs ajena (solo vista)

### 10.2 Lista de jugadores online ✅

- Panel accesible desde el HUD con lista de jugadores conectados
- Mostrar nombre y número de parcelas de cada jugador
- Opción de ir a la parcela de un jugador (navegar cámara)

---

## Fase 11: Autenticación (Firebase)

### 11.1 Configuración de Firebase Auth

- Crear proyecto en Firebase Console
- Configurar proveedores de autenticación (email/password, Google)
- Instalar `firebase-admin` en el backend
- Configurar credenciales de Firebase (service account) en `.env`

### 11.2 Middleware de autenticación en backend

- Middleware Express que valide Firebase ID tokens en cabecera `Authorization: Bearer <token>`
- Endpoint GET /auth/me que devuelva datos del jugador autenticado
- Al autenticar por primera vez, crear jugador en tabla `players` con monedas iniciales
- Proteger rutas sensibles (compras, acciones de construcción)

### 11.3 Integración Firebase Auth en frontend

- Instalar Firebase SDK en el frontend
- Pantalla de login/registro (email + Google)
- Almacenar token y enviarlo en las requests al backend
- Enviar token en el handshake de Colyseus para identificar al jugador
- Actualizar pantalla de Ajustes con datos reales del usuario (nombre, email, foto)

---

## Fase 12: Internacionalización (i18n)

### 12.1 Sistema de traducciones ✅

- Crear módulo i18n con diccionarios JSON por idioma (es, en, fr, de como mínimo)
- Función `t(key)` para obtener textos traducidos
- Detección automática del idioma del navegador/dispositivo
- Fallback a español si el idioma no está soportado

### 12.2 Traducir UI del frontend ✅

- Traducir todas las pantallas: menú principal, parcelas, tienda, ajustes, HUD
- Traducir toasts, diálogos de confirmación y mensajes de error
- Traducir nombres de categorías y eras en el catálogo

### 12.3 Selector de idioma en Ajustes ✅

- Dropdown/selector de idioma en la pantalla de Ajustes
- Persistir preferencia en localStorage
- Aplicar cambio de idioma en caliente sin recargar la app

---

## Fase 13: Seguridad y Validación del Backend

### 13.1 Middleware de autorización por ownership ✅

- Crear middleware `requirePlayer` que extraiga el `playerId` del contexto autenticado (header, token JWT, sesión, etc.)
- Inyectar `req.playerId` en todas las rutas protegidas
- Temporalmente (hasta que Firebase Auth esté en Fase 11) usar un header `X-Player-Id` con validación de existencia en BD
- **Aplicar a rutas críticas**: POST `/players/:id/coins`, POST `/parcels/buy`, POST `/shop/buy`, GET `/players/:id/inventory`, GET `/players/:id/balance`
- Validar que el `playerId` de la request coincida con el del jugador autenticado (un jugador NO puede actuar en nombre de otro)
- Devolver 401 si no hay jugador identificado, 403 si intenta actuar sobre otro jugador
- Tests: petición sin auth → 401, petición con auth sobre otro jugador → 403, petición legítima → 200

### 13.2 Validación estricta de inputs en todos los endpoints ✅

- Instalar librería de validación de esquemas (`zod` recomendado)
- **POST `/players/:id/coins`**: validar que `amount` sea entero, distinto de 0, con límite razonable (ej: -100000 ≤ amount ≤ 100000). Rechazar NaN, Infinity, floats
- **POST `/parcels/buy`**: validar que `x` e `y` sean enteros dentro de rangos razonables (ej: -1000000 ≤ x,y ≤ 1000000). Rechazar NaN, Infinity, floats, strings
- **POST `/shop/buy`**: validar que `objectId` sea un UUID v4 válido
- **GET `/parcels/`**: validar que `x`, `y` sean números válidos y `radius` sea entero positivo ≤ 50
- **GET `/parcels/available`**: validar que `playerId` sea UUID v4 válido
- **GET `/catalog/`**: validar que `era` y `category` sean valores del enum permitido (no strings arbitrarios)
- **GET `/players/:id/*`**: validar que `:id` sea UUID v4 válido
- Crear schemas reutilizables: `UUIDSchema`, `CoordinateSchema`, `CoinAmountSchema`
- Middleware genérico `validate(schema)` que parsee body/query/params y devuelva 400 con errores descriptivos
- Tests: enviar NaN, Infinity, strings donde van números, UUIDs malformados, valores fuera de rango → todos 400

### 13.3 Transacciones atómicas en operaciones de compra ✅

- **POST `/parcels/buy`**: envolver en transacción PostgreSQL (`BEGIN` → verificar propiedad → verificar proximidad → verificar saldo → descontar monedas → crear/asignar parcela → `COMMIT`)
- **POST `/shop/buy`**: envolver en transacción (`BEGIN` → verificar existencia objeto → verificar no duplicado → verificar saldo → descontar monedas → insertar inventario → `COMMIT`)
- Usar `SELECT ... FOR UPDATE` en la fila del jugador para evitar race conditions (bloqueo optimista a nivel de fila)
- Crear helper `withTransaction(callback)` en el módulo `db.ts` que maneje `BEGIN`/`COMMIT`/`ROLLBACK` automáticamente
- Si cualquier paso falla → `ROLLBACK` completo, ningún cambio persiste
- Tests de concurrencia: lanzar 10 compras simultáneas de la misma parcela → solo 1 éxito, 9 rechazos. Lanzar 10 compras del mismo objeto → solo 1 cobro

### 13.4 Rate limiting por IP y por jugador ✅

- Instalar `express-rate-limit` (o similar)
- **Rate limit global**: máximo 100 requests/minuto por IP
- **Rate limit en endpoints de compra** (`/parcels/buy`, `/shop/buy`, `/players/:id/coins`): máximo 10 requests/minuto por IP
- **Rate limit en endpoints de lectura costosos** (`/parcels/available`): máximo 20 requests/minuto por IP
- Respuesta 429 Too Many Requests con header `Retry-After`
- Considerar usar Redis como store del rate limiter para que funcione con múltiples instancias del backend
- Tests: enviar ráfaga de peticiones → verificar que se bloquean tras el límite

### 13.5 Configuración CORS ✅

- Instalar paquete `cors`
- Configurar origins permitidos desde variable de entorno `ALLOWED_ORIGINS` (ej: `http://localhost:5173` en dev)
- Permitir solo métodos necesarios: GET, POST (y OPTIONS para preflight)
- Permitir headers: `Content-Type`, `Authorization`, `X-Player-Id`
- Denegar credentials de orígenes no permitidos
- En producción, restringir a los dominios exactos del frontend

### 13.6 Restricciones de integridad en base de datos ✅

- **Migración**: añadir constraint `UNIQUE(x, y)` en tabla `parcels` (evitar dos parcelas en la misma coordenada)
- **Migración**: añadir `FOREIGN KEY (owner_id) REFERENCES players(id)` en tabla `parcels`
- **Migración**: añadir `FOREIGN KEY (parcel_id) REFERENCES parcels(id)` en tabla `placed_objects`
- **Migración**: añadir `CHECK (coins >= 0)` en tabla `players` (reforzar a nivel de BD que no haya saldo negativo)
- **Migración**: añadir `CHECK (price >= 0)` en tabla `placeable_objects`
- Verificar que la constraint `UNIQUE(player_id, object_id)` en `player_inventory` ya existe (la usa el `ON CONFLICT`)
- Ejecutar migración y verificar que los datos existentes cumplen las restricciones
- Tests: intentar insertar parcela duplicada en (x,y) → error de BD capturado y devuelto como 409

### 13.7 Proteger endpoint de monedas (admin-only) ✅

- El endpoint POST `/players/:id/coins` es extremadamente peligroso: permite sumar/restar monedas arbitrariamente
- **Opción A (recomendada)**: eliminar el endpoint público. Las monedas solo se modifican internamente (compras de parcelas, compras de objetos, recompensas del sistema)
- **Opción B**: restringir a un rol `admin` verificado por token especial (header `X-Admin-Key` o claim JWT `role: admin`)
- Si se mantiene, añadir logging detallado de cada operación (quién, cuánto, desde qué IP, timestamp)
- Crear endpoint alternativo GET `/players/:id/transactions` para consultar historial de movimientos (audit trail)

### 13.8 Sanitización de errores en producción ✅

- En modo producción (`NODE_ENV=production`), NO devolver mensajes de error internos ni stack traces
- Los errores `AppError` (controlados) devuelven su mensaje personalizado
- Los errores inesperados (500) devuelven solo `"Internal server error"` sin detalles
- Crear whitelist de mensajes de error seguros para cada endpoint
- Filtrar datos sensibles de los logs en producción (no loggear bodies con tokens, passwords, etc.)
- El endpoint `/health` en producción no debe revelar nombres de servicios internos (solo `"status": "ok"` o `"status": "degraded"`)

### 13.9 Audit logging para transacciones económicas ✅

- Crear tabla `economy_log` con columnas: `id`, `player_id`, `action` (enum: `buy_parcel`, `buy_object`, `earn_coins`, `spend_coins`), `amount`, `balance_before`, `balance_after`, `metadata` (JSONB con detalles como parcel coords, object id, etc.), `ip_address`, `created_at`
- Registrar automáticamente en cada operación que modifique monedas o inventario
- Endpoint GET `/admin/economy-log` (protegido) para consultar historial
- Índice por `player_id` y `created_at` para queries eficientes
- Retención configurable (ej: mantener últimos 90 días)

### 13.10 Tests de seguridad automatizados

- Crear suite de tests específica para seguridad (`tests/security/`)
- **Tests de autenticación**: requests sin auth a endpoints protegidos → 401
- **Tests de autorización**: jugador A intenta modificar recursos de jugador B → 403
- **Tests de validación**: inputs malformados (NaN, Infinity, strings, overflow, inyección SQL en strings libres) → 400
- **Tests de race conditions**: compras concurrentes con `Promise.all()` → solo 1 éxito
- **Tests de rate limiting**: ráfaga de peticiones → 429 tras el límite
- **Tests de integridad**: operaciones que violen constraints de BD → error controlado
- Integrar en CI/CD para que se ejecuten en cada PR

---

## Fase 14: Minimapa y Navegación Rápida

### 14.1 Componente base del minimapa (canvas 2D)

- Crear módulo `src/ui/Minimap.ts` con clase `Minimap`
- Insertar un `<canvas>` HTML dentro de `#ui-overlay`, posicionado en la esquina inferior izquierda
- Tamaño por defecto: 160×160px en móvil, 200×200px en desktop. Borde redondeado, fondo oscuro semitransparente
- El canvas se renderiza con la API Canvas 2D nativa (NO usar Babylon.js, es un overlay ligero)
- Dibujar una cuadrícula básica donde cada celda = 1 parcela. El centro del minimapa corresponde a la posición actual de la cámara
- Escala inicial: cada parcela ocupa ~8px en el minimapa (configurable)
- El minimapa solo se muestra en modo mundo (`game.getMode() === 'world'`), se oculta en modo edición
- Respetar `pointer-events: auto` solo sobre el canvas del minimapa (no bloquear el resto del overlay)
- Actualizar el minimapa en cada frame o con throttle (~10 FPS es suficiente para fluidez)

### 14.2 Renderizado de parcelas en el minimapa

- Obtener las parcelas cargadas del `ParcelManager` (exponer getter `getLoadedParcels()` si no existe)
- Pintar cada parcela como un cuadrado de color según su estado:
  - **Parcela propia**: verde claro (#5a8a35)
  - **Parcela de otro jugador**: rojo suave (#8a3535)
  - **Parcela comprable** (dentro del radio de compra): azul suave (#35608a)
  - **Sin dueño / fuera de rango**: gris oscuro (#2a2a2a) o simplemente no pintar (fondo vacío)
- Dibujar las líneas de cuadrícula entre parcelas en gris sutil (#444)
- Marcar el origen del mundo (0, 0) con un punto o icono especial (ej: estrella dorada, punto blanco) para referencia
- Consultar al backend las parcelas de la zona ampliada del minimapa (radio mayor al de carga 3D) para mostrar parcelas más allá del viewport — o usar los datos que ya tenga cacheados
- Leyenda compacta opcional (iconos de color) al mantener pulsado el minimapa

### 14.3 Indicador de cámara y navegación por clic/tap

- Dibujar un rectángulo semitransparente blanco sobre el minimapa que represente el viewport actual de la cámara 3D (la zona visible en pantalla)
- Dibujar un marcador (triángulo, punto, o icono de jugador) en el centro del minimapa indicando la posición actual
- **Click/tap en el minimapa**: mover la cámara 3D suavemente (animación lerp) a la coordenada del mundo correspondiente al punto tocado
- Convertir coordenadas del canvas 2D → coordenadas de parcela → coordenadas de mundo → nuevo `camera.target`
- **Drag en el minimapa**: permitir arrastrar para hacer pan continuo (mover la cámara mientras se arrastra el dedo/ratón sobre el minimapa)
- Evitar que los eventos de tap/drag en el minimapa se propaguen al canvas 3D de Babylon.js (`stopPropagation`)

### 14.4 Buscador de coordenadas (Go To)

- Añadir un botón pequeño (icono de lupa o brújula) junto al minimapa o en la barra superior del HUD
- Al pulsarlo, mostrar un diálogo/popup compacto con:
  - Dos inputs numéricos: X e Y (con labels claros)
  - Botón "Ir" / "Go"
  - Botón de cerrar
- Al confirmar: validar que X e Y sean enteros válidos, luego mover la cámara suavemente a la parcela (X, Y) con animación
- Mostrar la coordenada actual de la cámara en texto pequeño debajo del minimapa (ej: "Pos: (3, -2)") actualizado en tiempo real
- Atajo: si el jugador escribe coordenadas en formato "X, Y" o "X Y" en un solo input, parsearlas automáticamente
- Tras navegar, el minimapa se recentra automáticamente en la nueva posición y se cargan las parcelas correspondientes

### 14.5 Zoom del minimapa y modo expandido

- **Zoom con scroll/pinch**: permitir hacer zoom in/out sobre el minimapa (cambiar la escala px/parcela)
  - Zoom mínimo: 3px/parcela (vista amplia, ~50 parcelas visibles)
  - Zoom máximo: 16px/parcela (vista detallada, ~10 parcelas visibles)
- **Botones +/−**: dos botones pequeños en la esquina del minimapa para zoom (alternativa a scroll/pinch)
- **Modo expandido**: al hacer doble tap o pulsar un botón de expandir, el minimapa crece a ~60% de la pantalla (overlay centrado con fondo oscuro detrás)
  - En modo expandido: se ven más parcelas, se puede navegar con más precisión
  - Tap fuera del minimapa expandido o botón de cerrar → vuelve al tamaño compacto
  - En modo expandido se muestra la leyenda de colores completa
- Guardar la preferencia de zoom en `localStorage`

### 14.6 Datos del minimapa desde el backend (parcelas lejanas)

- El minimapa necesita datos de parcelas más allá del `LOAD_RADIUS` de carga 3D (actualmente 2 parcelas)
- Crear un sistema de petición de parcelas para el minimapa con radio mayor (ej: 25-50 parcelas) usando el endpoint existente GET `/parcels?x=...&y=...&radius=...`
- Cachear los datos recibidos en un `Map<string, MinimapParcel>` donde `MinimapParcel` es un tipo ligero: `{ x, y, ownerId: string | null }`
- Actualizar la caché del minimapa al moverse: cuando la cámara cruce un umbral de distancia (ej: cada 5 parcelas), hacer una nueva petición
- Throttle/debounce de las peticiones para no sobrecargar el backend (máximo 1 petición cada 2 segundos)
- Los datos del minimapa son solo para visualización — no interfieren con el sistema de carga 3D de `ParcelManager`

---

## Fase 15: Ciudad Inicial del Mundo

### 15.1 Jugador sistema "Infinity" y parcelas centrales reservadas

- Definir constante `SYSTEM_PLAYER_ID = "00000000-0000-0000-0000-000000000000"` y `SYSTEM_PLAYER_NAME = "Infinity"` en un archivo compartido de config (ej: `src/config/system.ts` en backend, `src/config/world.ts` en frontend)
- En el seeder (`seedParcels.ts`), antes de crear Player1, crear el jugador Infinity con ID fijo, nombre "Infinity" y 0 monedas. Usar `INSERT ... ON CONFLICT DO NOTHING` para que sea idempotente
- Modificar el seeder para crear las 4 parcelas centrales `(0,0)`, `(1,0)`, `(0,1)`, `(1,1)` con `ownerId = SYSTEM_PLAYER_ID`. Actualmente el seeder asigna (0,0) a Player1 — cambiar eso: Player1 pasa a no tener parcela inicial (empieza con 0 parcelas como cualquier jugador nuevo)
- Ajustar las monedas iniciales de Player1 (actualmente 500) para que tenga suficiente para comprar su primera parcela cerca del centro

### 15.2 Bloqueo de parcelas sistema en el backend

- En POST `/parcels/buy`: añadir validación temprana que rechace compra si la parcela ya existe y su `ownerId === SYSTEM_PLAYER_ID`, con error 403 "System parcels cannot be purchased"
- También rechazar si la coordenada está en la lista de parcelas sistema `[(0,0), (1,0), (0,1), (1,1)]` aunque la parcela aún no exista en BD (protección contra borrado accidental del seed)
- En el handler de Colyseus `placeBuild`/`moveBuild`/`deleteBuild` (cuando exista): validar que el `parcelId` no pertenezca al jugador Infinity
- Exportar función helper `isSystemParcel(x: number, y: number): boolean` que compruebe si las coordenadas son parcelas del sistema (reutilizable en backend y frontend)

### 15.3 Diseño y layout de la ciudad inicial

- Crear archivo `src/seed/seedCity.ts` con la función `seedCity()` que coloque los edificios de la ciudad
- La ciudad ocupa 4 parcelas = cuadrícula de 200×200 unidades de mundo (cada parcela es 100×100 con celdas de 0-99 en `localX`/`localY`)
- Diseño propuesto aprovechando el catálogo existente (mezcla de épocas para representar la diversidad del mundo):
  - **Parcela (0,0) — Plaza Central**: Fuente clásica (2×2) en el centro, Ayuntamiento (4×3) al norte, Banco de hierro y Farola de gas alrededor, Reloj de sol, caminos de Muralla de piedra formando una plaza
  - **Parcela (1,0) — Barrio Medieval**: Castillo (5×5) como pieza central, Torre de vigilancia (2×2), Herrería (3×3), varias Casas de madera (2×2), Taberna (3×2), Pozo de agua, Antorchas
  - **Parcela (0,1) — Zona Moderna**: Rascacielos pequeño (3×3), Hospital (4×3), Casa moderna (3×2), Gasolinera (3×2), Parada de bus, Semáforos, Jardín zen
  - **Parcela (1,1) — Distrito Futurista**: Torre de energía (2×2), Cúpula habitable (4×4), Laboratorio cuántico (3×3), Holograma proyector, Robot guardián, Árbol bioluminiscente
- Cada `placed_object` se inserta con: `parcelId` (de la parcela correspondiente), `objectId` (del catálogo), `localX`, `localY` (posición dentro de la parcela, respetando los `sizeX`/`sizeY` para que no se solapen)
- Añadir llamada a `seedCity()` desde `runAllSeeds()` después de `seedCatalog()` (necesita que el catálogo y las parcelas existan)

### 15.4 Visualización especial en el frontend

- En `ParcelManager.createParcelMeshes()`: detectar si `parcel.ownerId === SYSTEM_PLAYER_ID` como un nuevo estado (además de `isOwn`, `isOther`, `purchasable`)
- **Suelo**: color dorado/ámbar (#8a7a35) diferenciado de los otros estados, con brillo ligeramente mayor
- **Borde**: color dorado (#d4a837) en lugar de rojo (propio) o azul (comprable)
- **Sin iconos de edición ni compra**: no mostrar `editIcon` ni `buyIcon` en parcelas del sistema
- **Etiqueta especial**: mostrar "Infinity World" como `ownerLabel` con textura dorada en vez del UUID del jugador
- En el minimapa (cuando se implemente Fase 14): las parcelas sistema se pintan en dorado (#d4a837)
- Las decoraciones de bioma NO se generan sobre parcelas del sistema (ya tienen edificios predefinidos)

### 15.5 Spawn inicial y cámara en la ciudad

- Al entrar al mundo por primera vez (botón "Acceder al Mundo"), la cámara empieza centrada en la ciudad: `camera.target` apunta al centro de las 4 parcelas `(worldX=100, worldZ=100)` en vez de `(50, 0, 50)`
- Si el jugador tiene parcelas propias y entra desde "Mis Parcelas", la cámara va a su parcela seleccionada (comportamiento actual)
- Si el jugador tiene parcelas pero entra desde "Acceder al Mundo", centrar en la ciudad igualmente (punto de referencia universal)
- Añadir botón rápido en el HUD (icono de casa/brújula) que lleve la cámara de vuelta a la ciudad central con animación suave

### 15.6 Tamaño de parcelas, hacerlas de 200x200

- Cambiar el tamaño de parcelas a 200x200
- Todas las parcelas deben tener el mismo precio no importa la posicion
- Revisar el sistema de construccion, esta roto, antes se podia construir ahora no se posicionan los objetos en el grid

---

## Notas

- Cada tarea de catálogo (4.2 a 4.6) incluye definir los datos Y crear los meshes placeholder
- Las fases no son estrictamente secuenciales; algunas tareas de distintas fases pueden hacerse en paralelo
- El sistema de obtención de monedas (misiones, logros, etc.) se definirá más adelante
- Los modelos 3D definitivos (GLB) reemplazarán los meshes procedurales cuando estén disponibles
- El sistema de biomas (7.4-7.7) es 100% frontend; usa generación procedural determinista para que todos los jugadores vean el mismo mundo sin necesidad de almacenar biomas en el backend
