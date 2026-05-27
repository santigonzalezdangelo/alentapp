import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateResponseDTO, MedicalCertificateListItem, UpdateMedicalCertificateRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBCertificate = {
    id: string;
    issue_date: Date;
    expiry_date: Date;
    doctor_license: string;
    institution: string;
    status: 'in_review' | 'validated' | 'historical';
    deleted_at: Date | null;
    member_id: string;
};

type DBCertificateWithMember = DBCertificate & {
    member: {
        dni: string;
    };
};

export class PostgresMedicalCertificateRepository implements MedicalCertificateRepository {
    async findAll(): Promise<MedicalCertificateListItem[]> {
        const certificates = await prisma.medicalCertificate.findMany({
            where: { deleted_at: null },
            include: { member: true },
            orderBy: { issue_date: 'desc' },
        });

        return certificates.map((cert) => this.mapToListItem(cert));
    }

    async save(data: Omit<MedicalCertificateResponseDTO, 'id' | 'deleted_at'>): Promise<MedicalCertificateResponseDTO> {
        const certificate = await prisma.medicalCertificate.create({
            data: {
                member_id: data.member_id,
                issue_date: new Date(data.issue_date),
                expiry_date: new Date(data.expiry_date),
                doctor_license: data.doctor_license,
                institution: data.institution,
                status: data.status,
            },
        });

        return this.mapToDTO(certificate);
    }

    async findById(id: string): Promise<MedicalCertificateResponseDTO | null> {
        const certificate = await prisma.medicalCertificate.findUnique({
            where: { id },
        });

        if (!certificate) return null;

        return this.mapToDTO(certificate);
    }

    async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateResponseDTO> {
        const updateData: Record<string, unknown> = {};

        if (data.issue_date !== undefined) {
            updateData.issue_date = new Date(data.issue_date);
        }
        if (data.expiry_date !== undefined) {
            updateData.expiry_date = new Date(data.expiry_date);
        }
        if (data.doctor_license !== undefined) {
            updateData.doctor_license = data.doctor_license;
        }
        if (data.institution !== undefined) {
            updateData.institution = data.institution;
        }
        if (data.status !== undefined) {
            updateData.status = data.status;
        }

        const certificate = await prisma.medicalCertificate.update({
            where: { id },
            data: updateData,
        });

        return this.mapToDTO(certificate);
    }

    async updateStatusToValidated(certificateId: string, memberId: string): Promise<MedicalCertificateResponseDTO> {
        const [certificate] = await prisma.$transaction([
            prisma.medicalCertificate.update({
                where: { id: certificateId },
                data: { status: 'validated' },
            }),
            prisma.medicalCertificate.updateMany({
                where: { member_id: memberId, status: 'validated', deleted_at: null, id: { not: certificateId } },
                data: { status: 'historical' },
            }),
        ]);

        return this.mapToDTO(certificate);
    }

    async softDelete(id: string): Promise<void> {
        await prisma.medicalCertificate.update({
            where: { id },
            data: {
                deleted_at: new Date(),
            },
        });
    }

    private mapToDTO(cert: DBCertificate): MedicalCertificateResponseDTO {
        return {
            id: cert.id,
            member_id: cert.member_id,
            issue_date: cert.issue_date.toISOString().split('T')[0],
            expiry_date: cert.expiry_date.toISOString().split('T')[0],
            doctor_license: cert.doctor_license,
            institution: cert.institution,
            status: cert.status,
            deleted_at: cert.deleted_at ? cert.deleted_at.toISOString() : null,
        };
    }

    private mapToListItem(cert: DBCertificateWithMember): MedicalCertificateListItem {
        return {
            ...this.mapToDTO(cert),
            member_dni: cert.member.dni,
        };
    }
}
