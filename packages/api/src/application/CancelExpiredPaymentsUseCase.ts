import { PaymentRepository } from '../domain/PaymentRepository.js';
import { Clock } from '../domain/Clock.js';
import { CancelPaymentUseCase } from './CancelPaymentUseCase.js';

export interface JobLogger {
    info(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
}

export interface JobRunResult {
    selected: number;
    canceled: number;
    skipped: number;
    failed: number;
}

export class CancelExpiredPaymentsUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly cancelUseCase: CancelPaymentUseCase,
        private readonly clock: Clock,
        private readonly logger: JobLogger = consoleLogger(),
    ) {}

    async execute(): Promise<JobRunResult> {
        const result: JobRunResult = { selected: 0, canceled: 0, skipped: 0, failed: 0 };
        const now = this.clock.now();

        let expired;
        try {
            expired = await this.paymentRepo.findExpiredPending(now);
        } catch (err) {
            this.logger.error('No se pudieron obtener los pagos vencidos', {
                error: (err as Error).message,
            });
            return result;
        }

        result.selected = expired.length;
        this.logger.info(`Job de vencimiento: ${expired.length} pagos seleccionados`, {
            now: now.toISOString(),
        });

        for (const payment of expired) {
            try {
                const updated = await this.cancelUseCase.execute(payment.id);
                if (updated.canceled_at === payment.canceled_at) {
                    result.skipped += 1;
                } else {
                    result.canceled += 1;
                }
            } catch (err) {
                result.failed += 1;
                this.logger.error('Falló la cancelación de un pago vencido', {
                    payment_id: payment.id,
                    error: (err as Error).message,
                });
            }
        }

        this.logger.info(
            'Job de vencimiento finalizado',
            result as unknown as Record<string, unknown>,
        );
        return result;
    }
}

function consoleLogger(): JobLogger {
    return {
        info: (msg, meta) => console.log(`[CancelExpiredPaymentsUseCase] ${msg}`, meta ?? ''),
        error: (msg, meta) => console.error(`[CancelExpiredPaymentsUseCase] ${msg}`, meta ?? ''),
    };
}