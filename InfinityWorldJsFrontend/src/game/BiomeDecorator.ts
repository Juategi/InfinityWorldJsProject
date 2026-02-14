import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { BiomeType } from './BiomeGenerator'
import { WORLD_CONFIG } from '../config/world'

/** Decoration item to place on a parcel */
interface DecorationDef {
  type: 'tree' | 'bush' | 'rock' | 'cactus' | 'flower' | 'snowPile' | 'mushroom' | 'reed' | 'puddle' | 'dune' | 'pine' | 'crystal' | 'log'
  scaleMin: number
  scaleMax: number
  color: Color3
  /** Optional secondary color (e.g. tree canopy) */
  color2?: Color3
}

/** Config per biome: what decorations can appear, and at what density */
const BIOME_DECORATIONS: Record<BiomeType, { density: number; items: DecorationDef[] }> = {
  prairie: {
    density: 6,
    items: [
      { type: 'flower', scaleMin: 0.3, scaleMax: 0.6, color: new Color3(0.9, 0.8, 0.1) },
      { type: 'flower', scaleMin: 0.3, scaleMax: 0.5, color: new Color3(0.9, 0.3, 0.4) },
      { type: 'bush', scaleMin: 0.8, scaleMax: 1.5, color: new Color3(0.3, 0.55, 0.2) },
      { type: 'rock', scaleMin: 0.5, scaleMax: 1.2, color: new Color3(0.55, 0.52, 0.48) },
    ],
  },
  forest: {
    density: 10,
    items: [
      { type: 'tree', scaleMin: 2.0, scaleMax: 4.5, color: new Color3(0.35, 0.22, 0.1), color2: new Color3(0.15, 0.4, 0.12) },
      { type: 'tree', scaleMin: 1.5, scaleMax: 3.5, color: new Color3(0.3, 0.2, 0.1), color2: new Color3(0.2, 0.45, 0.15) },
      { type: 'bush', scaleMin: 0.8, scaleMax: 1.8, color: new Color3(0.22, 0.45, 0.15) },
      { type: 'mushroom', scaleMin: 0.3, scaleMax: 0.7, color: new Color3(0.7, 0.25, 0.2) },
      { type: 'log', scaleMin: 1.0, scaleMax: 2.0, color: new Color3(0.35, 0.22, 0.12) },
    ],
  },
  desert: {
    density: 4,
    items: [
      { type: 'cactus', scaleMin: 1.5, scaleMax: 3.5, color: new Color3(0.25, 0.5, 0.2) },
      { type: 'rock', scaleMin: 0.8, scaleMax: 2.0, color: new Color3(0.7, 0.6, 0.4) },
      { type: 'dune', scaleMin: 2.0, scaleMax: 4.0, color: new Color3(0.82, 0.72, 0.4) },
    ],
  },
  snow: {
    density: 6,
    items: [
      { type: 'pine', scaleMin: 2.5, scaleMax: 5.0, color: new Color3(0.3, 0.18, 0.08), color2: new Color3(0.85, 0.92, 0.95) },
      { type: 'snowPile', scaleMin: 1.0, scaleMax: 2.5, color: new Color3(0.9, 0.93, 0.96) },
      { type: 'rock', scaleMin: 0.6, scaleMax: 1.5, color: new Color3(0.6, 0.62, 0.65) },
      { type: 'crystal', scaleMin: 0.5, scaleMax: 1.2, color: new Color3(0.7, 0.85, 0.95) },
    ],
  },
  mountain: {
    density: 7,
    items: [
      { type: 'rock', scaleMin: 1.5, scaleMax: 4.0, color: new Color3(0.5, 0.48, 0.44) },
      { type: 'rock', scaleMin: 0.8, scaleMax: 2.0, color: new Color3(0.58, 0.55, 0.5) },
      { type: 'rock', scaleMin: 0.5, scaleMax: 1.0, color: new Color3(0.45, 0.43, 0.4) },
      { type: 'crystal', scaleMin: 0.4, scaleMax: 0.8, color: new Color3(0.6, 0.55, 0.7) },
    ],
  },
  swamp: {
    density: 8,
    items: [
      { type: 'puddle', scaleMin: 2.0, scaleMax: 4.0, color: new Color3(0.15, 0.25, 0.12) },
      { type: 'reed', scaleMin: 1.0, scaleMax: 2.5, color: new Color3(0.35, 0.4, 0.2) },
      { type: 'log', scaleMin: 1.2, scaleMax: 2.5, color: new Color3(0.25, 0.18, 0.1) },
      { type: 'mushroom', scaleMin: 0.3, scaleMax: 0.8, color: new Color3(0.5, 0.45, 0.3) },
      { type: 'bush', scaleMin: 0.6, scaleMax: 1.2, color: new Color3(0.2, 0.3, 0.12) },
    ],
  },
}

