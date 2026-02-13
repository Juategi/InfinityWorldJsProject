import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { BuildingType, BuildingEra } from './Building'

/**
 * Genera meshes procedurales por época usando primitivas de Babylon.js.
 * Cada época tiene su propia función que combina cajas, cilindros, esferas, etc.
 * para crear siluetas reconocibles aunque sean placeholder.
 */

type MeshCreator = (id: string, type: BuildingType, scene: Scene) => Mesh

// ── Utilidades ────────────────────────────────────────────

function makeMaterial(id: string, color: Color3, scene: Scene, specular: number = 0.2): StandardMaterial {
  const mat = new StandardMaterial(`${id}_mat`, scene)
  mat.diffuseColor = color
  mat.specularColor = new Color3(specular, specular, specular)
  return mat
}

function darken(color: Color3, factor: number): Color3 {
  return new Color3(color.r * factor, color.g * factor, color.b * factor)
}

function lighten(color: Color3, factor: number): Color3 {
  return new Color3(
    Math.min(1, color.r + (1 - color.r) * factor),
    Math.min(1, color.g + (1 - color.g) * factor),
    Math.min(1, color.b + (1 - color.b) * factor)
  )
}

// ── Medieval ──────────────────────────────────────────────
// Estilo: tejados inclinados (pirámides), bases gruesas, piedra irregular

const createMedievalMesh: MeshCreator = (id, type, scene) => {
  const w = type.sizeX * 0.9
  const d = type.sizeZ * 0.9
  const h = type.height

  const parent = MeshBuilder.CreateBox(`${id}_base`, { width: 0.01, height: 0.01, depth: 0.01 }, scene)
  parent.isVisible = false

  if (type.category === 'nature') {
    // Árboles: tronco cilíndrico + copa esférica
    const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { height: h * 0.5, diameter: w * 0.25 }, scene)
    trunk.position = new Vector3(0, h * 0.25, 0)
    trunk.material = makeMaterial(`${id}_trunk`, darken(type.color, 0.5), scene)
    trunk.parent = parent

    const crown = MeshBuilder.CreateSphere(`${id}_crown`, { diameter: w * 0.9, segments: 8 }, scene)
    crown.position = new Vector3(0, h * 0.65, 0)
    crown.material = makeMaterial(`${id}_crown`, type.color, scene)
    crown.parent = parent
  } else if (type.category === 'decor') {
    // Decoraciones: cilindros/cajas pequeñas
    const body = MeshBuilder.CreateCylinder(`${id}_body`, { height: h, diameter: Math.min(w, d) * 0.7 }, scene)
    body.position = new Vector3(0, h / 2, 0)
    body.material = makeMaterial(id, type.color, scene)
    body.parent = parent
  } else {
    // Edificios: cuerpo + tejado triangular (prisma)
    const wallH = h * 0.65
    const body = MeshBuilder.CreateBox(`${id}_walls`, { width: w, height: wallH, depth: d }, scene)
    body.position = new Vector3(0, wallH / 2, 0)
    body.material = makeMaterial(`${id}_walls`, type.color, scene)
    body.parent = parent

    const roofH = h * 0.35
    const roof = MeshBuilder.CreateCylinder(`${id}_roof`, {
      height: d,
      diameterTop: 0,
      diameterBottom: w * 1.1,
      tessellation: 4
    }, scene)
    roof.rotation.x = Math.PI / 2
    roof.rotation.y = Math.PI / 4
    roof.position = new Vector3(0, wallH + roofH / 2, 0)
    roof.material = makeMaterial(`${id}_roof`, darken(type.color, 0.6), scene)
    roof.parent = parent
  }

  return parent as unknown as Mesh
}

// ── Colonial ──────────────────────────────────────────────
// Estilo: columnas (cilindros), techos planos, fachadas simétricas

