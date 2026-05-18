import { SportRepository } from '../domain/SportRepository.js';

export class DeleteSportUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    // Retorna void, porque softDelete no devuelve SportDTO
    async execute(id: string): Promise<void> {
        await this.sportRepo.softDelete(id);
    }
}