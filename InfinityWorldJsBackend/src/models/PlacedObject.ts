export interface PlacedObject {
  id: string;
  parcelId: string;
  objectId: string;
  /** Posición X local dentro de la parcela (0-99) */
  localX: number;
  /** Posición Y local dentro de la parcela (0-99) */
  localY: number;
}
