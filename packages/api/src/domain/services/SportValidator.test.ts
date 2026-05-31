import { describe, it, expect } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('SportValidator', () => {
    const validator = new SportValidator();

    const validSport: CreateSportRequest = {
        name: 'Tenis',
        description: 'Actividad deportiva',
        max_capacity: 20,
        additional_price: 5000,
        requires_medical_certificate: true,
    };

    describe('validateRequiredFields', () => {
        it('debe pasar si todos los campos obligatorios están presentes', () => {
            expect(() => validator.validateRequiredFields(validSport)).not.toThrow();
        });

        it('debe lanzar error si falta algún campo obligatorio o viene vacío', () => {
            expect(() =>
                validator.validateRequiredFields({
                    ...validSport,
                    name: '   ',
                }),
            ).toThrow('Todos los campos obligatorios deben estar presentes');

            expect(() =>
                validator.validateRequiredFields({
                    ...validSport,
                    description: '',
                }),
            ).toThrow('Todos los campos obligatorios deben estar presentes');

            expect(() =>
                validator.validateRequiredFields({
                    ...validSport,
                    requires_medical_certificate: undefined as any,
                }),
            ).toThrow('Todos los campos obligatorios deben estar presentes');
        });
    });

    describe('validateMaxCapacity', () => {
        it('debe pasar si el cupo máximo es un número entero positivo y razonable', () => {
            expect(() => validator.validateMaxCapacity(25)).not.toThrow();
        });

        it('debe lanzar error si el cupo máximo es inválido', () => {
            expect(() => validator.validateMaxCapacity(NaN)).toThrow(
                'El cupo máximo debe ser un número válido',
            );

            expect(() => validator.validateMaxCapacity(5.5)).toThrow(
                'El cupo máximo debe ser un número entero',
            );

            expect(() => validator.validateMaxCapacity(0)).toThrow(
                'El cupo máximo debe ser mayor a cero',
            );

            expect(() => validator.validateMaxCapacity(10000)).toThrow(
                'El cupo máximo es demasiado alto',
            );
        });
    });

    describe('validateAdditionalPrice', () => {
        it('debe lanzar error si el precio adicional es inválido', () => {
            expect(() => validator.validateAdditionalPrice(NaN)).toThrow(
                'El precio adicional debe ser un número válido',
            );

            expect(() => validator.validateAdditionalPrice(-1)).toThrow(
                'El precio adicional no puede ser negativo',
            );

            expect(() => validator.validateAdditionalPrice(100000000)).toThrow(
                'El precio adicional es demasiado alto',
            );
        });
    });

    describe('validateDescription', () => {
        it('debe lanzar error si la descripción está vacía o tiene solo espacios', () => {
            expect(() => validator.validateDescription('')).toThrow(
                'La descripción no puede estar vacía',
            );

            expect(() => validator.validateDescription('   ')).toThrow(
                'La descripción no puede estar vacía',
            );
        });
    });
});