const createColonialMesh: MeshCreator = (id, type, scene) => {
  const w = type.sizeX * 0.9
  const d = type.sizeZ * 0.9
  const h = type.height

  const parent = MeshBuilder.CreateBox(`${id}_base`, { width: 0.01, height: 0.01, depth: 0.01 }, scene)
  parent.isVisible = false

  if (type.category === 'nature') {
    // Naturaleza colonial: formas recortadas geométricas
    if (h < 1) {
      // Jardines: caja plana verde
      const garden = MeshBuilder.CreateBox(`${id}_garden`, { width: w, height: h, depth: d }, scene)
      garden.position = new Vector3(0, h / 2, 0)
      garden.material = makeMaterial(id, type.color, scene)
      garden.parent = parent
    } else {
      // Árboles: tronco + copa cónica (ciprés) o esférica
      const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { height: h * 0.4, diameter: w * 0.2 }, scene)
      trunk.position = new Vector3(0, h * 0.2, 0)
      trunk.material = makeMaterial(`${id}_trunk`, new Color3(0.4, 0.3, 0.2), scene)
      trunk.parent = parent

      const crown = MeshBuilder.CreateCylinder(`${id}_crown`, {
        height: h * 0.7,
        diameterTop: 0,
        diameterBottom: w * 0.6,
        tessellation: 8
      }, scene)
      crown.position = new Vector3(0, h * 0.6, 0)
      crown.material = makeMaterial(`${id}_crown`, type.color, scene)
      crown.parent = parent
    }
  } else if (type.category === 'decor') {
    // Decoraciones coloniales
    const body = MeshBuilder.CreateBox(`${id}_body`, { width: w * 0.7, height: h, depth: d * 0.7 }, scene)
    body.position = new Vector3(0, h / 2, 0)
    body.material = makeMaterial(id, type.color, scene)
    body.parent = parent
  } else {
    // Edificios: cuerpo principal + cornisa + columnas frontales
    const wallH = h * 0.85
    const body = MeshBuilder.CreateBox(`${id}_walls`, { width: w, height: wallH, depth: d }, scene)
    body.position = new Vector3(0, wallH / 2, 0)
    body.material = makeMaterial(`${id}_walls`, type.color, scene)
    body.parent = parent

    // Cornisa (techo plano un poco más ancho)
    const cornice = MeshBuilder.CreateBox(`${id}_cornice`, { width: w * 1.05, height: h * 0.1, depth: d * 1.05 }, scene)
    cornice.position = new Vector3(0, wallH + h * 0.05, 0)
    cornice.material = makeMaterial(`${id}_cornice`, lighten(type.color, 0.2), scene)
    cornice.parent = parent

    // Columnas frontales (si es edificio grande)
    if (type.sizeX >= 3) {
      const colH = wallH * 0.8
      for (let i = 0; i < 2; i++) {
        const col = MeshBuilder.CreateCylinder(`${id}_col${i}`, { height: colH, diameter: 0.15 }, scene)
        col.position = new Vector3((i === 0 ? -1 : 1) * (w * 0.35), colH / 2, d / 2 + 0.05)
        col.material = makeMaterial(`${id}_col`, lighten(type.color, 0.3), scene)
        col.parent = parent
      }
    }
  }

  return parent as unknown as Mesh
}

// ── Industrial ────────────────────────────────────────────
// Estilo: cajas angulares, chimeneas cilíndricas, techos tipo diente de sierra

