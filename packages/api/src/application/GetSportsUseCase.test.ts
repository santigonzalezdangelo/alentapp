import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';

describe('GetSportsUseCase', () => {
    const mockSportRepo = {
        findAllActive: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new GetSportsUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de deportes', async () => {
        const mockSports = [
            { id: '1', name: 'Tenis' },
            { id: '2', name: 'Natación' },
        ];

        vi.mocked(mockSportRepo.findAllActive).mockResolvedValueOnce(mockSports as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockSports);
        expect(mockSportRepo.findAllActive).toHaveBeenCalledOnce();
    });

    it('debe retornar una lista vacía si no hay deportes activos', async () => {
        vi.mocked(mockSportRepo.findAllActive).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockSportRepo.findAllActive).toHaveBeenCalledOnce();
    });
});