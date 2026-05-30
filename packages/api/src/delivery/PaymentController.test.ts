import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentController } from './PaymentController.js';
import {
    MemberNotFoundError,
    MemberNotActiveError,
    DuplicateActivePaymentError,
} from '../application/NewPaymentUseCase.js';

describe('PaymentController - create y getAll', () => {
    // Mocks de los 5 use cases que recibe el controller en el constructor.
    // Solo usamos newPaymentUseCase y getPaymentsUseCase en estos tests;
    // los otros se mockean igual porque el constructor los exige.
    const mockNewUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const mockPayUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockCancelUseCase = { execute: vi.fn() };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new PaymentController(
        mockNewUseCase as any,
        mockGetUseCase as any,
        mockPayUseCase as any,
        mockUpdateUseCase as any,
        mockCancelUseCase as any,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const mockRequest = {
        log: { error: vi.fn() },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('201 con el pago creado cuando todo es válido', async () => {
            const payment = { id: 'p1', status: 'Pendiente' };
            mockNewUseCase.execute.mockResolvedValueOnce(payment);

            await controller.create(
                {
                    ...mockRequest,
                    body: { member_id: 'm1', amount: 100, due_date: '2026-06-30' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: payment });
        });

        it('mapea MemberNotFoundError a 404', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(new MemberNotFoundError());

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(404);
        });

        it('mapea MemberNotActiveError a 409', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(new MemberNotActiveError());

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('mapea DuplicateActivePaymentError a 409', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(new DuplicateActivePaymentError());

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('mapea errores con mensaje "inválido" a 400', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(new Error('Monto inválido'));

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('mapea "La fecha de vencimiento debe ser futura" a 400', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(
                new Error('La fecha de vencimiento debe ser futura'),
            );

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('mapea errores desconocidos a 500 con mensaje genérico', async () => {
            mockNewUseCase.execute.mockRejectedValueOnce(new Error('Boom DB'));

            await controller.create(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, body: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('getAll', () => {
        it('200 con la lista completa de pagos', async () => {
            mockGetUseCase.execute.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]);

            await controller.getAll(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, query: {} } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockGetUseCase.execute).toHaveBeenCalledWith(undefined);
            expect(mockReply.status).toHaveBeenCalledWith(200);
        });

        it('200 con filtro member_id cuando viene en query', async () => {
            mockGetUseCase.execute.mockResolvedValueOnce([]);

            await controller.getAll(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...mockRequest, query: { member_id: 'm1' } } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockReply as any,
            );

            expect(mockGetUseCase.execute).toHaveBeenCalledWith({ member_id: 'm1' });
        });
    });
});
