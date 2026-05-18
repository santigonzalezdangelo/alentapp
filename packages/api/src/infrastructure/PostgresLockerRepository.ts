import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBLocker = {
    id: string;
    number: number;
    location: 'MALE' | 'FEMALE' | 'CHILDREN';
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    member_id: string | null;
    contract_end_date: Date | null;
};

export class PostgresLockerRepository implements LockerRepository {

async create(data: {
    number: number;
    location: 'MALE' | 'FEMALE' | 'CHILDREN';
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    member_id: string | null;
    contract_end_date: string | null;
}): Promise<LockerDTO> {
    const locker = await prisma.locker.create({
    data: {
        number: data.number,
        location: data.location,
        status: data.status,
        member_id: data.member_id,
        contract_end_date: data.contract_end_date
        ? new Date(data.contract_end_date)
        : null,
    },
    });

    return this.mapToDTO(locker);
}

async findByNumber(number: number): Promise<LockerDTO | null> {
    const locker = await prisma.locker.findUnique({
    where: { number },
    });

    return locker ? this.mapToDTO(locker) : null;
}


async findAll(): Promise<LockerDTO[]> {
    const lockers = await prisma.locker.findMany({
    orderBy: { number: 'asc' },
    });

    return lockers.map((l) => this.mapToDTO(l));
}

async findById(id: string): Promise<LockerDTO | null> {
    const locker = await prisma.locker.findUnique({
    where: { id },
});

if (!locker) {
    return null;
}

return this.mapToDTO(locker);
}

async update(id: string, data: any): Promise<LockerDTO> {
    const locker = await prisma.locker.update({
    where: { id },
    data: {
        status: data.status,
        member_id: data.member_id,
        contract_end_date:
            data.contract_end_date !== undefined
                ? data.contract_end_date
                ? new Date(data.contract_end_date)
                : null
            : undefined,
    },
    });

    return this.mapToDTO(locker);
}

    async delete(id: string): Promise<void> {
    await prisma.locker.delete({
    where: { id },
});
}

    private mapToDTO(locker: DBLocker): LockerDTO {
    return {
        id: locker.id,
        number: locker.number,
        location: locker.location,
        status: locker.status,
        member_id: locker.member_id,
        contract_end_date: locker.contract_end_date
        ? locker.contract_end_date.toISOString().split('T')[0]
        : null,
    };
}
}