const createIndustrialMesh: MeshCreator = (id, type, scene) => {
  const w = type.sizeX * 0.9
  const d = type.sizeZ * 0.9
  const h = type.height

  const parent = MeshBuilder.CreateBox(`${id}_base`, { width: 0.01, height: 0.01, depth: 0.01 }, scene)
  parent.isVisible = false

  if (type.category === 'nature') {
    // Naturaleza urbana
    const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { height: h * 0.5, diameter: w * 0.15 }, scene)
    trunk.position = new Vector3(0, h * 0.25, 0)
    trunk.material = makeMaterial(`${id}_trunk`, new Color3(0.35, 0.25, 0.15), scene)
    trunk.parent = parent

    const crown = MeshBuilder.CreateSphere(`${id}_crown`, { diameter: w * 0.7, segments: 6 }, scene)
    crown.position = new Vector3(0, h * 0.7, 0)
    crown.material = makeMaterial(`${id}_crown`, type.color, scene)
    crown.parent = parent
  } else if (type.category === 'decor') {
    // Decoraciones: cilindros metálicos
    const body = MeshBuilder.CreateCylinder(`${id}_body`, { height: h, diameter: Math.min(w, d) * 0.6, tessellation: 6 }, scene)
    body.position = new Vector3(0, h / 2, 0)
    body.material = makeMaterial(id, type.color, scene, 0.4)
    body.parent = parent
  } else {
    // Edificios: cuerpo rectangular + chimenea cilíndrica
    const wallH = h * 0.75
    const body = MeshBuilder.CreateBox(`${id}_walls`, { width: w, height: wallH, depth: d }, scene)
    body.position = new Vector3(0, wallH / 2, 0)
    body.material = makeMaterial(`${id}_walls`, type.color, scene, 0.3)
    body.parent = parent

    // Chimenea
    const chimH = h * 0.4
    const chimney = MeshBuilder.CreateCylinder(`${id}_chimney`, { height: chimH, diameter: 0.3 }, scene)
    chimney.position = new Vector3(w * 0.3, wallH + chimH / 2, d * 0.3)
    chimney.material = makeMaterial(`${id}_chimney`, darken(type.color, 0.5), scene)
    chimney.parent = parent
  }

  return parent as unknown as Mesh
}

// ── Moderno ───────────────────────────────────────────────
// Estilo: cristal, líneas limpias, ángulos rectos, balcones

const createModernMesh: MeshCreator = (id, type, scene) => {
  const w = type.sizeX * 0.9
  const d = type.sizeZ * 0.9
  const h = type.height

  const parent = MeshBuilder.CreateBox(`${id}_base`, { width: 0.01, height: 0.01, depth: 0.01 }, scene)
  parent.isVisible = false

  if (type.category === 'nature') {
    // Palmeras, jardines zen
    if (h > 2) {
      // Palmera: tronco curvado + corona
      const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, {
        height: h * 0.7,
        diameterTop: w * 0.1,
        diameterBottom: w * 0.18
      }, scene)
      trunk.position = new Vector3(0, h * 0.35, 0)
      trunk.material = makeMaterial(`${id}_trunk`, new Color3(0.5, 0.4, 0.25), scene)
      trunk.parent = parent

      const crown = MeshBuilder.CreateSphere(`${id}_crown`, { diameter: w * 0.8, segments: 6 }, scene)
      crown.scaling = new Vector3(1, 0.5, 1)
      crown.position = new Vector3(0, h * 0.8, 0)
      crown.material = makeMaterial(`${id}_crown`, type.color, scene)
      crown.parent = parent
    } else {
      // Jardín: plano
      const garden = MeshBuilder.CreateBox(`${id}_garden`, { width: w, height: h, depth: d }, scene)
      garden.position = new Vector3(0, h / 2, 0)
      garden.material = makeMaterial(id, type.color, scene)
      garden.parent = parent
    }
  } else if (type.category === 'decor') {
    // Decoraciones modernas: formas limpias
    const body = MeshBuilder.CreateBox(`${id}_body`, { width: w * 0.7, height: h, depth: d * 0.7 }, scene)
    body.position = new Vector3(0, h / 2, 0)
    const mat = makeMaterial(id, type.color, scene, 0.4)
    mat.alpha = type.id === 'piscina' ? 0.8 : 1
    body.material = mat
    body.parent = parent
  } else {
    // Edificios: caja limpia con ventanas (línea de contraste)
    const body = MeshBuilder.CreateBox(`${id}_walls`, { width: w, height: h, depth: d }, scene)
    body.position = new Vector3(0, h / 2, 0)
    body.material = makeMaterial(`${id}_walls`, type.color, scene, 0.4)
    body.parent = parent

    // Banda horizontal de contraste (simulando ventanas)
    const bandH = h * 0.08
    for (let i = 1; i <= Math.min(3, Math.floor(h / 1.5)); i++) {
      const band = MeshBuilder.CreateBox(`${id}_band${i}`, { width: w * 1.01, height: bandH, depth: d * 1.01 }, scene)
      band.position = new Vector3(0, i * (h / (Math.floor(h / 1.5) + 1)), 0)
      band.material = makeMaterial(`${id}_band`, darken(type.color, 0.7), scene, 0.5)
      band.parent = parent
    }
  }

  return parent as unknown as Mesh
}

