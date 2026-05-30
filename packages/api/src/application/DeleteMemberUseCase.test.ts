import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMemberUseCase } from './DeleteMemberUseCase.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('DeleteMemberUseCase', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as MemberRepository;

    const mockLockerRepo = {
        releaseByMemberId: vi.fn().mockResolvedValue(undefined),
    } as unknown as LockerRepository;

    const useCase = new DeleteMemberUseCase(mockMemberRepo, mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
        // Resetear el mock de lockerRepo al default después de clearAllMocks
        vi.mocked(mockLockerRepo.releaseByMemberId).mockResolvedValue(undefined);
    });

    it('debe lanzar error si el miembro no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-999')).rejects.toThrow('El miembro no existe');

        // Ni los lockers ni el delete deben ejecutarse si el miembro no existe
        expect(mockLockerRepo.releaseByMemberId).not.toHaveBeenCalled();
        expect(mockMemberRepo.delete).not.toHaveBeenCalled();
    });

    it('debe liberar los lockers del miembro antes de eliminarlo', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'uuid-1' } as any);

        await useCase.execute('uuid-1');

        expect(mockLockerRepo.releaseByMemberId).toHaveBeenCalledWith('uuid-1');
    });

    it('debe eliminar el miembro si existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'uuid-1' } as any);

        await useCase.execute('uuid-1');

        expect(mockMemberRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('debe liberar los lockers antes de eliminar (orden correcto)', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'uuid-1' } as any);

        const callOrder: string[] = [];
        vi.mocked(mockLockerRepo.releaseByMemberId).mockImplementationOnce(async () => {
            callOrder.push('releaseByMemberId');
        });
        vi.mocked(mockMemberRepo.delete).mockImplementationOnce(async () => {
            callOrder.push('delete');
        });

        await useCase.execute('uuid-1');

        expect(callOrder).toEqual(['releaseByMemberId', 'delete']);
    });
});