import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';


if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBDiscipline = {
    id: string;
    reason: string;
    start_date: Date;
    end_date: Date;
    is_total_suspension: boolean;
    deleted_at: Date | null;
    member_id: string;
};

export class PostgresDisciplineRepository implements DisciplineRepository {
    async create(
        data: Omit<DisciplineDTO, 'id'>,
    ): Promise<DisciplineDTO> {
        const discipline = await prisma.discipline.create({
            data: {
                reason: data.reason,
                start_date: new Date(data.start_date),
                end_date: new Date(data.end_date),
                is_total_suspension: data.is_total_suspension,
                deleted_at: data.deleted_at,
                member_id: data.member_id,
            },
        });

        return this.mapToDTO(discipline);
    }

    async findAll(): Promise<DisciplineDTO[]> {
        const disciplines = await prisma.discipline.findMany({
            where: {
                deleted_at: null,
            },
            orderBy: { start_date: 'desc' },
        });
    
        return disciplines.map((discipline) => this.mapToDTO(discipline));
    }

    async findById(id: string): Promise<DisciplineDTO | null> {
        const discipline = await prisma.discipline.findUnique({
            where: { id },
        });
        return discipline ? this.mapToDTO(discipline) : null;
    }

    async update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        const updateDiscipline = await prisma.discipline.update({
            where: { id },
            data: {
                ...(data.reason !== undefined && { 
                    reason: data.reason }),
                ...(data.start_date !== undefined && { 
                    start_date: new Date(data.start_date) }),
                ...(data.end_date !== undefined && { 
                    end_date: new Date(data.end_date) }),
                ...(data.is_total_suspension !== undefined && { 
                    is_total_suspension: data.is_total_suspension 
                }),
            },
        });

        return this.mapToDTO(updateDiscipline);
    }
    
    async softDelete(id: string): Promise<void> {
        await prisma.discipline.update({
            where: { id },
            data: {
                deleted_at: new Date(),
            },
        });
    }

    private mapToDTO(discipline: DBDiscipline): DisciplineDTO {
        return {
            id: discipline.id,
            reason: discipline.reason,
            start_date: discipline.start_date.toISOString(),
            end_date: discipline.end_date.toISOString(),
            is_total_suspension: discipline.is_total_suspension,
            deleted_at: discipline.deleted_at
                ? discipline.deleted_at.toISOString()
                : null,
            member_id: discipline.member_id,
        };
    }
}