import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDisciplinesUseCase } from './GetDisciplinesUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';

describe('GetDisciplinesUseCase', () => {
    const mockDisciplineRepo = {
        findAll: vi.fn(),
    } as unknown as DisciplineRepository;

    const useCase = new GetDisciplinesUseCase(mockDisciplineRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de disciplinas', async () => {
        const mockDisciplines = [{ id: '1', reason: 'Falta de respeto' }, { id: '2', reason: 'Violencia' }];
        vi.mocked(mockDisciplineRepo.findAll).mockResolvedValueOnce(mockDisciplines as any);

        const result = await useCase.execute();
        expect(result).toEqual(mockDisciplines);
        expect(mockDisciplineRepo.findAll).toHaveBeenCalledOnce();
    }
    );

    it('debe retornar una lista vacía si no hay sanciones', async () => {
        vi.mocked(mockDisciplineRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockDisciplineRepo.findAll).toHaveBeenCalledOnce();
    });
});