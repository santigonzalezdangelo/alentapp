import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockerValidator } from './LockerValidator.js';
import { LockerRepository } from '../LockerRepository.js';

describe('LockerValidator', () => {
    const mockLockerRepo = {
        findByNumber: vi.fn(),
    } as unknown as LockerRepository;

    const validator = new LockerValidator(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateUniqueNumber', () => {
        it('debe pasar si el número no existe', async () => {
            vi.mocked(
                mockLockerRepo.findByNumber
            ).mockResolvedValueOnce(null);

            await expect(
                validator.validateUniqueNumber(10)
            ).resolves.not.toThrow();

            expect(
                mockLockerRepo.findByNumber
            ).toHaveBeenCalledWith(10);
        });

        it('debe lanzar error si el número ya existe', async () => {
            vi.mocked(
                mockLockerRepo.findByNumber
            ).mockResolvedValueOnce({ id: '1' } as any);

            await expect(
                validator.validateUniqueNumber(10)
            ).rejects.toThrow(
                'Ya existe un locker con ese número'
            );

            expect(
                mockLockerRepo.findByNumber
            ).toHaveBeenCalledWith(10);
        });
    });

    describe('validateNumber', () => {
        it('debe aceptar números válidos', () => {
            expect(() =>
                validator.validateNumber(10)
            ).not.toThrow();
        });

        it('debe rechazar números menores o iguales a cero', () => {
            expect(() =>
                validator.validateNumber(0)
            ).toThrow(
                'El número de locker debe ser mayor a cero'
            );
        });

        it('debe rechazar números no enteros', () => {
            expect(() =>
                validator.validateNumber(10.5)
            ).toThrow(
                'El número de locker debe ser un entero válido'
            );
        });
    });

    describe('validateLocation', () => {
        it('debe aceptar ubicaciones válidas', () => {
            expect(() =>
                validator.validateLocation('MALE')
            ).not.toThrow();

            expect(() =>
                validator.validateLocation('FEMALE')
            ).not.toThrow();

            expect(() =>
                validator.validateLocation('CHILDREN')
            ).not.toThrow();
        });

        it('debe rechazar ubicaciones inválidas', () => {
            expect(() =>
                validator.validateLocation('INVALID' as any)
            ).toThrow(
                'La ubicación seleccionada no es válida'
            );
        });
    });

    describe('validateRequiredFields', () => {
        it('debe aceptar datos completos', () => {
            expect(() =>
                validator.validateRequiredFields({
                    number: 10,
                    location: 'MALE',
                })
            ).not.toThrow();
        });

        it('debe lanzar error cuando falta el número', () => {
            expect(() =>
                validator.validateRequiredFields({
                    number: undefined as any,
                    location: 'MALE',
                })
            ).toThrow(
                'Todos los campos son requeridos'
            );
        });

        it('debe lanzar error cuando falta la ubicación', () => {
            expect(() =>
                validator.validateRequiredFields({
                    number: 10,
                    location: undefined as any,
                })
            ).toThrow(
                'Todos los campos son requeridos'
            );
        });
    });
});