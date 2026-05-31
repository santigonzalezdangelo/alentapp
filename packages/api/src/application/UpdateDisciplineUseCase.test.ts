import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateDisciplineUseCase } from './UpdateDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { UpdateDisciplineRequest, DisciplineDTO } from '@alentapp/shared';

describe('UpdateDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as DisciplineRepository;

    const mockDisciplineValidator = {
        validateHasUpdateFields: vi.fn(),
        validateMemberIdIsNotPresent: vi.fn(),
        validateUpdateReason: vi.fn(),
        validateUpdateIsTotalSuspension: vi.fn(),
        validateUpdateDateFormat: vi.fn(),
        validateEndDateAfterStartDate: vi.fn(),
    } as unknown as DisciplineValidator;

    const useCase = new UpdateDisciplineUseCase(mockDisciplineRepo, mockDisciplineValidator);

    const mockExistingDiscipline: DisciplineDTO = {
        id: 'uuid-1',
        reason: 'Motivo original',     
        start_date: '2026-01-01',
        end_date: '2026-01-10',
        is_total_suspension: false,
        deleted_at: null,
        member_id: 'member-uuid',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValue(mockExistingDiscipline);
    });

    it('debe actualizar una sanción correctamente si los datos enviados fueron validados', async () => {
        const updateData: UpdateDisciplineRequest = { reason: 'Nuevo motivo', start_date: '2026-01-05' };
        const updatedDiscipline: DisciplineDTO = { 
            ...mockExistingDiscipline, 
            ...updateData,
        };

        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce(updatedDiscipline);

        const result = await useCase.execute('uuid-1', updateData);

        expect(mockDisciplineRepo.findById).toHaveBeenCalledWith('uuid-1');

        expect(mockDisciplineValidator.validateHasUpdateFields).toHaveBeenCalledWith(updateData);
        expect(mockDisciplineValidator.validateMemberIdIsNotPresent).toHaveBeenCalledWith(updateData);
        expect(mockDisciplineValidator.validateUpdateReason).toHaveBeenCalledWith(updateData.reason);
        expect(mockDisciplineValidator.validateUpdateIsTotalSuspension).toHaveBeenCalledWith(updateData.is_total_suspension);
        expect(mockDisciplineValidator.validateUpdateDateFormat)
            .toHaveBeenCalledWith(updateData.start_date);
        expect(mockDisciplineValidator.validateUpdateDateFormat)
            .toHaveBeenCalledWith(undefined);
        expect(mockDisciplineValidator.validateEndDateAfterStartDate).toHaveBeenCalledWith(updateData.start_date, mockExistingDiscipline.end_date);
        
        expect(mockDisciplineRepo.update).toHaveBeenCalledWith('uuid-1', updateData);
        expect(result).toEqual(updatedDiscipline);
    });

    it('debe lanzar error si la fecha de fin es anterior a la fecha de inicio', async () => {
        const updateData: UpdateDisciplineRequest = {
            start_date: '2026-01-10',
            end_date: '2026-01-01',
        };

        vi.mocked(mockDisciplineValidator.validateEndDateAfterStartDate).mockImplementationOnce(() => {
            throw new Error('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');
        });

        await expect(useCase.execute('uuid-1', updateData)).rejects.toThrow('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');

        expect(mockDisciplineValidator.validateEndDateAfterStartDate).toHaveBeenCalledWith('2026-01-10', '2026-01-01');

        expect(mockDisciplineRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta actualizar una sanción eliminada', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce({ ...mockExistingDiscipline, deleted_at: '2026-02-01T00:00:00.000Z' });
        await expect(useCase.execute('uuid-1', {})).rejects.toThrow('No se puede modificar una sanción eliminada');
    });

    it('debe lanzar error si la sanción no existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-no-existe', {})).rejects.toThrow('La sanción no existe');
    });
});