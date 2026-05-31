import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository, PaymentNotPendingError } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { Clock } from '../domain/Clock.js';
import { PaymentDTO } from '@alentapp/shared';

describe('UpdatePaymentUseCase', () => {
    const fixedNow = new Date('2026-05-15T10:00:00.000Z');
    const clock: Clock = { now: () => fixedNow };

    const buildPayment = (overrides: Partial<PaymentDTO> = {}): PaymentDTO => ({
        id: 'p-1',
        member_id: '11111111-1111-1111-1111-111111111111',
        member_name: 'Juan',
        member_dni: '12345678',
        amount: 1500,
        month: 6,
        year: 2026,
        status: 'Pendiente',
        due_date: '2026-06-30T00:00:00.000Z',
        payment_date: null,
        created_at: '2026-05-15T10:00:00.000Z',
        updated_at: '2026-05-15T10:00:00.000Z',
        canceled_at: null,
        ...overrides,
    });

    let mockPaymentRepo: PaymentRepository;
    let validator: PaymentValidator;
    let useCase: UpdatePaymentUseCase;

    beforeEach(() => {
        mockPaymentRepo = {
            create: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findByMemberId: vi.fn(),
            existsActiveByMemberAndPeriod: vi.fn().mockResolvedValue(false),
            updateIfPending: vi.fn(),
            markAsPaidIfPending: vi.fn(),
            cancelIfPending: vi.fn(),
            findExpiredPending: vi.fn(),
        };
        validator = new PaymentValidator(clock);
        useCase = new UpdatePaymentUseCase(mockPaymentRepo, validator);
    });

    describe('actualizar monto', () => {
        it('6) actualiza el monto de un pago Pendiente', async () => {
            const pending = buildPayment({ amount: 1500 });
            const updated = buildPayment({ amount: 2000 });

            vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(pending);
            vi.mocked(mockPaymentRepo.updateIfPending).mockResolvedValueOnce(updated);

            const result = await useCase.execute('p-1', { amount: 2000 });

            expect(result.amount).toBe(2000);
            expect(mockPaymentRepo.updateIfPending).toHaveBeenCalledWith('p-1', {
                amount: 2000,
                due_date: undefined,
                month: 6,
                year: 2026,
            });
        });

    });

    describe('actualizar fecha de vencimiento', () => {
        it('7) actualiza la fecha y deriva el nuevo período', async () => {
            const pending = buildPayment({ month: 6, year: 2026 });
            const updated = buildPayment({
                due_date: '2026-08-31T00:00:00.000Z',
                month: 8,
                year: 2026,
            });

            vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(pending);
            vi.mocked(mockPaymentRepo.updateIfPending).mockResolvedValueOnce(updated);

            const result = await useCase.execute('p-1', { due_date: '2026-08-31' });

            expect(result.month).toBe(8);
            expect(result.year).toBe(2026);
            expect(mockPaymentRepo.updateIfPending).toHaveBeenCalledWith('p-1', {
                amount: undefined,
                due_date: '2026-08-31',
                month: 8,
                year: 2026,
            });
        });

    });

    describe('errores de estado', () => {
        it('8)lanza PaymentNotPendingError si el pago está Pagado', async () => {
            const paid = buildPayment({ status: 'Pagado' });
            vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(paid);

            await expect(
                useCase.execute('p-1', { amount: 999 }),
            ).rejects.toBeInstanceOf(PaymentNotPendingError);

            expect(mockPaymentRepo.updateIfPending).not.toHaveBeenCalled();
        });

    });
});