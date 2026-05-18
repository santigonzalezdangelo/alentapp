import { useState } from 'react';
import { Box, Text, Badge, Button, Flex } from '@chakra-ui/react';
import { LuPencil } from 'react-icons/lu';
import { toaster } from './ui/toaster';
import type { PaymentDTO } from '@alentapp/shared';
import { paymentsService } from '../services/payments';

interface PaymentItemProps {
  payment: PaymentDTO;
  onUpdate: (updatedPayment: PaymentDTO) => void;
  onEdit: (payment: PaymentDTO) => void;
}

export function PaymentItem({ payment, onUpdate, onEdit }: PaymentItemProps) {
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const handlePay = async () => {
    setLoadingPay(true);
    try {
      const updated = await paymentsService.pay(payment.id);
      onUpdate(updated);
      toaster.create({
        title: 'Cobro exitoso',
        description: 'La cuota se ha marcado como pagada.',
        type: 'success',
      });
    } catch (error: any) {
      toaster.create({
        title: 'No se pudo cobrar',
        description: error?.message || 'Ocurrió un error inesperado',
        type: 'error',
      });
    } finally {
      setLoadingPay(false);
    }
  };

  const handleCancel = async () => {
    setLoadingCancel(true);
    try {
      const updated = await paymentsService.cancel(payment.id);
      onUpdate(updated);
      toaster.create({
        title: 'Anulación exitosa',
        description: 'La cuota ha sido anulada.',
        type: 'info',
      });
    } catch (error: any) {
      toaster.create({
        title: 'Error al anular',
        description: error?.message || 'Ocurrió un error inesperado',
        type: 'error',
      });
    } finally {
      setLoadingCancel(false);
    }
  };

  const colorPalette =
    payment.status === 'Pagado' ? 'green' :
    payment.status === 'Cancelado' ? 'red' :
    'yellow';

  const isPending = payment.status === 'Pendiente';
  const anyLoading = loadingPay || loadingCancel;

  const amountFormatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(payment.amount);

const formatDateOnly = (isoString: string): string => {
  // Toma solo la parte YYYY-MM-DD, ignora la hora y el timezone
  const datePart = isoString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
};

const dueDateFormatted = formatDateOnly(payment.due_date);
  const paymentDateFormatted = payment.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('es-AR')
    : null;

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" mb={4} boxShadow="sm">
      <Flex justifyContent="space-between" alignItems="center">
        <Box>
          <Text fontWeight="bold" fontSize="lg">
            Cuota {payment.month}/{payment.year}
          </Text>
          <Text color="gray.500">Monto: {amountFormatted}</Text>
          <Text fontSize="sm" color="gray.400">
            Vencimiento: {dueDateFormatted}
          </Text>
          {paymentDateFormatted && (
            <Text fontSize="sm">Fecha de cobro: {paymentDateFormatted}</Text>
          )}
        </Box>

        <Flex alignItems="center" gap={4}>
          <Badge colorPalette={colorPalette} fontSize="md" p={1} borderRadius="md">
            {payment.status}
          </Badge>

          {isPending && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(payment)}
                disabled={anyLoading}
              >
                <LuPencil /> Editar
              </Button>
              <Button
                colorPalette="green"
                size="sm"
                onClick={handlePay}
                loading={loadingPay}
                disabled={loadingCancel}
              >
                Cobrar
              </Button>
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                loading={loadingCancel}
                disabled={loadingPay}
              >
                Anular
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}