import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportUseCase } from './DeleteSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';

describe('DeleteSportUseCase', () => {
    // Mock del repositorio para probar el caso de uso sin conectarnos a la base de datos.
    const mockSportRepo = {
        softDelete: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new DeleteSportUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar el deporte si existe', async () => {
        vi.mocked(mockSportRepo.softDelete).mockResolvedValueOnce(undefined);

        await useCase.execute('sport-1');

        expect(mockSportRepo.softDelete).toHaveBeenCalledWith('sport-1');
        expect(mockSportRepo.softDelete).toHaveBeenCalledOnce();
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.softDelete).mockRejectedValueOnce(
            new Error('El deporte no existe'),
        );

        await expect(useCase.execute('sport-999')).rejects.toThrow(
            'El deporte no existe',
        );

        expect(mockSportRepo.softDelete).toHaveBeenCalledWith('sport-999');
    });

    it('debe lanzar error si el deporte ya fue dado de baja', async () => {
        vi.mocked(mockSportRepo.softDelete).mockRejectedValueOnce(
            new Error('El deporte ya fue dado de baja'),
        );

        await expect(useCase.execute('sport-999')).rejects.toThrow(
            'El deporte ya fue dado de baja',
        );

        expect(mockSportRepo.softDelete).toHaveBeenCalledWith('sport-999');
    });
});