import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                if (id === 'member-1') return { id: 'member-1', name: 'Socio Test' };
                return null;
            }
            async findAll() {
                return [];
            }
        },
    };
});

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    const lockers: any[] = [
        {
            id: 'locker-1',
            number: 10,
            location: 'MALE',
            status: 'AVAILABLE',
            member_id: null,
            contract_end_date: null,
        },
        {
            id: 'locker-2',
            number: 20,
            location: 'FEMALE',
            status: 'MAINTENANCE',
            member_id: null,
            contract_end_date: null,
        },
        {
            id: 'locker-3',
            number: 30,
            location: 'MALE',
            status: 'OCCUPIED',
            member_id: 'member-1',
            contract_end_date: null,
        },
        {
            id: '11111111-1111-1111-1111-111111111111',
            number: 40,
            location: 'MALE',
            status: 'AVAILABLE',
            member_id: null,
            contract_end_date: null,
        },
        {
            id: '33333333-3333-3333-3333-333333333333',
            number: 50,
            location: 'MALE',
            status: 'OCCUPIED',
            member_id: 'member-1',
            contract_end_date: null,
        },
    ];

    return {
        PostgresLockerRepository: class {
            async findAll() { return lockers; }
            async findByNumber(number: number) {
                if (number === 999) return { id: 'existing-locker' };
                return null;
            }
            async create(data: any) { return { id: 'locker-new', ...data }; }
            async findById(id: string) { return lockers.find(l => l.id === id) ?? null; }
            async update(id: string, data: any) {
                const locker = lockers.find(l => l.id === id);
                return { ...locker, ...data };
            }
            async delete() { return; }
            async releaseByMemberId() { return; }
        },
    };
});

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/lockers', () => {
        it('debe retornar 201 y crear el locker', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload: {
                    number: 10,
                    location: 'MALE',
                },
            });

            expect(response.statusCode).toBe(201);

            const body = JSON.parse(response.payload);

            expect(body.data.number).toBe(10);
            expect(body.data.location).toBe('MALE');
            expect(body.data.status).toBe('AVAILABLE');
            expect(body.data.member_id).toBeNull();
            expect(body.data.contract_end_date).toBeNull();
        });

        it('debe retornar 409 si el número ya existe', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload: {
                    number: 999,
                    location: 'MALE',
                },
            });

            expect(response.statusCode).toBe(409);

            const body = JSON.parse(response.payload);

            expect(body.message).toBe(
                'Ya existe un locker con ese número'
            );
        });
    });

    describe('GET /api/v1/lockers', () => {
        it('debe retornar la lista de lockers', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers',
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);

            expect(body.data.length).toBe(5);
            expect(body.data[0].number).toBe(10);
        });
    });

    describe('PATCH /api/v1/lockers/:id', () => {
        it('debe retornar 200 al pasar a mantenimiento', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-1',
                payload: { status: 'MAINTENANCE' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('MAINTENANCE');
        });

        it('debe retornar 200 al liberar un locker ocupado', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-3',
                payload: { member_id: null },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('AVAILABLE');
            expect(body.data.member_id).toBeNull();
        });

        it('debe retornar 200 al asignar un socio', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-1',
                payload: { member_id: 'member-1' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('OCCUPIED');
            expect(body.data.member_id).toBe('member-1');
        });

        it('debe retornar 400 al asignar socio a locker en mantenimiento', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-2',
                payload: { member_id: 'member-1' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('El locker está en mantenimiento');
        });

        it('debe retornar 404 si el locker no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-inexistente',
                payload: { status: 'MAINTENANCE' },
            });

            expect(response.statusCode).toBe(404);
        });

        it('debe retornar 400 al asignar fecha sin socio', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-1',
                payload: { contract_end_date: '2027-12-31' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('No se puede asignar fecha de contrato sin socio');
        });

        it('debe retornar 404 si el socio no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-1',
                payload: { member_id: 'member-inexistente' },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('El socio no existe');
        });

        it('debe retornar 409 en doble asignación', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/locker-3',
                payload: { member_id: 'member-2' },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('El locker ya se encuentra asignado');
        });
    });

    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe retornar 204 al eliminar un locker disponible', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/11111111-1111-1111-1111-111111111111',
            });

            expect(response.statusCode).toBe(204);
        });

        it('debe retornar 404 si el locker no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/00000000-0000-0000-0000-000000000000',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('El locker no existe');
        });

        it('debe retornar 409 si el locker está ocupado', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/33333333-3333-3333-3333-333333333333',
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.message).toBe('No se puede eliminar un locker ocupado');
        });
    });
});