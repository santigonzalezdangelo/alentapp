import { describe, it, expect } from 'vitest';
import { PaymentValidator } from './PaymentValidator.js';

describe('PaymentValidator', () => {
    // Fijamos una fecha conocida para que los tests de "fecha futura" sean determinísticos.
    const fixedNow = new Date('2026-05-15T10:00:00.000Z');
    const clock = { now: () => fixedNow };
    const validator = new PaymentValidator(clock);

    describe('validateUuid', () => {
        it('acepta UUIDs válidos', () => {
            expect(() =>
                validator.validateUuid('11111111-1111-1111-1111-111111111111'),
            ).not.toThrow();
        });

        it('rechaza strings que no son UUID con mensaje genérico', () => {
            expect(() => validator.validateUuid('xyz')).toThrow('Formato de id inválido');
            expect(() => validator.validateUuid('123')).toThrow('Formato de id inválido');
            expect(() => validator.validateUuid('')).toThrow('Formato de id inválido');
        });

        it('usa el fieldName personalizado en el mensaje de error', () => {
            expect(() => validator.validateUuid('no-uuid', 'member_id')).toThrow(
                'Formato de member_id inválido',
            );
        });
    });

    describe('validateAmount', () => {
        it('acepta números positivos finitos', () => {
            expect(() => validator.validateAmount(0.01)).not.toThrow();
            expect(() => validator.validateAmount(1500)).not.toThrow();
            expect(() => validator.validateAmount(999999.99)).not.toThrow();
        });

        it('rechaza cero', () => {
            expect(() => validator.validateAmount(0)).toThrow('Monto inválido');
        });

        it('rechaza valores negativos', () => {
            expect(() => validator.validateAmount(-1)).toThrow('Monto inválido');
            expect(() => validator.validateAmount(-100.5)).toThrow('Monto inválido');
        });

        it('rechaza NaN e Infinity', () => {
            expect(() => validator.validateAmount(NaN)).toThrow('Monto inválido');
            expect(() => validator.validateAmount(Infinity)).toThrow('Monto inválido');
        });

        it('rechaza no-números', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => validator.validateAmount('100' as any)).toThrow('Monto inválido');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => validator.validateAmount(null as any)).toThrow('Monto inválido');
        });
    });

    describe('parseDueDate', () => {
        it('acepta formato YYYY-MM-DD', () => {
            expect(validator.parseDueDate('2027-06-30')).toBeInstanceOf(Date);
        });

        it('acepta formato ISO 8601 completo', () => {
            expect(validator.parseDueDate('2027-06-30T23:59:59.000Z')).toBeInstanceOf(Date);
        });

        it('rechaza formato DD/MM/YYYY', () => {
            expect(() => validator.parseDueDate('30/06/2027')).toThrow(
                'Formato de fecha inválido',
            );
        });

        it('rechaza strings que no son fechas', () => {
            expect(() => validator.parseDueDate('not-a-date')).toThrow(
                'Formato de fecha inválido',
            );
        });

        it('rechaza no-strings', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => validator.parseDueDate(123 as any)).toThrow('Formato de fecha inválido');
        });
    });

    describe('validateDueDateIsFuture', () => {
        it('acepta fechas estrictamente posteriores al día actual', () => {
            expect(() =>
                validator.validateDueDateIsFuture(new Date('2026-05-16')),
            ).not.toThrow();
            expect(() =>
                validator.validateDueDateIsFuture(new Date('2027-01-01')),
            ).not.toThrow();
        });

        it('rechaza fechas iguales al día actual (regla estricta)', () => {
            // fixedNow está en 2026-05-15
            expect(() => validator.validateDueDateIsFuture(new Date('2026-05-15'))).toThrow(
                'La fecha de vencimiento debe ser futura',
            );
        });

        it('rechaza fechas pasadas', () => {
            expect(() => validator.validateDueDateIsFuture(new Date('2026-05-14'))).toThrow(
                'La fecha de vencimiento debe ser futura',
            );
            expect(() => validator.validateDueDateIsFuture(new Date('2020-01-01'))).toThrow(
                'La fecha de vencimiento debe ser futura',
            );
        });
    });

    describe('extractPeriod', () => {
        it('extrae mes y año UTC de una fecha', () => {
            expect(validator.extractPeriod(new Date('2026-06-30T00:00:00.000Z'))).toEqual({
                month: 6,
                year: 2026,
            });
        });

        it('maneja correctamente el primer y último mes del año', () => {
            expect(validator.extractPeriod(new Date('2026-01-01T00:00:00.000Z'))).toEqual({
                month: 1,
                year: 2026,
            });
            expect(validator.extractPeriod(new Date('2026-12-31T00:00:00.000Z'))).toEqual({
                month: 12,
                year: 2026,
            });
        });
    });
});
