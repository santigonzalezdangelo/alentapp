import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
    return {
        PostgresMedicalCertificateRepository: class {
            async findAll() {
                return [];
            }

            async save(data: any) {
                return {
                    id: 'cert-1',
                    ...data,
                    deleted_at: null,
                };
            }

            async findById(id: string) {
                return id === 'cert-1'
                    ? {
                          id: 'cert-1',
                          member_id: 'member-1',
                          issue_date: '2026-01-01',
                          expiry_date: '2026-12-31',
                          doctor_license: 'LIC123',
                          institution: 'Hospital',
                          status: 'in_review',
                          deleted_at: null,
                      }
                    : null;
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async updateStatusToValidated(certificateId: string, memberId: string) {
                return { id: certificateId, status: 'validated' };
            }

            async softDelete(id: string) {
                return;
            }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() {
                return [];
            }

            async findById(id: string) {
                return id === 'member-1'
                    ? {
                          id: 'member-1',
                          dni: '12345678',
                          name: 'Test',
                          email: 't@t.com',
                          birthdate: new Date('1990-01-01'),
                          category: 'Pleno',
                          status: 'Activo',
                          created_at: new Date(),
                          deleted_at: null,
                      }
                    : null;
            }

            async findByDni(dni: string) {
                return dni === '12345678'
                    ? { id: 'member-1', dni: '12345678' }
                    : null;
            }

            async create(data: any) {
                return { id: 'm-1', ...data };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

describe('MedicalCertificate API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/medical-certificates', () => {
        it('debe retornar 201 y crear el certificado con status in_review', async () => {
            const payload = {
                issue_date: '2026-01-01',
                expiry_date: '2026-12-31',
                doctor_license: 'LIC123',
                institution: 'Hospital',
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('in_review');
            expect(body.data.doctor_license).toBe('LIC123');
            expect(body.data.id).toBeDefined();
        });

        it('debe retornar 404 si el member_id no existe', async () => {
            const payload = {
                issue_date: '2026-01-01',
                expiry_date: '2026-12-31',
                doctor_license: 'LIC123',
                institution: 'Hospital',
                member_id: 'nonexistent',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio indicado no existe');
        });

        it('debe retornar 400 si expiry_date no es posterior a issue_date', async () => {
            const payload = {
                issue_date: '2026-12-31',
                expiry_date: '2026-01-01',
                doctor_license: 'LIC123',
                institution: 'Hospital',
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe(
                'La fecha de vencimiento debe ser posterior a la fecha de emisión',
            );
        });
    });

    describe('PATCH /api/v1/medical-certificates/:id', () => {
        it('debe retornar 200 y actualizar el certificado', async () => {
            const payload: UpdateMedicalCertificateRequest = {
                doctor_license: 'LIC999',
                institution: 'Hospital Actualizado',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/medical-certificates/cert-1',
                payload,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('cert-1');
            expect(body.data.doctor_license).toBe('LIC999');
            expect(body.data.institution).toBe('Hospital Actualizado');
        });

        it('debe retornar 404 si el certificado no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/medical-certificates/nonexistent',
                payload: { doctor_license: 'LIC999' },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El certificado médico no existe');
        });

        it('debe retornar 400 si expiry_date no es posterior a issue_date', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/medical-certificates/cert-1',
                payload: { expiry_date: '2025-01-01' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe(
                'La fecha de vencimiento debe ser posterior a la fecha de emisión',
            );
        });
    });
});
