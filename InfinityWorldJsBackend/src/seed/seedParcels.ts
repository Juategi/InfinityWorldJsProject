import { IParcelRepository, IPlayerRepository } from "../repositories/interfaces";

export async function seedWorld(
  playerRepo: IPlayerRepository,
  parcelRepo: IParcelRepository
): Promise<void> {
  // Crear jugador principal
  let player = await playerRepo.findByName("Player1");

  if (!player) {
    player = await playerRepo.create({ name: "Player1", coins: 500 });
    console.log(`👤 Created player: ${player.name} (${player.id})`);
  }

  // Crear parcela central (0,0) asignada al jugador
  let parcel = await parcelRepo.findAtPosition(0, 0);

  if (!parcel) {
    parcel = await parcelRepo.create({
      ownerId: player.id,
      x: 0,
      y: 0,
    });
    console.log(`🏠 Created parcel (0,0) for ${player.name}`);
  }

  console.log(`🌍 World initialized: 1 player, 1 parcel`);
}
