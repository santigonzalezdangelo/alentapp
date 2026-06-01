import { MemberRepository } from '../MemberRepository.js';
import { MedicalCertificateStatus, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class MedicalCertificateValidator {
    constructor(private readonly memberRepo: MemberRepository) {}

    validateDateFormat(date: string): void {
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error('Formato de fecha inválido');
        }
        const year = parsedDate.getUTCFullYear();
        if (year < 1000 || year > 9999) {
            throw new Error('Formato de fecha inválido');
        }
    }

    validateExpiryAfterIssue(issueDate: string, expiryDate: string): void {
        const issue = new Date(issueDate);
        const expiry = new Date(expiryDate);
        if (expiry <= issue) {
            throw new Error('La fecha de vencimiento debe ser posterior a la fecha de emisión');
        }
    }

    async validateMemberExists(memberId: string): Promise<void> {
        const member = await this.memberRepo.findById(memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }
    }

    validateHasUpdateFields(data: UpdateMedicalCertificateRequest): void {
        if (
            data.issue_date === undefined &&
            data.expiry_date === undefined &&
            data.doctor_license === undefined &&
            data.institution === undefined &&
            data.status === undefined
        ) {
            throw new Error('Debe enviarse al menos un campo para actualizar');
        }
    }

    validateStatusTransition(current: MedicalCertificateStatus, next: MedicalCertificateStatus): void {
        if (current !== 'in_review' || next !== 'validated') {
            throw new Error('transición de estado no permitida');
        }
    }

    validateExpiryIsFuture(expiryDate: string): void {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate + 'T00:00:00Z');
        if (expiry <= today) {
            throw new Error('No se puede validar un certificado vencido');
        }
    }
}
