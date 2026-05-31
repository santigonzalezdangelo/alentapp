import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { UpdateMedicalCertificateRequest, MedicalCertificateResponseDTO } from '@alentapp/shared';

describe('UpdateMedicalCertificateUseCase', () => {
    const mockRepo = {
        findById: vi.fn(),
        update: vi.fn(),
        updateStatusToValidated: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockValidator = {
        validateHasUpdateFields: vi.fn(),
        validateDateFormat: vi.fn(),
        validateExpiryAfterIssue: vi.fn(),
        validateStatusTransition: vi.fn(),
        validateExpiryIsFuture: vi.fn(),
    } as unknown as MedicalCertificateValidator;

    const useCase = new UpdateMedicalCertificateUseCase(mockRepo, mockValidator);

    const mockExistingCert: MedicalCertificateResponseDTO = {
        id: 'cert-1',
        member_id: 'member-1',
        issue_date: '2026-01-01',
        expiry_date: '2026-12-31',
        doctor_license: 'LIC123',
        institution: 'Hospital',
        status: 'in_review',
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockRepo.findById).mockResolvedValue(mockExistingCert);
    });

    it('debe lanzar error si no se envía ningún campo para actualizar', async () => {
        vi.mocked(mockValidator.validateHasUpdateFields).mockImplementationOnce(() => {
            throw new Error('Debe enviarse al menos un campo para actualizar');
        });
        await expect(useCase.execute('cert-1', {})).rejects.toThrow(
            'Debe enviarse al menos un campo para actualizar'
        );
        expect(mockRepo.findById).not.toHaveBeenCalled();
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el certificado no existe', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValueOnce(null);
        await expect(
            useCase.execute('cert-no-existe', { doctor_license: 'LIC999' })
        ).rejects.toThrow('El certificado médico no existe');
    });

    it('debe lanzar error si el certificado está dado de baja', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValueOnce({
            ...mockExistingCert,
            deleted_at: '2026-02-01',
        });
        await expect(
            useCase.execute('cert-1', { doctor_license: 'LIC999' })
        ).rejects.toThrow('No se puede modificar un certificado dado de baja');
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el certificado es histórico', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValueOnce({
            ...mockExistingCert,
            status: 'historical',
        });
        await expect(
            useCase.execute('cert-1', { doctor_license: 'LIC999' })
        ).rejects.toThrow('No se puede modificar un certificado histórico');
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('debe actualizar campos correctamente si los datos son válidos', async () => {
        const updateData: UpdateMedicalCertificateRequest = {
            doctor_license: 'LIC999',
            institution: 'Hospital Actualizado',
        };

        const updatedCert = { ...mockExistingCert, ...updateData };
        vi.mocked(mockRepo.update).mockResolvedValueOnce(updatedCert as MedicalCertificateResponseDTO);

        const result = await useCase.execute('cert-1', updateData);

        expect(mockRepo.findById).toHaveBeenCalledWith('cert-1');
        expect(mockValidator.validateHasUpdateFields).toHaveBeenCalledWith(updateData);
        expect(mockRepo.update).toHaveBeenCalledWith('cert-1', updateData);
        expect(result).toEqual(updatedCert);
    });

    it('debe validar el certificado llamando a updateStatusToValidated cuando status = validated', async () => {
        const updateData: UpdateMedicalCertificateRequest = { status: 'validated' };

        const validatedCert = { ...mockExistingCert, status: 'validated' };
        vi.mocked(mockRepo.updateStatusToValidated).mockResolvedValueOnce(validatedCert as MedicalCertificateResponseDTO);

        const result = await useCase.execute('cert-1', updateData);

        expect(mockValidator.validateHasUpdateFields).toHaveBeenCalledWith(updateData);
        expect(mockValidator.validateStatusTransition).toHaveBeenCalledWith('in_review', 'validated');
        expect(mockValidator.validateExpiryIsFuture).toHaveBeenCalledWith(mockExistingCert.expiry_date);
        expect(mockRepo.updateStatusToValidated).toHaveBeenCalledWith('cert-1', 'member-1');
        expect(mockRepo.update).not.toHaveBeenCalled();
        expect(result.status).toBe('validated');
    });
});
