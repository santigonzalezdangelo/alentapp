import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { SportDTO, UpdateSportRequest } from '@alentapp/shared';

describe('UpdateSportUseCase', () => {
    // Mock del repositorio para aislar el caso de uso de la base de datos.
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    // Mock del validator para verificar que se validen los campos editables.
    const mockSportValidator = {
        validateDescription: vi.fn(),
        validateMaxCapacity: vi.fn(),
        validateAdditionalPrice: vi.fn(),
    } as unknown as SportValidator;

    // Instanciamos el caso de uso inyectando los mocks.
    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    const existingSport: SportDTO = {
        id: 'sport-1',
        name: 'Tenis',
        description: 'Actividad deportiva',
        max_capacity: 20,
        additional_price: 5000,
        requires_medical_certificate: true,
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Por defecto simulamos que el deporte existe y está activo.
        vi.mocked(mockSportRepo.findById).mockResolvedValue(existingSport);
    });

    it('debe actualizar campos editables correctamente', async () => {
        const updateData: UpdateSportRequest = {
            description: 'Actividad deportiva actualizada',
            max_capacity: 30,
            additional_price: 7000,
            requires_medical_certificate: false,
        };

        const updatedSport: SportDTO = {
            ...existingSport,
            ...updateData,
        };

        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(updatedSport);

        const result = await useCase.execute('sport-1', updateData);

        // Verifica que busque el deporte antes de actualizar.
        expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');

        // Verifica que valide los campos enviados.
        expect(mockSportValidator.validateDescription).toHaveBeenCalledWith(updateData.description);
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(updateData.max_capacity);
        expect(mockSportValidator.validateAdditionalPrice).toHaveBeenCalledWith(updateData.additional_price);

        // Verifica que delegue la actualización al repositorio.
        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', updateData);

        expect(result).toEqual(updatedSport);
    });

    it('debe lanzar error si no se envía ningún campo para actualizar', async () => {
        await expect(useCase.execute('sport-1', {})).rejects.toThrow(
            'Debe enviar al menos un campo para actualizar',
        );

        // Si no hay campos para actualizar, no debería buscar ni actualizar.
        expect(mockSportRepo.findById).not.toHaveBeenCalled();
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta modificar el nombre del deporte', async () => {
        const invalidUpdate = {
            name: 'Fútbol',
        } as any;

        await expect(useCase.execute('sport-1', invalidUpdate)).rejects.toThrow(
            'El nombre del deporte no puede modificarse después de la creación',
        );

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el deporte está dado de baja', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            ...existingSport,
            deleted_at: '2026-05-01T00:00:00.000Z',
        });

        const updateData: UpdateSportRequest = {
            description: 'Intento de actualización',
        };

        await expect(useCase.execute('sport-1', updateData)).rejects.toThrow(
            'El deporte se encuentra dado de baja',
        );

        // Si el deporte está dado de baja, no debe actualizarse.
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });
});