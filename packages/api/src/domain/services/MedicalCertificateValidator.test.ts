import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificateValidator } from './MedicalCertificateValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('MedicalCertificateValidator', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new MedicalCertificateValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateExpiryAfterIssue', () => {
        it('debe pasar si la fecha de vencimiento es posterior a la fecha de emisión', () => {
            expect(() =>
                validator.validateExpiryAfterIssue(
                    '2026-01-01',
                    '2026-12-31',
                ),
            ).not.toThrow();
        });

        it('debe lanzar error si la fecha de vencimiento es menor a la de emisión', () => {
            expect(() =>
                validator.validateExpiryAfterIssue(
                    '2026-06-01',
                    '2026-01-01',
                ),
            ).toThrow('La fecha de vencimiento debe ser posterior a la fecha de emisión');
        });

        it('debe lanzar error si la fecha de vencimiento es igual a la de emisión', () => {
            expect(() =>
                validator.validateExpiryAfterIssue(
                    '2026-06-01',
                    '2026-06-01',
                ),
            ).toThrow('La fecha de vencimiento debe ser posterior a la fecha de emisión');
        });
    });

    describe('validateMemberExists', () => {
        it('debe pasar si el socio existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'member-1' } as any);

            await expect(validator.validateMemberExists('member-1')).resolves.not.toThrow();

            expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');
        });

        it('debe lanzar error si el socio no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberExists('nonexistent')).rejects.toThrow(
                'El socio indicado no existe',
            );

            expect(mockMemberRepo.findById).toHaveBeenCalledWith('nonexistent');
        });
    });

    describe('validateHasUpdateFields', () => {
        it('debe pasar si se envía al menos un campo para actualizar', () => {
            expect(() =>
                validator.validateHasUpdateFields({ doctor_license: 'LIC999' })
            ).not.toThrow();
        });

        it('debe lanzar error si no se envía ningún campo para actualizar', () => {
            expect(() =>
                validator.validateHasUpdateFields({})
            ).toThrow('Debe enviarse al menos un campo para actualizar');
        });
    });

    describe('validateStatusTransition', () => {
        it('debe pasar si la transición es de in_review a validated', () => {
            expect(() =>
                validator.validateStatusTransition('in_review', 'validated')
            ).not.toThrow();
        });

        it('debe lanzar error si la transición no es de in_review a validated', () => {
            expect(() =>
                validator.validateStatusTransition('validated', 'validated')
            ).toThrow('transición de estado no permitida');
        });
    });

    describe('validateExpiryIsFuture', () => {
        it('debe pasar si la fecha de vencimiento es futura', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const futureStr = futureDate.toISOString().split('T')[0];

            expect(() =>
                validator.validateExpiryIsFuture(futureStr)
            ).not.toThrow();
        });

        it('debe lanzar error si la fecha de vencimiento es hoy o pasada', () => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            expect(() =>
                validator.validateExpiryIsFuture(todayStr)
            ).toThrow('No se puede validar un certificado vencido');
        });
    });
});

