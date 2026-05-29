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
  Input,
  IconButton,
} from "@chakra-ui/react";

import {
  LuPlus,
  LuRefreshCw,
  LuPencil,
  LuTrash2,
} from "react-icons/lu";

import { useEffect, useState } from "react";

import { lockersService } from "../services/lockers";
import { membersService } from "../services/members";

import type {
  LockerDTO,
  CreateLockerRequest,
  UpdateLockerRequest,
  LockerLocation,
  MemberDTO,
} from "@alentapp/shared";

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

import { Field } from "../components/ui/field";

import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from "../components/ui/select";

const locations = createListCollection({
  items: [
    { label: "Hombres", value: "MALE" },
    { label: "Mujeres", value: "FEMALE" },
    { label: "Niños", value: "CHILDREN" },
  ],
});

const statuses = createListCollection({
  items: [
    { label: "Disponible", value: "AVAILABLE" },
    { label: "Mantenimiento", value: "MAINTENANCE" },
  ],
});

type LockerFormData = {
  number: number;
  location: LockerLocation;
  status?: "AVAILABLE" | "MAINTENANCE";
  member_id: string | null;
  contract_end_date: string | null;
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);

  const [numberError, setNumberError] = useState<string | null>(null);

  const [formData, setFormData] = useState<LockerFormData>({
    number: 0,
    location: "MALE",
    member_id: null,
    contract_end_date: null,
  });

  const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [lockersData, membersData] = await Promise.all([
        lockersService.getAll(),
        membersService.getAll(),
      ]);

      setLockers(lockersData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar lockers");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLockerId(null);

    setNumberError(null);

    setFormData({
      number: 0,
      location: "MALE",
      member_id: null,
      contract_end_date: null,
    });

    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setEditingLockerId(locker.id);

    setNumberError(null);

    setFormData({
      number: locker.number,
      location: locker.location,
      member_id: locker.member_id,
      contract_end_date: locker.contract_end_date
        ? locker.contract_end_date.split("T")[0]
        : null,
      status:
        locker.status === "MAINTENANCE"
          ? "MAINTENANCE"
          : "AVAILABLE",
    });

    setIsDialogOpen(true);
  };

  const validateForm = () => {
    let isValid = true;

    setNumberError(null);

    if (!Number.isInteger(Number(formData.number))) {
      setNumberError("El número debe ser un entero válido");
      isValid = false;
    }

    if (Number(formData.number) <= 0) {
      setNumberError("El número debe ser mayor a cero");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      if (!validateForm()) return;

      const isBeingReleased =
      formData.status !== "MAINTENANCE" &&
        !formData.member_id &&
        !formData.contract_end_date;

      if (editingLockerId) {
        const lockerToUpdate: UpdateLockerRequest = {
          member_id: isBeingReleased
            ? null
            : formData.member_id,

          contract_end_date: isBeingReleased
            ? null
            : formData.contract_end_date,

          status: isBeingReleased
            ? "AVAILABLE"
            : formData.status,
        };

        await lockersService.update(
          editingLockerId,
          lockerToUpdate
        );
      } else {
        const lockerToCreate: CreateLockerRequest = {
          number: Number(formData.number),
          location: formData.location,
        };

        await lockersService.create(lockerToCreate);
      }

      setIsDialogOpen(false);
      setEditingLockerId(null);

      await fetchLockers();
    } catch (err: any) {
      alert(err.message || "Error al guardar locker");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (locker: LockerDTO) => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar el locker ${locker.number}?`
    );

    if (!confirmed) return;

    try {
      await lockersService.delete(locker.id);
      await fetchLockers();
    } catch (err: any) {
      alert(err.message || "Error al eliminar locker");
    }
  };

  const getMemberDisplay = (
    memberId?: string | null
  ) => {
    if (!memberId) return "Sin asignar";

    const member = members.find(
      (m) => m.id === memberId
    );

    if (!member) return "Socio no encontrado";

    return `${member.name} - DNI ${member.dni}`;
  };
const getLocationLabel = (
  location: LockerLocation
) => {
  switch (location) {
    case "MALE":
      return "Hombres";

    case "FEMALE":
      return "Mujeres";

    case "CHILDREN":
      return "Niños";

    default:
      return location;
  }
};

const getStatusLabel = (
  status: LockerDTO["status"]
) => {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";

    case "OCCUPIED":
      return "Ocupado";

    case "MAINTENANCE":
      return "Mantenimiento";

    default:
      return status;
  }
};
  useEffect(() => {
    fetchLockers();
  }, []);

  return (
    <DialogRoot
      open={isDialogOpen}
      onOpenChange={(e) =>
        setIsDialogOpen(e.open)
      }
    >
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading
              size="2xl"
              fontWeight="bold"
            >
              Administración de Lockers
            </Heading>

            <Text
              color="fg.muted"
              fontSize="md"
            >
              Gestiona los lockers del club.
            </Text>
          </Stack>

          <HStack gap="3">
            <Button
              variant="outline"
              onClick={fetchLockers}
              disabled={isLoading}
            >
              <LuRefreshCw /> Actualizar
            </Button>

            <Button
              colorPalette="blue"
              size="md"
              onClick={openCreateModal}
            >
              <LuPlus /> Agregar Locker
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingLockerId
                  ? "Editar Locker"
                  : "Agregar Nuevo Locker"}
              </DialogTitle>
            </DialogHeader>

            <DialogBody>
              <Stack gap="4">
                <Field label="Número" required>
                  <Input
                    type="number"
                    placeholder="Ej. 10"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        number: Number(
                          e.target.value
                        ),
                      })
                    }
                    required
                    disabled={!!editingLockerId}
                  />

                  {numberError && (
                    <Text
                      color="red.500"
                      fontSize="sm"
                    >
                      {numberError}
                    </Text>
                  )}
                </Field>

                <Field
                  label="Ubicación"
                  required
                >
                  <SelectRoot
                    collection={locations}
                    value={[formData.location]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        location:
                          e.value[0] as LockerLocation,
                      })
                    }
                    disabled={!!editingLockerId}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione una ubicación" />
                    </SelectTrigger>

                    <SelectContent>
                      {locations.items.map(
                        (location) => (
                          <SelectItem
                            item={location}
                            key={location.value}
                          >
                            {location.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                {editingLockerId && (
                  <>
                    <Field label="Estado">
                      <SelectRoot
                        collection={statuses}
                        value={
                          formData.status
                            ? [formData.status]
                            : ["AVAILABLE"]
                        }
                        onValueChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.value[0] as
                              | "AVAILABLE"
                              | "MAINTENANCE",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione estado" />
                        </SelectTrigger>

                        <SelectContent>
                          {statuses.items.map(
                            (status) => (
                              <SelectItem
                                item={status}
                                key={status.value}
                              >
                                {status.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </SelectRoot>
                    </Field>

                    <Field label="Socio asignado">
                      <SelectRoot
                        collection={createListCollection(
                          {
                            items: [
                              {
                                label:
                                  "Sin asignar",
                                value: "",
                              },
                              ...members.map(
                                (member) => ({
                                  label: `${member.name} - DNI ${member.dni}`,
                                  value:
                                    member.id,
                                })
                              ),
                            ],
                          }
                        )}
                        value={[
                          formData.member_id ||
                            "",
                        ]}
                        onValueChange={(e) =>
                          setFormData({
                            ...formData,
                            member_id:
                              e.value[0] ===
                              ""
                                ? null
                                : e.value[0],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un socio" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem
                            item={{
                              label:
                                "Sin asignar",
                              value: "",
                            }}
                          >
                            Sin asignar
                          </SelectItem>

                          {members.map(
                            (member) => (
                              <SelectItem
                                key={member.id}
                                item={{
                                  label: `${member.name} - DNI ${member.dni}`,
                                  value:
                                    member.id,
                                }}
                              >
                                {member.name} -
                                DNI {member.dni}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </SelectRoot>
                    </Field>

                    <Field label="Fin de contrato">
                      <Input
                        type="date"
                        value={
                          formData.contract_end_date ||
                          ""
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contract_end_date:
                              e.target.value ||
                              null,
                          })
                        }
                      />
                    </Field>

                    <Text
                      fontSize="sm"
                      color="fg.muted"
                    >
                      Para liberar un locker,
                      debe dejar el socio sin asignar.
                    </Text>
                  </>
                )}
              </Stack>
            </DialogBody>

            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">
                  Cancelar
                </Button>
              </DialogActionTrigger>

              <Button
                type="submit"
                colorPalette="blue"
                loading={isSubmitting}
              >
                {editingLockerId
                  ? "Guardar Cambios"
                  : "Crear Locker"}
              </Button>
            </DialogFooter>

            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box
            p="4"
            bg="red.50"
            color="red.700"
            borderRadius="md"
            border="1px solid"
            borderColor="red.200"
          >
            <Text fontWeight="bold">
              Error:
            </Text>

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
              <Stack
                align="center"
                gap="4"
              >
                <Spinner
                  size="xl"
                  color="blue.500"
                />

                <Text color="fg.muted">
                  Cargando lockers...
                </Text>
              </Stack>
            </Center>
          ) : lockers.length === 0 ? (
            <Center h="300px">
              <Stack
                align="center"
                gap="4"
              >
                <Text color="fg.muted">
                  No se encontraron lockers.
                </Text>

                <Button
                  variant="ghost"
                  onClick={fetchLockers}
                >
                  Reintentar
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root
              size="md"
              variant="line"
              interactive
            >
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">
                    Número
                  </Table.ColumnHeader>

                  <Table.ColumnHeader py="4">
                    Ubicación
                  </Table.ColumnHeader>

                  <Table.ColumnHeader py="4">
                    Estado
                  </Table.ColumnHeader>

                  <Table.ColumnHeader py="4">
                    Socio
                  </Table.ColumnHeader>

                  <Table.ColumnHeader py="4">
                    Fin contrato
                  </Table.ColumnHeader>

                  <Table.ColumnHeader
                    py="4"
                    textAlign="end"
                  >
                    Acciones
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {lockers.map((locker) => (
                  <Table.Row
                    key={locker.id}
                    _hover={{
                      bg: "bg.muted/30",
                    }}
                  >
                    <Table.Cell
                      fontWeight="semibold"
                      color="fg.emphasized"
                    >
                      {locker.number}
                    </Table.Cell>

                    <Table.Cell color="fg.muted">
                      {getLocationLabel(locker.location)}
                    </Table.Cell>

                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={
                          locker.status ===
                          "AVAILABLE"
                            ? "green.50"
                            : locker.status ===
                              "MAINTENANCE"
                            ? "orange.50"
                            : "blue.50"
                        }
                        color={
                          locker.status ===
                          "AVAILABLE"
                            ? "green.700"
                            : locker.status ===
                              "MAINTENANCE"
                            ? "orange.700"
                            : "blue.700"
                        }
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {getStatusLabel(locker.status)}
                      </Box>
                    </Table.Cell>

                    <Table.Cell color="fg.muted">
                      {getMemberDisplay(
                        locker.member_id
                      )}
                    </Table.Cell>

                    <Table.Cell color="fg.muted">
                      {locker.contract_end_date
                        ? locker.contract_end_date
                            .split("T")[0]
                            .split("-")
                            .reverse()
                            .join("/")
                        : "-"}
                    </Table.Cell>

                    <Table.Cell textAlign="end">
                      <HStack
                        gap="2"
                        justify="flex-end"
                      >
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar locker"
                          onClick={() =>
                            openEditModal(
                              locker
                            )
                          }
                        >
                          <LuPencil />
                        </IconButton>

                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar locker"
                          onClick={() =>
                            handleDelete(
                              locker
                            )
                          }
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}