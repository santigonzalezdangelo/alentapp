import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkPaymentAsPaidUseCase } from './MarkPaymentAsPaidUseCase.js';
import { PaymentRepository, PaymentNotPendingError } from '../domain/PaymentRepository.js';
import { Clock } from '../domain/Clock.js';
import { PaymentDTO } from '@alentapp/shared';

describe('MarkPaymentAsPaidUseCase', () => {
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
    let useCase: MarkPaymentAsPaidUseCase;

    beforeEach(() => {
        mockPaymentRepo = {
            create: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findByMemberId: vi.fn(),
            existsActiveByMemberAndPeriod: vi.fn(),
            updateIfPending: vi.fn(),
            markAsPaidIfPending: vi.fn(),
            cancelIfPending: vi.fn(),
            findExpiredPending: vi.fn(),
        };
        useCase = new MarkPaymentAsPaidUseCase(mockPaymentRepo, clock);
    });

    it('marca como Pagado un pago Pendiente y registra la fecha de cobro', async () => {
        const pending = buildPayment({ status: 'Pendiente' });
        const paid = buildPayment({
            status: 'Pagado',
            payment_date: fixedNow.toISOString(),
        });

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(pending);
        vi.mocked(mockPaymentRepo.markAsPaidIfPending).mockResolvedValueOnce(paid);

        const result = await useCase.execute('p-1');

        expect(result.status).toBe('Pagado');
        expect(result.payment_date).toBe(fixedNow.toISOString());
        expect(mockPaymentRepo.markAsPaidIfPending).toHaveBeenCalledWith('p-1', fixedNow);
    });

    it('es idempotente: si el pago ya está Pagado lo retorna sin modificarlo', async () => {
        const paid = buildPayment({
            status: 'Pagado',
            payment_date: '2026-05-10T08:00:00.000Z',
        });

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(paid);

        const result = await useCase.execute('p-1');

        expect(result.status).toBe('Pagado');
        // No debe llamar a markAsPaidIfPending — retorna el pago tal cual
        expect(mockPaymentRepo.markAsPaidIfPending).not.toHaveBeenCalled();
        // La fecha de cobro original NO se modifica
        expect(result.payment_date).toBe('2026-05-10T08:00:00.000Z');
    });

    it('lanza PaymentNotPendingError si el pago está Cancelado', async () => {
        const canceled = buildPayment({ status: 'Cancelado' });
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(canceled);

        await expect(useCase.execute('p-1')).rejects.toBeInstanceOf(PaymentNotPendingError);
        expect(mockPaymentRepo.markAsPaidIfPending).not.toHaveBeenCalled();
    });

    it('lanza error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('p-inexistente')).rejects.toThrow('El pago no existe');
        expect(mockPaymentRepo.markAsPaidIfPending).not.toHaveBeenCalled();
    });
});