import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export interface DisciplineRepository {
    create(discipline: Omit<DisciplineDTO, 'id'>): Promise<DisciplineDTO>;
    findAll(): Promise<DisciplineDTO[]>;
    findById(id: string): Promise<DisciplineDTO | null>;
    update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO>;
    softDelete(id: string): Promise<void>;
}