import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { Animation } from '@babylonjs/core/Animations/animation'
import { BackEase, CubicEase } from '@babylonjs/core/Animations/easing'
import { EasingFunction } from '@babylonjs/core/Animations/easing'
import '@babylonjs/core/Animations/animatable'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import '@babylonjs/loaders/glTF'
import { createProceduralMesh } from './MeshFactory'

export type BuildingCategory = 'buildings' | 'nature' | 'decor'
export type BuildingEra = 'medieval' | 'colonial' | 'industrial' | 'moderno' | 'futurista'

export interface BuildingType {
  id: string
  name: string
  icon: string
  category: BuildingCategory
  era?: BuildingEra
  sizeX: number
  sizeZ: number
  height: number
  cost: number
  color: Color3
  isNew?: boolean
  modelFile?: string
  modelScale?: number
  smokeOffset?: { x: number; y: number; z: number }
}

// ── Catálogo Medieval ─────────────────────────────────────────
// Paleta: marrones, piedra, madera oscura, paja
export const BUILDING_TYPES: Record<string, BuildingType> = {
  // === EDIFICIOS ===
  casaDeMadera: {
    id: 'casaDeMadera',
    name: 'Casa de madera',
    icon: '🏠',
    category: 'buildings',
    era: 'medieval',
    sizeX: 2,
    sizeZ: 2,
    height: 2.2,
    cost: 0,
    color: new Color3(0.55, 0.35, 0.18) // madera oscura
  },
  murallaDePiedra: {
    id: 'murallaDePiedra',
    name: 'Muralla de piedra',
    icon: '🧱',
    category: 'buildings',
    era: 'medieval',
    sizeX: 1,
    sizeZ: 1,
    height: 1.5,
    cost: 0,
    color: new Color3(0.55, 0.53, 0.48) // piedra gris
  },
  torreDeVigilancia: {
    id: 'torreDeVigilancia',
    name: 'Torre de vigilancia',
    icon: '🗼',
    category: 'buildings',
    era: 'medieval',
    sizeX: 2,
    sizeZ: 2,
    height: 4.5,
    cost: 50,
    color: new Color3(0.5, 0.48, 0.42) // piedra oscura
  },
  castillo: {
    id: 'castillo',
    name: 'Castillo',
    icon: '🏰',
    category: 'buildings',
    era: 'medieval',
    sizeX: 5,
    sizeZ: 5,
    height: 5,
    cost: 200,
    color: new Color3(0.6, 0.58, 0.52) // piedra clara
  },
  herreria: {
    id: 'herreria',
    name: 'Herrería',
    icon: '⚒️',
    category: 'buildings',
    era: 'medieval',
    sizeX: 3,
    sizeZ: 3,
    height: 2.5,
    cost: 80,
    color: new Color3(0.35, 0.28, 0.22) // madera quemada
  },
  taberna: {
    id: 'taberna',
    name: 'Taberna',
    icon: '🍺',
    category: 'buildings',
    era: 'medieval',
    sizeX: 3,
    sizeZ: 2,
    height: 2.3,
    cost: 60,
    color: new Color3(0.6, 0.42, 0.2) // madera cálida
  },
  iglesiaMedieval: {
    id: 'iglesiaMedieval',
    name: 'Iglesia medieval',
    icon: '⛪',
    category: 'buildings',
    era: 'medieval',
    sizeX: 3,
    sizeZ: 4,
    height: 4,
    cost: 120,
    color: new Color3(0.72, 0.68, 0.6) // piedra blanca
  },
  granero: {
    id: 'granero',
    name: 'Granero',
    icon: '🏚️',
    category: 'buildings',
    era: 'medieval',
    sizeX: 3,
    sizeZ: 3,
    height: 2.8,
    cost: 40,
    color: new Color3(0.65, 0.45, 0.15) // madera dorada
  },
  establo: {
    id: 'establo',
    name: 'Establo',
    icon: '🐴',
    category: 'buildings',
    era: 'medieval',
    sizeX: 3,
    sizeZ: 2,
    height: 2,
    cost: 70,
    color: new Color3(0.5, 0.35, 0.15) // madera rústica
  },

  // === NATURALEZA ===
  robleGrande: {
    id: 'robleGrande',
    name: 'Roble grande',
    icon: '🌳',
    category: 'nature',
    era: 'medieval',
    sizeX: 2,
    sizeZ: 2,
    height: 3.5,
    cost: 0,
    color: new Color3(0.22, 0.45, 0.18) // verde bosque
  },
  arbustoSilvestre: {
    id: 'arbustoSilvestre',
    name: 'Arbusto silvestre',
    icon: '🌿',
    category: 'nature',
    era: 'medieval',
    sizeX: 1,
    sizeZ: 1,
    height: 0.7,
    cost: 0,
    color: new Color3(0.3, 0.55, 0.25) // verde claro
  },

  // === DECORACIÓN ===
  pozoDeAgua: {
    id: 'pozoDeAgua',
    name: 'Pozo de agua',
    icon: '🪣',
    category: 'decor',
    era: 'medieval',
    sizeX: 1,
    sizeZ: 1,
    height: 1,
    cost: 0,
    color: new Color3(0.45, 0.45, 0.4) // piedra
  },
  antorcha: {
    id: 'antorcha',
    name: 'Antorcha',
    icon: '🔥',
    category: 'decor',
    era: 'medieval',
    sizeX: 1,
    sizeZ: 1,
    height: 1.8,
    cost: 0,
    color: new Color3(0.7, 0.5, 0.1) // llama dorada
  },
  carreta: {
    id: 'carreta',
    name: 'Carreta',
    icon: '🛒',
    category: 'decor',
    era: 'medieval',
    sizeX: 2,
    sizeZ: 1,
    height: 1,
    cost: 0,
    color: new Color3(0.5, 0.38, 0.2) // madera
  },
  barril: {
    id: 'barril',
    name: 'Barril',
    icon: '🪵',
    category: 'decor',
    era: 'medieval',
    sizeX: 1,
    sizeZ: 1,
    height: 0.8,
    cost: 0,
    color: new Color3(0.45, 0.3, 0.12) // roble oscuro
  },

  // ── Catálogo Colonial / Clásico ──────────────────────────────
  // Paleta: cremas, blancos, terracota, verde jardín
  // === EDIFICIOS ===
  granja: {
    id: 'granja',
    name: 'Granja',
    icon: '🌾',
    category: 'buildings',
    era: 'colonial',
    sizeX: 3,
    sizeZ: 3,
    height: 2,
    cost: 0,
    color: new Color3(0.7, 0.55, 0.3) // paja dorada
  },
  molinoDeViento: {
    id: 'molinoDeViento',
    name: 'Molino de viento',
    icon: '🌬️',
    category: 'buildings',
    era: 'colonial',
    sizeX: 2,
    sizeZ: 2,
    height: 3.5,
    cost: 60,
    color: new Color3(0.85, 0.8, 0.7) // blanco crema
  },
  mansionColonial: {
    id: 'mansionColonial',
    name: 'Mansión colonial',
    icon: '🏛️',
    category: 'buildings',
    era: 'colonial',
    sizeX: 4,
    sizeZ: 4,
    height: 3.5,
    cost: 150,
    color: new Color3(0.9, 0.85, 0.75) // blanco marfil
  },
  puenteDePiedra: {
    id: 'puenteDePiedra',
    name: 'Puente de piedra',
    icon: '🌉',
    category: 'buildings',
    era: 'colonial',
    sizeX: 4,
    sizeZ: 1,
    height: 1.5,
    cost: 100,
    color: new Color3(0.6, 0.58, 0.5) // piedra gris cálido
  },
  ayuntamiento: {
    id: 'ayuntamiento',
    name: 'Ayuntamiento',
    icon: '🏛️',
    category: 'buildings',
    era: 'colonial',
    sizeX: 4,
    sizeZ: 3,
    height: 3.8,
    cost: 140,
    color: new Color3(0.82, 0.75, 0.6) // piedra arenisca
  },
  biblioteca: {
    id: 'biblioteca',
    name: 'Biblioteca',
    icon: '📚',
    category: 'buildings',
    era: 'colonial',
    sizeX: 3,
    sizeZ: 3,
    height: 3,
    cost: 90,
    color: new Color3(0.65, 0.45, 0.3) // terracota
  },
  mercado: {
    id: 'mercado',
    name: 'Mercado',
    icon: '🛍️',
    category: 'buildings',
    era: 'colonial',
    sizeX: 3,
    sizeZ: 2,
    height: 2.2,
    cost: 0,
    color: new Color3(0.75, 0.6, 0.4) // madera clara
  },
  // === NATURALEZA ===
  jardinFormal: {
    id: 'jardinFormal',
    name: 'Jardín formal',
    icon: '🌷',
    category: 'nature',
    era: 'colonial',
    sizeX: 2,
    sizeZ: 2,
    height: 0.4,
    cost: 0,
    color: new Color3(0.3, 0.6, 0.25) // verde jardín
  },
  setoRecortado: {
    id: 'setoRecortado',
    name: 'Seto recortado',
    icon: '🌿',
    category: 'nature',
    era: 'colonial',
    sizeX: 1,
    sizeZ: 1,
    height: 0.9,
    cost: 0,
    color: new Color3(0.2, 0.5, 0.2) // verde oscuro
  },
  cipres: {
    id: 'cipres',
    name: 'Ciprés',
    icon: '🌲',
    category: 'nature',
    era: 'colonial',
    sizeX: 1,
    sizeZ: 1,
    height: 3.5,
    cost: 0,
    color: new Color3(0.15, 0.38, 0.18) // verde profundo
  },
  // === DECORACIÓN ===
  fuenteClasica: {
    id: 'fuenteClasica',
    name: 'Fuente clásica',
    icon: '⛲',
    category: 'decor',
    era: 'colonial',
    sizeX: 2,
    sizeZ: 2,
    height: 1.5,
    cost: 0,
    color: new Color3(0.7, 0.72, 0.75) // mármol gris claro
  },
  farolaDeGas: {
    id: 'farolaDeGas',
    name: 'Farola de gas',
    icon: '🏮',
    category: 'decor',
    era: 'colonial',
    sizeX: 1,
    sizeZ: 1,
    height: 2.5,
    cost: 0,
    color: new Color3(0.25, 0.25, 0.22) // hierro oscuro
  },
  bancoDeHierro: {
    id: 'bancoDeHierro',
    name: 'Banco de hierro',
    icon: '🪑',
    category: 'decor',
    era: 'colonial',
    sizeX: 1,
    sizeZ: 1,
    height: 0.5,
    cost: 0,
    color: new Color3(0.3, 0.3, 0.28) // hierro forjado
  },
  relojDeSol: {
    id: 'relojDeSol',
    name: 'Reloj de sol',
    icon: '☀️',
    category: 'decor',
    era: 'colonial',
    sizeX: 1,
    sizeZ: 1,
    height: 1.2,
    cost: 30,
    color: new Color3(0.78, 0.72, 0.6) // piedra arena
  },
  arcoDecorativo: {
    id: 'arcoDecorativo',
    name: 'Arco decorativo',
    icon: '🚪',
    category: 'decor',
    era: 'colonial',
    sizeX: 2,
    sizeZ: 1,
    height: 3,
    cost: 50,
    color: new Color3(0.8, 0.78, 0.7) // piedra clara
  },

  // ── Catálogo Industrial ──────────────────────────────────────
  // Paleta: rojos ladrillo, grises acero, negro hierro
  // === EDIFICIOS ===
  fabrica: {
    id: 'fabrica',
    name: 'Fábrica',
    icon: '🏭',
    category: 'buildings',
    era: 'industrial',
    sizeX: 4,
    sizeZ: 3,
    height: 3,
    cost: 0,
    color: new Color3(0.6, 0.3, 0.25) // ladrillo rojo
  },
  estacionDeTren: {
    id: 'estacionDeTren',
    name: 'Estación de tren',
    icon: '🚂',
    category: 'buildings',
    era: 'industrial',
    sizeX: 5,
    sizeZ: 2,
    height: 2.8,
    cost: 120,
    color: new Color3(0.55, 0.35, 0.28) // ladrillo oscuro
  },
  almacenIndustrial: {
    id: 'almacenIndustrial',
    name: 'Almacén industrial',
    icon: '🏗️',
    category: 'buildings',
    era: 'industrial',
    sizeX: 3,
    sizeZ: 3,
    height: 2.5,
    cost: 40,
    color: new Color3(0.5, 0.45, 0.4) // gris cálido
  },
  chimenea: {
    id: 'chimenea',
    name: 'Chimenea',
    icon: '🔥',
    category: 'buildings',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 4,
    cost: 0,
    color: new Color3(0.5, 0.28, 0.22) // ladrillo oscuro
  },
  puenteDeHierro: {
    id: 'puenteDeHierro',
    name: 'Puente de hierro',
    icon: '🌉',
    category: 'buildings',
    era: 'industrial',
    sizeX: 5,
    sizeZ: 1,
    height: 1.8,
    cost: 130,
    color: new Color3(0.35, 0.35, 0.38) // acero gris
  },
  centralElectrica: {
    id: 'centralElectrica',
    name: 'Central eléctrica',
    icon: '⚡',
    category: 'buildings',
    era: 'industrial',
    sizeX: 3,
    sizeZ: 3,
    height: 3.2,
    cost: 100,
    color: new Color3(0.45, 0.42, 0.4) // hormigón
  },
  depositoDeAgua: {
    id: 'depositoDeAgua',
    name: 'Depósito de agua',
    icon: '💧',
    category: 'buildings',
    era: 'industrial',
    sizeX: 2,
    sizeZ: 2,
    height: 3.5,
    cost: 60,
    color: new Color3(0.4, 0.45, 0.5) // metal azulado
  },
  grua: {
    id: 'grua',
    name: 'Grúa',
    icon: '🏗️',
    category: 'buildings',
    era: 'industrial',
    sizeX: 2,
    sizeZ: 2,
    height: 5,
    cost: 80,
    color: new Color3(0.8, 0.6, 0.1) // amarillo industrial
  },
  // === NATURALEZA ===
  parqueUrbano: {
    id: 'parqueUrbano',
    name: 'Parque urbano',
    icon: '🌳',
    category: 'nature',
    era: 'industrial',
    sizeX: 3,
    sizeZ: 3,
    height: 0.4,
    cost: 0,
    color: new Color3(0.3, 0.52, 0.28) // verde urbano
  },
  arbolPodado: {
    id: 'arbolPodado',
    name: 'Árbol podado',
    icon: '🌲',
    category: 'nature',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 2.5,
    cost: 0,
    color: new Color3(0.25, 0.48, 0.22) // verde
  },
  // === DECORACIÓN ===
  farolaElectrica: {
    id: 'farolaElectrica',
    name: 'Farola eléctrica',
    icon: '💡',
    category: 'decor',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 2.8,
    cost: 0,
    color: new Color3(0.3, 0.3, 0.3) // hierro negro
  },
  buzon: {
    id: 'buzon',
    name: 'Buzón',
    icon: '📮',
    category: 'decor',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 1,
    cost: 0,
    color: new Color3(0.7, 0.15, 0.12) // rojo postal
  },
  senalDeTrafico: {
    id: 'senalDeTrafico',
    name: 'Señal de tráfico',
    icon: '🛑',
    category: 'decor',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 2,
    cost: 0,
    color: new Color3(0.35, 0.35, 0.35) // metal gris
  },
  canonDecorativo: {
    id: 'canonDecorativo',
    name: 'Cañón decorativo',
    icon: '💣',
    category: 'decor',
    era: 'industrial',
    sizeX: 1,
    sizeZ: 1,
    height: 0.6,
    cost: 50,
    color: new Color3(0.2, 0.2, 0.2) // hierro negro
  },
  vagonDeTren: {
    id: 'vagonDeTren',
    name: 'Vagón de tren',
    icon: '🚃',
    category: 'decor',
    era: 'industrial',
    sizeX: 2,
    sizeZ: 1,
    height: 1.5,
    cost: 70,
    color: new Color3(0.45, 0.3, 0.2) // madera oxidada
  },

  // ── Catálogo Moderno ─────────────────────────────────────────
  // Paleta: blancos, grises, azules, cristal
  // === EDIFICIOS ===
  casaModerna: {
    id: 'casaModerna',
    name: 'Casa moderna',
    icon: '🏠',
    category: 'buildings',
    era: 'moderno',
    sizeX: 3,
    sizeZ: 2,
    height: 2.5,
    cost: 0,
    color: new Color3(0.85, 0.85, 0.88) // blanco moderno
  },
  rascacielosPequeno: {
    id: 'rascacielosPequeno',
    name: 'Rascacielos pequeño',
    icon: '🏢',
    category: 'buildings',
    era: 'moderno',
    sizeX: 3,
    sizeZ: 3,
    height: 6,
    cost: 180,
    color: new Color3(0.55, 0.6, 0.7) // cristal azulado
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    icon: '🏥',
    category: 'buildings',
    era: 'moderno',
    sizeX: 4,
    sizeZ: 3,
    height: 3.5,
    cost: 150,
    color: new Color3(0.9, 0.92, 0.95) // blanco clínico
  },
  centroComercial: {
    id: 'centroComercial',
    name: 'Centro comercial',
    icon: '🏬',
    category: 'buildings',
    era: 'moderno',
    sizeX: 5,
    sizeZ: 4,
    height: 3,
    cost: 200,
    color: new Color3(0.75, 0.72, 0.68) // hormigón claro
  },
  estadio: {
    id: 'estadio',
    name: 'Estadio',
    icon: '🏟️',
    category: 'buildings',
    era: 'moderno',
    sizeX: 6,
    sizeZ: 6,
    height: 4,
    cost: 300,
    color: new Color3(0.7, 0.7, 0.72) // hormigón gris
  },
  gasolinera: {
    id: 'gasolinera',
    name: 'Gasolinera',
    icon: '⛽',
    category: 'buildings',
    era: 'moderno',
    sizeX: 3,
    sizeZ: 2,
    height: 2,
    cost: 0,
    color: new Color3(0.8, 0.2, 0.15) // rojo corporativo
  },
  comisaria: {
    id: 'comisaria',
    name: 'Comisaría',
    icon: '🚔',
    category: 'buildings',
    era: 'moderno',
    sizeX: 3,
    sizeZ: 3,
    height: 3,
    cost: 120,
    color: new Color3(0.3, 0.4, 0.6) // azul policía
  },
  helipuerto: {
    id: 'helipuerto',
    name: 'Helipuerto',
    icon: '🚁',
    category: 'buildings',
    era: 'moderno',
    sizeX: 2,
    sizeZ: 2,
    height: 0.3,
    cost: 160,
    color: new Color3(0.4, 0.4, 0.42) // asfalto gris
  },
  // === NATURALEZA ===
  palmera: {
    id: 'palmera',
    name: 'Palmera',
    icon: '🌴',
    category: 'nature',
    era: 'moderno',
    sizeX: 1,
    sizeZ: 1,
    height: 3.5,
    cost: 0,
    color: new Color3(0.25, 0.5, 0.2) // verde tropical
  },
  jardinZen: {
    id: 'jardinZen',
    name: 'Jardín zen',
    icon: '🪨',
    category: 'nature',
    era: 'moderno',
    sizeX: 2,
    sizeZ: 2,
    height: 0.3,
    cost: 0,
    color: new Color3(0.8, 0.75, 0.65) // arena clara
  },
  // === DECORACIÓN ===
  semaforo: {
    id: 'semaforo',
    name: 'Semáforo',
    icon: '🚦',
    category: 'decor',
    era: 'moderno',
    sizeX: 1,
    sizeZ: 1,
    height: 2.5,
    cost: 0,
    color: new Color3(0.25, 0.25, 0.25) // metal oscuro
  },
  paradaDeBus: {
    id: 'paradaDeBus',
    name: 'Parada de bus',
    icon: '🚏',
    category: 'decor',
    era: 'moderno',
    sizeX: 2,
    sizeZ: 1,
    height: 2.2,
    cost: 0,
    color: new Color3(0.5, 0.55, 0.6) // metal claro
  },
  contenedor: {
    id: 'contenedor',
    name: 'Contenedor',
    icon: '🗑️',
    category: 'decor',
    era: 'moderno',
    sizeX: 1,
    sizeZ: 1,
    height: 0.8,
    cost: 0,
    color: new Color3(0.2, 0.5, 0.25) // verde reciclaje
  },
  esculturaAbstracta: {
    id: 'esculturaAbstracta',
    name: 'Escultura abstracta',
    icon: '🗿',
    category: 'decor',
    era: 'moderno',
    sizeX: 1,
    sizeZ: 1,
    height: 2,
    cost: 60,
    color: new Color3(0.75, 0.75, 0.78) // acero pulido
  },
  piscina: {
    id: 'piscina',
    name: 'Piscina',
    icon: '🏊',
    category: 'decor',
    era: 'moderno',
    sizeX: 3,
    sizeZ: 2,
    height: 0.3,
    cost: 80,
    color: new Color3(0.3, 0.6, 0.85) // agua azul
  },
  antenaParabolica: {
    id: 'antenaParabolica',
    name: 'Antena parabólica',
    icon: '📡',
    category: 'decor',
    era: 'moderno',
    sizeX: 1,
    sizeZ: 1,
    height: 1.5,
    cost: 40,
    color: new Color3(0.8, 0.8, 0.82) // blanco satélite
  },

  // ── Catálogo Futurista ───────────────────────────────────────
  // Paleta: neón, metálico, cian, violeta
  // === EDIFICIOS ===
  torreDeEnergia: {
    id: 'torreDeEnergia',
    name: 'Torre de energía',
    icon: '⚡',
    category: 'buildings',
    era: 'futurista',
    sizeX: 2,
    sizeZ: 2,
    height: 4,
    cost: 0,
    color: new Color3(0.2, 0.7, 0.9) // cian energía
  },
  cupulaHabitable: {
    id: 'cupulaHabitable',
    name: 'Cúpula habitable',
    icon: '🔮',
    category: 'buildings',
    era: 'futurista',
    sizeX: 4,
    sizeZ: 4,
    height: 3.5,
    cost: 250,
    color: new Color3(0.6, 0.65, 0.75) // cristal gris azulado
  },
  laboratorioCuantico: {
    id: 'laboratorioCuantico',
    name: 'Laboratorio cuántico',
    icon: '🔬',
    category: 'buildings',
    era: 'futurista',
    sizeX: 3,
    sizeZ: 3,
    height: 3,
    cost: 200,
    color: new Color3(0.7, 0.7, 0.8) // metal plateado
  },
  hangarDeNaves: {
    id: 'hangarDeNaves',
    name: 'Hangar de naves',
    icon: '🛸',
    category: 'buildings',
    era: 'futurista',
    sizeX: 4,
    sizeZ: 3,
    height: 2.5,
    cost: 180,
    color: new Color3(0.45, 0.48, 0.55) // metal oscuro
  },
  reactorDeFusion: {
    id: 'reactorDeFusion',
    name: 'Reactor de fusión',
    icon: '☢️',
    category: 'buildings',
    era: 'futurista',
    sizeX: 3,
    sizeZ: 3,
    height: 3.5,
    cost: 220,
    color: new Color3(0.3, 0.8, 0.5) // verde reactor
  },
  moduloResidencial: {
    id: 'moduloResidencial',
    name: 'Módulo residencial',
    icon: '🏠',
    category: 'buildings',
    era: 'futurista',
    sizeX: 2,
    sizeZ: 3,
    height: 2.5,
    cost: 0,
    color: new Color3(0.75, 0.78, 0.82) // blanco metálico
  },
  estacionEspacialMini: {
    id: 'estacionEspacialMini',
    name: 'Estación espacial mini',
    icon: '🛰️',
    category: 'buildings',
    era: 'futurista',
    sizeX: 3,
    sizeZ: 3,
    height: 4,
    cost: 280,
    color: new Color3(0.55, 0.55, 0.6) // gris espacial
  },
  // === NATURALEZA ===
  arbolBioluminiscente: {
    id: 'arbolBioluminiscente',
    name: 'Árbol bioluminiscente',
    icon: '🌳',
    category: 'nature',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 3,
    cost: 0,
    color: new Color3(0.1, 0.8, 0.6) // verde neón
  },
  jardinHidroponico: {
    id: 'jardinHidroponico',
    name: 'Jardín hidropónico',
    icon: '🌱',
    category: 'nature',
    era: 'futurista',
    sizeX: 2,
    sizeZ: 2,
    height: 0.5,
    cost: 0,
    color: new Color3(0.3, 0.75, 0.4) // verde luminoso
  },
  // === DECORACIÓN ===
  hologramaProyector: {
    id: 'hologramaProyector',
    name: 'Holograma proyector',
    icon: '💠',
    category: 'decor',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 1.5,
    cost: 0,
    color: new Color3(0.4, 0.5, 0.9) // azul holograma
  },
  teletransportador: {
    id: 'teletransportador',
    name: 'Teletransportador',
    icon: '🌀',
    category: 'decor',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 2,
    cost: 100,
    color: new Color3(0.6, 0.3, 0.8) // violeta portal
  },
  robotGuardian: {
    id: 'robotGuardian',
    name: 'Robot guardián',
    icon: '🤖',
    category: 'decor',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 1.8,
    cost: 80,
    color: new Color3(0.5, 0.52, 0.55) // metal gris
  },
  cristalEnergetico: {
    id: 'cristalEnergetico',
    name: 'Cristal energético',
    icon: '💎',
    category: 'decor',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 1.2,
    cost: 0,
    color: new Color3(0.2, 0.9, 0.85) // cian brillante
  },
  naveEstacionada: {
    id: 'naveEstacionada',
    name: 'Nave estacionada',
    icon: '🚀',
    category: 'decor',
    era: 'futurista',
    sizeX: 2,
    sizeZ: 2,
    height: 1,
    cost: 150,
    color: new Color3(0.6, 0.6, 0.65) // metal plateado
  },
  dronDeCarga: {
    id: 'dronDeCarga',
    name: 'Dron de carga',
    icon: '🛩️',
    category: 'decor',
    era: 'futurista',
    sizeX: 1,
    sizeZ: 1,
    height: 0.8,
    cost: 60,
    color: new Color3(0.35, 0.35, 0.4) // gris oscuro
  },

  // === MODELOS 3D ===
  whimsicalCottage: {
    id: 'whimsicalCottage',
    name: 'Whimsical Cottage',
    icon: '🏡',
    category: 'buildings',
    sizeX: 3,
    sizeZ: 3,
    height: 3,
    cost: 400,
    color: new Color3(0.7, 0.5, 0.3),
    isNew: true,
    modelFile: '/models/whimsical_cottage.glb',
    modelScale: 1,
    smokeOffset: { x: 0.8, y: 3.2, z: 0.5 }
  }
}

