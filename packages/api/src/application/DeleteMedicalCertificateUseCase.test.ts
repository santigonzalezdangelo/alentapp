import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from './DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateResponseDTO } from '@alentapp/shared';

describe('DeleteMedicalCertificateUseCase', () => {
  const CERT_ID         = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const CERT_DELETED_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const CERT_MISSING_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  const mockRepo = {
    findById: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as MedicalCertificateRepository;

  const useCase = new DeleteMedicalCertificateUseCase(mockRepo);

  const mockExistingCert: MedicalCertificateResponseDTO = {
    id: CERT_ID,
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
  });

  it('debe lanzar error si el ID no tiene formato UUID válido', async () => {
    await expect(useCase.execute('id-invalido')).rejects.toThrow(
      'Formato de ID inválido',
    );
    expect(mockRepo.findById).not.toHaveBeenCalled();
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('debe lanzar error si el certificado no existe', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute(CERT_MISSING_ID)).rejects.toThrow(
      'El certificado médico no existe',
    );

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('debe eliminar el certificado si existe', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValueOnce(mockExistingCert);

    await useCase.execute(CERT_ID);

    expect(mockRepo.findById).toHaveBeenCalledWith(CERT_ID);
    expect(mockRepo.softDelete).toHaveBeenCalledWith(CERT_ID);
  });

  it('debe lanzar error si el certificado ya fue dado de baja', async () => {
    const deletedCert = {
      ...mockExistingCert,
      id: CERT_DELETED_ID,
      deleted_at: '2026-05-05',
    };
    vi.mocked(mockRepo.findById).mockResolvedValueOnce(deletedCert);

    await expect(useCase.execute(CERT_DELETED_ID)).rejects.toThrow(
      'El certificado médico ya fue dado de baja',
    );

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('debe lanzar error si el certificado es histórico', async () => {
    const historicalCert = {
      ...mockExistingCert,
      status: 'historical' as const,
    };
    vi.mocked(mockRepo.findById).mockResolvedValueOnce(historicalCert);

    await expect(useCase.execute(CERT_ID)).rejects.toThrow(
      'No se puede eliminar un certificado histórico',
    );

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });
});
