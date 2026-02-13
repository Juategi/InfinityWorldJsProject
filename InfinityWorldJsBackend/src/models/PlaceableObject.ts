export interface PlaceableObject {
  id: string;
  name: string;
  sizeX: number;
  sizeY: number;
  category: string | null;
  era: string | null;
  price: number;
  isFree: boolean;
  description: string | null;
}
