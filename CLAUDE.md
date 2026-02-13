# Infinity World

Juego móvil 3D de construcción estilo Clash of Clans.

## Concepto del Juego

- **Mundo abierto compartido**: Todos los jugadores comparten un único mundo persistente
- **Sistema de parcelas**: Cada jugador puede tener una o más parcelas dentro del mundo
- **Modo edición**: Al entrar en su parcela, el jugador entra en modo edición para construir/modificar
- **Mundo infinito**: El mundo se expande desde un punto central (origen del mapa)
- **Expansión orgánica**: Los jugadores van reclamando parcelas cada vez más lejanas del centro, expandiendo el mundo de forma natural

## Economía y Progresión

- **Monedas**: Los jugadores usan monedas para comprar parcelas y desbloquear objetos/edificios premium
- **Parcelas**: Los jugadores empiezan con 0 parcelas. Deben comprar parcelas con monedas para empezar a construir
- **Catálogo de objetos y edificios**: Gran variedad que abarca múltiples épocas históricas:
  - **Medieval**: Castillos, torres de vigilancia, herrerías, casas de madera, murallas de piedra, etc.
  - **Colonial/Clásico**: Mansiones, iglesias, molinos de viento, granjas, puentes de piedra, etc.
  - **Industrial**: Fábricas, estaciones de tren, almacenes, chimeneas, puentes de hierro, etc.
  - **Moderno**: Rascacielos, centros comerciales, parques, hospitales, estadios, etc.
  - **Futurista**: Torres de energía, cúpulas, estaciones espaciales, laboratorios, vehículos voladores, etc.
- **Objetos gratuitos vs premium**: Algunos objetos son accesibles para todos gratuitamente, otros se desbloquean pagando monedas
- **Sistema de obtención de monedas**: Por definir (posibles fuentes: logros, tiempo jugado, compras in-app, misiones, etc.)

## Interfaz de Usuario

- **Menú principal** (pantalla de inicio al abrir la app):
  - **Acceder al mundo**: Botón para entrar al mundo compartido
  - **Mis parcelas**: Lista de parcelas del jugador con sus coordenadas (clickeables para ir directamente)
  - **Tienda**: Acceso a la tienda de objetos, edificios y parcelas
  - **Ajustes**: Configuración del juego (sonido, gráficos, cuenta, etc.)

## Estructura de Carpetas

```
InfinityWorldJsProject/
├── InfinityWorldJsFrontend/    # Cliente del juego
│   ├── src/
│   │   ├── game/               # Lógica del juego
│   │   │   ├── Game.ts
│   │   │   ├── Grid.ts
│   │   │   ├── Building.ts
│   │   │   ├── BuildingManager.ts
│   │   │   └── InputManager.ts
│   │   ├── ui/                 # Interfaz de usuario
│   │   │   └── UIManager.ts
│   │   ├── types/              # Tipos TypeScript
│   │   │   └── GameState.ts
│   │   ├── styles/             # Estilos CSS
│   │   │   └── main.css
│   │   └── main.ts             # Punto de entrada
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
└── InfinityWorldJsBackend/     # Servidor
    ├── src/
    │   ├── models/             # Entidades del dominio
    │   │   ├── Player.ts
    │   │   ├── Parcel.ts
    │   │   └── Building.ts
    │   ├── repositories/
    │   │   ├── interfaces/     # Contratos de repositorios
    │   │   │   ├── IPlayerRepository.ts
    │   │   │   ├── IParcelRepository.ts
    │   │   │   └── IBuildingRepository.ts
    │   │   └── memory/         # Implementación en memoria (mock)
    │   │       ├── MemoryPlayerRepository.ts
    │   │       ├── MemoryParcelRepository.ts
    │   │       └── MemoryBuildingRepository.ts
    │   └── index.ts            # Punto de entrada Colyseus
    ├── .env
    ├── package.json
    └── tsconfig.json
```

## Stack

### Frontend
- **Motor 3D**: Babylon.js 7.x
- **Lenguaje**: TypeScript
- **Build tool**: Vite 6.x
- **Wrapper nativo**: Capacitor 8.x (Android/iOS)
- **UI**: HTML/CSS nativo (overlay sobre canvas)

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework tiempo real**: Colyseus 0.15.x (WebSockets, rooms, sincronización de estado)
- **Base de datos**: PostgreSQL + PostGIS (persistencia, queries espaciales para parcelas)
- **Cache/Pub-Sub**: Redis (escalar múltiples instancias)
- **Dev tools**: tsx (hot reload en desarrollo)

#### Configuración (.env)
```
PORT=3000
DATABASE_URL=postgresql://iw_user:iw_dev_pass@localhost:5432/infinity_world
REDIS_URL=redis://localhost:6379
```

## Comandos

### Docker (servicios de infraestructura)
```bash
# Desde la raíz del proyecto
docker compose up -d       # Levantar PostgreSQL + Redis en background
docker compose down        # Parar servicios
docker compose logs -f     # Ver logs en tiempo real
docker compose ps          # Ver estado de los servicios
```

### Frontend
```bash
cd InfinityWorldJsFrontend
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
```

### Backend
```bash
cd InfinityWorldJsBackend
npm run dev      # Servidor de desarrollo (hot reload)
npm run build    # Compilar TypeScript
npm run start    # Ejecutar build de producción
```

## Protocolo de Trabajo (Backlog)

- El backlog de tareas está en `BACKLOG.md` en la raíz del proyecto
- Cuando el usuario pida la "siguiente tarea" o "próxima tarea", buscar en `BACKLOG.md` la primera tarea cuyo título NO tenga un check (✅)
- Al completar una tarea, añadir ✅ al lado del título en `BACKLOG.md` (ej: `### 1.1 Crear pantalla de menú principal ✅`)