/**
 * Deterministic PRNG seeded by parcel coordinates.
 * Returns a function that produces values in [0, 1).
 */
function parcelRng(px: number, py: number): () => number {
  // Mix coordinates into a seed
  let h = (px * 374761393 + py * 668265263 + 1013904223) | 0
  return () => {
    h |= 0
    h = h + 0x6D2B79F5 | 0
    let t = Math.imul(h ^ h >>> 15, 1 | h)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/** Generate a decoration mesh based on its type */
function createDecorationMesh(
  scene: Scene,
  name: string,
  def: DecorationDef,
  scale: number,
  worldX: number,
  worldZ: number
): Mesh {
  const mat = new StandardMaterial(`${name}_mat`, scene)
  mat.diffuseColor = def.color
  mat.specularColor = new Color3(0.05, 0.05, 0.05)

  let root: Mesh

  switch (def.type) {
    case 'tree': {
      // Trunk (cylinder) + canopy (sphere)
      const trunk = MeshBuilder.CreateCylinder(`${name}_trunk`, {
        height: scale * 2,
        diameter: scale * 0.4,
      }, scene)
      trunk.position = new Vector3(worldX, scale, worldZ)
      trunk.material = mat

      const canopy = MeshBuilder.CreateSphere(`${name}_canopy`, {
        diameter: scale * 2.2,
        segments: 6,
      }, scene)
      canopy.position = new Vector3(worldX, scale * 2.3, worldZ)
      const canopyMat = new StandardMaterial(`${name}_canopy_mat`, scene)
      canopyMat.diffuseColor = def.color2 ?? new Color3(0.2, 0.5, 0.15)
      canopyMat.specularColor = new Color3(0.05, 0.05, 0.05)
      canopy.material = canopyMat
      canopy.parent = null
      canopy.isPickable = false
      trunk.isPickable = false

      // Use trunk as root, attach canopy
      canopy.parent = trunk
      canopy.position = new Vector3(0, scale * 1.3, 0)
      root = trunk
      break
    }

    case 'pine': {
      // Trunk + cone canopy (snowy pine)
      const trunk = MeshBuilder.CreateCylinder(`${name}_trunk`, {
        height: scale * 2,
        diameter: scale * 0.3,
      }, scene)
      trunk.position = new Vector3(worldX, scale, worldZ)
      trunk.material = mat

      const cone = MeshBuilder.CreateCylinder(`${name}_cone`, {
        height: scale * 2.5,
        diameterTop: 0,
        diameterBottom: scale * 2,
        tessellation: 6,
      }, scene)
      const coneMat = new StandardMaterial(`${name}_cone_mat`, scene)
      coneMat.diffuseColor = def.color2 ?? new Color3(0.85, 0.9, 0.95)
      coneMat.specularColor = new Color3(0.1, 0.1, 0.1)
      cone.material = coneMat
      cone.parent = trunk
      cone.position = new Vector3(0, scale * 1.8, 0)
      cone.isPickable = false
      trunk.isPickable = false
      root = trunk
      break
    }

    case 'bush': {
      root = MeshBuilder.CreateSphere(name, {
        diameter: scale,
        segments: 5,
      }, scene)
      root.scaling.y = 0.6
      root.position = new Vector3(worldX, scale * 0.25, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    case 'rock': {
      root = MeshBuilder.CreatePolyhedron(name, {
        size: scale * 0.5,
        type: 1, // octahedron - rocky look
      }, scene)
      root.scaling.y = 0.6
      root.position = new Vector3(worldX, scale * 0.2, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    case 'cactus': {
      // Main trunk
      root = MeshBuilder.CreateCylinder(name, {
        height: scale * 2,
        diameter: scale * 0.5,
      }, scene)
      root.position = new Vector3(worldX, scale, worldZ)
      root.material = mat
      root.isPickable = false

      // Arm
      const arm = MeshBuilder.CreateCylinder(`${name}_arm`, {
        height: scale * 0.8,
        diameter: scale * 0.3,
      }, scene)
      arm.parent = root
      arm.position = new Vector3(scale * 0.3, scale * 0.3, 0)
      arm.rotation.z = Math.PI / 3
      arm.material = mat
      arm.isPickable = false
      break
    }

    case 'flower': {
      // Thin stem + small colored sphere on top
      root = MeshBuilder.CreateCylinder(`${name}_stem`, {
        height: scale,
        diameter: scale * 0.1,
      }, scene)
      const stemMat = new StandardMaterial(`${name}_stem_mat`, scene)
      stemMat.diffuseColor = new Color3(0.2, 0.5, 0.15)
      stemMat.specularColor = new Color3(0, 0, 0)
      root.material = stemMat
      root.position = new Vector3(worldX, scale * 0.5, worldZ)
      root.isPickable = false

      const petal = MeshBuilder.CreateSphere(`${name}_petal`, {
        diameter: scale * 0.5,
        segments: 4,
      }, scene)
      petal.parent = root
      petal.position = new Vector3(0, scale * 0.5, 0)
      petal.material = mat
      petal.isPickable = false
      break
    }

    case 'snowPile': {
      root = MeshBuilder.CreateSphere(name, {
        diameter: scale,
        segments: 5,
      }, scene)
      root.scaling.y = 0.35
      root.position = new Vector3(worldX, scale * 0.1, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    case 'mushroom': {
      // Stem + cap
      root = MeshBuilder.CreateCylinder(`${name}_stem`, {
        height: scale * 0.6,
        diameter: scale * 0.2,
      }, scene)
      const mStemMat = new StandardMaterial(`${name}_stem_mat`, scene)
      mStemMat.diffuseColor = new Color3(0.85, 0.82, 0.7)
      mStemMat.specularColor = new Color3(0, 0, 0)
      root.material = mStemMat
      root.position = new Vector3(worldX, scale * 0.3, worldZ)
      root.isPickable = false

      const cap = MeshBuilder.CreateSphere(`${name}_cap`, {
        diameter: scale * 0.7,
        segments: 5,
      }, scene)
      cap.scaling.y = 0.4
      cap.parent = root
      cap.position = new Vector3(0, scale * 0.35, 0)
      cap.material = mat
      cap.isPickable = false
      break
    }

    case 'reed': {
      root = MeshBuilder.CreateCylinder(name, {
        height: scale * 1.5,
        diameter: scale * 0.08,
      }, scene)
      root.position = new Vector3(worldX, scale * 0.75, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    case 'puddle': {
      root = MeshBuilder.CreateDisc(name, {
        radius: scale,
        tessellation: 12,
      }, scene)
      root.rotation.x = Math.PI / 2
      root.position = new Vector3(worldX, 0.05, worldZ)
      mat.alpha = 0.6
      root.material = mat
      root.isPickable = false
      break
    }

    case 'dune': {
      root = MeshBuilder.CreateSphere(name, {
        diameter: scale * 2,
        segments: 5,
      }, scene)
      root.scaling.y = 0.25
      root.position = new Vector3(worldX, scale * 0.15, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    case 'crystal': {
      root = MeshBuilder.CreateCylinder(name, {
        height: scale * 1.2,
        diameterTop: 0,
        diameterBottom: scale * 0.4,
        tessellation: 5,
      }, scene)
      root.position = new Vector3(worldX, scale * 0.6, worldZ)
      mat.emissiveColor = def.color.scale(0.2)
      mat.alpha = 0.85
      root.material = mat
      root.isPickable = false
      break
    }

    case 'log': {
      root = MeshBuilder.CreateCylinder(name, {
        height: scale * 2,
        diameter: scale * 0.35,
      }, scene)
      root.rotation.z = Math.PI / 2
      root.position = new Vector3(worldX, scale * 0.18, worldZ)
      root.material = mat
      root.isPickable = false
      break
    }

    default: {
      root = MeshBuilder.CreateBox(name, { size: scale * 0.5 }, scene)
      root.position = new Vector3(worldX, scale * 0.25, worldZ)
      root.material = mat
      root.isPickable = false
    }
  }

  return root
}

/**
 * Generate decorations for a parcel deterministically.
 * At biome borders, a portion of decorations come from neighboring biomes.
 * Returns an array of root meshes that can be disposed when the parcel is unloaded.
 */
export function generateDecorations(
  scene: Scene,
  parcelX: number,
  parcelY: number,
  biome: BiomeType,
  neighborBiomes?: BiomeType[]
): Mesh[] {
  const config = BIOME_DECORATIONS[biome]
  const rng = parcelRng(parcelX, parcelY)
  const meshes: Mesh[] = []

  // Collect unique different neighbor biomes for border mixing
  const borderBiomes: BiomeType[] = []
  if (neighborBiomes) {
    for (const nb of neighborBiomes) {
      if (nb !== biome && !borderBiomes.includes(nb)) {
        borderBiomes.push(nb)
      }
    }
  }
  const isBorder = borderBiomes.length > 0

  // At borders: reduce main biome density, add a few from neighbor biomes
  const mainDensity = isBorder ? Math.ceil(config.density * 0.65) : config.density
  const borderDensity = isBorder ? Math.ceil(config.density * 0.35) : 0

  const size = WORLD_CONFIG.PARCEL_SIZE
  const worldOffX = parcelX * size
  const worldOffZ = parcelY * size
  const margin = 5

  // Main biome decorations
  for (let i = 0; i < mainDensity; i++) {
    const itemIdx = Math.floor(rng() * config.items.length)
    const def = config.items[itemIdx]

    const localX = margin + rng() * (size - margin * 2)
    const localZ = margin + rng() * (size - margin * 2)
    const worldX = worldOffX + localX
    const worldZ = worldOffZ + localZ

    const scale = def.scaleMin + rng() * (def.scaleMax - def.scaleMin)

    const name = `deco_${parcelX}_${parcelY}_${i}`
    const mesh = createDecorationMesh(scene, name, def, scale, worldX, worldZ)
    meshes.push(mesh)
  }

  // Border biome decorations (from neighboring biomes)
  for (let i = 0; i < borderDensity; i++) {
    const borderBiome = borderBiomes[Math.floor(rng() * borderBiomes.length)]
    const borderConfig = BIOME_DECORATIONS[borderBiome]
    const itemIdx = Math.floor(rng() * borderConfig.items.length)
    const def = borderConfig.items[itemIdx]

    const localX = margin + rng() * (size - margin * 2)
    const localZ = margin + rng() * (size - margin * 2)
    const worldX = worldOffX + localX
    const worldZ = worldOffZ + localZ

    const scale = def.scaleMin + rng() * (def.scaleMax - def.scaleMin)

    const name = `deco_${parcelX}_${parcelY}_b${i}`
    const mesh = createDecorationMesh(scene, name, def, scale, worldX, worldZ)
    meshes.push(mesh)
  }

  return meshes
}
