import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import {
    PaymentRepository,
    CreatePaymentData,
    UpdatePaymentData,
    PaymentNotPendingError,
} from '../domain/PaymentRepository.js';
import { PaymentDTO } from '@alentapp/shared';

let prismaInstance: PrismaClient | null = null;
function getPrisma(): PrismaClient {
    if (!prismaInstance) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        prismaInstance = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL),
        });
    }
    return prismaInstance;
}

type DBPayment = {
    id: string;
    member_id: string;
    amount: any;
    month: number;
    year: number;
    status: 'Pendiente' | 'Pagado' | 'Cancelado';
    due_date: Date;
    payment_date: Date | null;
    created_at: Date;
    updated_at: Date;
    canceled_at: Date | null;
    member?: { name: string; dni: string } | null;
};

export class PostgresPaymentRepository implements PaymentRepository {
    async create(data: CreatePaymentData): Promise<PaymentDTO> {
        const payment = await getPrisma().payment.create({
            data: {
                member_id: data.member_id,
                amount: data.amount,
                month: data.month,
                year: data.year,
                due_date: new Date(data.due_date),
                status: 'Pendiente',
            },
        });
        return this.mapToDTO(payment as unknown as DBPayment);
    }

    async findById(id: string): Promise<PaymentDTO | null> {
        const payment = await getPrisma().payment.findUnique({ where: { id } });
        return payment ? this.mapToDTO(payment as unknown as DBPayment) : null;
    }

    async findAll(): Promise<PaymentDTO[]> {
        const payments = await getPrisma().payment.findMany({
            orderBy: { created_at: 'desc' },
            include: { member: { select: { name: true, dni: true } } }, 
        });
        return payments.map((p) => this.mapToDTO(p as unknown as DBPayment));
    }

    async findByMemberId(member_id: string): Promise<PaymentDTO[]> {
        const payments = await getPrisma().payment.findMany({
            where: { member_id },
            orderBy: { due_date: 'desc' },
            include: { member: { select: { name: true, dni: true } } },
        });
        return payments.map((p) => this.mapToDTO(p as unknown as DBPayment));
    }

    async existsActiveByMemberAndPeriod(
        member_id: string,
        month: number,
        year: number,
        excluding_payment_id?: string,
    ): Promise<boolean> {
        const count = await getPrisma().payment.count({
            where: {
                member_id,
                month,
                year,
                status: { in: ['Pendiente', 'Pagado'] },
                ...(excluding_payment_id ? { NOT: { id: excluding_payment_id } } : {}),
            },
        });
        return count > 0;
    }

    async updateIfPending(id: string, data: UpdatePaymentData): Promise<PaymentDTO> {
        const updated = await getPrisma().$transaction(async (tx) => {
            const current = await tx.payment.findUnique({ where: { id } });
            if (!current) {
                throw new PaymentNotPendingError('Cancelado');
            }
            if (current.status !== 'Pendiente') {
                throw new PaymentNotPendingError(current.status as 'Pagado' | 'Cancelado');
            }
            return tx.payment.update({
                where: { id },
                data: {
                    ...(data.amount !== undefined && { amount: data.amount }),
                    ...(data.due_date !== undefined && { due_date: new Date(data.due_date) }),
                    ...(data.month !== undefined && { month: data.month }),
                    ...(data.year !== undefined && { year: data.year }),
                },
            });
        });
        return this.mapToDTO(updated as unknown as DBPayment);
    }

    async markAsPaidIfPending(id: string, payment_date: Date): Promise<PaymentDTO> {
        const updated = await getPrisma().$transaction(async (tx) => {
            const current = await tx.payment.findUnique({ where: { id } });
            if (!current) {
                throw new PaymentNotPendingError('Cancelado');
            }
            if (current.status !== 'Pendiente') {
                throw new PaymentNotPendingError(current.status as 'Pagado' | 'Cancelado');
            }
            return tx.payment.update({
                where: { id },
                data: { status: 'Pagado', payment_date },
            });
        });
        return this.mapToDTO(updated as unknown as DBPayment);
    }

    async cancelIfPending(id: string, canceled_at: Date): Promise<PaymentDTO> {
        const updated = await getPrisma().$transaction(async (tx) => {
            const current = await tx.payment.findUnique({ where: { id } });
            if (!current) {
                throw new PaymentNotPendingError('Cancelado');
            }
            if (current.status !== 'Pendiente') {
                throw new PaymentNotPendingError(current.status as 'Pagado' | 'Cancelado');
            }
            return tx.payment.update({
                where: { id },
                data: { status: 'Cancelado', canceled_at },
            });
        });
        return this.mapToDTO(updated as unknown as DBPayment);
    }

    async findExpiredPending(now: Date): Promise<PaymentDTO[]> {
        const payments = await getPrisma().payment.findMany({
            where: {
                status: 'Pendiente',
                due_date: { lt: now },
            },
            orderBy: { due_date: 'asc' },
        });
        return payments.map((p) => this.mapToDTO(p as unknown as DBPayment));
    }

    private mapToDTO(payment: DBPayment): PaymentDTO {
        const amountRaw = payment.amount;
        const amountNumber =
            typeof amountRaw === 'number'
                ? amountRaw
                : Number(typeof amountRaw === 'string' ? amountRaw : amountRaw.toString());

        return {
            id: payment.id,
            member_id: payment.member_id,
            member_name: payment.member?.name,  
            member_dni: payment.member?.dni,     
            amount: amountNumber,
            month: payment.month,
            year: payment.year,
            status: payment.status,
            due_date: payment.due_date.toISOString(),
            payment_date: payment.payment_date ? payment.payment_date.toISOString() : null,
            created_at: payment.created_at.toISOString(),
            updated_at: payment.updated_at.toISOString(),
            canceled_at: payment.canceled_at ? payment.canceled_at.toISOString() : null,
        };
    }
}