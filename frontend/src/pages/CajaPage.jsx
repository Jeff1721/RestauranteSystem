// src/pages/CajaPage.jsx
import React, { useState, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Divider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Tooltip,
  TextField, InputAdornment, Switch, FormControlLabel, Checkbox,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  ToggleButton, ToggleButtonGroup, Avatar, Badge,
} from '@mui/material';
import {
  Receipt as ReceiptIcon, Print as PrintIcon,
  CheckCircle as PagarIcon, Search as SearchIcon,
  PointOfSale as CajaIcon, Close as CloseIcon,
  Refresh as RefreshIcon, Delete as DeleteIcon,
  CallSplit as SplitIcon, Person as PersonIcon,
  Group as GroupIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { usePedidos, useNotificacion } from '../hooks/hooks';
import { pedidoService } from '../services/services';
import { EstadoChip, ConfirmDialog } from '../components/common/CommonComponents';
import { useReactToPrint } from 'react-to-print';

const MONEDA = '₡';
const fmt      = (n) => `${MONEDA}${Number(n || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
const fmtFecha = (d) => new Date(d).toLocaleString('es-CR', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ─────────────────────────────────────────────────────────────────
// Componente de ticket estrecho (térmica 80mm) para imprimir
// ─────────────────────────────────────────────────────────────────
const Ticket = React.forwardRef(({ factura, items, aplicarIva, nombreFactura }, ref) => {
  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const pct      = factura?.porcentajeImpuesto || 13;
  const impuesto = aplicarIva ? Math.round(subtotal * pct / 100) : 0;
  const total    = subtotal + impuesto;

  return (
    <Box ref={ref} sx={{
      width: '80mm',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '11px',
      color: '#000',
      p: '4mm',
      bgcolor: '#fff',
      lineHeight: 1.4,
    }}>
      {/* Encabezado */}
      <Box sx={{ textAlign: 'center', mb: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}>
          🍽️ RESTAURANTE
        </Typography>
        <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>Sistema de Pedidos</Typography>
        <Box sx={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', my: 0.5, py: 0.25 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            {nombreFactura ? nombreFactura.toUpperCase() : `COMPROBANTE #${factura?.pedidoId}`}
          </Typography>
          <Typography sx={{ fontSize: 9, fontFamily: 'inherit' }}>
            {factura && fmtFecha(factura.fecha)}
          </Typography>
        </Box>
      </Box>

      {/* Info */}
      {(factura?.nombreCliente || factura?.numeroMesa || factura?.atendidoPor) && (
        <Box sx={{ mb: 0.5 }}>
          {factura?.nombreCliente && (
            <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>Cliente: {factura.nombreCliente}</Typography>
          )}
          {factura?.numeroMesa && (
            <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>Mesa: {factura.numeroMesa}</Typography>
          )}
          {factura?.atendidoPor && (
            <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>Mesero: {factura.atendidoPor}</Typography>
          )}
          <Box sx={{ borderTop: '1px dashed #000', mt: 0.5 }} />
        </Box>
      )}

      {/* Items */}
      <Box sx={{ mb: 0.5 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ mb: 0.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 10, fontFamily: 'inherit', flex: 1, pr: 1 }}>
                {item.cantidad}x {item.nombrePlatillo || item.nombre}
              </Typography>
              <Typography sx={{ fontSize: 10, fontFamily: 'inherit', flexShrink: 0 }}>
                {fmt(item.subtotal)}
              </Typography>
            </Box>
            {item.personalizaciones?.map((p, pi) => (
              <Typography key={pi} sx={{ fontSize: 9, fontFamily: 'inherit', pl: 1.5, color: '#555' }}>
                → {typeof p === 'string' ? p : p.descripcion}
              </Typography>
            ))}
          </Box>
        ))}
        <Box sx={{ borderTop: '1px dashed #000', mt: 0.5 }} />
      </Box>

      {/* Totales */}
      <Box sx={{ mb: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>Subtotal</Typography>
          <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>{fmt(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>
            IVA {aplicarIva ? `(${pct}%)` : '(Exento)'}
          </Typography>
          <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>{fmt(impuesto)}</Typography>
        </Box>
        <Box sx={{ borderTop: '1px solid #000', mt: 0.25, pt: 0.25, display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>TOTAL</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>{fmt(total)}</Typography>
        </Box>
      </Box>

      {/* Pie */}
      <Box sx={{ borderTop: '1px dashed #000', textAlign: 'center', pt: 0.5 }}>
        <Typography sx={{ fontSize: 9, fontFamily: 'inherit' }}>¡Gracias por su visita!</Typography>
        <Typography sx={{ fontSize: 9, fontFamily: 'inherit' }}>Vuelva pronto 🙏</Typography>
      </Box>
    </Box>
  );
});

// ─────────────────────────────────────────────────────────────────
// Modal de pago — soporta pago total, parcial o dividido
// ─────────────────────────────────────────────────────────────────
function FacturaModal({ pedidoId, open, onClose, onPagar }) {
  const [factura,       setFactura]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [pagando,       setPagando]       = useState(false);
  const [aplicarIva,    setAplicarIva]    = useState(true);
  const [modoPago,      setModoPago]      = useState('total');   // 'total' | 'parcial' | 'dividido'
  const [seleccionados, setSeleccionados] = useState([]);        // índices de items seleccionados
  const [numPersonas,   setNumPersonas]   = useState(2);
  const [personaActual, setPersonaActual] = useState(1);
  const [pagosDiv,      setPagosDiv]      = useState({});        // { personaIdx: [itemIndices] }
  const [nombreFactura, setNombreFactura] = useState('');
  const [editNombre,    setEditNombre]    = useState(false);
  const { exito, error: notifError } = useNotificacion();
  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  React.useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    setAplicarIva(true);
    setModoPago('total');
    setSeleccionados([]);
    setPagosDiv({});
    setNombreFactura('');
    setEditNombre(false);
    pedidoService.getFactura(pedidoId)
      .then((data) => {
        setFactura(data);
        setSeleccionados(data.items?.map((_, i) => i) || []);
      })
      .catch(err => notifError(err.message))
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

  // Items a facturar según modo
  const itemsAFacturar = React.useMemo(() => {
    if (!factura?.items) return [];
    if (modoPago === 'total') return factura.items;
    if (modoPago === 'parcial') return seleccionados.map(i => factura.items[i]);
    if (modoPago === 'dividido') {
      const indices = pagosDiv[personaActual] || [];
      return indices.map(i => factura.items[i]);
    }
    return factura.items;
  }, [factura, modoPago, seleccionados, pagosDiv, personaActual]);

  const subtotal = itemsAFacturar.reduce((s, i) => s + (i?.subtotal || 0), 0);
  const pct      = factura?.porcentajeImpuesto || 13;
  const impuesto = aplicarIva ? Math.round(subtotal * pct / 100) : 0;
  const total    = subtotal + impuesto;

  const toggleItem = (idx) => {
    setSeleccionados(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleItemDiv = (idx) => {
    setPagosDiv(prev => {
      const curr = prev[personaActual] || [];
      const next = curr.includes(idx) ? curr.filter(i => i !== idx) : [...curr, idx];
      return { ...prev, [personaActual]: next };
    });
  };

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

  const COLORES_PERSONA = ['#1565C0','#2E7D32','#E65100','#6A1B9A','#AD1457','#00695C'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <ReceiptIcon color="primary" />
          {editNombre ? (
            <TextField
              size="small" autoFocus
              value={nombreFactura}
              placeholder={`Comprobante #${pedidoId}`}
              onChange={e => setNombreFactura(e.target.value)}
              onBlur={() => setEditNombre(false)}
              onKeyDown={e => e.key === 'Enter' && setEditNombre(false)}
              sx={{ maxWidth: 220 }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => setEditNombre(true)}>
              <Typography variant="h6" fontWeight={700}>
                {nombreFactura || `Comprobante #${pedidoId}`}
              </Typography>
              <Tooltip title="Cambiar nombre">
                <EditIcon fontSize="small" sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }} />
              </Tooltip>
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} sx={{ mb: 1 }} height={40} />)
        ) : factura ? (
          <>
            {/* ── Modo de pago ── */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography fontWeight={600} color="text.secondary" sx={{ fontSize: 13 }}>Modo de pago:</Typography>
              <ToggleButtonGroup value={modoPago} exclusive size="small"
                onChange={(_, v) => { if (v) { setModoPago(v); setSeleccionados(factura.items?.map((_,i)=>i)||[]); }}}>
                <ToggleButton value="total">
                  <PagarIcon fontSize="small" sx={{ mr: 0.5 }} /> Todo junto
                </ToggleButton>
                <ToggleButton value="parcial">
                  <ReceiptIcon fontSize="small" sx={{ mr: 0.5 }} /> Ítems específicos
                </ToggleButton>
                <ToggleButton value="dividido">
                  <SplitIcon fontSize="small" sx={{ mr: 0.5 }} /> Dividir entre personas
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* ── Control de personas (modo dividido) ── */}
            {modoPago === 'dividido' && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Typography fontWeight={600} sx={{ fontSize: 13 }}>Número de personas:</Typography>
                  <TextField
                    type="number" size="small" sx={{ width: 70 }}
                    inputProps={{ min: 2, max: 10 }}
                    value={numPersonas}
                    onChange={e => setNumPersonas(Math.max(2, Math.min(10, Number(e.target.value))))}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Array.from({ length: numPersonas }, (_, i) => i + 1).map(n => (
                    <Button key={n} variant={personaActual === n ? 'contained' : 'outlined'}
                      size="small" onClick={() => setPersonaActual(n)}
                      startIcon={<PersonIcon />}
                      sx={{
                        borderColor: COLORES_PERSONA[(n-1) % COLORES_PERSONA.length],
                        color: personaActual === n ? '#fff' : COLORES_PERSONA[(n-1) % COLORES_PERSONA.length],
                        bgcolor: personaActual === n ? COLORES_PERSONA[(n-1) % COLORES_PERSONA.length] : 'transparent',
                        '&:hover': { bgcolor: COLORES_PERSONA[(n-1) % COLORES_PERSONA.length], color: '#fff' },
                      }}>
                      Persona {n}
                      {(pagosDiv[n] || []).length > 0 && (
                        <Chip label={(pagosDiv[n]||[]).length} size="small"
                          sx={{ ml: 0.5, height: 16, fontSize: 10, bgcolor: 'rgba(255,255,255,0.3)' }} />
                      )}
                    </Button>
                  ))}
                </Box>
                {personaActual && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Selecciona los ítems de la Persona {personaActual}:
                  </Typography>
                )}
              </Box>
            )}

            {/* ── Toggle IVA ── */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Box>
                <Typography fontWeight={600} sx={{ fontSize: 13 }}>
                  Aplicar IVA ({factura.porcentajeImpuesto}%)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {aplicarIva ? `+${fmt(impuesto)} de impuesto` : 'Factura exenta de IVA'}
                </Typography>
              </Box>
              <Switch checked={aplicarIva} onChange={e => setAplicarIva(e.target.checked)} color="primary" />
            </Box>

            {/* ── Lista de ítems ── */}
            <TableContainer component={Paper} elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', mb: 2, maxHeight: 300, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    {modoPago !== 'total' && <TableCell padding="checkbox" />}
                    <TableCell><strong>Platillo</strong></TableCell>
                    <TableCell align="center"><strong>Cant.</strong></TableCell>
                    <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    {modoPago === 'dividido' && <TableCell align="center"><strong>Asignado a</strong></TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {factura.items?.map((item, i) => {
                    const selParcial  = modoPago === 'parcial'  && seleccionados.includes(i);
                    const selDividido = modoPago === 'dividido' && (pagosDiv[personaActual]||[]).includes(i);
                    const asignadoA   = modoPago === 'dividido'
                      ? Object.entries(pagosDiv).find(([,idxs]) => idxs.includes(i))?.[0]
                      : null;

                    return (
                      <TableRow key={i} hover
                        selected={modoPago === 'total' || selParcial || selDividido}
                        sx={{ opacity: modoPago === 'parcial' && !selParcial ? 0.45 : 1,
                              cursor: modoPago !== 'total' ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (modoPago === 'parcial') toggleItem(i);
                          if (modoPago === 'dividido') toggleItemDiv(i);
                        }}
                      >
                        {modoPago !== 'total' && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={modoPago === 'parcial' ? seleccionados.includes(i) : (pagosDiv[personaActual]||[]).includes(i)}
                              sx={modoPago === 'dividido' ? {
                                color: COLORES_PERSONA[(personaActual-1) % COLORES_PERSONA.length],
                                '&.Mui-checked': { color: COLORES_PERSONA[(personaActual-1) % COLORES_PERSONA.length] }
                              } : {}}
                              size="small"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                          {item.personalizaciones?.map((p, pi) => (
                            <Typography key={pi} variant="caption" color="text.secondary" display="block">
                              ↳ {p}
                            </Typography>
                          ))}
                        </TableCell>
                        <TableCell align="center">{item.cantidad}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(item.subtotal)}</TableCell>
                        {modoPago === 'dividido' && (
                          <TableCell align="center">
                            {asignadoA ? (
                              <Avatar sx={{
                                width: 24, height: 24, fontSize: 11, mx: 'auto',
                                bgcolor: COLORES_PERSONA[(Number(asignadoA)-1) % COLORES_PERSONA.length]
                              }}>
                                {asignadoA}
                              </Avatar>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ── Totales ── */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ minWidth: 220, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmt(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color={aplicarIva ? 'text.primary' : 'text.disabled'}>
                    IVA {aplicarIva ? `(${pct}%)` : '(Exento)'}
                  </Typography>
                  <Typography variant="body2" color={aplicarIva ? 'text.primary' : 'text.disabled'}>
                    {fmt(impuesto)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={800} color="primary">TOTAL A COBRAR</Typography>
                  <Typography fontWeight={800} color="primary" fontSize="1.1rem">{fmt(total)}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Ticket oculto para imprimir */}
            <Box sx={{ display: 'none' }}>
              <Ticket
                ref={printRef}
                factura={factura}
                items={itemsAFacturar}
                aplicarIva={aplicarIva}
                nombreFactura={nombreFactura}
              />
            </Box>
          </>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
        <Button startIcon={<PrintIcon />} variant="outlined"
          onClick={handlePrint} disabled={!factura || itemsAFacturar.length === 0}>
          Imprimir ticket
        </Button>
        <Button
          startIcon={<PagarIcon />} variant="contained" color="success"
          onClick={handlePagar} disabled={pagando || !factura} sx={{ fontWeight: 700 }}>
          {pagando ? 'Procesando...' : '💳 Marcar como Pagado'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Página principal Caja
// ─────────────────────────────────────────────────────────────────
export default function CajaPage() {
  const { pedidos, loading, error, cargar, cambiarEstado } = usePedidos();
  const [facturaId,   setFacturaId]   = useState(null);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [busqueda,    setBusqueda]    = useState('');
  const [eliminarId,  setEliminarId]  = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { exito, error: notifError }  = useNotificacion();

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
    if (!['Listo','Entregado','Pagado'].includes(p.estado)) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return p.id.toString().includes(q) ||
      p.nombreCliente?.toLowerCase().includes(q) ||
      p.numeroMesa?.toLowerCase().includes(q);
  });

  const totalHoy = pedidos
    .filter(p => p.estado === 'Pagado' &&
      new Date(p.creadoEn).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + (p.total || 0), 0);
  const cantHoy = pedidos.filter(p => p.estado === 'Pagado' &&
    new Date(p.creadoEn).toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="secondary.main">💳 Caja y Facturación</Typography>
          <Typography variant="body2" color="text.secondary">Pagos totales, parciales o divididos entre personas</Typography>
        </Box>
        <Tooltip title="Actualizar"><IconButton onClick={cargar}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Ventas hoy', value: fmt(totalHoy), color: 'success.main', white: true },
          { label: 'Pedidos pagados hoy', value: cantHoy, color: undefined },
          { label: 'Pendientes de cobro', value: pedidos.filter(p => p.estado==='Listo'||p.estado==='Entregado').length, color: 'warning.main' },
          { label: 'En lista', value: pedidosFiltrados.length, color: undefined },
        ].map(({ label, value, color, white }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3, ...(white ? { bgcolor: color, color: '#fff' } : {}) }}
              variant={white ? 'elevation' : 'outlined'}>
              <Typography variant="caption" sx={{ opacity: white ? 0.9 : 1 }} color={white ? 'inherit' : 'text.secondary'}>
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={700} color={!white && color ? color : 'inherit'}>
                {value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField fullWidth sx={{ mb: 2 }}
        placeholder="Buscar por #pedido, cliente o mesa..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
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
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : pedidosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <CajaIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
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
                        <Button variant="contained" size="small" startIcon={<ReceiptIcon />}
                          onClick={() => abrirFactura(p.id)}
                          color={p.estado === 'Pagado' ? 'inherit' : 'primary'}>
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
