import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../application/CreateDisciplineUseCase.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';
import { GetDisciplinesUseCase } from '../application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from '../application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from '../application/DeleteDisciplineUseCase.js';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase,
        private readonly updateDisciplineUseCase: UpdateDisciplineUseCase,
        private readonly deleteDisciplineUseCase: DeleteDisciplineUseCase,
    ) {}
    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const disciplina = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: disciplina });
        } catch (error: any) {
            if (error.message.includes('El socio no existe')) {
                return reply.status(404).send({ message: error.message });
            }

            if (
                error.message.includes('Todos los campos son requeridos') ||
                error.message.includes('El motivo de la sanción es obligatorio') ||
                error.message.includes('El campo is_total_suspension debe ser booleano') ||
                error.message.includes('Formato de fecha inválido') ||
                error.message.includes('La fecha de fin debe ser estrictamente posterior')
            ) {
                return reply.status(400).send({ message: error.message });
            }

            return reply.status(500).send({ message: "Error interno, reintente más tarde" });
        }
    }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const disciplines = await this.getDisciplinesUseCase.execute();
            return reply.status(200).send({ data: disciplines });
        } catch (error: any) {
            console.error(error);
            return reply.status(500).send({ message: "Error interno, reintente más tarde" });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateDisciplineRequest }>,
        reply: FastifyReply
    ) {
        try {
            const discipline = await this.updateDisciplineUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: discipline });
        } catch (error: any) {
            if (error.message.includes('La sanción no existe')) {
                return reply.status(404).send({ message: error.message });
            }

            if (error.message.includes('No se puede modificar una sanción eliminada')) {
                return reply.status(409).send({ message: error.message });
            }

            if (
                error.message.includes('Debe enviarse al menos un campo para actualizar') ||
                error.message.includes('No se permite modificar el socio asociado a la sanción') ||
                error.message.includes('El motivo de la sanción es obligatorio') ||
                error.message.includes('El campo is_total_suspension debe ser booleano') ||
                error.message.includes('Formato de fecha inválido') ||
                error.message.includes('La fecha de fin debe ser estrictamente posterior')
            ) {
                return reply.status(400).send({ message: error.message });
            }

            return reply.status(500).send({ message: "Error interno, reintente más tarde" });
        }
    }
    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteDisciplineUseCase.execute(id);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('Formato de ID inválido')) {
                return reply.status(400).send({ message: error.message });
            }

            if (error.message.includes('La sanción no existe')) {
                return reply.status(404).send({ message: error.message });
            }

            if (error.message.includes('La sanción ya fue eliminada')) {
                return reply.status(409).send({ message: error.message });
            }

            return reply.status(500).send({ message: 'Error interno, reintente más tarde' });
        }
    }
}