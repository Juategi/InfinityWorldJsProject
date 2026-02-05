# Infinity World

Juego móvil 3D de construcción estilo Clash of Clans.

## Concepto del Juego

- **Mundo abierto compartido**: Todos los jugadores comparten un único mundo persistente
- **Sistema de parcelas**: Cada jugador puede tener una o más parcelas dentro del mundo
- **Modo edición**: Al entrar en su parcela, el jugador entra en modo edición para construir/modificar
- **Mundo infinito**: El mundo se expande desde un punto central (origen del mapa)
- **Expansión orgánica**: Los jugadores van reclamando parcelas cada vez más lejanas del centro, expandiendo el mundo de forma natural

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
DATABASE_URL=postgresql://user:password@localhost:5432/infinity_world
REDIS_URL=redis://localhost:6379
```

## Comandos

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
