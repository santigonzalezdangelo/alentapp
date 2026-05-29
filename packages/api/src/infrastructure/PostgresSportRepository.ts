import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { SportRepository } from '../domain/SportRepository.js';
import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

// Tipo interno que representa cómo Prisma devuelve un Sport desde la base.
type DBSport = {
    id: string;
    name: string;
    description: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
    deleted_at: Date | null;
};

export class PostgresSportRepository implements SportRepository {
    // inserta un deporte nuevo. 
    async create(data: CreateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.create({
            data: {
                name: data.name,
                description: data.description,
                max_capacity: data.max_capacity,
                additional_price: data.additional_price,
                requires_medical_certificate: data.requires_medical_certificate,

                // Todo deporte nuevo nace activo.
                deleted_at: null,
            },
        });

        return this.mapToDTO(sport);
    }

    // busca duplicados solo entre deportes activos.
    async findActiveByName(name: string): Promise<SportDTO | null> {
        const sports = await prisma.sport.findMany({
            where: {
                deleted_at: null,
            },
        });

        const normalizedName = this.normalizeName(name);

        const sport = sports.find(
            (sport) => this.normalizeName(sport.name) === normalizedName,
        );

        return sport ? this.mapToDTO(sport) : null;
    }

    // Normaliza el nombre para comparar sin distinguir mayúsculas, tildes ni espacios externos.
    private normalizeName(name: string): string {
        return name
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // lista deportes activos.
    async findAllActive(): Promise<SportDTO[]> {
        const sports = await prisma.sport.findMany({
            where: {
                deleted_at: null,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return sports.map((sport) => this.mapToDTO(sport));
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.update({
            where: { id },
            data: {
                // !== undefined permite valores validos como false o 0. 
                ...(data.description !== undefined && {
                    description: data.description.trim(),
                }),
                ...(data.max_capacity !== undefined && {
                    max_capacity: data.max_capacity,
                }),
                ...(data.additional_price !== undefined && {
                    additional_price: data.additional_price,
                }),
                ...(data.requires_medical_certificate !== undefined && {
                    requires_medical_certificate: data.requires_medical_certificate,
                }),
            },
        });

        return this.mapToDTO(sport);
    }

    async softDelete(id: string): Promise<void> {
        const sport = await prisma.sport.findUnique({ where: { id } });
            if (!sport || sport.deleted_at) {
            throw new Error('El deporte no existe o ya fue dado de baja');
        }

        await prisma.sport.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    }

    // Transforma el resultado de Prisma en respuesta. 
    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            max_capacity: sport.max_capacity,
            additional_price: sport.additional_price,
            requires_medical_certificate: sport.requires_medical_certificate,
            deleted_at: sport.deleted_at ? sport.deleted_at.toISOString() : null,
        };
    }
}