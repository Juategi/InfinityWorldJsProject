import { Repositories } from "../repositories/factory";
import { SYSTEM_PARCELS } from "../config/system";

/**
 * Layout definition for each system parcel.
 * localX/localY are grid positions within the 100×100 parcel.
 * Objects are positioned ensuring no overlap based on sizeX/sizeY.
 */
interface Placement {
  objectName: string;
  localX: number;
  localY: number;
}

// ── Parcela (0,0) — Plaza Central ──────────────────────────
// Mix of colonial buildings forming a town square
const PLAZA_CENTRAL: Placement[] = [
  // Ayuntamiento (4×3) at the north
  { objectName: "Ayuntamiento", localX: 48, localY: 10 },
  // Fuente clásica (2×2) in the center
  { objectName: "Fuente clásica", localX: 49, localY: 49 },
  // Banco de hierro (1×1) around the fountain
  { objectName: "Banco de hierro", localX: 47, localY: 49 },
  { objectName: "Banco de hierro", localX: 52, localY: 49 },
  { objectName: "Banco de hierro", localX: 49, localY: 47 },
  { objectName: "Banco de hierro", localX: 49, localY: 52 },
  // Farola de gas (1×1) corners of the plaza
  { objectName: "Farola de gas", localX: 40, localY: 40 },
  { objectName: "Farola de gas", localX: 60, localY: 40 },
  { objectName: "Farola de gas", localX: 40, localY: 60 },
  { objectName: "Farola de gas", localX: 60, localY: 60 },
  // Reloj de sol (1×1)
  { objectName: "Reloj de sol", localX: 55, localY: 45 },
  // Biblioteca (3×3)
  { objectName: "Biblioteca", localX: 20, localY: 48 },
  // Mercado (3×2)
  { objectName: "Mercado", localX: 75, localY: 48 },
  // Jardín formal (2×2)
  { objectName: "Jardín formal", localX: 48, localY: 75 },
  // Seto recortado borders
  { objectName: "Seto recortado", localX: 44, localY: 75 },
  { objectName: "Seto recortado", localX: 53, localY: 75 },
  // Ciprés trees
  { objectName: "Ciprés", localX: 30, localY: 30 },
  { objectName: "Ciprés", localX: 70, localY: 30 },
];

// ── Parcela (1,0) — Barrio Medieval ───────────────────────
const BARRIO_MEDIEVAL: Placement[] = [
  // Castillo (5×5) as centerpiece
  { objectName: "Castillo", localX: 45, localY: 45 },
  // Torre de vigilancia (2×2)
  { objectName: "Torre de vigilancia", localX: 20, localY: 20 },
  // Herrería (3×3)
  { objectName: "Herrería", localX: 70, localY: 25 },
  // Casas de madera (2×2) village area
  { objectName: "Casa de madera", localX: 15, localY: 55 },
  { objectName: "Casa de madera", localX: 15, localY: 65 },
  { objectName: "Casa de madera", localX: 25, localY: 55 },
  // Taberna (3×2)
  { objectName: "Taberna", localX: 70, localY: 55 },
  // Iglesia medieval (3×4)
  { objectName: "Iglesia medieval", localX: 70, localY: 70 },
  // Pozo de agua (1×1)
  { objectName: "Pozo de agua", localX: 50, localY: 65 },
  // Antorchas (1×1) around the castle
  { objectName: "Antorcha", localX: 43, localY: 43 },
  { objectName: "Antorcha", localX: 52, localY: 43 },
  { objectName: "Antorcha", localX: 43, localY: 52 },
  { objectName: "Antorcha", localX: 52, localY: 52 },
  // Muralla sections around the village
  { objectName: "Muralla de piedra", localX: 10, localY: 10 },
  { objectName: "Muralla de piedra", localX: 11, localY: 10 },
  { objectName: "Muralla de piedra", localX: 12, localY: 10 },
  // Barril near tavern
  { objectName: "Barril", localX: 74, localY: 55 },
  // Carreta (2×1)
  { objectName: "Carreta", localX: 35, localY: 70 },
  // Roble grande (2×2)
  { objectName: "Roble grande", localX: 80, localY: 15 },
];

