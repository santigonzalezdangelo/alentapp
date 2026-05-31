import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreatePaymentRequest } from '@alentapp/shared';

const ids = vi.hoisted(() => ({
    MEMBER_ID_ACTIVE: '11111111-1111-1111-1111-111111111111',
    MEMBER_ID_SUSPENDIDO: '22222222-2222-2222-2222-222222222222',
    PAYMENT_PENDING: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    PAYMENT_PAID: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    PAYMENT_CANCELED: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
}));

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class {
        async findById(id: string) {
            if (id === ids.MEMBER_ID_ACTIVE) {
                return {
                    id: ids.MEMBER_ID_ACTIVE,
                    dni: '12345678',
                    name: 'Activo',
                    email: 'a@a.com',
                    birthdate: '1990-01-01',
                    category: 'Pleno',
                    status: 'Activo',
                    created_at: '2026-01-01T00:00:00.000Z',
                };
            }
            if (id === ids.MEMBER_ID_SUSPENDIDO) {
                return {
                    id: ids.MEMBER_ID_SUSPENDIDO,
                    dni: '99999999',
                    name: 'Suspendido',
                    email: 's@s.com',
                    birthdate: '1990-01-01',
                    category: 'Pleno',
                    status: 'Suspendido',
                    created_at: '2026-01-01T00:00:00.000Z',
                };
            }
            return null;
        }
        async findAll() { return []; }
        async findByDni() { return null; }
        async create() { return null; }
        async update() { return null; }
        async delete() { return; }
    },
}));

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    const payments: Record<string, any> = {
        [ids.PAYMENT_PENDING]: {
            id: ids.PAYMENT_PENDING,
            member_id: ids.MEMBER_ID_ACTIVE,
            amount: 1500,
            month: 6,
            year: 2026,
            status: 'Pendiente',
            due_date: '2026-06-30T00:00:00.000Z',
            payment_date: null,
            created_at: '2026-05-15T10:00:00.000Z',
            updated_at: '2026-05-15T10:00:00.000Z',
            canceled_at: null,
        },
        [ids.PAYMENT_PAID]: {
            id: ids.PAYMENT_PAID,
            member_id: ids.MEMBER_ID_ACTIVE,
            amount: 1500,
            month: 5,
            year: 2026,
            status: 'Pagado',
            due_date: '2026-05-31T00:00:00.000Z',
            payment_date: '2026-05-10T08:00:00.000Z',
            created_at: '2026-04-15T10:00:00.000Z',
            updated_at: '2026-05-10T08:00:00.000Z',
            canceled_at: null,
        },
        [ids.PAYMENT_CANCELED]: {
            id: ids.PAYMENT_CANCELED,
            member_id: ids.MEMBER_ID_ACTIVE,
            amount: 1500,
            month: 4,
            year: 2026,
            status: 'Cancelado',
            due_date: '2026-04-30T00:00:00.000Z',
            payment_date: null,
            created_at: '2026-03-15T10:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
            canceled_at: '2026-05-01T00:00:00.000Z',
        },
    };

    return {
        PostgresPaymentRepository: class {
            async create(data: any) {
                const id = 'new-' + Math.random().toString(36).slice(2, 10);
                const payment = {
                    id,
                    ...data,
                    status: 'Pendiente',
                    payment_date: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    canceled_at: null,
                    due_date: new Date(data.due_date).toISOString(),
                };
                payments[id] = payment;
                return payment;
            }
            async findById(id: string) { return payments[id] ?? null; }
            async findAll() { return Object.values(payments); }
            async findByMemberId(member_id: string) {
                return Object.values(payments).filter((p) => p.member_id === member_id);
            }
            async existsActiveByMemberAndPeriod(
                member_id: string,
                month: number,
                year: number,
                excluding_payment_id?: string,
            ) {
                return Object.values(payments).some(
                    (p) =>
                        p.member_id === member_id &&
                        p.month === month &&
                        p.year === year &&
                        (p.status === 'Pendiente' || p.status === 'Pagado') &&
                        p.id !== excluding_payment_id,
                );
            }
            async updateIfPending(id: string, data: any) {
                const current = payments[id];
                if (!current) throw new Error('El pago no existe');
                if (current.status !== 'Pendiente') {
                    const { PaymentNotPendingError } = await import('../domain/PaymentRepository.js');
                    throw new PaymentNotPendingError(current.status);
                }
                if (data.amount !== undefined) current.amount = data.amount;
                if (data.due_date !== undefined) {
                    current.due_date = new Date(data.due_date).toISOString();
                    current.month = data.month;
                    current.year = data.year;
                }
                current.updated_at = new Date().toISOString();
                return current;
            }
            async markAsPaidIfPending(id: string, payment_date: Date) {
                const current = payments[id];
                if (!current) throw new Error('El pago no existe');
                if (current.status !== 'Pendiente') {
                    const { PaymentNotPendingError } = await import('../domain/PaymentRepository.js');
                    throw new PaymentNotPendingError(current.status);
                }
                current.status = 'Pagado';
                current.payment_date = payment_date.toISOString();
                current.updated_at = new Date().toISOString();
                return current;
            }
            async cancelIfPending(id: string, canceled_at: Date) {
                const current = payments[id];
                if (!current) throw new Error('El pago no existe');
                if (current.status !== 'Pendiente') {
                    const { PaymentNotPendingError } = await import('../domain/PaymentRepository.js');
                    throw new PaymentNotPendingError(current.status);
                }
                current.status = 'Cancelado';
                current.canceled_at = canceled_at.toISOString();
                current.updated_at = new Date().toISOString();
                return current;
            }
            async findExpiredPending() { return []; }
        },
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/payments', () => {
        it('1) 201 al crear pago con datos válidos para socio Activo', async () => {
            const payload: CreatePaymentRequest = {
                member_id: ids.MEMBER_ID_ACTIVE,
                amount: 2000,
                due_date: '2099-12-31',
            };
            const res = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.payload);
            expect(body.data.status).toBe('Pendiente');
            expect(body.data.month).toBe(12);
            expect(body.data.year).toBe(2099);
        });

        it('2) 404 si el socio no existe', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: '99999999-9999-9999-9999-999999999999',
                    amount: 100,
                    due_date: '2099-12-31',
                },
            });
            expect(res.statusCode).toBe(404);
        });

        it('3) 409 si el socio está Suspendido', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: ids.MEMBER_ID_SUSPENDIDO,
                    amount: 100,
                    due_date: '2099-12-31',
                },
            });
            expect(res.statusCode).toBe(409);
        });

        it('4) 400 si la fecha no es futura', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: ids.MEMBER_ID_ACTIVE,
                    amount: 100,
                    due_date: '2020-01-01',
                },
            });
            expect(res.statusCode).toBe(400);
        });


    });

    describe('GET /api/v1/payments', () => {
        it('5) 200 con lista completa de pagos', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/v1/payments' });
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeGreaterThan(0);
        });


    });

    

    describe(' PATCH /api/v1/payments/:id/pay', () => {
        it('6) 200 al cobrar un pago Pendiente', async () => {
            const res = await app.inject({
                method: 'PATCH',
                url: `/api/v1/payments/${ids.PAYMENT_PENDING}/pay`,
            });
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(body.data.status).toBe('Pagado');
            expect(body.data.payment_date).toBeTruthy();
        });


    describe('PATCH /api/v1/payments/:id (editar)', () => {
        it('7) 200 al actualizar el monto de un pago Pendiente', async () => {
           
            const create = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: ids.MEMBER_ID_ACTIVE,
                    amount: 500,
                    due_date: '2099-11-30',
                },
            });
            const created = JSON.parse(create.payload).data;

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/v1/payments/${created.id}`,
                payload: { amount: 9999 },
            });
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(body.data.amount).toBe(9999);
        });

        it('8) 400 si el monto es inválido', async () => {
            const create = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: ids.MEMBER_ID_ACTIVE,
                    amount: 500,
                    due_date: '2099-09-30',
                },
            });
            const created = JSON.parse(create.payload).data;

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/v1/payments/${created.id}`,
                payload: { amount: 0 },
            });
            expect(res.statusCode).toBe(400);
        });

        it('9) 400 si la nueva fecha de vencimiento no es futura', async () => {
            const create = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: {
                    member_id: ids.MEMBER_ID_ACTIVE,
                    amount: 500,
                    due_date: '2099-08-31',
                },
            });
            const created = JSON.parse(create.payload).data;

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/v1/payments/${created.id}`,
                payload: { due_date: '2020-01-01' },
            });
            expect(res.statusCode).toBe(400);
            });
        });
    });

});