import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

describe('UpdateLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as LockerRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const mockLockerValidator = {
        validateStatus: vi.fn(),
        validateContractEndDate: vi.fn(),
        validateMaintenanceBlock: vi.fn(),
        validateAlreadyOccupied: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new UpdateLockerUseCase(
        mockLockerRepo,
        mockMemberRepo,
        mockLockerValidator,
    );

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

    it('debe lanzar error si el locker no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-inexistente', {})
        ).rejects.toThrow('El locker no existe');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe pasar a mantenimiento desde disponible', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(availableLocker as any);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...availableLocker, status: 'MAINTENANCE' } as any);

        await useCase.execute('locker-1', { status: 'MAINTENANCE' });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', expect.objectContaining({ status: 'MAINTENANCE' }));
    });

    it('debe pasar a mantenimiento desde ocupado conservando member_id', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(occupiedLocker as any);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...occupiedLocker, status: 'MAINTENANCE' } as any);

        await useCase.execute('locker-1', { status: 'MAINTENANCE' });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', expect.objectContaining({ status: 'MAINTENANCE' }));
    });

    it('debe liberar un locker ocupado y pasar a disponible', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(occupiedLocker as any);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...availableLocker } as any);

        await useCase.execute('locker-1', { member_id: null });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', expect.objectContaining({
            status: 'AVAILABLE',
            member_id: null,
            contract_end_date: null,
        }));
    });

    it('debe liberar un locker en mantenimiento sin cambiar el estado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(maintenanceLocker as any);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...maintenanceLocker, member_id: null } as any);

        await useCase.execute('locker-1', { member_id: null });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', expect.objectContaining({
            member_id: null,
            contract_end_date: null,
        }));
        expect(mockLockerRepo.update).not.toHaveBeenCalledWith('locker-1', expect.objectContaining({
            status: 'AVAILABLE',
        }));
    });

    it('debe asignar un socio y pasar a ocupado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(availableLocker as any);
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'member-1' } as any);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...availableLocker, status: 'OCCUPIED', member_id: 'member-1' } as any);

        await useCase.execute('locker-1', { member_id: 'member-1' });

        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', expect.objectContaining({
            status: 'OCCUPIED',
            member_id: 'member-1',
        }));
    });

    it('debe lanzar error si el socio no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(availableLocker as any);
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-1', { member_id: 'member-inexistente' })
        ).rejects.toThrow('El socio no existe');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe bloquear asignación si el locker está en mantenimiento', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(maintenanceLocker as any);
        vi.mocked(mockLockerValidator.validateMaintenanceBlock).mockImplementationOnce(() => {
            throw new Error('El locker está en mantenimiento');
        });

        await expect(
            useCase.execute('locker-1', { member_id: 'member-1' })
        ).rejects.toThrow('El locker está en mantenimiento');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se asigna fecha sin socio', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(availableLocker as any);

        await expect(
            useCase.execute('locker-1', { contract_end_date: '2027-12-31' })
        ).rejects.toThrow('No se puede asignar fecha de contrato sin socio');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error en doble asignación', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(occupiedLocker as any);
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'member-2' } as any);
        vi.mocked(mockLockerValidator.validateAlreadyOccupied).mockImplementationOnce(() => {
            throw new Error('El locker ya se encuentra asignado');
        });

        await expect(
            useCase.execute('locker-1', { member_id: 'member-2' })
        ).rejects.toThrow('El locker ya se encuentra asignado');

        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });
});