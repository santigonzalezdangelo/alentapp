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
});
