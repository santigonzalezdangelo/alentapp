import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteDisciplineUseCase } from './DeleteDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO } from '@alentapp/shared';

describe('DeleteDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        findById: vi.fn(),
        softDelete: vi.fn(),
    } as unknown as DisciplineRepository;

    const useCase = new DeleteDisciplineUseCase(mockDisciplineRepo);


    const mockExistingDiscipline: DisciplineDTO = {
        id: 'discipline-1',
        reason: 'Conducta inapropiada',
        start_date: '2026-05-01T00:00:00.000Z',
        end_date: '2026-05-10T00:00:00.000Z',
        is_total_suspension: false,
        deleted_at: null,
        member_id: 'member-1',
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si la sanción no existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('discipline-999')).rejects.toThrow('La sanción no existe');

        expect(mockDisciplineRepo.softDelete).not.toHaveBeenCalled();
    });

    it('debe eliminar la sanción si existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(mockExistingDiscipline);

        await useCase.execute('discipline-1');

        expect(mockDisciplineRepo.findById).toHaveBeenCalledWith('discipline-1');
        expect(mockDisciplineRepo.softDelete).toHaveBeenCalledWith('discipline-1');
    });

    it('debe lanzar error si la sanción ya fue eliminada', async () => {
        const deletedDiscipline = { ...mockExistingDiscipline, deleted_at: '2026-05-05T00:00:00.000Z' };
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(deletedDiscipline);

        await expect(useCase.execute('discipline-1')).rejects.toThrow('La sanción ya fue eliminada');
        
        expect(mockDisciplineRepo.softDelete).not.toHaveBeenCalled();
    });
});