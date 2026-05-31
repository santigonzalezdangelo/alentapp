import { PaymentRepository, PaymentNotPendingError } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { PaymentDTO, UpdatePaymentRequest } from '@alentapp/shared';

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly validator: PaymentValidator,
    ) {}

    async execute(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
        const existing = await this.paymentRepo.findById(id);
        if (!existing) {
            throw new Error('El pago no existe');
        }

        if (existing.status !== 'Pendiente') {
            throw new PaymentNotPendingError(existing.status as 'Pagado' | 'Cancelado');
        }

        if (data.amount !== undefined) {
            this.validator.validateAmount(data.amount);
        }

        let month = existing.month;
        let year = existing.year;

        if (data.due_date !== undefined) {
            const parsedDue = this.validator.parseDueDate(data.due_date);
            this.validator.validateDueDateIsFuture(parsedDue);
            const period = this.validator.extractPeriod(parsedDue);
            month = period.month;
            year = period.year;

            const isDuplicate = await this.paymentRepo.existsActiveByMemberAndPeriod(
                existing.member_id,
                month,
                year,
                id
            );

            if (isDuplicate) {
                throw new Error('Ya existe un pago activo para ese socio en ese período');
            }
        }

        return await this.paymentRepo.updateIfPending(id, {
            amount: data.amount,
            due_date: data.due_date,
            month,
            year
        });
    }
}

