import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDisciplineUseCase } from './CreateDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { CreateDisciplineRequest } from '@alentapp/shared';
import { CreateMemberRequest } from '@alentapp/shared';

describe('CreateDisciplineUseCase', () => {
    // 1. Creamos Mocks de nuestras dependencias (Puertos y Servicios)
    const mockDisciplineRepo = {
        create: vi.fn(),
    } as unknown as DisciplineRepository;

    const mockDisciplineValidator = {
        validateRequiredFields: vi.fn(),
        validateReason: vi.fn(),
        validateIsTotalSuspension: vi.fn(),
        validateMemberExists: vi.fn(),
        validateDateFormat: vi.fn(),
        validateEndDateAfterStartDate: vi.fn(),
    } as unknown as DisciplineValidator;

    // 2. Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateDisciplineUseCase(mockDisciplineRepo, mockDisciplineValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear una sanción exitosamente si el socio existe y pasa validaciones', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Conducta antideportiva',
            start_date: '2026-05-01T00:00:00.000Z',
            end_date: '2026-05-10T00:00:00.000Z',
            is_total_suspension: true,
            member_id: 'member-1',
        };

        const mockCreatedDiscipline = {
            id: 'discipline-uuid-1',
            ...mockRequest,
            deleted_at: null,
        };

        vi.mocked(mockDisciplineValidator.validateMemberExists).mockResolvedValueOnce(undefined);
        vi.mocked(mockDisciplineRepo.create).mockResolvedValueOnce(mockCreatedDiscipline);

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones
        expect(mockDisciplineValidator.validateRequiredFields).toHaveBeenCalledWith(mockRequest);
        expect(mockDisciplineValidator.validateReason).toHaveBeenCalledWith(mockRequest.reason);
        expect(mockDisciplineValidator.validateIsTotalSuspension).toHaveBeenCalledWith(mockRequest.is_total_suspension);
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.start_date);
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.end_date);
        expect(mockDisciplineValidator.validateEndDateAfterStartDate).toHaveBeenCalledWith(mockRequest.start_date, mockRequest.end_date);
        expect(mockDisciplineValidator.validateMemberExists).toHaveBeenCalledWith(mockRequest.member_id);

        expect(mockDisciplineRepo.create).toHaveBeenCalledWith({
            ...mockRequest,
            deleted_at: null,
        });

        expect(result).toEqual(mockCreatedDiscipline);
    });

    it('debe lanzar un error si el socio no existe', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Daño de materiales',
            start_date: '2026-05-01T00:00:00.000Z',
            end_date: '2026-05-10T00:00:00.000Z',
            is_total_suspension: true,
            member_id: 'member-nonexistent',
        };

        vi.mocked(mockDisciplineValidator.validateMemberExists).mockRejectedValueOnce(new Error('El socio no existe'));

        await expect(useCase.execute(mockRequest)).rejects.toThrow('El socio no existe');

        expect(mockDisciplineValidator.validateMemberExists).toHaveBeenCalledWith(mockRequest.member_id);
        expect(mockDisciplineRepo.create).not.toHaveBeenCalled();
    });
});