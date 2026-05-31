import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './CreateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest, SportDTO } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
    //Creamos mocks de nuestras dependencias (Puertos y Servicios)
    const mockSportRepo = {
        create: vi.fn(),
        findActiveByName: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateRequiredFields: vi.fn(),
        validateMaxCapacity: vi.fn(),
        validateAdditionalPrice: vi.fn(),
    } as unknown as SportValidator;

    //Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateSportUseCase(mockSportRepo, mockSportValidator);

    const mockRequest: CreateSportRequest = {
        name: 'Tenis',
        description: 'Actividad deportiva',
        max_capacity: 20,
        additional_price: 5000,
        requires_medical_certificate: true,
    };

    const mockCreatedSport: SportDTO = {
        id: 'sport-uuid-1',
        ...mockRequest,
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte exitosamente si pasa validaciones y no existe duplicado', async () => {
        vi.mocked(mockSportRepo.findActiveByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce(mockCreatedSport);

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones de dominio
        expect(mockSportValidator.validateRequiredFields).toHaveBeenCalledWith(mockRequest);
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(mockRequest.max_capacity);
        expect(mockSportValidator.validateAdditionalPrice).toHaveBeenCalledWith(mockRequest.additional_price);

        // Verificamos que se haya consultado si ya existía un deporte activo con ese nombre
        expect(mockSportRepo.findActiveByName).toHaveBeenCalledWith(mockRequest.name);

        // Verificamos que se haya intentado persistir el deporte
        expect(mockSportRepo.create).toHaveBeenCalledWith(mockRequest);

        expect(result).toEqual(mockCreatedSport);
    });

    it('debe normalizar name y description antes de validar y crear', async () => {
        const requestWithSpaces: CreateSportRequest = {
            ...mockRequest,
            name: '   Tenis   ',
            description: '   Actividad deportiva   ',
        };

        const normalizedRequest: CreateSportRequest = {
            ...mockRequest,
            name: 'Tenis',
            description: 'Actividad deportiva',
        };

        vi.mocked(mockSportRepo.findActiveByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'sport-uuid-1',
            ...normalizedRequest,
            deleted_at: null,
        });

        await useCase.execute(requestWithSpaces);

        // El caso de uso debe trabajar con los datos ya limpiados
        expect(mockSportValidator.validateRequiredFields).toHaveBeenCalledWith(normalizedRequest);
        expect(mockSportRepo.findActiveByName).toHaveBeenCalledWith(normalizedRequest.name);
        expect(mockSportRepo.create).toHaveBeenCalledWith(normalizedRequest);
    });

    it('debe lanzar error si ya existe un deporte activo con el mismo nombre', async () => {
        vi.mocked(mockSportRepo.findActiveByName).mockResolvedValueOnce(mockCreatedSport);

        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'Ya existe un deporte activo con ese nombre',
        );

        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe validar cupo máximo y precio adicional antes de crear', async () => {
        vi.mocked(mockSportRepo.findActiveByName).mockResolvedValueOnce(null);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce(mockCreatedSport);

        await useCase.execute(mockRequest);

        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(20);
        expect(mockSportValidator.validateAdditionalPrice).toHaveBeenCalledWith(5000);
    });
});