// ── Futurista ─────────────────────────────────────────────
// Estilo: formas orgánicas, esferas, conos invertidos, brillos

const createFuturistMesh: MeshCreator = (id, type, scene) => {
  const w = type.sizeX * 0.9
  const d = type.sizeZ * 0.9
  const h = type.height

  const parent = MeshBuilder.CreateBox(`${id}_base`, { width: 0.01, height: 0.01, depth: 0.01 }, scene)
  parent.isVisible = false

  if (type.category === 'nature') {
    // Árboles bioluminiscentes: tronco + esfera brillante
    const trunk = MeshBuilder.CreateCylinder(`${id}_trunk`, { height: h * 0.5, diameter: w * 0.15 }, scene)
    trunk.position = new Vector3(0, h * 0.25, 0)
    trunk.material = makeMaterial(`${id}_trunk`, darken(type.color, 0.4), scene)
    trunk.parent = parent

    const crown = MeshBuilder.CreateSphere(`${id}_crown`, { diameter: w * 0.8, segments: 8 }, scene)
    crown.position = new Vector3(0, h * 0.7, 0)
    const crownMat = makeMaterial(`${id}_crown`, type.color, scene, 0.6)
    crownMat.emissiveColor = new Color3(type.color.r * 0.3, type.color.g * 0.3, type.color.b * 0.3)
    crown.material = crownMat
    crown.parent = parent
  } else if (type.category === 'decor') {
    // Decoraciones futuristas: esferas/octaedros flotantes
    const body = MeshBuilder.CreateSphere(`${id}_body`, { diameter: Math.min(w, d) * 0.7, segments: 6 }, scene)
    body.position = new Vector3(0, h / 2, 0)
    const mat = makeMaterial(id, type.color, scene, 0.6)
    mat.emissiveColor = new Color3(type.color.r * 0.2, type.color.g * 0.2, type.color.b * 0.2)
    body.material = mat
    body.parent = parent

    // Base/pedestal
    const base = MeshBuilder.CreateCylinder(`${id}_pedestal`, { height: h * 0.15, diameter: Math.min(w, d) * 0.4 }, scene)
    base.position = new Vector3(0, h * 0.075, 0)
    base.material = makeMaterial(`${id}_pedestal`, darken(type.color, 0.4), scene)
    base.parent = parent
  } else {
    // Edificios: cuerpo con cúpula o torre
    const wallH = h * 0.6
    const body = MeshBuilder.CreateCylinder(`${id}_walls`, {
      height: wallH,
      diameter: Math.min(w, d),
      tessellation: 8
    }, scene)
    body.position = new Vector3(0, wallH / 2, 0)
    const bodyMat = makeMaterial(`${id}_walls`, type.color, scene, 0.5)
    body.material = bodyMat
    body.parent = parent

    // Cúpula superior
    const dome = MeshBuilder.CreateSphere(`${id}_dome`, {
      diameter: Math.min(w, d) * 0.9,
      segments: 8,
      slice: 0.5
    }, scene)
    dome.position = new Vector3(0, wallH, 0)
    const domeMat = makeMaterial(`${id}_dome`, lighten(type.color, 0.2), scene, 0.6)
    domeMat.emissiveColor = new Color3(type.color.r * 0.15, type.color.g * 0.15, type.color.b * 0.15)
    dome.material = domeMat
    dome.parent = parent
  }

  return parent as unknown as Mesh
}

// ── Mapa de creadores por época ───────────────────────────

const ERA_MESH_CREATORS: Record<BuildingEra, MeshCreator> = {
  medieval: createMedievalMesh,
  colonial: createColonialMesh,
  industrial: createIndustrialMesh,
  moderno: createModernMesh,
  futurista: createFuturistMesh
}

/**
 * Crea un mesh procedural basado en la época del edificio.
 * Si no tiene época, devuelve null y se usa el box placeholder por defecto.
 */
export function createProceduralMesh(id: string, type: BuildingType, scene: Scene): Mesh | null {
  if (!type.era) return null
  const creator = ERA_MESH_CREATORS[type.era]
  if (!creator) return null
  return creator(id, type, scene)
}
