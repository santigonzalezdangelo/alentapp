import { DisciplineRepository } from '../domain/DisciplineRepository.js';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: DisciplineRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            throw new Error('Formato de ID inválido');
        }

        const existingDiscipline = await this.disciplineRepository.findById(id);

        if (!existingDiscipline) {
            throw new Error('La sanción no existe');
        }

        if (existingDiscipline.deleted_at !== null) {
            throw new Error('La sanción ya fue eliminada');
        }

        await this.disciplineRepository.softDelete(id);
    }
}