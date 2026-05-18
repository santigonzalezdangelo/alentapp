import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { PostgresMedicalCertificateRepository } from './infrastructure/PostgresMedicalCertificateRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { MedicalCertificateValidator } from './domain/services/MedicalCertificateValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { CreateMedicalCertificateUseCase } from './application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from './application/GetMedicalCertificatesUseCase.js';
import { UpdateMedicalCertificateUseCase } from './application/UpdateMedicalCertificateUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { MedicalCertificateController } from './delivery/MedicalCertificateController.js';
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { CreateSportUseCase } from './application/CreateSportUseCase.js';
import { GetSportsUseCase } from './application/GetSportsUseCase.js';
import { SportController } from './delivery/SportController.js';
import { SportValidator } from './domain/services/SportValidator.js';

import { PostgresDisciplineRepository } from './infrastructure/PostgresDisciplineRepository.js';
import { DisciplineValidator } from './domain/services/DisciplineValidator.js';
import { CreateDisciplineUseCase } from './application/CreateDisciplineUseCase.js';
import { DisciplineController } from './delivery/DisciplineController.js';
import { GetDisciplinesUseCase } from './application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from './application/UpdateDisciplineUseCase.js';

// === Payment imports (PR 1: foundation + create) ===
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { SystemClock } from './infrastructure/SystemClock.js';
import { PaymentValidator } from './domain/services/PaymentValidator.js';
import { NewPaymentUseCase } from './application/NewPaymentUseCase.js';
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.js';
import { PaymentController } from './delivery/PaymentController.js';

import { PostgresLockerRepository } from './infrastructure/PostgresLockerRepository.js';
import { LockerValidator } from './domain/services/LockerValidator.js';
import { CreateLockerUseCase } from './application/CreateLockerUseCase.js';
import { LockerController } from './delivery/LockerController.js';
import { GetLockersUseCase } from './application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from './application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from './application/DeleteLockerUseCase.js';


export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
                : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // ============================================================
    // Members
    // ============================================================
    const memberRepo = new PostgresMemberRepository();
    const medicalCertificateRepo = new PostgresMedicalCertificateRepository();
    const memberValidator = new MemberValidator(memberRepo);
    const medicalCertificateValidator = new MedicalCertificateValidator(memberRepo);

    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);

    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(medicalCertificateRepo, medicalCertificateValidator);
    const getMedicalCertificatesUseCase = new GetMedicalCertificatesUseCase(medicalCertificateRepo);
    const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(medicalCertificateRepo, medicalCertificateValidator);

    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase,
    );

    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo);
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);
    
    const updateLockerUseCase = new UpdateLockerUseCase(
    lockerRepo,
    memberRepo
);

const deleteLockerUseCase = new DeleteLockerUseCase(
lockerRepo
);

    const lockerController = new LockerController(
    createLockerUseCase,
    getLockersUseCase,
    updateLockerUseCase,
    deleteLockerUseCase
);


    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        getMedicalCertificatesUseCase,
        updateMedicalCertificateUseCase,
    );

    // ============================================================
    // Disciplines
    // ============================================================
    const disciplineRepo = new PostgresDisciplineRepository();
    const disciplineValidator = new DisciplineValidator(memberRepo);
    const getDisciplinesUseCase = new GetDisciplinesUseCase(disciplineRepo);
    const createDisciplineUseCase = new CreateDisciplineUseCase(
        disciplineRepo,
        disciplineValidator,
    );
    const updateDisciplineUseCase = new UpdateDisciplineUseCase(
        disciplineRepo, disciplineValidator
    );

    const disciplineController = new DisciplineController(
        createDisciplineUseCase,
        getDisciplinesUseCase,
        updateDisciplineUseCase,
    );

    // ============================================================
    // Sports
    // ============================================================
    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator();

    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const getSportsUseCase = new GetSportsUseCase(sportRepo);

    const sportController = new SportController(createSportUseCase, getSportsUseCase);

    // ============================================================
    // Payments - PR 1: Crear y listar (TDD-0010)
    // Cobrar, editar y cancelar se sumarán en PRs siguientes
    // ============================================================
    const clock = new SystemClock();
    const paymentRepo = new PostgresPaymentRepository();
    const paymentValidator = new PaymentValidator(clock);

    const newPaymentUseCase = new NewPaymentUseCase(
        paymentRepo,
        memberRepo,
        paymentValidator,
        clock,
    );
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo, paymentValidator);

    const paymentController = new PaymentController(newPaymentUseCase, getPaymentsUseCase);

    // ============================================================
    // Routes
    // ============================================================
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));
    
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.patch('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));

    server.get('/api/v1/medical-certificates', medicalCertificateController.getAll.bind(medicalCertificateController));
    server.post('/api/v1/medical-certificates', medicalCertificateController.create.bind(medicalCertificateController));
    server.patch('/api/v1/medical-certificates/:id', medicalCertificateController.update.bind(medicalCertificateController));

    server.post('/api/v1/disciplines', disciplineController.create.bind(disciplineController));
    server.get('/api/v1/disciplines', disciplineController.getAll.bind(disciplineController));
    server.patch('/api/v1/disciplines/:id', disciplineController.update.bind(disciplineController));

    server.get('/api/v1/sports', sportController.getAll.bind(sportController));
    server.post('/api/v1/sports', sportController.create.bind(sportController));

    server.get('/api/v1/pagos', paymentController.getAll.bind(paymentController));
    server.post('/api/v1/pagos', paymentController.create.bind(paymentController));

    server.get('/', async (_req, rep) => {
        rep.status(200).send({ msg: 'asd' });
    });

    return server;
}

// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`),
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
} 