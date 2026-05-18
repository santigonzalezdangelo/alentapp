import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportUseCase } from '../application/CreateSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { CreateSportRequest, UpdateSportRequest} from '@alentapp/shared';

type RawUpdateSportRequest = UpdateSportRequest & {
    name?: unknown;
    deleted_at?: unknown;
};
export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly getSportsUseCase: GetSportsUseCase,
        private readonly updateSportUseCase: UpdateSportUseCase,
        private readonly deleteSportUseCase: DeleteSportUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const sports = await this.getSportsUseCase.execute();
            return reply.status(200).send({ data: sports });
        } catch (error: any) {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('Ya existe')) {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message.includes('obligatorios') ||
                error.message.includes('cupo') ||
                error.message.includes('precio')
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: RawUpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        try {
            // Extrae el id de la URL y delega la actualización al caso de uso con los datos enviados en el body.
            const { id } = request.params;
            const sport = await this.updateSportUseCase.execute(id, request.body);
            return reply.status(200).send({ data: sport });

        } catch (error: any) {
            if (error.message.includes('no existe')) {
               return reply.status(404).send({ error: error.message });
            }

            if (error.message.includes('dado de baja')) {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message.includes('modificarse') ||
                error.message.includes('Debe enviar') ||
                error.message.includes('descripción') ||
                error.message.includes('cupo') ||
                error.message.includes('precio')
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            await this.deleteSportUseCase.execute(id);
            return reply.status(200).send({ message: 'Deporte eliminado correctamente' });
        } catch (error: any) {
            if (error.message.includes('no existe') || error.message.includes('ya fue dado de baja')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}