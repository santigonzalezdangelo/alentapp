import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

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
        {
            id: 'sport-deleted',
            name: 'Fútbol',
            description: 'Deporte ya eliminado',
            max_capacity: 22,
            additional_price: 4000,
            requires_medical_certificate: true,
            deleted_at: '2026-05-01T00:00:00.000Z',
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
                const sport = activeSports.find((sport) => sport.id === id);

                if (!sport) {
                    throw new Error('El deporte no existe');
                }

                return {
                    ...sport,
                    description:
                        data.description !== undefined
                            ? data.description.trim()
                            : sport.description,
                    max_capacity:
                        data.max_capacity !== undefined
                            ? data.max_capacity
                            : sport.max_capacity,
                    additional_price:
                        data.additional_price !== undefined
                            ? data.additional_price
                            : sport.additional_price,
                    requires_medical_certificate:
                        data.requires_medical_certificate !== undefined
                            ? data.requires_medical_certificate
                            : sport.requires_medical_certificate,
                };
            }

            async softDelete(id: string) {
                const sport = activeSports.find((sport) => sport.id === id);

                if (!sport) {
                    throw new Error('El deporte no existe');
                }

                if (sport.deleted_at) {
                    throw new Error('El deporte ya fue dado de baja');
                }

                sport.deleted_at = '2026-05-01T00:00:00.000Z';
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

    describe('PATCH /api/v1/sports/:id', () => {
        it('debe retornar 200 y actualizar campos editables del deporte', async () => {
            const payload: UpdateSportRequest = {
                description: ' Actividad deportiva actualizada ',
                max_capacity: 30,
                additional_price: 7000,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/sports/sport-existing',
                payload,
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);

            expect(body.data.id).toBe('sport-existing');
            expect(body.data.name).toBe('Tenis');

            // Debe venir sin espacios porque el repositorio real hace trim.
            expect(body.data.description).toBe('Actividad deportiva actualizada');

            expect(body.data.max_capacity).toBe(30);
            expect(body.data.additional_price).toBe(7000);
            expect(body.data.requires_medical_certificate).toBe(false);
        });

        it('debe retornar 400 si se intenta modificar el nombre del deporte', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/sports/sport-existing',
                payload: {
                    name: 'Fútbol',
                },
            });

            expect(response.statusCode).toBe(400);

            const body = JSON.parse(response.payload);

            expect(body.error).toBe(
                'El nombre del deporte no puede modificarse después de la creación',
            );
        });
        it('debe retornar 404 si el deporte no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/sports/sport-nonexistent',
                payload: {
                    description: 'Intento de actualización',
                },
            });

            expect(response.statusCode).toBe(404);

            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte no existe');
        });
    });

    describe('DELETE /api/v1/sports/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/sport-existing',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el deporte no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/sport-inexistente',
            });

            expect(response.statusCode).toBe(404);

            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte no existe');
        });

        it('debe retornar 409 si el deporte ya fue dado de baja', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/sport-deleted',
            });

            expect(response.statusCode).toBe(409);

            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte ya fue dado de baja');
        });
    });
});