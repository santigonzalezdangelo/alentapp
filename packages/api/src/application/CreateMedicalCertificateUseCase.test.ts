import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './CreateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

describe('CreateMedicalCertificateUseCase', () => {
    const mockRepo = {
        save: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockValidator = {
        validateDateFormat: vi.fn(),
        validateExpiryAfterIssue: vi.fn(),
        validateMemberExists: vi.fn(),
    } as unknown as MedicalCertificateValidator;

    const useCase = new CreateMedicalCertificateUseCase(mockRepo, mockValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un certificado exitosamente si el socio existe y pasa validaciones', async () => {
        const input: CreateMedicalCertificateRequest = {
            issue_date: '2026-01-01',
            expiry_date: '2026-12-31',
            doctor_license: 'LIC123',
            institution: 'Hospital',
            member_id: 'member-1',
        };

        vi.mocked(mockRepo.save).mockResolvedValueOnce({
            id: 'cert-1',
            ...input,
            status: 'in_review',
            deleted_at: null,
        } as any);

        const result = await useCase.execute(input);

        expect(mockValidator.validateDateFormat).toHaveBeenCalledWith(input.issue_date);
        expect(mockValidator.validateDateFormat).toHaveBeenCalledWith(input.expiry_date);
        expect(mockValidator.validateExpiryAfterIssue).toHaveBeenCalledWith(
            input.issue_date,
            input.expiry_date,
        );
        expect(mockValidator.validateMemberExists).toHaveBeenCalledWith(input.member_id);
        expect(mockRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'in_review' }),
        );
        expect(result.status).toBe('in_review');
        expect(result.id).toBe('cert-1');
    });

    it('debe lanzar error si el socio no existe', async () => {
        const input: CreateMedicalCertificateRequest = {
            issue_date: '2026-01-01',
            expiry_date: '2026-12-31',
            doctor_license: 'LIC123',
            institution: 'Hospital',
            member_id: 'nonexistent',
        };

        vi.mocked(mockValidator.validateMemberExists).mockRejectedValueOnce(
            new Error('El socio indicado no existe'),
        );

        await expect(useCase.execute(input)).rejects.toThrow('El socio indicado no existe');
        expect(mockValidator.validateMemberExists).toHaveBeenCalledWith(input.member_id);
        expect(mockRepo.save).not.toHaveBeenCalled();
    });
});
