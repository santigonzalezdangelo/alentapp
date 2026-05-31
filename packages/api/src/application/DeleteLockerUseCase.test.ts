import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('DeleteLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new DeleteLockerUseCase(mockLockerRepo);

    const availableLocker = {
        id: 'locker-1',
        number: 10,
        location: 'MALE',
        status: 'AVAILABLE',
        member_id: null,
        contract_end_date: null,
    };

    const occupiedLocker = {
        ...availableLocker,
        status: 'OCCUPIED',
        member_id: 'member-1',
    };

    const maintenanceLocker = {
        ...availableLocker,
        status: 'MAINTENANCE',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar un locker disponible correctamente', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(availableLocker as any);
        vi.mocked(mockLockerRepo.delete).mockResolvedValueOnce(undefined);

        await useCase.execute('locker-1');

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.delete).toHaveBeenCalledWith('locker-1');
    });

    it('debe eliminar un locker en mantenimiento correctamente', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(maintenanceLocker as any);
        vi.mocked(mockLockerRepo.delete).mockResolvedValueOnce(undefined);

        await useCase.execute('locker-1');

        expect(mockLockerRepo.delete).toHaveBeenCalledWith('locker-1');
    });

    it('debe lanzar error si el locker no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-inexistente')
        ).rejects.toThrow('El locker no existe');

        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el locker está ocupado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(occupiedLocker as any);

        await expect(
            useCase.execute('locker-1')
        ).rejects.toThrow('No se puede eliminar un locker ocupado');

        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });
});