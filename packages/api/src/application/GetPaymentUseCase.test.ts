import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPaymentsUseCase } from './GetPaymentsUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { Clock } from '../domain/Clock.js';
import { PaymentDTO } from '@alentapp/shared';

describe('GetPaymentsUseCase', () => {
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
    let useCase: GetPaymentsUseCase;

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
        validator = new PaymentValidator(clock);
        useCase = new GetPaymentsUseCase(mockPaymentRepo, validator);
    });

    describe('sin filtros', () => {
        it('devuelve todos los pagos cuando no se pasan filtros', async () => {
            const payments = [buildPayment({ id: 'p-1' }), buildPayment({ id: 'p-2' })];
            vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce(payments);

            const result = await useCase.execute();

            expect(mockPaymentRepo.findAll).toHaveBeenCalledOnce();
            expect(mockPaymentRepo.findByMemberId).not.toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });

        it('devuelve lista vacía si no hay pagos', async () => {
            vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce([]);

            const result = await useCase.execute();

            expect(result).toEqual([]);
        });

        it('devuelve todos los pagos cuando filters es undefined', async () => {
            vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce([]);

            await useCase.execute(undefined);

            expect(mockPaymentRepo.findAll).toHaveBeenCalledOnce();
        });
    });

    describe('con filtro member_id', () => {
        const validMemberId = '11111111-1111-1111-1111-111111111111';

        it('devuelve pagos del socio cuando se filtra por member_id válido', async () => {
            const payments = [buildPayment({ member_id: validMemberId })];
            vi.mocked(mockPaymentRepo.findByMemberId).mockResolvedValueOnce(payments);

            const result = await useCase.execute({ member_id: validMemberId });

            expect(mockPaymentRepo.findByMemberId).toHaveBeenCalledWith(validMemberId);
            expect(mockPaymentRepo.findAll).not.toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('devuelve lista vacía si el socio no tiene pagos', async () => {
            vi.mocked(mockPaymentRepo.findByMemberId).mockResolvedValueOnce([]);

            const result = await useCase.execute({ member_id: validMemberId });

            expect(result).toEqual([]);
        });

        it('rechaza member_id con formato no-UUID', async () => {
            await expect(
                useCase.execute({ member_id: 'no-es-uuid' }),
            ).rejects.toThrow('Formato de member_id inválido');

            expect(mockPaymentRepo.findByMemberId).not.toHaveBeenCalled();
            expect(mockPaymentRepo.findAll).not.toHaveBeenCalled();
        });


    });
});