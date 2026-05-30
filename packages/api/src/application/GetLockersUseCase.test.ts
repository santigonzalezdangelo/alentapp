import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetLockersUseCase } from './GetLockersUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('GetLockersUseCase', () => {
    const mockLockerRepo = {
        findAll: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new GetLockersUseCase(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de lockers', async () => {
        const mockLockers = [
            {
                id: '1',
                number: 10,
                location: 'MALE',
            },
            {
                id: '2',
                number: 20,
                location: 'FEMALE',
            },
        ];

        vi.mocked(mockLockerRepo.findAll)
            .mockResolvedValueOnce(mockLockers as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockLockers);
        expect(mockLockerRepo.findAll).toHaveBeenCalledOnce();
    });

    it('debe retornar una lista vacía si no hay lockers', async () => {
        vi.mocked(mockLockerRepo.findAll)
            .mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockLockerRepo.findAll).toHaveBeenCalledOnce();
    });
});