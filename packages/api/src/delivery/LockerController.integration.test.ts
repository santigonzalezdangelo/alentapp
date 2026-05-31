import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById() {
                return null;
            }
            async findAll() {
                return [];
            }
        },
    };
});

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() {
                return [
                    {
                        id: 'locker-1',
                        number: 10,
                        location: 'MALE',
                        status: 'AVAILABLE',
                        member_id: null,
                        contract_end_date: null,
                    },
                ];
            }

            async findByNumber(number: number) {
                if (number === 999) {
                    return {
                        id: 'existing-locker',
                    };
                }

                return null;
            }

            async create(data: any) {
                return {
                    id: 'locker-1',
                    ...data,
                };
            }

            async findById() {
                return null;
            }

            async update() {
                return null;
            }

            async delete() {
                return;
            }
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

            expect(body.data.length).toBe(1);
            expect(body.data[0].number).toBe(10);
        });
    });
});