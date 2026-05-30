import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    const activeSports = [
        {
            id: 'sport-existing',
            name: 'Tenis',
            description: 'Actividad existente',
            max_capacity: 20,
            additional_price: 5000,
            requires_medical_certificate: true,
            deleted_at: null,
        },
    ];

    const normalizeName = (name: string) =>
        name
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

    return {
        PostgresSportRepository: class {
            async findAllActive() {
                return activeSports;
            }

            async findActiveByName(name: string) {
                const normalizedName = normalizeName(name);

                const sport = activeSports.find(
                    (sport) => normalizeName(sport.name) === normalizedName,
                );

                return sport ?? null;
            }

            async create(data: CreateSportRequest) {
                return {
                    id: 'sport-created',
                    ...data,
                    deleted_at: null,
                };
            }

            async findById(id: string) {
                return activeSports.find((sport) => sport.id === id) ?? null;
            }

            async update(id: string, data: any) {
                return { id, name: 'Tenis', ...data, deleted_at: null };
            }

            async softDelete() {
                return;
            }
        },
    };
});

describe('Sport API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/sports', () => {
        it('debe retornar código 200 y el listado de deportes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/sports',
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('sport-existing');
            expect(body.data[0].name).toBe('Tenis');
        });
    });

    describe('POST /api/v1/sports', () => {
        it('debe retornar 201 y crear el deporte', async () => {
            const payload: CreateSportRequest = {
                name: 'Natación',
                description: 'Actividad en pileta',
                max_capacity: 15,
                additional_price: 3000,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(201);

            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('sport-created');
            expect(body.data.name).toBe('Natación');
            expect(body.data.description).toBe('Actividad en pileta');
            expect(body.data.deleted_at).toBeNull();
        });

        it('debe retornar 409 si el nombre del deporte ya existe', async () => {
            const payload: CreateSportRequest = {
                name: ' tenis ',
                description: 'Intento duplicado',
                max_capacity: 10,
                additional_price: 1000,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(409);

            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un deporte activo con ese nombre');
        });
    });
});