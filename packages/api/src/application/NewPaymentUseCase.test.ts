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

    it('crea un pago Pendiente con month/year derivados de due_date', async () => {
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

    it('permite crear pagos para socios Morosos (no solo Activos)', async () => {
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

    it('rechaza con MemberNotFoundError si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: futureDueDate,
            }),
        ).rejects.toBeInstanceOf(MemberNotFoundError);
    });

    it('rechaza con MemberNotActiveError si el socio está Suspendido', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(buildMember('Suspendido'));

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: futureDueDate,
            }),
        ).rejects.toBeInstanceOf(MemberNotActiveError);
    });

    it('rechaza monto inválido (cero o negativo) sin tocar la DB', async () => {
        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 0,
                due_date: futureDueDate,
            }),
        ).rejects.toThrow('Monto inválido');

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: -5,
                due_date: futureDueDate,
            }),
        ).rejects.toThrow('Monto inválido');

        expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    it('rechaza due_date con formato incorrecto', async () => {
        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: '30-06-2026',
            }),
        ).rejects.toThrow('Formato de fecha inválido');
    });

    it('rechaza due_date que no es futura', async () => {
        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: '2026-05-15', // mismo día que fixedNow
            }),
        ).rejects.toThrow('La fecha de vencimiento debe ser futura');
    });

    it('rechaza member_id con formato no-UUID', async () => {
        await expect(
            useCase.execute({
                member_id: 'no-uuid',
                amount: 100,
                due_date: futureDueDate,
            }),
        ).rejects.toThrow('Formato de member_id inválido');
    });

    it('rechaza con DuplicateActivePaymentError si ya existe un pago activo en el mismo período', async () => {
        vi.mocked(mockPaymentRepo.existsActiveByMemberAndPeriod).mockResolvedValueOnce(true);

        await expect(
            useCase.execute({
                member_id: validMemberId,
                amount: 100,
                due_date: futureDueDate,
            }),
        ).rejects.toBeInstanceOf(DuplicateActivePaymentError);
    });

    it('consulta unicidad con el período correcto (mes/año derivados de due_date)', async () => {
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce({} as never);

        await useCase.execute({
            member_id: validMemberId,
            amount: 100,
            due_date: '2027-09-15',
        });

        expect(mockPaymentRepo.existsActiveByMemberAndPeriod).toHaveBeenCalledWith(
            validMemberId,
            9,
            2027,
        );
    });
});
