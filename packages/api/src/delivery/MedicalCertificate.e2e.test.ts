import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('MedicalCertificate API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = randomSuffix.padStart(8, '0');
    const testEmail = `e2e${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        if (createdMemberId) {
            await prisma.medicalCertificate.deleteMany({
                where: { member_id: createdMemberId },
            });
            await prisma.member.deleteMany({
                where: { id: createdMemberId },
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe crear un certificado en la base de datos real con status in_review', async () => {
        const memberPayload = {
            name: 'E2E Cert Create',
            dni: testDni,
            email: testEmail,
            birthdate: '1990-01-01',
            category: 'Pleno',
        };

        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: memberPayload,
        });

        expect(memberResponse.statusCode).toBe(201);
        const memberBody = JSON.parse(memberResponse.payload);
        expect(memberBody.data.id).toBeDefined();
        createdMemberId = memberBody.data.id;

        const certResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                issue_date: '2026-01-01',
                expiry_date: '2026-12-31',
                doctor_license: 'LIC123',
                institution: 'Hospital',
                member_id: createdMemberId,
            },
        });

        expect(certResponse.statusCode).toBe(201);
        const certBody = JSON.parse(certResponse.payload);
        const createdCertId = certBody.data.id;

        const dbCert = await prisma.medicalCertificate.findUnique({
            where: { id: createdCertId },
        });
        expect(dbCert).not.toBeNull();
        expect(dbCert!.status).toBe('in_review');
        expect(dbCert!.deleted_at).toBeNull();
    });
});
