// src/pages/CajaPage.jsx
import React, { useState, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Divider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Tooltip,
  TextField, InputAdornment, Switch, FormControlLabel,
  Checkbox, Tabs, Tab, Badge,
} from '@mui/material';
import {
  Receipt as ReceiptIcon, Print as PrintIcon,
  CheckCircle as PagarIcon, Search as SearchIcon,
  PointOfSale as CajaIcon, Close as CloseIcon,
  Refresh as RefreshIcon, Delete as DeleteIcon,
  CallSplit as SplitIcon, Person as PersonIcon,
  Add as AddIcon,
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

// ─────────────────────────────────────────────────────────────
// Comprobante estrecho estilo POS (80mm)
// ─────────────────────────────────────────────────────────────
const Comprobante = React.forwardRef(({ datos }, ref) => {
  const { items, subtotal, impuesto, total, aplicarIva, porcentajeImpuesto,
          pedidoId, fecha, nombreCliente, numeroMesa, atendidoPor,
          nombreFactura } = datos;
  return (
    <Box ref={ref} sx={{
      width: '72mm', fontFamily: '"Courier New", monospace',
      fontSize: '11px', p: '4mm', color: '#000', bgcolor: '#fff',
      '@media print': { width: '72mm', margin: 0, padding: '4mm' },
    }}>
      {/* Encabezado */}
      <Box sx={{ textAlign: 'center', mb: '3mm' }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 900, letterSpacing: 1 }}>
          🍽 RESTAURANTE
        </Typography>
        <Typography sx={{ fontSize: '10px' }}>Sistema de Pedidos</Typography>
        <Box sx={{ borderTop: '1px dashed #000', my: '2mm' }} />
        <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>
          COMPROBANTE #{pedidoId}
        </Typography>
        <Typography sx={{ fontSize: '10px' }}>{fecha && fmtFecha(fecha)}</Typography>
      </Box>

      {/* Datos */}
      <Box sx={{ mb: '2mm' }}>
        {nombreFactura  && <Typography><b>Facturar a:</b> {nombreFactura}</Typography>}
        {nombreCliente  && <Typography><b>Cliente:</b> {nombreCliente}</Typography>}
        {numeroMesa     && <Typography><b>Mesa:</b> {numeroMesa}</Typography>}
        {atendidoPor    && <Typography><b>Mesero:</b> {atendidoPor}</Typography>}
      </Box>

      <Box sx={{ borderTop: '1px dashed #000', mb: '2mm' }} />

      {/* Items */}
      {items.map((item, i) => (
        <Box key={i} sx={{ mb: '1mm' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ flex: 1, fontWeight: 700, fontSize: '11px' }}>
              {item.nombre}
            </Typography>
            <Typography sx={{ fontSize: '11px' }}>{fmt(item.subtotal)}</Typography>
          </Box>
          <Typography sx={{ fontSize: '10px', color: '#444' }}>
            {item.cantidad} x {fmt(item.precioUnitario)}
          </Typography>
          {item.personalizaciones?.map((p, pi) => (
            <Typography key={pi} sx={{ fontSize: '10px', color: '#666', pl: '3mm' }}>↳ {p}</Typography>
          ))}
        </Box>
      ))}

      <Box sx={{ borderTop: '1px dashed #000', my: '2mm' }} />

      {/* Totales */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>Subtotal:</Typography>
          <Typography>{fmt(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>IVA {aplicarIva ? `(${porcentajeImpuesto}%):` : '(Exento):'}</Typography>
          <Typography>{aplicarIva ? fmt(impuesto) : fmt(0)}</Typography>
        </Box>
        <Box sx={{ borderTop: '1px solid #000', mt: '1mm', pt: '1mm', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '13px' }}>TOTAL:</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '13px' }}>{fmt(total)}</Typography>
        </Box>
      </Box>

      {datos.metodoPago && (
        <Box sx={{ mt: '2mm' }}>
          <Typography><b>Método de pago:</b> {datos.metodoPago === 'efectivo' ? '💵 Efectivo' : datos.metodoPago === 'tarjeta' ? '💳 Tarjeta' : '📱 SINPE'}</Typography>
          {datos.metodoPago === 'efectivo' && datos.montoRecibido > 0 && (
            <>
              <Typography><b>Recibido:</b> {`₡${Number(datos.montoRecibido).toLocaleString('es-CR',{minimumFractionDigits:0})}`}</Typography>
              <Typography sx={{ fontWeight: 900 }}><b>Vuelto:</b> {`₡${Number(datos.montoRecibido - datos.total).toLocaleString('es-CR',{minimumFractionDigits:0})}`}</Typography>
            </>
          )}
        </Box>
      )}
      <Box sx={{ borderTop: '1px dashed #000', mt: '3mm', textAlign: 'center' }}>
        <Typography sx={{ fontSize: '10px', mt: '2mm' }}>¡Gracias por su visita! 🙏</Typography>
        <Typography sx={{ fontSize: '9px', color: '#666' }}>
          {new Date().toLocaleString('es-CR')}
        </Typography>
      </Box>
    </Box>
  );
});

// ─────────────────────────────────────────────────────────────
// Modal de Factura con pago total / dividido
// ─────────────────────────────────────────────────────────────
function FacturaModal({ pedidoId, open, onClose, onPagar }) {
  const [factura,     setFactura]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [tab,         setTab]         = useState(0); // 0=Completo 1=Dividido
  const [aplicarIva,  setAplicarIva]  = useState(true);
  const [nombreFact,  setNombreFact]  = useState('');
  const [pagando,     setPagando]     = useState(false);
  const [metodoPago,  setMetodoPago]  = useState('efectivo'); // efectivo | tarjeta | sinpe
  const [montoRecibido, setMontoRecibido] = useState('');

  // Pago dividido: lista de grupos
  const [grupos, setGrupos] = useState([
    { nombre: 'Persona 1', items: [], nombreFactura: '' },
  ]);

  const printRef   = useRef();
  const printData  = useRef({});

  const { exito, error: notifError } = useNotificacion();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print { body { margin: 0; } }
    `,
  });

  React.useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    setTab(0);
    setNombreFact('');
    setAplicarIva(true);
    setMetodoPago('efectivo');
    setMontoRecibido('');
    setGrupos([{ nombre: 'Persona 1', items: [], nombreFactura: '' }]);
    pedidoService.getFactura(pedidoId)
      .then(data => {
        setFactura(data);
        // Por defecto todos los items al primer grupo
        setGrupos([{
          nombre: 'Persona 1',
          items: (data.items || []).map((_, i) => i),
          nombreFactura: '',
        }]);
      })
      .catch(err => notifError(err.message))
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

  // ── Totales pago completo ────────────────────────────────────
  const subtotalTotal = factura?.subtotal || 0;
  const impuestoTotal = aplicarIva ? subtotalTotal * ((factura?.porcentajeImpuesto || 13) / 100) : 0;
  const totalCompleto = subtotalTotal + impuestoTotal;

  // ── Helpers dividido ─────────────────────────────────────────
  const getSubtotalGrupo = (grupo) =>
    (factura?.items || [])
      .filter((_, i) => grupo.items.includes(i))
      .reduce((s, item) => s + item.subtotal, 0);

  const toggleItemGrupo = (grupoIdx, itemIdx) => {
    setGrupos(prev => prev.map((g, gi) => {
      if (gi !== grupoIdx) return g;
      const tiene = g.items.includes(itemIdx);
      return { ...g, items: tiene ? g.items.filter(i => i !== itemIdx) : [...g.items, itemIdx] };
    }));
  };

  const agregarGrupo = () => {
    setGrupos(prev => [...prev, {
      nombre: `Persona ${prev.length + 1}`,
      items: [],
      nombreFactura: '',
    }]);
  };

  const eliminarGrupo = (idx) => {
    if (grupos.length === 1) return;
    setGrupos(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Imprimir grupo específico ────────────────────────────────
  const imprimirGrupo = (grupo) => {
    if (!factura) return;
    const items = (factura.items || []).filter((_, i) => grupo.items.includes(i));
    const sub   = items.reduce((s, i) => s + i.subtotal, 0);
    const imp   = aplicarIva ? sub * ((factura.porcentajeImpuesto || 13) / 100) : 0;
    printData.current = {
      items, subtotal: sub, impuesto: imp, total: sub + imp,
      aplicarIva, porcentajeImpuesto: factura.porcentajeImpuesto,
      pedidoId, fecha: factura.fecha,
      nombreCliente: factura.nombreCliente,
      numeroMesa: factura.numeroMesa,
      atendidoPor: factura.atendidoPor,
      nombreFactura: grupo.nombreFactura,
    };
    handlePrint();
  };

  const imprimirTotal = () => {
    if (!factura) return;
    printData.current = {
      items: factura.items || [],
      subtotal: subtotalTotal, impuesto: impuestoTotal, total: totalCompleto,
      aplicarIva, porcentajeImpuesto: factura.porcentajeImpuesto,
      pedidoId, fecha: factura.fecha,
      nombreCliente: factura.nombreCliente,
      numeroMesa: factura.numeroMesa,
      atendidoPor: factura.atendidoPor,
      nombreFactura: nombreFact,
    };
    handlePrint();
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

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Factura #{pedidoId}</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 0 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} sx={{ mb: 1 }} height={40} />)
          ) : factura ? (
            <>
              {/* Tabs */}
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab icon={<ReceiptIcon fontSize="small" />} iconPosition="start" label="Pago completo" />
                <Tab icon={<SplitIcon fontSize="small" />} iconPosition="start" label="Pago dividido" />
              </Tabs>

              {/* ── TAB 0: Pago completo ── */}
              {tab === 0 && (
                <Box>
                  {/* Toggle IVA + nombre factura */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth size="small"
                        label="Nombre en la factura (opcional)"
                        placeholder="Ej: Juan Pérez / Empresa ABC"
                        value={nombreFact}
                        onChange={e => setNombreFact(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <FormControlLabel
                          control={<Switch checked={aplicarIva} onChange={e => setAplicarIva(e.target.checked)} color="primary" />}
                          label={`IVA ${factura.porcentajeImpuesto}%`}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Resumen */}
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                      { label: 'Subtotal',    value: fmt(subtotalTotal), color: 'default' },
                      { label: 'IVA',         value: aplicarIva ? fmt(impuestoTotal) : 'Exento', color: 'default' },
                      { label: 'TOTAL',       value: fmt(totalCompleto), color: 'primary', big: true },
                    ].map(k => (
                      <Grid item xs={4} key={k.label}>
                        <Card sx={{ textAlign: 'center', p: 1.5, bgcolor: k.big ? 'primary.main' : 'grey.50' }}
                          variant={k.big ? 'elevation' : 'outlined'}>
                          <Typography variant="caption" sx={{ color: k.big ? '#fff' : 'text.secondary' }}>{k.label}</Typography>
                          <Typography fontWeight={800} sx={{ color: k.big ? '#fff' : 'text.primary', fontSize: k.big ? '1.1rem' : '1rem' }}>
                            {k.value}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Tabla */}
                  <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell><b>Platillo</b></TableCell>
                          <TableCell align="center"><b>Cant.</b></TableCell>
                          <TableCell align="right"><b>Subtotal</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {factura.items?.map((item, i) => (
                          <TableRow key={i} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                              {item.personalizaciones?.map((p, pi) => (
                                <Typography key={pi} variant="caption" color="text.secondary" display="block">↳ {p}</Typography>
                              ))}
                            </TableCell>
                            <TableCell align="center">{item.cantidad}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* ── Método de pago ── */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                      💳 Método de pago
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: metodoPago === 'efectivo' ? 2 : 0 }}>
                      {[
                        { key: 'efectivo', label: '💵 Efectivo' },
                        { key: 'tarjeta',  label: '💳 Tarjeta' },
                        { key: 'sinpe',    label: '📱 SINPE' },
                      ].map(m => (
                        <Grid item xs={4} key={m.key}>
                          <Card
                            onClick={() => { setMetodoPago(m.key); setMontoRecibido(''); }}
                            sx={{
                              p: 1.5, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                              border: '2px solid',
                              borderColor: metodoPago === m.key ? 'primary.main' : 'divider',
                              bgcolor: metodoPago === m.key ? 'primary.50' : '#fff',
                              transition: 'all .2s',
                            }}
                          >
                            <Typography variant="body2" fontWeight={metodoPago === m.key ? 800 : 400}>
                              {m.label}
                            </Typography>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Vuelto — solo en efectivo */}
                    {metodoPago === 'efectivo' && (
                      <Box>
                        <TextField
                          fullWidth size="small"
                          label="Monto recibido del cliente"
                          type="number"
                          placeholder={String(totalCompleto)}
                          value={montoRecibido}
                          onChange={e => setMontoRecibido(e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₡</InputAdornment>,
                          }}
                          sx={{ mb: 1.5 }}
                        />
                        {montoRecibido !== '' && (
                          <Box sx={{
                            p: 1.5, borderRadius: 2,
                            bgcolor: Number(montoRecibido) >= totalCompleto ? 'success.50' : 'error.50',
                            border: '1px solid',
                            borderColor: Number(montoRecibido) >= totalCompleto ? 'success.main' : 'error.main',
                          }}>
                            {Number(montoRecibido) >= totalCompleto ? (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="body2" color="success.dark">✅ Pago suficiente</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Recibido: {fmt(Number(montoRecibido))} · Total: {fmt(totalCompleto)}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="caption" color="text.secondary">VUELTO</Typography>
                                  <Typography variant="h5" fontWeight={900} color="success.main">
                                    {fmt(Number(montoRecibido) - totalCompleto)}
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="error.dark">
                                  ❌ Monto insuficiente
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="error.main">
                                  Faltan {fmt(totalCompleto - Number(montoRecibido))}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* ── TAB 1: Pago dividido ── */}
              {tab === 1 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Asigna cada platillo a la persona que lo paga. Puedes imprimir un comprobante por separado.
                  </Alert>

                  {/* Toggle IVA global */}
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <FormControlLabel
                      control={<Switch checked={aplicarIva} onChange={e => setAplicarIva(e.target.checked)} color="primary" />}
                      label={`IVA ${factura.porcentajeImpuesto}%`}
                    />
                  </Box>

                  {grupos.map((grupo, gi) => {
                    const sub = getSubtotalGrupo(grupo);
                    const imp = aplicarIva ? sub * ((factura.porcentajeImpuesto || 13) / 100) : 0;
                    return (
                      <Card key={gi} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                        <CardContent sx={{ pb: '12px !important' }}>
                          {/* Cabecera del grupo */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <TextField
                              size="small" sx={{ flex: 1 }}
                              label="Nombre de la persona"
                              value={grupo.nombre}
                              onChange={e => setGrupos(prev => prev.map((g, i) => i === gi ? { ...g, nombre: e.target.value } : g))}
                              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
                            />
                            <TextField
                              size="small" sx={{ flex: 1 }}
                              label="Nombre en factura"
                              value={grupo.nombreFactura}
                              onChange={e => setGrupos(prev => prev.map((g, i) => i === gi ? { ...g, nombreFactura: e.target.value } : g))}
                            />
                            {grupos.length > 1 && (
                              <IconButton size="small" color="error" onClick={() => eliminarGrupo(gi)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>

                          {/* Items asignables */}
                          <TableContainer>
                            <Table size="small">
                              <TableBody>
                                {factura.items?.map((item, ii) => (
                                  <TableRow key={ii} hover
                                    onClick={() => toggleItemGrupo(gi, ii)}
                                    sx={{ cursor: 'pointer', bgcolor: grupo.items.includes(ii) ? 'primary.50' : 'inherit' }}>
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        size="small"
                                        checked={grupo.items.includes(ii)}
                                        onChange={() => toggleItemGrupo(gi, ii)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                                      {item.personalizaciones?.map((p, pi) => (
                                        <Typography key={pi} variant="caption" color="text.secondary" display="block">↳ {p}</Typography>
                                      ))}
                                    </TableCell>
                                    <TableCell align="center">{item.cantidad}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(item.subtotal)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>

                          {/* Total del grupo + imprimir */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Subtotal: {fmt(sub)}
                                {aplicarIva && <> · IVA: {fmt(imp)}</>}
                              </Typography>
                              <Typography fontWeight={800} color="primary.main">
                                Total: {fmt(sub + imp)}
                              </Typography>
                            </Box>
                            <Button
                              size="small" variant="outlined" startIcon={<PrintIcon />}
                              disabled={grupo.items.length === 0}
                              onClick={() => imprimirGrupo(grupo)}
                            >
                              Imprimir
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Button startIcon={<AddIcon />} variant="dashed" onClick={agregarGrupo} fullWidth
                    sx={{ border: '1px dashed', borderColor: 'primary.main', color: 'primary.main', py: 1 }}>
                    Agregar persona
                  </Button>
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={onClose} variant="outlined">Cerrar</Button>
          {tab === 0 && (
            <Button startIcon={<PrintIcon />} variant="outlined" onClick={imprimirTotal} disabled={!factura}>
              Imprimir comprobante
            </Button>
          )}
          <Button
            startIcon={<PagarIcon />} variant="contained" color="success"
            onClick={handlePagar} disabled={pagando || !factura} sx={{ fontWeight: 700 }}
          >
            {pagando ? 'Procesando...' : '💳 Marcar como Pagado'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Componente oculto para impresión */}
      <Box sx={{ display: 'none' }}>
        <Comprobante ref={printRef} datos={printData.current} />
      </Box>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Página principal Caja
// ─────────────────────────────────────────────────────────────
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
    if (!['Listo', 'Entregado', 'Pagado'].includes(p.estado)) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return p.id.toString().includes(q) ||
      p.nombreCliente?.toLowerCase().includes(q) ||
      p.numeroMesa?.toLowerCase().includes(q);
  });

  const totalHoy = pedidos
    .filter(p => p.estado === 'Pagado' && new Date(p.creadoEn).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + (p.total || 0), 0);
  const cantHoy = pedidos
    .filter(p => p.estado === 'Pagado' && new Date(p.creadoEn).toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="secondary.main">💳 Caja y Facturación</Typography>
          <Typography variant="body2" color="text.secondary">Pagos individuales, divididos e impresión de comprobantes</Typography>
        </Box>
        <Tooltip title="Actualizar"><IconButton onClick={cargar}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {/* Resumen rápido */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Ventas hoy', value: fmt(totalHoy), color: 'success.main', text: '#fff' },
          { label: 'Pagados hoy', value: cantHoy, color: 'grey.100', text: 'text.primary' },
          { label: 'Pendientes de cobro', value: pedidos.filter(p => ['Listo','Entregado'].includes(p.estado)).length, color: 'warning.50', text: 'warning.dark' },
          { label: 'En lista', value: pedidosFiltrados.length, color: 'grey.100', text: 'text.primary' },
        ].map(k => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: k.color }} variant="outlined">
              <Typography variant="caption" sx={{ color: k.text }}>{k.label}</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: k.text }}>{k.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField fullWidth sx={{ mb: 2 }} size="small"
        placeholder="Buscar por #, cliente o mesa..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><b>#</b></TableCell>
                <TableCell><b>Mesa</b></TableCell>
                <TableCell><b>Cliente</b></TableCell>
                <TableCell><b>Ítems</b></TableCell>
                <TableCell><b>Fecha</b></TableCell>
                <TableCell align="right"><b>Total</b></TableCell>
                <TableCell align="center"><b>Estado</b></TableCell>
                <TableCell align="center"><b>Acciones</b></TableCell>
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
                    <CajaIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography>No hay pedidos en caja</Typography>
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