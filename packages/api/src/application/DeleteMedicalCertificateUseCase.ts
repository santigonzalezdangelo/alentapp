import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

export class DeleteMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: MedicalCertificateRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            throw new Error('Formato de ID inválido');
        }

        const existingCertificate = await this.medicalCertificateRepository.findById(id);

        if (!existingCertificate) {
            throw new Error('El certificado médico no existe');
        }

        if (existingCertificate.deleted_at !== null) {
            throw new Error('El certificado médico ya fue dado de baja');
        }

        if (existingCertificate.status === 'historical') {
            throw new Error('No se puede eliminar un certificado histórico');
        }

        await this.medicalCertificateRepository.softDelete(id);
    }
}
