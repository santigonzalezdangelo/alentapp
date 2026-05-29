import { FastifyRequest, FastifyReply } from 'fastify';

import {
    CreateLockerRequest,
    UpdateLockerRequest,
} from '@alentapp/shared';

import { CreateLockerUseCase } from '../application/CreateLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly getLockerUseCase: GetLockersUseCase,
        private readonly updateLockerUseCase: UpdateLockerUseCase,
        private readonly deleteLockerUseCase: DeleteLockerUseCase,
    ) {}

    async create(
        request: FastifyRequest<{
            Body: CreateLockerRequest;
        }>,
        reply: FastifyReply,
    ) {
        try {
            request.log.info(
                'Creación de locker solicitada',
            );

            const locker =
                await this.createLockerUseCase.execute(
                    request.body,
                );

            return reply.status(201).send({
                data: locker,
            });
        } catch (error: any) {
            if (error.message.includes('Ya existe')) {
                return reply.status(409).send({
                    message: error.message,
                });
            }

            if (
                error.message.includes('requeridos') ||
                error.message.includes('entero') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('ubicación') ||
                error.message.includes('inválida')
            ) {
                return reply.status(400).send({
                    message: error.message,
                });
            }

            return reply.status(500).send({
                message:
                    'Error interno, reintente más tarde',
            });
        }
    }

    async getAll(
        _request: FastifyRequest,
        reply: FastifyReply,
    ) {
        try {
            const lockers =
                await this.getLockerUseCase.execute();

            return reply.status(200).send({
                data: lockers,
            });
        } catch {
            return reply.status(500).send({
                error: 'Error interno',
            });
        }
    }

    async update(
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateLockerRequest;
        }>,
        reply: FastifyReply,
    ) {
        try {
            const locker =
                await this.updateLockerUseCase.execute(
                    request.params.id,
                    request.body,
                );

            return reply.status(200).send({
                data: locker,
            });
        } catch (error: any) {
            if (
                error.message.includes('no existe')
            ) {
                return reply.status(404).send({
                    message: error.message,
                });
            }

            if (
                error.message.includes(
                    'mantenimiento',
                ) ||
                error.message.includes(
                    'asignado',
                ) ||
                error.message.includes('socio') ||
                error.message.includes('Estado')
            )
        {
                return reply.status(400).send({
                    message: error.message,
                });
            }

            return reply.status(500).send({
                message: 'Error interno',
            });
        }
    }

    async delete(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply,
    ) {
        if (request.params.id.length !== 36) {
            return reply.status(400).send({
                message: 'Formato de ID inválido',
            });
        }

        try {
            await this.deleteLockerUseCase.execute(
                request.params.id,
            );

            return reply.status(204).send();
        } catch (error: any) {
            if (
                error.message.includes('no existe')
            ) {
                return reply.status(404).send({
                    message: error.message,
                });
            }

            if (
                error.message.includes('ocupado')
            ) {
                return reply.status(409).send({
                    message: error.message,
                });
            }

            return reply.status(500).send({
                message:
                    'Error interno, reintente más tarde',
            });
        }
    }
}