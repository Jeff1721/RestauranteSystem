// src/pages/CajaPage.jsx
import React, { useState, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Divider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Tooltip,
  TextField, InputAdornment, Switch, FormControlLabel,
} from '@mui/material';
import {
  Receipt as ReceiptIcon, Print as PrintIcon,
  CheckCircle as PagarIcon, Search as SearchIcon,
  PointOfSale as CajaIcon, Close as CloseIcon,
  Refresh as RefreshIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { usePedidos } from '../hooks/hooks';
import { useNotificacion } from '../hooks/hooks';
import { pedidoService } from '../services/services';
import { EstadoChip, ConfirmDialog } from '../components/common/CommonComponents';
import { useReactToPrint } from 'react-to-print';

const MONEDA = '₡';
const fmt      = (n) => `${MONEDA}${Number(n || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
const fmtFecha = (d) => new Date(d).toLocaleString('es-CR', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ── Factura para imprimir ─────────────────────────────────────
const FacturaPrint = React.forwardRef(({ factura, aplicarIva }, ref) => {
  const subtotal = factura?.subtotal || 0;
  const impuesto = aplicarIva ? (subtotal * ((factura?.porcentajeImpuesto || 13) / 100)) : 0;
  const total    = subtotal + impuesto;

  return (
    <Box ref={ref} sx={{ p: 4, fontFamily: 'monospace', fontSize: '0.9rem' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>🍽️ Restaurante</Typography>
        <Typography variant="body2">Sistema de Pedidos</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="h6">FACTURA #{factura?.pedidoId}</Typography>
        <Typography variant="body2">{factura && fmtFecha(factura.fecha)}</Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        {factura?.nombreCliente && <Typography><strong>Cliente:</strong> {factura.nombreCliente}</Typography>}
        {factura?.numeroMesa    && <Typography><strong>Mesa:</strong> {factura.numeroMesa}</Typography>}
        {factura?.atendidoPor   && <Typography><strong>Mesero:</strong> {factura.atendidoPor}</Typography>}
      </Box>
      <Divider sx={{ mb: 1 }} />
      {factura?.items?.map((item, i) => (
        <Box key={i} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ flex: 2 }}>{item.nombre} x{item.cantidad}</Typography>
            <Typography sx={{ flex: 1, textAlign: 'right' }}>{fmt(item.subtotal)}</Typography>
          </Box>
          {item.personalizaciones?.map((p, pi) => (
            <Typography key={pi} variant="caption" sx={{ pl: 2, color: 'text.secondary', display: 'block' }}>→ {p}</Typography>
          ))}
        </Box>
      ))}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ textAlign: 'right' }}>
        <Typography>Subtotal: <strong>{fmt(subtotal)}</strong></Typography>
        {aplicarIva && <Typography>IVA ({factura?.porcentajeImpuesto}%): <strong>{fmt(impuesto)}</strong></Typography>}
        {!aplicarIva && <Typography color="text.secondary">IVA: <strong>Exento</strong></Typography>}
        <Divider sx={{ my: 0.5 }} />
        <Typography variant="h6" fontWeight={800}>TOTAL: {fmt(total)}</Typography>
      </Box>
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="caption">¡Gracias por su visita! 🙏</Typography>
      </Box>
    </Box>
  );
});

// ── Modal Factura ─────────────────────────────────────────────
function FacturaModal({ pedidoId, open, onClose, onPagar }) {
  const [factura,   setFactura]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [pagando,   setPagando]   = useState(false);
  const [aplicarIva, setAplicarIva] = useState(true);
  const { exito, error: notifError } = useNotificacion();
  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  React.useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    setAplicarIva(true);
    pedidoService.getFactura(pedidoId)
      .then((data) => setFactura(data))
      .catch(err => notifError(err.message))
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

  // Recalcular totales según toggle IVA
  const subtotal = factura?.subtotal || 0;
  const impuesto = aplicarIva ? (subtotal * ((factura?.porcentajeImpuesto || 13) / 100)) : 0;
  const total    = subtotal + impuesto;

  const handlePagar = async () => {
    setPagando(true);
    try {
      await onPagar(pedidoId);
      exito(`Pedido #${pedidoId} marcado como PAGADO ✅`);
      onClose();
    } catch (err) {
      notifError(err.message);
    } finally {
      setPagando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Factura #{pedidoId}</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} sx={{ mb: 1 }} height={40} />)
        ) : factura ? (
          <>
            {/* Toggle IVA */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography fontWeight={600}>Aplicar IVA ({factura.porcentajeImpuesto}%)</Typography>
                <Typography variant="caption" color="text.secondary">
                  {aplicarIva ? `Se cobra ₡${Number(impuesto).toLocaleString('es-CR', { minimumFractionDigits: 2 })} de impuesto` : 'Factura exenta de IVA'}
                </Typography>
              </Box>
              <Switch
                checked={aplicarIva}
                onChange={e => setAplicarIva(e.target.checked)}
                color="primary"
              />
            </Box>

            {/* Tarjetas resumen */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.main', color: '#fff' }}>
                  <Typography variant="caption">TOTAL A COBRAR</Typography>
                  <Typography variant="h6" fontWeight={800}>{fmt(total)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                  <Typography fontWeight={700}>{fmt(subtotal)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">IVA</Typography>
                  <Typography fontWeight={700} color={aplicarIva ? 'text.primary' : 'text.disabled'}>
                    {aplicarIva ? fmt(impuesto) : 'Exento'}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Ítems</Typography>
                  <Typography fontWeight={700}>{factura.items?.length}</Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Info */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              {factura.nombreCliente && <Typography><strong>Cliente:</strong> {factura.nombreCliente}</Typography>}
              {factura.numeroMesa    && <Typography><strong>Mesa:</strong> {factura.numeroMesa}</Typography>}
              {factura.atendidoPor   && <Typography><strong>Atendido por:</strong> {factura.atendidoPor}</Typography>}
              <Typography><strong>Fecha:</strong> {fmtFecha(factura.fecha)}</Typography>
            </Box>

            {/* Tabla detalle */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Platillo</strong></TableCell>
                    <TableCell align="center"><strong>Cant.</strong></TableCell>
                    <TableCell align="right"><strong>Precio Unit.</strong></TableCell>
                    <TableCell align="right"><strong>Subtotal</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {factura.items?.map((item, i) => (
                    <React.Fragment key={i}>
                      <TableRow hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                          {item.personalizaciones?.map((p, pi) => (
                            <Typography key={pi} variant="caption" color="text.secondary" display="block">↳ {p}</Typography>
                          ))}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{item.cantidad}</TableCell>
                        <TableCell align="right">{fmt(item.precioUnitario)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(item.subtotal)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                    <TableCell align="right">{fmt(subtotal)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, color: aplicarIva ? 'text.primary' : 'text.disabled' }}>
                      IVA ({factura.porcentajeImpuesto}%) {!aplicarIva && '— Exento'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: aplicarIva ? 'text.primary' : 'text.disabled' }}>
                      {aplicarIva ? fmt(impuesto) : fmt(0)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>{fmt(total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Versión oculta para imprimir */}
            <Box sx={{ display: 'none' }}>
              <FacturaPrint ref={printRef} factura={factura} aplicarIva={aplicarIva} />
            </Box>
          </>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
        <Button startIcon={<PrintIcon />} variant="outlined" onClick={handlePrint} disabled={!factura}>
          Imprimir
        </Button>
        <Button
          startIcon={<PagarIcon />} variant="contained" color="success"
          onClick={handlePagar} disabled={pagando || !factura} sx={{ fontWeight: 700 }}
        >
          {pagando ? 'Procesando...' : '💳 Marcar como Pagado'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página Principal Caja ─────────────────────────────────────
export default function CajaPage() {
  const { pedidos, loading, error, cargar, cambiarEstado } = usePedidos();
  const [facturaId,    setFacturaId]    = useState(null);
  const [facturaOpen,  setFacturaOpen]  = useState(false);
  const [busqueda,     setBusqueda]     = useState('');
  const [eliminarId,   setEliminarId]   = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const { exito, error: notifError }   = useNotificacion();

  const abrirFactura = (id) => { setFacturaId(id); setFacturaOpen(true); };

  const handlePagar = async (id) => {
    await cambiarEstado(id, 'Pagado');
    await cargar();
  };

  const handleEliminar = async () => {
    try {
      await pedidoService.cancelar(eliminarId);
      exito(`Pedido #${eliminarId} eliminado`);
      await cargar();
    } catch (err) {
      notifError(err.message);
    } finally {
      setConfirmOpen(false);
    }
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const estados = ['Listo', 'Entregado', 'Pagado'];
    if (!estados.includes(p.estado)) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return p.id.toString().includes(q) ||
      p.nombreCliente?.toLowerCase().includes(q) ||
      p.numeroMesa?.toLowerCase().includes(q);
  });

  // Resumen rápido
  const totalHoy = pedidos
    .filter(p => p.estado === 'Pagado' && new Date(p.creadoEn).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + (p.total || 0), 0);
  const cantHoy = pedidos.filter(p => p.estado === 'Pagado' && new Date(p.creadoEn).toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="secondary.main">💳 Caja y Facturación</Typography>
          <Typography variant="body2" color="text.secondary">Gestiona pagos y genera facturas detalladas</Typography>
        </Box>
        <Tooltip title="Actualizar"><IconButton onClick={cargar}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {/* Resumen del día */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: '#fff', borderRadius: 3 }}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Ventas hoy</Typography>
            <Typography variant="h6" fontWeight={800}>{fmt(totalHoy)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
            <Typography variant="caption" color="text.secondary">Pedidos pagados hoy</Typography>
            <Typography variant="h6" fontWeight={700}>{cantHoy}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
            <Typography variant="caption" color="text.secondary">Pendientes de cobro</Typography>
            <Typography variant="h6" fontWeight={700} color="warning.main">
              {pedidos.filter(p => p.estado === 'Listo' || p.estado === 'Entregado').length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
            <Typography variant="caption" color="text.secondary">Total en lista</Typography>
            <Typography variant="h6" fontWeight={700}>{pedidosFiltrados.length}</Typography>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth sx={{ mb: 2 }}
        placeholder="Buscar por #pedido, cliente o mesa..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>Mesa</strong></TableCell>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Ítems</strong></TableCell>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell align="right"><strong>Total</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : pedidosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <CajaIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography>No hay pedidos para mostrar en caja</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pedidosFiltrados.map(p => (
                  <TableRow key={p.id} hover sx={{ opacity: p.estado === 'Pagado' ? 0.75 : 1 }}>
                    <TableCell><Typography fontWeight={700} color="primary">#{p.id}</Typography></TableCell>
                    <TableCell>{p.numeroMesa || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.nombreCliente || 'Sin nombre'}</Typography>
                      {p.atendidoPor && <Typography variant="caption" color="text.secondary">Mesero: {p.atendidoPor}</Typography>}
                    </TableCell>
                    <TableCell><Chip label={`${p.detalles?.length || 0} ítems`} size="small" /></TableCell>
                    <TableCell><Typography variant="body2">{fmtFecha(p.creadoEn)}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={800} color="primary.dark">{fmt(p.total)}</Typography>
                    </TableCell>
                    <TableCell align="center"><EstadoChip estado={p.estado} /></TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Button
                          variant="contained" size="small" startIcon={<ReceiptIcon />}
                          onClick={() => abrirFactura(p.id)}
                          color={p.estado === 'Pagado' ? 'inherit' : 'primary'}
                        >
                          {p.estado === 'Pagado' ? 'Ver' : 'Cobrar'}
                        </Button>
                        {p.estado === 'Pagado' && (
                          <Tooltip title="Eliminar registro">
                            <IconButton size="small" color="error"
                              onClick={() => { setEliminarId(p.id); setConfirmOpen(true); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <FacturaModal
        pedidoId={facturaId}
        open={facturaOpen}
        onClose={() => setFacturaOpen(false)}
        onPagar={handlePagar}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar registro"
        message={`¿Eliminar el pedido #${eliminarId}? Esta acción no se puede deshacer.`}
        onConfirm={handleEliminar}
        onClose={() => setConfirmOpen(false)}
        confirmColor="error"
        confirmText="Eliminar"
      />
    </Box>
  );
}
