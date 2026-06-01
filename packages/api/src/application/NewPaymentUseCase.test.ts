import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    NewPaymentUseCase,
    MemberNotFoundError,
    MemberNotActiveError,
    DuplicateActivePaymentError,
} from './NewPaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { Clock } from '../domain/Clock.js';

describe('NewPaymentUseCase', () => {
    const fixedNow = new Date('2026-05-15T10:00:00.000Z');
    const validMemberId = '11111111-1111-1111-1111-111111111111';
    const futureDueDate = '2026-06-30';

    let mockPaymentRepo: PaymentRepository;
    let mockMemberRepo: MemberRepository;
    let validator: PaymentValidator;
    let clock: Clock;
    let useCase: NewPaymentUseCase;

    // Helper para crear un socio mock con status configurable
    const buildMember = (status: 'Activo' | 'Moroso' | 'Suspendido') => ({
        id: validMemberId,
        dni: '12345678',
        name: 'Juan',
        email: 'juan@test.com',
        birthdate: '1990-01-01',
        category: 'Pleno' as const,
        status,
        created_at: '2026-01-01T00:00:00.000Z',
    });

    beforeEach(() => {
        clock = { now: () => fixedNow };
        validator = new PaymentValidator(clock);

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

        mockMemberRepo = {
            create: vi.fn(),
            findById: vi.fn().mockResolvedValue(buildMember('Activo')),
            findByDni: vi.fn(),
            findAll: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        useCase = new NewPaymentUseCase(mockPaymentRepo, mockMemberRepo, validator, clock);
    });

    it('1) crea un pago Pendiente con month/year derivados de due_date', async () => {
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce({
            id: 'p-1',
            member_id: validMemberId,
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
        });

        const result = await useCase.execute({
            member_id: validMemberId,
            amount: 1500,
            due_date: futureDueDate,
        });

        expect(mockPaymentRepo.create).toHaveBeenCalledWith({
            member_id: validMemberId,
            amount: 1500,
            month: 6,
            year: 2026,
            due_date: futureDueDate,
        });
        expect(result.status).toBe('Pendiente');
    });

    it('2) permite crear pagos para socios Morosos (no solo Activos)', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(buildMember('Moroso'));
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce({} as never);

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: futureDueDate,
            }),
        ).resolves.toBeDefined();
    });

    it('3)rechaza con MemberNotFoundError si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: futureDueDate,
            }),
        ).rejects.toBeInstanceOf(MemberNotFoundError);
    });


});
