import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLockerUseCase } from './CreateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest } from '@alentapp/shared';

describe('CreateLockerUseCase', () => {
    const mockLockerRepo = {
        create: vi.fn(),
    } as unknown as LockerRepository;

    const mockLockerValidator = {
        validateRequiredFields: vi.fn(),
        validateNumber: vi.fn(),
        validateLocation: vi.fn(),
        validateUniqueNumber: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new CreateLockerUseCase(
        mockLockerRepo,
        mockLockerValidator
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un locker exitosamente', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 10,
            location: 'MALE',
        };

        const mockCreatedLocker = {
            id: 'locker-1',
            number: 10,
            location: 'MALE',
            status: 'AVAILABLE',
            member_id: null,
            contract_end_date: null,
        };

        vi.mocked(
            mockLockerValidator.validateUniqueNumber
        ).mockResolvedValueOnce(undefined);

        vi.mocked(mockLockerRepo.create)
            .mockResolvedValueOnce(mockCreatedLocker as any);

        const result = await useCase.execute(mockRequest);

        expect(
            mockLockerValidator.validateRequiredFields
        ).toHaveBeenCalledWith(mockRequest);

        expect(
            mockLockerValidator.validateNumber
        ).toHaveBeenCalledWith(mockRequest.number);

        expect(
            mockLockerValidator.validateLocation
        ).toHaveBeenCalledWith(mockRequest.location);

        expect(
            mockLockerValidator.validateUniqueNumber
        ).toHaveBeenCalledWith(mockRequest.number);

        expect(mockLockerRepo.create).toHaveBeenCalledWith({
            number: 10,
            location: 'MALE',
            status: 'AVAILABLE',
            member_id: null,
            contract_end_date: null,
        });

        expect(result).toEqual(mockCreatedLocker);
    });

    it('debe lanzar error si el número ya existe', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 10,
            location: 'MALE',
        };

        vi.mocked(
            mockLockerValidator.validateUniqueNumber
        ).mockRejectedValueOnce(
            new Error('Ya existe un locker con ese número')
        );

        await expect(
            useCase.execute(mockRequest)
        ).rejects.toThrow(
            'Ya existe un locker con ese número'
        );

        expect(mockLockerRepo.create).not.toHaveBeenCalled();
    });
});