// src/pages/CocinaPage.jsx
// Vista de cocina: muestra pedidos activos en tiempo real (polling)
import React, { useEffect, useCallback, useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardHeader, Typography,
  Button, Chip, Divider, IconButton, Tooltip, Alert,
  LinearProgress, Avatar, Badge, Skeleton
} from '@mui/material';
import {
  Refresh as RefreshIcon, CheckCircle as CheckIcon,
  PlayArrow as StartIcon, LocalShipping as DeliverIcon,
  AccessTime as TimeIcon, TableBar as TableIcon,
  Kitchen as KitchenIcon
} from '@mui/icons-material';
import { usePedidos } from '../hooks/hooks';
import { useNotificacion } from '../hooks/hooks';
import { EstadoChip } from '../components/common/CommonComponents';

const MONEDA = '₡';
const fmt = (n) => `${MONEDA}${Number(n).toLocaleString('es-CR')}`;

const ESTADOS_TRANSICION = {
  Pendiente:  { siguiente: 'Preparando', label: '🍳 Iniciar', color: 'warning',  icon: <StartIcon /> },
  Preparando: { siguiente: 'Listo',      label: '✅ Listo',   color: 'success',  icon: <CheckIcon /> },
  Listo:      { siguiente: 'Entregado',  label: '🚀 Entregar',color: 'info',     icon: <DeliverIcon /> },
};

const COLORES_ESTADO = {
  Pendiente:  { border: '#FF9800', bg: '#FFF8E1', header: '#E65100' },
  Preparando: { border: '#2196F3', bg: '#E3F2FD', header: '#0D47A1' },
  Listo:      { border: '#4CAF50', bg: '#E8F5E9', header: '#1B5E20' },
};

// Calcula minutos desde que se creó el pedido
function tiempoTranscurrido(fechaStr) {
  const mins = Math.floor((Date.now() - new Date(fechaStr).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function PedidoCard({ pedido, onCambiarEstado }) {
  const transicion = ESTADOS_TRANSICION[pedido.estado];
  const colores = COLORES_ESTADO[pedido.estado] || {};
  const [loading, setLoading] = useState(false);

  const handleAccion = async () => {
    if (!transicion) return;
    setLoading(true);
    try {
      await onCambiarEstado(pedido.id, transicion.siguiente);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{
      border: `2px solid ${colores.border || '#DDD'}`,
      bgcolor: colores.bg || '#FFF',
      transition: 'all 0.3s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }
    }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5,
        bgcolor: colores.header || '#2C3E50',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', fontWeight: 700 }}>
            #{pedido.id}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#FFF', lineHeight: 1.2 }}>
              {pedido.numeroMesa ? `Mesa ${pedido.numeroMesa}` : 'Sin mesa'}
            </Typography>
            {pedido.nombreCliente && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {pedido.nombreCliente}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<TimeIcon sx={{ fontSize: '0.9rem !important' }} />}
            label={tiempoTranscurrido(pedido.creadoEn)}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 700 }}
          />
        </Box>
      </Box>

      {/* Detalles de platillos */}
      <CardContent sx={{ py: 1.5 }}>
        {pedido.detalles?.map((detalle, i) => (
          <Box key={i} sx={{ mb: 1, pb: 1, borderBottom: i < pedido.detalles.length - 1 ? '1px dashed #DDD' : 'none' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  <Typography component="span" color="primary" fontWeight={800} sx={{ mr: 1 }}>
                    ×{detalle.cantidad}
                  </Typography>
                  {detalle.nombrePlatillo}
                </Typography>
                {detalle.notas && (
                  <Typography variant="caption" color="warning.dark" sx={{
                    display: 'block', fontStyle: 'italic', mt: 0.3
                  }}>
                    📝 {detalle.notas}
                  </Typography>
                )}
                {detalle.personalizaciones?.map((p, pi) => (
                  <Chip
                    key={pi}
                    label={`${p.tipo === 'SIN' ? '🚫' : p.tipo === 'EXTRA' ? '➕' : '🍴'} ${p.descripcion}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 18, mr: 0.4, mt: 0.4 }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        ))}

        {pedido.notas && (
          <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
            <Typography variant="caption">{pedido.notas}</Typography>
          </Alert>
        )}
      </CardContent>

      {/* Footer con acción */}
      {transicion && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color={transicion.color}
            startIcon={loading ? null : transicion.icon}
            onClick={handleAccion}
            disabled={loading}
            sx={{ fontWeight: 700 }}
          >
            {loading ? 'Actualizando...' : transicion.label}
          </Button>
        </Box>
      )}
    </Card>
  );
}

// Columna por estado
function EstadoColumna({ titulo, estado, pedidos, onCambiarEstado, color }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} color={color}>{titulo}</Typography>
        <Badge badgeContent={pedidos.length} color="primary">
          <Box sx={{ width: 20 }} />
        </Badge>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pedidos.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary',
            border: '2px dashed #DDD', borderRadius: 2 }}>
            <KitchenIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">Sin pedidos</Typography>
          </Box>
        ) : (
          pedidos.map(p => (
            <PedidoCard key={p.id} pedido={p} onCambiarEstado={onCambiarEstado} />
          ))
        )}
      </Box>
    </Box>
  );
}

export default function CocinaPage() {
  const { pedidos, loading, error, cargar, cambiarEstado } = usePedidos(true);
  const { exito, error: notifError } = useNotificacion();
  const [pollingActive, setPollingActive] = useState(true);

  // Polling automático cada 10 segundos
  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(cargar, 10000);
    return () => clearInterval(interval);
  }, [pollingActive, cargar]);

  const handleCambiarEstado = async (id, estado) => {
    try {
      await cambiarEstado(id, estado);
      exito(`Pedido #${id} → ${estado}`);
    } catch (err) {
      notifError(err.message);
    }
  };

  const pendientes  = pedidos.filter(p => p.estado === 'Pendiente');
  const preparando  = pedidos.filter(p => p.estado === 'Preparando');
  const listos      = pedidos.filter(p => p.estado === 'Listo');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="secondary.main">
            🍳 Vista de Cocina
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pedidos.length} pedidos activos · Actualización automática cada 10s
            <Chip
              label={pollingActive ? '🟢 Live' : '⏸ Pausado'}
              size="small" sx={{ ml: 1 }}
              onClick={() => setPollingActive(!pollingActive)}
            />
          </Typography>
        </Box>
        <Tooltip title="Actualizar ahora">
          <IconButton onClick={cargar} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error   && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Columnas Kanban */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <EstadoColumna
            titulo="⏳ Pendiente"
            estado="Pendiente"
            pedidos={pendientes}
            onCambiarEstado={handleCambiarEstado}
            color="#E65100"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EstadoColumna
            titulo="🍳 Preparando"
            estado="Preparando"
            pedidos={preparando}
            onCambiarEstado={handleCambiarEstado}
            color="#0D47A1"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EstadoColumna
            titulo="✅ Listo"
            estado="Listo"
            pedidos={listos}
            onCambiarEstado={handleCambiarEstado}
            color="#1B5E20"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
