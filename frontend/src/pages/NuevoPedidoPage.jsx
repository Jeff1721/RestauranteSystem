// src/pages/NuevoPedidoPage.jsx
import React, { useState, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, CardActionArea, CardMedia,
  Typography, Button, IconButton, Badge, Tabs, Tab, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Divider, Avatar, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction, Paper, Alert,
  FormControl, InputLabel, Select, MenuItem, Drawer,
  useMediaQuery, useTheme, Fab, Autocomplete, CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon,
  ShoppingCart as CartIcon, Send as SendIcon,
  Edit as EditIcon, Restaurant as RestaurantIcon,
  PersonSearch as PersonIcon, TableBar as TableIcon,
  ReceiptLong as ReceiptIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import {
  agregarItem, removerItem, actualizarItem, limpiarCarrito,
  setInfoPedido, selectItems, selectTotal, selectCantidadItems
} from '../store/store';
import { usePlatillos } from '../hooks/hooks';
import { useNotificacion } from '../hooks/hooks';
import { pedidoService, clienteService } from '../services/services';
import { useNavigate } from 'react-router-dom';

const MONEDA = '₡';
const fmt = (n) => `${MONEDA}${Number(n).toLocaleString('es-CR', { minimumFractionDigits: 0 })}`;

// ── Modal personalizar ítem ────────────────────────────────────
function PersonalizarDialog({ item, onSave, onClose }) {
  const [cantidad, setCantidad] = useState(item?.cantidad || 1);
  const [notas, setNotas]       = useState(item?.notas || '');
  const [pers, setPers]         = useState(item?.personalizaciones || []);
  const [newPers, setNewPers]   = useState({ tipo: 'SIN', descripcion: '', costoAdicional: 0 });

  const agregarPers = () => {
    if (!newPers.descripcion.trim()) return;
    setPers(prev => [...prev, { ...newPers }]);
    setNewPers({ tipo: 'SIN', descripcion: '', costoAdicional: 0 });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RestaurantIcon color="primary" />
        {item?.platillo?.nombre}
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        {/* Cantidad */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography fontWeight={600}>Cantidad:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="h5" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 700 }}>
              {cantidad}
            </Typography>
            <IconButton size="small" onClick={() => setCantidad(cantidad + 1)}
              sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography color="primary" fontWeight={700} sx={{ ml: 'auto' }}>
            {fmt((item?.platillo?.precio + pers.reduce((s,p) => s+(p.costoAdicional||0),0)) * cantidad)}
          </Typography>
        </Box>

        {/* Notas */}
        <TextField
          fullWidth label="Notas especiales" value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: sin cebolla, bien cocido..."
          multiline rows={2} sx={{ mb: 3 }}
        />

        {/* Personalizaciones */}
        <Typography fontWeight={700} gutterBottom>Personalizaciones:</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={newPers.tipo} label="Tipo"
              onChange={(e) => setNewPers(p => ({ ...p, tipo: e.target.value }))}>
              <MenuItem value="SIN">🚫 Sin</MenuItem>
              <MenuItem value="EXTRA">➕ Extra</MenuItem>
              <MenuItem value="AL_GUSTO">🍴 Al gusto</MenuItem>
              <MenuItem value="OTRO">📝 Otro</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Descripción" sx={{ flex: 1, minWidth: 140 }}
            value={newPers.descripcion}
            onChange={(e) => setNewPers(p => ({ ...p, descripcion: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && agregarPers()}
          />
          <TextField size="small" label="Costo (+/-)" sx={{ width: 120 }}
            type="number"
            placeholder="0"
            inputProps={{ step: 100 }}
            InputProps={{ startAdornment: <InputAdornment position="start">₡</InputAdornment> }}
            value={newPers.costoAdicional === 0 ? '' : newPers.costoAdicional}
            onChange={(e) => {
              const val = e.target.value;
              setNewPers(p => ({ ...p, costoAdicional: val === '' ? 0 : Number(val) }));
            }}
            helperText="Negativo = rebajo"
          />
          <Button variant="outlined" onClick={agregarPers} sx={{ px: 2 }}>
            <AddIcon />
          </Button>
        </Box>

        {pers.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {pers.map((p, i) => (
              <Chip
                key={i}
                label={`${p.tipo === 'SIN' ? '🚫' : p.tipo === 'EXTRA' ? '➕' : '🍴'} ${p.descripcion}${p.costoAdicional !== 0 ? ` ${p.costoAdicional > 0 ? '+' : ''}${fmt(p.costoAdicional)}` : ''}`}
                onDelete={() => setPers(prev => prev.filter((_, idx) => idx !== i))}
                size="small" variant="outlined"
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button variant="contained" onClick={() => onSave({ cantidad, notas, personalizaciones: pers })}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Tarjeta de platillo ────────────────────────────────────────
function PlatilloCard({ platillo, onAgregar }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {platillo.destacado && (
        <Chip label="⭐ Destacado" size="small" color="warning"
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontWeight: 700, fontSize: '0.7rem' }} />
      )}
      <CardActionArea onClick={() => onAgregar(platillo)} sx={{ flex: 1 }}>
        {platillo.imagenUrl ? (
          <CardMedia component="img" height="120" image={platillo.imagenUrl} alt={platillo.nombre}
            sx={{ objectFit: 'cover' }} />
        ) : (
          <Box sx={{
            height: 80, bgcolor: 'primary.main', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #B5451B20, #B5451B40)'
          }}>
            <RestaurantIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.6 }} />
          </Box>
        )}
        <CardContent sx={{ py: 1.5 }}>
          <Typography fontWeight={700} variant="body2" gutterBottom noWrap>
            {platillo.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1
          }}>
            {platillo.descripcion}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography color="primary.main" fontWeight={800} variant="body1">
              {fmt(platillo.precio)}
            </Typography>
            {platillo.tiempoPrep && (
              <Typography variant="caption" color="text.secondary">
                ⏱ {platillo.tiempoPrep}min
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Panel del carrito ──────────────────────────────────────────
function CarritoPanel({ onEnviar, loading }) {
  const dispatch  = useDispatch();
  const items     = useSelector(selectItems);
  const { subtotal, impuesto, total } = useSelector(selectTotal);
  const [persItem, setPersItem]   = useState(null);
  const [infoPedido, setInfoPedido_local] = useState({
    numeroMesa: '', nombreCliente: '', atendidoPor: '', clienteId: null
  });

  // Búsqueda de clientes
  const [clienteOpts,    setClienteOpts]    = useState([]);
  const [clienteInput,   setClienteInput]   = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (clienteInput.length < 1) { setClienteOpts([]); return; }
      setBuscandoCliente(true);
      try {
        const data = await clienteService.buscar(clienteInput);
        setClienteOpts(Array.isArray(data) ? data : []);
      } catch { setClienteOpts([]); }
      finally { setBuscandoCliente(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteInput]);

  const handlePersonalizar = (item, index) => setPersItem({ item, index });

  const handleSavePers = ({ cantidad, notas, personalizaciones }) => {
    dispatch(actualizarItem({ index: persItem.index, cantidad, notas, personalizaciones }));
    setPersItem(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CartIcon color="primary" /> Pedido Actual
        <Chip label={items.length} size="small" color="primary" sx={{ ml: 'auto' }} />
      </Typography>

      {/* Info del pedido */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <TextField label="N° Mesa" size="small" fullWidth
          value={infoPedido.numeroMesa}
          onChange={(e) => setInfoPedido_local(p => ({ ...p, numeroMesa: e.target.value }))}
          InputProps={{ startAdornment: <TableIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} /> }}
        />

        {/* Buscador de cliente registrado o nombre libre */}
        <Autocomplete
          freeSolo
          size="small"
          options={clienteOpts}
          getOptionLabel={(opt) =>
            typeof opt === 'string' ? opt : `${opt.nombre} ${opt.apellido}`
          }
          inputValue={clienteInput}
          onInputChange={(_, value) => {
            setClienteInput(value);
            // Si escribe libremente (no seleccionó), limpiar clienteId y guardar como nombre
            setInfoPedido_local(p => ({ ...p, nombreCliente: value, clienteId: null }));
          }}
          onChange={(_, value) => {
            if (value && typeof value === 'object') {
              // Seleccionó un cliente registrado
              setClienteInput(`${value.nombre} ${value.apellido}`);
              setInfoPedido_local(p => ({
                ...p,
                clienteId: value.id,
                nombreCliente: `${value.nombre} ${value.apellido}`,
              }));
            }
          }}
          loading={buscandoCliente}
          noOptionsText={clienteInput.length > 0 ? 'No encontrado — se registrará como nombre libre' : 'Escribe para buscar...'}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cliente (buscar o escribir nombre)"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <><PersonIcon sx={{ ml: 0.5, mr: 0.5, color: 'action.active', fontSize: 20 }} />{params.InputProps.startAdornment}</>
                ),
                endAdornment: (
                  <>
                    {buscandoCliente ? <CircularProgress size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, opt) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {opt.nombre} {opt.apellido}
                </Typography>
                {opt.telefono && (
                  <Typography variant="caption" color="text.secondary">{opt.telefono}</Typography>
                )}
              </Box>
            </Box>
          )}
        />

        <TextField label="Mesero" size="small" fullWidth
          value={infoPedido.atendidoPor}
          onChange={(e) => setInfoPedido_local(p => ({ ...p, atendidoPor: e.target.value }))}
        />
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
        {items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <CartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">Selecciona platillos del menú</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((item, index) => (
              <ListItem key={index} alignItems="flex-start" sx={{
                py: 1, px: 0, borderBottom: '1px solid', borderColor: 'divider'
              }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{item.platillo.nombre}</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {fmt((item.platillo.precio + (item.personalizaciones||[]).reduce((s,p)=>s+(p.costoAdicional||0),0)) * item.cantidad)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <IconButton size="small" onClick={() => {
                          if (item.cantidad === 1) dispatch(removerItem(index));
                          else dispatch(actualizarItem({ index, cantidad: item.cantidad - 1, notas: item.notas, personalizaciones: item.personalizaciones }));
                        }}>
                          <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="body2" fontWeight={700}>{item.cantidad}</Typography>
                        <IconButton size="small" onClick={() => dispatch(actualizarItem({ index, cantidad: item.cantidad + 1, notas: item.notas, personalizaciones: item.personalizaciones }))}>
                          <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary">
                          @ {fmt(item.platillo.precio + (item.personalizaciones||[]).reduce((s,p)=>s+(p.costoAdicional||0),0))}
                        </Typography>
                      </Box>
                      {item.personalizaciones.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mt: 0.5 }}>
                          {item.personalizaciones.map((p, pi) => (
                            <Chip key={pi} label={p.descripcion} size="small"
                              variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handlePersonalizar(item, index)}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => dispatch(removerItem(index))}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Totales */}
      {items.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
            <Typography variant="body2">{fmt(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">IVA (13%)</Typography>
            <Typography variant="body2">{fmt(impuesto)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2,
            bgcolor: 'primary.main', color: '#fff', p: 1.5, borderRadius: 2 }}>
            <Typography fontWeight={800}>TOTAL</Typography>
            <Typography fontWeight={800} variant="h6">{fmt(total)}</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="error" size="small"
              onClick={() => dispatch(limpiarCarrito())} sx={{ flex: 1 }}>
              Limpiar
            </Button>
            <Button variant="contained" startIcon={<SendIcon />}
              onClick={() => onEnviar(infoPedido)}
              disabled={loading || items.length === 0} sx={{ flex: 2 }}>
              {loading ? 'Enviando...' : 'Enviar a Cocina'}
            </Button>
          </Box>
        </Box>
      )}

      {persItem && (
        <PersonalizarDialog
          item={persItem.item}
          onSave={handleSavePers}
          onClose={() => setPersItem(null)}
        />
      )}
    </Box>
  );
}

// ── Página Principal ──────────────────────────────────────────
export default function NuevoPedidoPage() {
  const { platillos, categorias, loading: loadMenu } = usePlatillos();
  const { exito, error: notifError } = useNotificacion();
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const items      = useSelector(selectItems);
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'));

  const [tabCategoria, setTabCategoria] = useState(0);
  const [busqueda,     setBusqueda]     = useState('');
  const [enviando,     setEnviando]     = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const cantItems = useSelector(selectCantidadItems);

  const handleAgregarPlatillo = (platillo) => {
    dispatch(agregarItem({ platillo }));
  };

  // Filtrar platillos por categoría y búsqueda
  const categoriaActual = categorias[tabCategoria];
  const platillosFiltrados = useMemo(() => {
    let filtered = platillos;
    if (categoriaActual) {
      filtered = filtered.filter(p => p.categoriaId === categoriaActual.id);
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [platillos, categoriaActual, busqueda]);

  const handleEnviar = async (infoPedido) => {
    if (items.length === 0) return;
    setEnviando(true);
    try {
      const payload = {
        clienteId:      infoPedido.clienteId || null,
        nombreCliente:  infoPedido.nombreCliente || null,
        numeroMesa:     infoPedido.numeroMesa || null,
        atendidoPor:    infoPedido.atendidoPor || null,
        porcentajeImpuesto: 13,
        detalles: items.map(item => ({
          platilloId: item.platillo.id,
          cantidad:   item.cantidad,
          notas:      item.notas,
          personalizaciones: item.personalizaciones
        }))
      };
      const data = await pedidoService.create(payload);
      dispatch(limpiarCarrito());
      exito(`✅ Pedido #${data.id} enviado a cocina`);
      navigate('/cocina');
    } catch (err) {
      notifError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const carritoPanel = (
    <CarritoPanel onEnviar={handleEnviar} loading={enviando} />
  );

  return (
    <Box sx={{ height: 'calc(100vh - 128px)' }}>
      <Typography variant="h4" fontWeight={700} color="secondary.main" sx={{ mb: 2 }}>
        🍽️ Nuevo Pedido
      </Typography>

      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Panel Menú */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Búsqueda */}
          <TextField
            fullWidth placeholder="Buscar platillo..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>🔍</Box>
              )
            }}
          />

          {/* Tabs de Categorías */}
          {!busqueda && (
            <Tabs
              value={tabCategoria}
              onChange={(_, v) => setTabCategoria(v)}
              variant="scrollable" scrollButtons="auto"
              sx={{ mb: 2, bgcolor: 'background.paper', borderRadius: 2, px: 1 }}
            >
              {categorias.map((cat, i) => (
                <Tab key={cat.id} label={cat.nombre} value={i}
                  sx={{ fontWeight: 600, fontSize: '0.8rem' }} />
              ))}
            </Tabs>
          )}

          {/* Grid Platillos */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loadMenu ? (
              <Grid container spacing={2}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid item xs={6} sm={4} lg={3} key={i}>
                    <Card sx={{ height: 180 }}><CardContent><Box sx={{ bgcolor: 'grey.200', height: '100%', borderRadius: 1 }} /></CardContent></Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {platillosFiltrados.map(p => (
                  <Grid item xs={6} sm={4} lg={3} key={p.id}>
                    <PlatilloCard platillo={p} onAgregar={handleAgregarPlatillo} />
                  </Grid>
                ))}
                {platillosFiltrados.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info">No hay platillos disponibles en esta categoría</Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </Grid>

        {/* Panel Carrito — Desktop */}
        {!isMobile && (
          <Grid item md={4}>
            <Card sx={{ height: '100%', p: 2 }}>
              <CardContent sx={{ height: '100%', p: '0 !important' }}>
                {carritoPanel}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* FAB Carrito — Mobile */}
      {isMobile && (
        <>
          <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}
            onClick={() => setDrawerOpen(true)}>
            <Badge badgeContent={cantItems} color="error">
              <CartIcon />
            </Badge>
          </Fab>
          <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { borderRadius: '20px 20px 0 0', p: 2, maxHeight: '85vh' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Box>
            {carritoPanel}
          </Drawer>
        </>
      )}
    </Box>
  );
}
