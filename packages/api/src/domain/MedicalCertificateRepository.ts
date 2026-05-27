import { MedicalCertificateResponseDTO, MedicalCertificateListItem, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export interface MedicalCertificateRepository {
  findAll(): Promise<MedicalCertificateListItem[]>;
  save(certificate: Omit<MedicalCertificateResponseDTO, 'id' | 'deleted_at'>): Promise<MedicalCertificateResponseDTO>;
  findById(id: string): Promise<MedicalCertificateResponseDTO | null>;
  update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateResponseDTO>;
  updateStatusToValidated(certificateId: string, memberId: string): Promise<MedicalCertificateResponseDTO>;
  softDelete(id: string): Promise<void>;
}
