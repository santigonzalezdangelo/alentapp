import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresDisciplineRepository.js', () => {
    return {
        PostgresDisciplineRepository: class {
            async findAll() {
                return [];
            }

            async findById(id: string) {
                return id === 'discipline-1'
                    ? {
                          id: 'discipline-1',
                          reason: 'Conducta inapropiada',
                          start_date: '2026-05-01T00:00:00.000Z',
                          end_date: '2026-05-10T00:00:00.000Z',
                          is_total_suspension: true,
                          deleted_at: null,
                          member_id: 'member-1',
                      }
                    : null;
            }

            async create(data: any) {
                return {
                    id: 'discipline-1',
                    ...data,
                };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async softDelete() {
                return;
            }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === 'member-1'
                    ? { id: 'member-1', name: 'Socio Existente' }
                    : null;
            }

            async findByDni() {
                return null;
            }

            async create(data: any) {
                return { id: 'member-1', ...data };
            }

            async findAll() {
                return [];
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

describe('Discipline API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/disciplines', () => {

        it('debe retornar 201 y crear la sanción', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Conducta inapropiada',
                start_date: '2026-05-01T00:00:00.000Z',
                end_date: '2026-05-10T00:00:00.000Z',
                is_total_suspension: false,
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.reason).toBe('Conducta inapropiada');
            expect(body.data.deleted_at).toBeNull();
            expect(body.data.member_id).toBe('member-1');
        });

        it('debe retornar 400 si la fecha de fin no es posterior a la fecha de inicio', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Daño de equipo',
                start_date: '2026-05-10T00:00:00.000Z',
                end_date: '2026-05-01T00:00:00.000Z',
                is_total_suspension: false,
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');
        });
    });
});