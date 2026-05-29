import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { Clock } from '../domain/Clock.js';
import { PaymentDTO, CreatePaymentRequest } from '@alentapp/shared';

export class MemberNotFoundError extends Error {
    constructor() {
        super('El socio no existe');
        this.name = 'MemberNotFoundError';
    }
}

export class MemberNotActiveError extends Error {
    constructor() {
        super('No se puede generar el pago para un socio inactivo');
        this.name = 'MemberNotActiveError';
    }
}

export class DuplicateActivePaymentError extends Error {
    constructor() {
        super('Ya existe un pago activo para ese socio en ese período');
        this.name = 'DuplicateActivePaymentError';
    }
}

export class NewPaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly memberRepo: MemberRepository,
        private readonly validator: PaymentValidator,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        private readonly clock: Clock,
    ) {}

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        // 1. Validaciones puras de formato
        this.validator.validateUuid(data.member_id, 'member_id');
        this.validator.validateAmount(data.amount);
        const parsedDate = this.validator.parseDueDate(data.due_date);
        this.validator.validateDueDateIsFuture(parsedDate);

        // 2. Derivar período (mes/año) desde due_date como única fuente de verdad
        const { month, year } = this.validator.extractPeriod(parsedDate);

        // 3. Validar socio
        const member = await this.memberRepo.findById(data.member_id);
        if (!member) {
            throw new MemberNotFoundError();
        }
        if (member.status === 'Suspendido') {
            throw new MemberNotActiveError();
        }

        // 4. Validar unicidad por período
        const exists = await this.paymentRepo.existsActiveByMemberAndPeriod(
            data.member_id,
            month,
            year,
        );
        if (exists) {
            throw new DuplicateActivePaymentError();
        }

        // 5. Crear el pago
        return this.paymentRepo.create({
            member_id: data.member_id,
            amount: data.amount,
            month,
            year,
            due_date: data.due_date,
        });
    }
}