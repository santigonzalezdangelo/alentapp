import { PaymentRepository } from '../domain/PaymentRepository.js';
import { Clock } from '../domain/Clock.js';
import { PaymentDTO } from '@alentapp/shared';

export class CancelPaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly clock: Clock,
    ) {}

    async execute(id: string): Promise<PaymentDTO> {
        const existing = await this.paymentRepo.findById(id);
        if (!existing) {
            throw new Error('El pago no existe');
        }
        return this.paymentRepo.cancelIfPending(id, this.clock.now());
    }
}