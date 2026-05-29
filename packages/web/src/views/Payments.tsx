import { useEffect, useState, useMemo } from 'react';
import { Box, Heading, VStack, Spinner, Center, Text, Flex, HStack, Button, Stack, Input } from '@chakra-ui/react';
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import type { PaymentDTO, MemberDTO } from '@alentapp/shared';
import { paymentsService } from '../services/payments';
import { membersService } from '../services/members';
import { PaymentItem } from '../components/PaymentItem';
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import { 
  SelectRoot, 
  SelectTrigger, 
  SelectValueText, 
  SelectContent, 
  SelectItem, 
  createListCollection 
} from "../components/ui/select";

import { toaster } from '../components/ui/toaster';

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentDTO | null>(null);
  
  // El período (month/year) se deriva automáticamente de due_date en el backend.
  // No se incluye en el formulario para evitar estados inconsistentes.
  const [formData, setFormData] = useState({
    member_id: "",
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const membersCollection = useMemo(() => createListCollection({
    items: members.map(m => ({ label: `${m.name} (${m.dni})`, value: m.id }))
  }), [members]);

  // Período derivado de la fecha (solo para mostrar al usuario)
  const derivedPeriod = useMemo(() => {
    if (!formData.due_date) return null;
    const d = new Date(formData.due_date);
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, [formData.due_date]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [paymentsData, membersData] = await Promise.all([
        paymentsService.getAll(),
        membersService.getAll()
      ]);
      setPayments(paymentsData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = (updatedPayment: PaymentDTO) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
    );
  };

  const handleEdit = (payment: PaymentDTO) => {
    setEditingPayment(payment);
    setFormData({
      member_id: payment.member_id,
      amount: Number(payment.amount),
      due_date: payment.due_date.split('T')[0],
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    setFormData({
      member_id: "",
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.member_id) {
      errors.member_id = "Debe seleccionar un socio";
    }
    if (formData.amount <= 0) {
      errors.amount = "El monto debe ser mayor a 0";
    }
    if (!formData.due_date) {
      errors.due_date = "Debe seleccionar una fecha de vencimiento";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toaster.create({ title: "Corrija los errores en el formulario", type: "warning" });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});
    try {
      if (editingPayment) {
        const updated = await paymentsService.update(editingPayment.id, {
          amount: formData.amount,
          due_date: formData.due_date,
        });
        toaster.create({ title: "Pago actualizado con exito", type: "success" });
        handleUpdate(updated);
      } else {
        await paymentsService.create(formData);
        toaster.create({ title: "Pago creado con exito", type: "success" });
        fetchData();
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toaster.create({ 
        title: editingPayment ? "No se pudo actualizar el pago" : "No se pudo crear el pago", 
        description: err.message, 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8" maxW="4xl" mx="auto">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Gestion de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona el cobro de cuotas y el estado de pagos de los miembros.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Crear Pago
            </Button>
          </HStack>
        </Flex>

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
          p={payments.length > 0 && !loading ? 6 : 0}
        >
          {loading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando pagos...</Text>
              </Stack>
            </Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No hay pagos registrados.</Text>
                <Button variant="ghost" onClick={openCreateModal}>Crear primer pago</Button>
              </Stack>
            </Center>
          ) : (
            <VStack align="stretch" gap="4">
              {payments.map((payment) => {
                const member = members.find(m => m.id === payment.member_id);
                return (
                  <Box key={payment.id}>
                    <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">
                      Socio: {member ? `${member.name} (${member.dni})` : payment.member_id}
                    </Text>
                    <PaymentItem 
                      payment={payment} 
                      onUpdate={handleUpdate}
                      onEdit={handleEdit}
                    />
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingPayment ? 'Editar Pago' : 'Crear Nuevo Pago'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field 
                  label="Socio" 
                  required 
                  invalid={!!formErrors.member_id} 
                  errorText={formErrors.member_id}
                >
                  <SelectRoot 
                    collection={membersCollection} 
                    value={formData.member_id ? [formData.member_id] : []}
                    onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                    disabled={!!editingPayment}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersCollection.items.map((member) => (
                        <SelectItem item={member} key={member.value}>
                          {member.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                <Field 
                  label="Monto" 
                  required 
                  invalid={!!formErrors.amount} 
                  errorText={formErrors.amount}
                >
                  <Input 
                    type="number"
                    placeholder="Ej. 5000" 
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    min={0}
                  />
                </Field>

                <Field 
                  label="Fecha de Vencimiento" 
                  required 
                  invalid={!!formErrors.due_date} 
                  errorText={formErrors.due_date}
                  helperText={
                    derivedPeriod
                      ? `Período: ${String(derivedPeriod.month).padStart(2, '0')}/${derivedPeriod.year}`
                      : undefined
                  }
                >
                  <Input 
                    type="date" 
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingPayment ? 'Guardar Cambios' : 'Crear Pago'}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </Stack>
    </DialogRoot>
  );
}