// ── Parcela (0,1) — Zona Moderna ──────────────────────────
const ZONA_MODERNA: Placement[] = [
  // Rascacielos pequeño (3×3)
  { objectName: "Rascacielos pequeño", localX: 48, localY: 20 },
  // Hospital (4×3)
  { objectName: "Hospital", localX: 20, localY: 20 },
  // Casa moderna (3×2)
  { objectName: "Casa moderna", localX: 70, localY: 25 },
  { objectName: "Casa moderna", localX: 70, localY: 35 },
  // Gasolinera (3×2)
  { objectName: "Gasolinera", localX: 20, localY: 60 },
  // Parada de bus (2×1)
  { objectName: "Parada de bus", localX: 50, localY: 55 },
  // Semáforo (1×1)
  { objectName: "Semáforo", localX: 45, localY: 55 },
  { objectName: "Semáforo", localX: 55, localY: 45 },
  // Jardín zen (2×2)
  { objectName: "Jardín zen", localX: 75, localY: 70 },
  // Palmera
  { objectName: "Palmera", localX: 65, localY: 60 },
  { objectName: "Palmera", localX: 35, localY: 75 },
  // Contenedor (1×1)
  { objectName: "Contenedor", localX: 25, localY: 55 },
  // Comisaría (3×3)
  { objectName: "Comisaría", localX: 48, localY: 70 },
];

// ── Parcela (1,1) — Distrito Futurista ────────────────────
const DISTRITO_FUTURISTA: Placement[] = [
  // Torre de energía (2×2)
  { objectName: "Torre de energía", localX: 20, localY: 20 },
  // Cúpula habitable (4×4)
  { objectName: "Cúpula habitable", localX: 45, localY: 45 },
  // Laboratorio cuántico (3×3)
  { objectName: "Laboratorio cuántico", localX: 70, localY: 20 },
  // Holograma proyector (1×1)
  { objectName: "Holograma proyector", localX: 50, localY: 30 },
  { objectName: "Holograma proyector", localX: 30, localY: 50 },
  // Módulo residencial (2×3)
  { objectName: "Módulo residencial", localX: 15, localY: 55 },
  { objectName: "Módulo residencial", localX: 15, localY: 70 },
  // Robot guardián (1×1)
  { objectName: "Robot guardián", localX: 42, localY: 42 },
  // Cristal energético (1×1)
  { objectName: "Cristal energético", localX: 55, localY: 55 },
  { objectName: "Cristal energético", localX: 60, localY: 65 },
  // Árbol bioluminiscente (1×1)
  { objectName: "Árbol bioluminiscente", localX: 80, localY: 70 },
  { objectName: "Árbol bioluminiscente", localX: 75, localY: 80 },
  // Jardín hidropónico (2×2)
  { objectName: "Jardín hidropónico", localX: 70, localY: 70 },
  // Hangar de naves (4×3)
  { objectName: "Hangar de naves", localX: 45, localY: 80 },
];

const PARCEL_LAYOUTS: Record<string, Placement[]> = {
  "0,0": PLAZA_CENTRAL,
  "1,0": BARRIO_MEDIEVAL,
  "0,1": ZONA_MODERNA,
  "1,1": DISTRITO_FUTURISTA,
};

export async function seedCity(repos: Repositories): Promise<void> {
  // Build a name → id lookup from catalog
  const allObjects = await repos.placeableObject.findAll();
  const nameToId = new Map<string, string>();
  for (const obj of allObjects) {
    nameToId.set(obj.name, obj.id);
  }

  let totalPlaced = 0;
  let skippedMissing = 0;

  for (const sp of SYSTEM_PARCELS) {
    const key = `${sp.x},${sp.y}`;
    const layout = PARCEL_LAYOUTS[key];
    if (!layout) continue;

    // Find the parcel in DB
    const parcel = await repos.parcel.findAtPosition(sp.x, sp.y);
    if (!parcel) {
      console.log(`⚠️ System parcel (${sp.x},${sp.y}) not found — skipping`);
      continue;
    }

    // Check if already seeded (has placed objects)
    const existing = await repos.placedObject.findByParcelId(parcel.id);
    if (existing.length > 0) {
      console.log(`📦 Parcel (${sp.x},${sp.y}) already has ${existing.length} objects — skipping`);
      continue;
    }

    for (const placement of layout) {
      const objectId = nameToId.get(placement.objectName);
      if (!objectId) {
        console.log(`⚠️ Object "${placement.objectName}" not found in catalog`);
        skippedMissing++;
        continue;
      }

      await repos.placedObject.create({
        parcelId: parcel.id,
        objectId,
        localX: placement.localX,
        localY: placement.localY,
      });
      totalPlaced++;
    }
  }

  console.log(
    `🏙️ City seeded: ${totalPlaced} objects placed${skippedMissing > 0 ? `, ${skippedMissing} skipped (missing)` : ""}`
  );
}
