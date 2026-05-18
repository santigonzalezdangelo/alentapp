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
} from "@chakra-ui/react";

import { LuPlus, LuRefreshCw, LuPencil } from "react-icons/lu";
import { LuTrash } from "react-icons/lu";
import { useEffect, useState } from "react";

import { lockersService } from "../services/lockers";
import { membersService } from "../services/members";

import type {
LockerDTO,
CreateLockerRequest,
LockerLocation,
LockerStatus,
MemberDTO,
} from "@alentapp/shared";

import {
DialogRoot,
DialogContent,
DialogHeader,
DialogTitle,
DialogBody,
DialogFooter,
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
    { label: "Masculino", value: "MALE" },
    { label: "Femenino", value: "FEMALE" },
    { label: "Niños", value: "CHILDREN" },
],
});

const statuses = createListCollection({
items: [
    { label: "Disponible", value: "AVAILABLE" },
    { label: "Mantenimiento", value: "MAINTENANCE" },
],
});

export function LockersView() {
const [lockers, setLockers] = useState<LockerDTO[]>([]);
const [members, setMembers] = useState<MemberDTO[]>([]);

const [isLoading, setIsLoading] = useState(true);
const [_error, setError] = useState<string | null>(null);

const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

const [selectedLocker, setSelectedLocker] = useState<LockerDTO | null>(null);

const [formData, setFormData] = useState<CreateLockerRequest>({
    number: 1,
    location: "MALE",
});

const [updateData, setUpdateData] = useState<{
    status: LockerStatus;
    member_id: string | null;
    contract_end_date: string | null;
}>({
    status: "AVAILABLE",
    member_id: null,
    contract_end_date: null,
});

  // ===================== FETCH LOCKERS =====================
const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);

    try {
    const data = await lockersService.getAll();
    setLockers(data);
    } catch (err: any) {
    setError(err.message);
    } finally {
    setIsLoading(false);
    }
};

  // ===================== FETCH MEMBERS =====================
const fetchMembers = async () => {
    try {
    const data = await membersService.getAll();
    setMembers(data ?? []);
    } catch (err) {
    console.error("Error cargando socios", err);
    setMembers([]);
    }
};

useEffect(() => {
    fetchLockers();
    fetchMembers();
}, []);

  // ===================== CREATE =====================
const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
    await lockersService.create(formData);
    setIsCreateOpen(false);
    fetchLockers();
    } catch (err: any) {
    alert(err.message);
    } finally {
    setIsSubmitting(false);
    }
};

  // ===================== UPDATE =====================
const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocker) return;

    setIsSubmitting(true);

    try {
    await lockersService.update(selectedLocker.id, updateData);
    setIsEditOpen(false);
    fetchLockers();
    } catch (err: any) {
    alert(err.message);
    } finally {
    setIsSubmitting(false);
    }
};

const handleDelete = async (id: string) => {
  const confirmDelete = confirm(
    "¿Seguro que desea eliminar el locker?"
  );

  if (!confirmDelete) return;

  try {
    await lockersService.delete(id);
    fetchLockers();
  } catch (err: any) {
    alert(err.message);
  }
};

  const openEdit = (locker: LockerDTO) => {
    setSelectedLocker(locker);
    setUpdateData({
      status: locker.status,
      member_id: locker.member_id,
      contract_end_date: locker.contract_end_date,
    });
    setIsEditOpen(true);
  };

  return (
    <Stack gap="8">

      {/* HEADER */}
      <Flex justify="space-between" align="center">
        <Stack>
          <Heading>Lockers</Heading>
          <Text color="fg.muted">Gestión completa de lockers</Text>
        </Stack>

        <HStack>
          <Button onClick={fetchLockers} variant="outline">
            <LuRefreshCw />
          </Button>

          <Button onClick={() => setIsCreateOpen(true)}>
            <LuPlus /> Crear
          </Button>
        </HStack>
      </Flex>

      {/* TABLE */}
      <Box borderWidth="1px" borderRadius="xl">
        {isLoading ? (
          <Center h="200px">
            <Spinner />
          </Center>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Número</Table.ColumnHeader>
                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                <Table.ColumnHeader>Socio</Table.ColumnHeader>
                <Table.ColumnHeader>Acciones</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {lockers.map((l) => (
                <Table.Row key={l.id}>
                  <Table.Cell>
                    {l.number}
                  </Table.Cell>

                  <Table.Cell>
                    {l.status}
                  </Table.Cell>

                  <Table.Cell>
                    {l.member_id ?? "-"}
                  </Table.Cell>

                  <Table.Cell>
                    <HStack>

                      <Button
                        size="sm"
                        onClick={() => openEdit(l)}
                      >
                        <LuPencil />
                      </Button>

                      <Button
                        size="sm"
                        colorPalette="red"
                        onClick={() => handleDelete(l.id)}
                      >
                        <LuTrash />
                      </Button>

                    </HStack>
                  </Table.Cell>

                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      {/* ================= CREATE ================= */}
      <DialogRoot open={isCreateOpen} onOpenChange={(e) => setIsCreateOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Crear Locker</DialogTitle>
            </DialogHeader>

            <DialogBody>
              <Stack gap="4">

                <Field label="Número">
                  <Input
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: Number(e.target.value) })
                    }
                  />
                </Field>

                <Field label="Ubicación">
                  <SelectRoot
                    collection={locations}
                    value={[formData.location]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.value[0] as LockerLocation,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.items.map((l) => (
                        <SelectItem key={l.value} item={l}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

              </Stack>
            </DialogBody>

            <DialogFooter>
              <Button type="submit" loading={isSubmitting}>
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>

      {/* ================= EDIT ================= */}
      <DialogRoot open={isEditOpen} onOpenChange={(e) => setIsEditOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Editar Locker</DialogTitle>
            </DialogHeader>

            <DialogBody>
              <Stack gap="4">

                {/* STATUS */}
                <Field label="Estado">
                  <SelectRoot
                    collection={statuses}
                    value={[updateData.status]}
                    onValueChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        status: e.value[0] as LockerStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.items.map((s) => (
                        <SelectItem key={s.value} item={s}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                {/* SOCIO */}
                <Field label="Socio">
                  <SelectRoot
                    collection={createListCollection({
                      items: members.map((m) => ({
                        label: `${m.name} (${m.dni})`,
                        value: m.id,
                      })),
                    })}
                    value={updateData.member_id ? [updateData.member_id] : []}
                    onValueChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        member_id: e.value[0] || null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccionar socio" />
                    </SelectTrigger>

                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem
                          key={m.id}
                          item={{
                            label: `${m.name} (${m.dni})`,
                            value: m.id,
                          }}
                        >
                          {m.name} ({m.dni})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                {/* CONTRACT */}
                <Field label="Fin contrato">
                  <Input
                    type="date"
                    value={updateData.contract_end_date ?? ""}
                    onChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        contract_end_date: e.target.value || null,
                      })
                    }
                  />
                </Field>

              </Stack>
            </DialogBody>

            <DialogFooter>
              <Button type="submit" loading={isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>

    </Stack>
  );
}