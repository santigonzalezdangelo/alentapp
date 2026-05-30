import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberDTO, CreateMemberRequest, UpdateMemberRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBMember = {
    id: string;
    dni: string;
    name: string;
    email: string;
    birthdate: Date | null;
    category: 'Pleno' | 'Cadete' | 'Honorario';
    status: 'Activo' | 'Moroso' | 'Suspendido';
    created_at: Date;
    deleted_at: Date | null;

};

export class PostgresMemberRepository implements MemberRepository {
    async create(data: CreateMemberRequest): Promise<MemberDTO> {
        const member = await prisma.member.create({
            data: {
                dni: data.dni,
                name: data.name,
                email: data.email,
                birthdate: new Date(data.birthdate),
                category: data.category,

            },
        });

        return this.mapToDTO(member);
    }

    async findAll(): Promise<MemberDTO[]> {
        const members = await prisma.member.findMany({
            where: { deleted_at: null },        
            orderBy: { created_at: 'desc' },
        });
        return members.map(this.mapToDTO);
    }

    async findById(id: string): Promise<MemberDTO | null> {
     
        const member = await prisma.member.findFirst({
            where: { id, deleted_at: null },     
        });
        return member ? this.mapToDTO(member) : null;
    }

    async findByDni(dni: string): Promise<MemberDTO | null> {
        const member = await prisma.member.findFirst({
            where: { dni, deleted_at: null },    
        });
        return member ? this.mapToDTO(member) : null;
    }


    async update(id: string, data: UpdateMemberRequest): Promise<MemberDTO> {
        const member = await prisma.member.update({
            where: { id },
            data: {
                ...(data.dni && { dni: data.dni }),
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.birthdate && { birthdate: new Date(data.birthdate) }),
                ...(data.category && { category: data.category }),
                ...(data.status && { status: data.status }),
            },
        });

        return this.mapToDTO(member);
    }
    async delete(id: string): Promise<void> {
        await prisma.member.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    }



    private mapToDTO(member: DBMember): MemberDTO {
        return {
            id: member.id,
            dni: member.dni,
            name: member.name,
            email: member.email,
            birthdate: member.birthdate ? member.birthdate.toISOString().split('T')[0] : '', // Extract YYYY-MM-DD
            category: member.category,
            status: member.status,
            created_at: member.created_at.toISOString(),
        };
    }
}
