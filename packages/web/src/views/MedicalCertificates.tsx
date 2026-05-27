import {
  Table,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  IconButton,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw, LuPencil, LuTrash2 } from "react-icons/lu";
import { useEffect, useState, useRef } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { membersService } from "../services/members";
import type { MedicalCertificateListItem, MemberDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from "@alentapp/shared";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { MedicalCertificateForm, type MedicalCertificateFormRef } from "../components/medical-certificate/MedicalCertificateForm";

const statusLabels: Record<string, string> = {
  in_review: "En revisión",
  validated: "Validado",
  historical: "Histórico",
};

const statusColors: Record<string, { bg: string; color: string }> = {
  in_review: { bg: "yellow.50", color: "yellow.700" },
  validated: { bg: "green.50", color: "green.700" },
  historical: { bg: "gray.50", color: "gray.700" },
};

export function MedicalCertificatesView() {
  const [certificates, setCertificates] = useState<MedicalCertificateListItem[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<MedicalCertificateListItem | undefined>(undefined);

  const formRef = useRef<MedicalCertificateFormRef>(null);

  const fetchCertificates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [certs, mems] = await Promise.all([
        medicalCertificatesService.getAll(),
        membersService.getAll(),
      ]);
      setCertificates(certs);
      setMembers(mems);
    } catch (err: any) {
      setError(err.message || "Error al cargar los certificados");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setSubmitError(null);
    setEditingCertificateId(null);
    setEditingInitialData(undefined);
    formRef.current?.reset();
    setIsDialogOpen(true);
  };

  const openEditModal = (cert: MedicalCertificateListItem) => {
    setSubmitError(null);
    setEditingCertificateId(cert.id);
    setEditingInitialData(cert);
    setIsDialogOpen(true);
  };

  const closeModal = () => {
    setIsDialogOpen(false);
    setEditingCertificateId(null);
    setEditingInitialData(undefined);
    setSubmitError(null);
  };

  const handleDelete = async (cert: MedicalCertificateListItem) => {
    if (window.confirm(`¿Seguro que querés eliminar el certificado médico del socio con DNI ${cert.member_dni}?`)) {
      try {
        await medicalCertificatesService.delete(cert.id);
        fetchCertificates();
      } catch (err: any) {
        alert(err.message || "Error al eliminar el certificado médico");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    const data = formRef.current.validateAndGetData();
    if (!data) {
      setSubmitError(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (editingCertificateId) {
        const requestData: UpdateMedicalCertificateRequest = {
          issue_date: data.issue_date,
          expiry_date: data.expiry_date,
          doctor_license: data.doctor_license,
          institution: data.institution,
        };

        if (data.status && data.status !== editingInitialData?.status) {
          requestData.status = data.status as 'in_review' | 'validated';
        }

        await medicalCertificatesService.update(editingCertificateId, requestData);
      } else {
        const member = members.find((m) => m.dni === data.member_dni);
        if (!member) {
          setSubmitError(`No se encontró un socio con DNI ${data.member_dni}`);
          return;
        }

        const requestData: CreateMedicalCertificateRequest = {
          member_id: member.id,
          issue_date: data.issue_date,
          expiry_date: data.expiry_date,
          doctor_license: data.doctor_license,
          institution: data.institution,
        };

        await medicalCertificatesService.create(requestData);
      }

      closeModal();
      fetchCertificates();
    } catch (err: any) {
      setSubmitError(err.message || "Error al guardar el certificado");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => { if (!e.open) closeModal(); }}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Certificados Médicos</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestioná los certificados de aptitud física de los socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchCertificates} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Certificado
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCertificateId ? "Editar Certificado Médico" : "Agregar Nuevo Certificado Médico"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <MedicalCertificateForm ref={formRef} initialData={editingInitialData} />
              {submitError && (
                <Box mt="4" p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                  <Text fontWeight="bold" fontSize="sm">Error:</Text>
                  <Text fontSize="sm">{submitError}</Text>
                </Box>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingCertificateId ? "Guardar Cambios" : "Crear Certificado"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando certificados...</Text>
              </Stack>
            </Center>
          ) : certificates.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron certificados médicos.</Text>
                <Button variant="ghost" onClick={fetchCertificates}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio (DNI)</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Emisión</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Matrícula</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Institución</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {certificates.map((cert) => {
                  const colors = statusColors[cert.status] || { bg: "gray.50", color: "gray.700" };
                  return (
                    <Table.Row key={cert.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {cert.member_dni}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{cert.issue_date}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.expiry_date}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.doctor_license}</Table.Cell>
                      <Table.Cell color="fg.muted">{cert.institution}</Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={colors.bg}
                          color={colors.color}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {statusLabels[cert.status] || cert.status}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar certificado"
                          onClick={() => openEditModal(cert)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar certificado"
                          disabled={cert.status === 'historical'}
                          title="No se puede eliminar un certificado histórico"
                          onClick={() => handleDelete(cert)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