export class Building {
  public id: string
  public type: BuildingType
  public gridX: number
  public gridZ: number
  public rotation: number = 0
  public mesh: Mesh
  public rootNode: TransformNode
  private scene: Scene
  private modelMeshes: AbstractMesh[] = []
  private originalMaterials: Map<AbstractMesh, import('@babylonjs/core/Materials/material').Material | null> = new Map()
  private modelLoaded: boolean = false
  private previewMaterial: StandardMaterial | null = null
  private footprintMesh: Mesh | null = null
  private footprintMaterial: StandardMaterial | null = null
  private smokeSystem: ParticleSystem | null = null

  constructor(scene: Scene, type: BuildingType, gridX: number, gridZ: number, worldPos: Vector3) {
    this.scene = scene
    this.type = type
    this.gridX = gridX
    this.gridZ = gridZ
    this.id = `${type.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Nodo raíz para posicionamiento
    this.rootNode = new TransformNode(`${this.id}_root`, this.scene)
    this.rootNode.position = new Vector3(worldPos.x, 0, worldPos.z)

    // Crear caja placeholder
    this.mesh = this.createMesh()
    this.mesh.parent = this.rootNode
    this.mesh.metadata = { buildingId: this.id, type: type.id }

    // Cargar modelo GLB si está definido
    if (type.modelFile) {
      this.loadModel(type.modelFile)
    }
  }

  private createMesh(): Mesh {
    // Intentar mesh procedural por época
    if (this.type.era) {
      const procedural = createProceduralMesh(this.id, this.type, this.scene)
      if (procedural) {
        return procedural
      }
    }

    // Fallback: caja simple con color
    const mesh = MeshBuilder.CreateBox(
      this.id,
      {
        width: this.type.sizeX * 0.9,
        height: this.type.height,
        depth: this.type.sizeZ * 0.9
      },
      this.scene
    )

    mesh.position = new Vector3(0, this.type.height / 2, 0)

    const material = new StandardMaterial(`${this.id}_material`, this.scene)
    material.diffuseColor = this.type.color
    material.specularColor = new Color3(0.2, 0.2, 0.2)
    mesh.material = material

    return mesh
  }

  private async loadModel(modelFile: string): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '', modelFile, this.scene)

      const rootMesh = result.meshes[0]
      rootMesh.parent = this.rootNode

      // Medir bounding box a escala 1 para calcular auto-fit
      rootMesh.scaling = new Vector3(1, 1, 1)
      rootMesh.computeWorldMatrix(true)
      for (const m of result.meshes) {
        m.computeWorldMatrix(true)
      }
      const rawBounds = rootMesh.getHierarchyBoundingVectors(true)
      const modelWidth = rawBounds.max.x - rawBounds.min.x
      const modelDepth = rawBounds.max.z - rawBounds.min.z

      // Auto-escalar para que el modelo encaje en sizeX x sizeZ celdas
      const userScale = this.type.modelScale ?? 1
      let fitScale = userScale
      if (modelWidth > 0 && modelDepth > 0) {
        fitScale = Math.min(this.type.sizeX / modelWidth, this.type.sizeZ / modelDepth) * userScale
      }
      rootMesh.scaling = new Vector3(fitScale, fitScale, fitScale)

      // Recalcular bounds con escala final para posicionar en Y=0
      rootMesh.computeWorldMatrix(true)
      for (const m of result.meshes) {
        m.computeWorldMatrix(true)
      }
      const bounds = rootMesh.getHierarchyBoundingVectors(true)
      rootMesh.position.y = -bounds.min.y

      // Guardar referencias, materiales originales y metadata para raycasting
      this.modelMeshes = result.meshes as AbstractMesh[]
      for (const m of this.modelMeshes) {
        m.metadata = { buildingId: this.id, type: this.type.id }
        this.originalMaterials.set(m, m.material)
      }

      this.modelLoaded = true

      // Ocultar placeholder, mostrar modelo
      this.mesh.isVisible = false

      // Crear efecto de humo si tiene smokeOffset
      if (this.type.smokeOffset) {
        this.createSmoke(this.type.smokeOffset)
      }
    } catch (error) {
      console.warn(`Error cargando modelo ${modelFile}, usando placeholder:`, error)
    }
  }

  private createSmoke(offset: { x: number; y: number; z: number }): void {
    const smoke = new ParticleSystem(`${this.id}_smoke`, 80, this.scene)

    // Textura procedural: círculo blanco con gradiente
    const texSize = 64
    const canvas = document.createElement('canvas')
    canvas.width = texSize
    canvas.height = texSize
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(texSize / 2, texSize / 2, 0, texSize / 2, texSize / 2, texSize / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.4)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, texSize, texSize)
    smoke.particleTexture = new Texture(canvas.toDataURL(), this.scene)

    // Emisor: mesh invisible hijo del rootNode en la posición de la chimenea
    const emitter = MeshBuilder.CreateBox(`${this.id}_smoke_emitter`, { size: 0.01 }, this.scene)
    emitter.parent = this.rootNode
    emitter.position = new Vector3(offset.x, offset.y, offset.z)
    emitter.isVisible = false
    smoke.emitter = emitter

    // Área de emisión pequeña (boca de chimenea)
    smoke.minEmitBox = new Vector3(-0.05, 0, -0.05)
    smoke.maxEmitBox = new Vector3(0.05, 0, 0.05)

    // Dirección: hacia arriba con algo de dispersión
    smoke.direction1 = new Vector3(-0.1, 1, -0.1)
    smoke.direction2 = new Vector3(0.1, 1.5, 0.1)

    // Velocidad
    smoke.minEmitPower = 0.3
    smoke.maxEmitPower = 0.6

    // Tamaño de partículas
    smoke.minSize = 0.3
    smoke.maxSize = 0.7

    // Crecen al subir
    smoke.minScaleX = 1.0
    smoke.maxScaleX = 2.0
    smoke.minScaleY = 1.0
    smoke.maxScaleY = 2.0

    // Vida
    smoke.minLifeTime = 2.0
    smoke.maxLifeTime = 4.0

    // Emisión
    smoke.emitRate = 18

    // Colores: gris claro → gris → transparente
    smoke.color1 = new Color4(0.75, 0.75, 0.75, 0.5)
    smoke.color2 = new Color4(0.6, 0.6, 0.6, 0.35)
    smoke.colorDead = new Color4(0.5, 0.5, 0.5, 0)

    // Gravedad negativa (sube lentamente)
    smoke.gravity = new Vector3(0, 0.3, 0)

    // Blend mode aditivo para suavidad
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD

    smoke.start()
    this.smokeSystem = smoke
  }

  setPosition(worldPos: Vector3): void {
    this.rootNode.position = new Vector3(worldPos.x, 0, worldPos.z)
  }

  setRotation(angle: number, animate: boolean = false): void {
    const newRotation = angle % (Math.PI * 2)
    if (animate) {
      const from = this.rotation
      this.rotation = newRotation
      const anim = new Animation('rotAnim', 'rotation.y', 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT)
      anim.setKeys([
        { frame: 0, value: from },
        { frame: 15, value: newRotation }
      ])
      const ease = new CubicEase()
      ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)
      anim.setEasingFunction(ease)
      this.scene.beginDirectAnimation(this.rootNode, [anim], 0, 15, false)
    } else {
      this.rotation = newRotation
      this.rootNode.rotation.y = newRotation
    }
  }

  rotate90(): void {
    this.setRotation(this.rotation + Math.PI / 2, true)
  }

  // === Animaciones ===

  animatePlace(): void {
    this.rootNode.scaling = new Vector3(0, 0, 0)
    const anim = new Animation('placeAnim', 'scaling', 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys([
      { frame: 0, value: new Vector3(0, 0, 0) },
      { frame: 24, value: new Vector3(1, 1, 1) }
    ])
    const ease = new BackEase(0.5)
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)
    anim.setEasingFunction(ease)
    this.scene.beginDirectAnimation(this.rootNode, [anim], 0, 24, false)
  }

  animateDelete(onComplete: () => void): void {
    const anim = new Animation('deleteAnim', 'scaling', 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 21, value: new Vector3(0, 0, 0) }
    ])
    const ease = new CubicEase()
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEIN)
    anim.setEasingFunction(ease)
    this.scene.beginDirectAnimation(this.rootNode, [anim], 0, 21, false, 1, onComplete)
  }

  animateSelect(): void {
    const anim = new Animation('selectAnim', 'scaling', 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 8, value: new Vector3(1.08, 1.08, 1.08) },
      { frame: 15, value: new Vector3(1, 1, 1) }
    ])
    this.scene.beginDirectAnimation(this.rootNode, [anim], 0, 15, false)
  }

  animateBounce(): void {
    const baseY = this.rootNode.position.y
    const anim = new Animation('bounceAnim', 'position.y', 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys([
      { frame: 0, value: baseY },
      { frame: 9, value: baseY + 1.5 },
      { frame: 18, value: baseY }
    ])
    const ease = new CubicEase()
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT)
    anim.setEasingFunction(ease)
    this.scene.beginDirectAnimation(this.rootNode, [anim], 0, 18, false)
  }

  setPreviewMode(valid: boolean): void {
    const color = valid
      ? new Color3(0.2, 0.8, 0.2)
      : new Color3(0.8, 0.2, 0.2)

    // Mostrar footprint del suelo
    this.showFootprint(true, color)

    if (this.modelLoaded) {
      // Usar el modelo real con material semitransparente
      this.mesh.isVisible = false
      this.setModelVisible(true)

      if (!this.previewMaterial) {
        this.previewMaterial = new StandardMaterial(`${this.id}_preview`, this.scene)
        this.previewMaterial.specularColor = new Color3(0, 0, 0)
      }
      this.previewMaterial.diffuseColor = color
      this.previewMaterial.alpha = 0.7

      for (const m of this.modelMeshes) {
        m.material = this.previewMaterial
      }
    } else {
      // Fallback: usar caja placeholder
      this.mesh.isVisible = true
      const material = this.mesh.material as StandardMaterial
      material.diffuseColor = color
      material.alpha = 0.7
    }
  }

  setNormalMode(): void {
    // Ocultar footprint
    this.showFootprint(false)

    if (this.modelLoaded) {
      // Restaurar materiales originales del modelo
      this.mesh.isVisible = false
      for (const m of this.modelMeshes) {
        const original = this.originalMaterials.get(m)
        if (original !== undefined) {
          m.material = original
        }
      }
      this.setModelVisible(true)
    } else {
      const material = this.mesh.material as StandardMaterial
      material.diffuseColor = this.type.color
      material.alpha = 1
    }
  }

  private showFootprint(visible: boolean, color?: Color3): void {
    if (visible) {
      // Crear footprint si no existe
      if (!this.footprintMesh) {
        this.footprintMesh = MeshBuilder.CreateGround(
          `${this.id}_footprint`,
          { width: this.type.sizeX, height: this.type.sizeZ },
          this.scene
        )
        this.footprintMesh.parent = this.rootNode
        this.footprintMesh.position.y = 0.05 // Ligeramente sobre el suelo

        this.footprintMaterial = new StandardMaterial(`${this.id}_footprint_mat`, this.scene)
        this.footprintMaterial.specularColor = new Color3(0, 0, 0)
        this.footprintMaterial.backFaceCulling = false
        this.footprintMesh.material = this.footprintMaterial
      }

      if (this.footprintMaterial && color) {
        this.footprintMaterial.diffuseColor = color
        this.footprintMaterial.alpha = 0.5
      }
      this.footprintMesh.isVisible = true
    } else if (this.footprintMesh) {
      this.footprintMesh.isVisible = false
    }
  }

  private setModelVisible(visible: boolean): void {
    for (const m of this.modelMeshes) {
      m.isVisible = visible
    }
  }

  dispose(): void {
    this.smokeSystem?.dispose()
    for (const m of this.modelMeshes) {
      m.dispose()
    }
    this.modelMeshes = []
    this.originalMaterials.clear()
    this.previewMaterial?.dispose()
    this.footprintMaterial?.dispose()
    this.footprintMesh?.dispose()
    this.mesh.dispose()
    this.rootNode.dispose()
  }
}
