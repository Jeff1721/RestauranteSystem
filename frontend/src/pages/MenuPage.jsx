import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, CardMedia, CardActions,
  Button, IconButton, Typography, Chip, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Switch, FormControlLabel, Tooltip, Fab, Tab, Tabs, Paper,
  List, ListItem, ListItemText, ListItemSecondaryAction, Avatar,
  alpha, useTheme, Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  RestaurantMenu as MenuIcon,
  Category as CategoryIcon,
  AttachMoney as PriceIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { platilloService, categoriaService } from '../services/services';
import { PageHeader, ConfirmDialog, LoadingOverlay, EmptyState } from '../components/common/CommonComponents';

// ── Convierte URL de Google Drive al formato thumbnail (funciona sin CORS) ──
function convertirUrlDrive(url) {
  if (!url) return url;
  let id = null;
  // https://drive.google.com/file/d/ID/view
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) id = m1[1];
  // https://drive.google.com/open?id=ID  o  uc?id=ID
  if (!id) { const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m2) id = m2[1]; }
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  return url;
}


// ─── Skeleton de tarjeta ──────────────────────────────────────────────────────
const PlatilloCardSkeleton = () => (
  <Card sx={{ borderRadius: 3 }}>
    <Skeleton variant="rectangular" height={160} />
    <CardContent>
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" />
    </CardContent>
  </Card>
);

// ─── Tarjeta de platillo ──────────────────────────────────────────────────────
const PlatilloCard = ({ platillo, onEdit, onToggle, onDelete }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        borderRadius: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s ease',
        opacity: platillo.disponible ? 1 : 0.6,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: theme.shadows[6],
        },
      }}
    >
      {/* Imagen o placeholder */}
      {platillo.imagenUrl ? (
        <Box sx={{ position: 'relative', height: 160, overflow: 'hidden' }}>
          <img
            src={convertirUrlDrive(platillo.imagenUrl)}
            alt={platillo.nombre}
            style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <Box
            style={{ display: 'none' }}
            sx={{
              height: 160,
              width: '100%',
              position: 'absolute',
              top: 0,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <ImageIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">URL no válida</Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          }}
        >
          <ImageIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
            {platillo.nombre}
          </Typography>
          <Chip
            label={platillo.disponible ? 'Activo' : 'Inactivo'}
            size="small"
            color={platillo.disponible ? 'success' : 'default'}
            sx={{ ml: 1, flexShrink: 0 }}
          />
        </Box>

        <Chip
          label={platillo.nombreCategoria || platillo.categoriaNombre || 'Sin categoría'}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ mb: 1 }}
        />

        {platillo.descripcion && (
          <Typography variant="body2" color="text.secondary" sx={{
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1,
          }}>
            {platillo.descripcion}
          </Typography>
        )}

        <Typography variant="h6" color="primary" fontWeight={800}>
          ₡{Number(platillo.precio).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
        <Tooltip title={platillo.disponible ? 'Desactivar' : 'Activar'}>
          <IconButton size="small" onClick={() => onToggle(platillo)} color={platillo.disponible ? 'warning' : 'success'}>
            {platillo.disponible ? <HiddenIcon fontSize="small" /> : <VisibleIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => onEdit(platillo)} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" onClick={() => onDelete(platillo)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

// ─── Formulario de platillo (diálogo) ─────────────────────────────────────────
const PlatilloDialog = ({ open, onClose, platillo, categorias, onSaved }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(platillo?.id);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '', descripcion: '', precio: '', imagenUrl: '',
      categoriaId: '', disponible: true,
    },
  });

  // Rellenar formulario al abrir en modo edición
  useEffect(() => {
    if (open) {
      reset(platillo
        ? { ...platillo, precio: platillo.precio ?? '', categoriaId: platillo.categoriaId ?? '' }
        : { nombre: '', descripcion: '', precio: '', imagenUrl: '', categoriaId: '', disponible: true }
      );
    }
  }, [open, platillo, reset]);

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const payload = { ...data, precio: parseFloat(data.precio) };
      if (isEdit) {
        await platilloService.actualizar(platillo.id, payload);
        enqueueSnackbar('Platillo actualizado', { variant: 'success' });
      } else {
        await platilloService.crear(payload);
        enqueueSnackbar('Platillo creado', { variant: 'success' });
      }
      onSaved();
      onClose();
    } catch {
      enqueueSnackbar('Error al guardar el platillo', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Platillo' : 'Nuevo Platillo'}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          {/* Nombre */}
          <Controller name="nombre" control={control}
            rules={{ required: 'El nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } }}
            render={({ field }) => (
              <TextField {...field} label="Nombre del platillo" error={!!errors.nombre}
                helperText={errors.nombre?.message} fullWidth />
            )}
          />

          {/* Categoría */}
          <Controller name="categoriaId" control={control}
            rules={{ required: 'Seleccione una categoría' }}
            render={({ field }) => (
              <TextField {...field} select label="Categoría" error={!!errors.categoriaId}
                helperText={errors.categoriaId?.message} fullWidth>
                {categorias.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Precio */}
          <Controller name="precio" control={control}
            rules={{
              required: 'El precio es requerido',
              min: { value: 0.01, message: 'El precio debe ser mayor a 0' },
            }}
            render={({ field }) => (
              <TextField {...field} label="Precio" type="number" error={!!errors.precio}
                helperText={errors.precio?.message} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">₡</InputAdornment> }}
              />
            )}
          />

          {/* Descripción */}
          <Controller name="descripcion" control={control}
            render={({ field }) => (
              <TextField {...field} label="Descripción (opcional)" multiline rows={2} fullWidth />
            )}
          />

          {/* URL Imagen */}
          <Controller name="imagenUrl" control={control}
            render={({ field }) => (
              <Box>
                <TextField
                  {...field}
                  label="URL de imagen (Google Drive u otra)"
                  fullWidth
                  placeholder="https://drive.google.com/file/d/... o cualquier URL"
                  helperText="Pega el link de Google Drive — se convierte automáticamente"
                  InputProps={{ startAdornment: <InputAdornment position="start"><ImageIcon fontSize="small" /></InputAdornment> }}
                  onChange={(e) => field.onChange(convertirUrlDrive(e.target.value.trim()))}
                />
                {field.value && (
                  <Box sx={{ mt: 1, borderRadius: 1, overflow: 'hidden', height: 120, bgcolor: 'grey.100', position: 'relative' }}>
                    <img
                      src={convertirUrlDrive(field.value)}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <Box style={{ display: 'none' }} sx={{
                      position: 'absolute', top: 0, width: '100%', height: '100%',
                      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                      bgcolor: 'grey.100', color: 'text.disabled',
                    }}>
                      <ImageIcon />
                      <Typography variant="caption">URL no válida o sin acceso</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          />

          {/* Disponible */}
          <Controller name="disponible" control={control}
            render={({ field: { value, onChange } }) => (
              <FormControlLabel
                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="success" />}
                label="Disponible en menú"
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
          {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Pestaña: Categorías ──────────────────────────────────────────────────────
const CategoriasTab = ({ categorias, onReload }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eliminar, setEliminar] = useState(null);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { nombre: '', descripcion: '' } });

  const abrirCrear = () => { setEditando(null); reset({ nombre: '', descripcion: '' }); setDialogOpen(true); };
  const abrirEditar = (cat) => { setEditando(cat); reset(cat); setDialogOpen(true); };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      if (editando) {
        await categoriaService.actualizar(editando.id, data);
        enqueueSnackbar('Categoría actualizada', { variant: 'success' });
      } else {
        await categoriaService.crear(data);
        enqueueSnackbar('Categoría creada', { variant: 'success' });
      }
      onReload();
      setDialogOpen(false);
    } catch {
      enqueueSnackbar('Error al guardar categoría', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = async () => {
    try {
      await categoriaService.eliminar(eliminar.id);
      enqueueSnackbar('Categoría eliminada', { variant: 'success' });
      onReload();
    } catch {
      enqueueSnackbar('No se puede eliminar: tiene platillos asociados', { variant: 'error' });
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}>
          Nueva Categoría
        </Button>
      </Box>

      {categorias.length === 0 ? (
        <EmptyState title="Sin categorías" message="Crea la primera categoría para empezar a organizar el menú" icon={<CategoryIcon />} />
      ) : (
        <List>
          {categorias.map(cat => (
            <Paper key={cat.id} sx={{ mb: 1, borderRadius: 2 }} variant="outlined">
              <ListItem>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <CategoryIcon />
                </Avatar>
                <ListItemText
                  primary={<Typography fontWeight={600}>{cat.nombre}</Typography>}
                  secondary={cat.descripcion || 'Sin descripción'}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => abrirEditar(cat)} size="small" color="primary" sx={{ mr: 0.5 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => { setEliminar(cat); setConfirmOpen(true); }} size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      {/* Diálogo de categoría */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editando ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="nombre" control={control}
              rules={{ required: 'El nombre es requerido' }}
              render={({ field }) => (
                <TextField {...field} label="Nombre" error={!!errors.nombre}
                  helperText={errors.nombre?.message} fullWidth />
              )}
            />
            <Controller name="descripcion" control={control}
              render={({ field }) => (
                <TextField {...field} label="Descripción (opcional)" fullWidth />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar Categoría"
        message={`¿Deseas eliminar "${eliminar?.nombre}"? El platillo se desactivará y no aparecerá en el menú. Los pedidos históricos se conservan.`}
        onConfirm={confirmarEliminar}
        onClose={() => setConfirmOpen(false)}
        confirmColor="error"
        confirmText="Eliminar"
      />
    </Box>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const MenuPage = () => {
  const theme = useTheme();

  const [tab, setTab] = useState(0);
  const [platillos, setPlatillos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eliminar, setEliminar] = useState(null);

  const { enqueueSnackbar } = useSnackbar();

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [p, c] = await Promise.all([
        platilloService.obtenerTodos(),
        categoriaService.obtenerTodas(),
      ]);
      setPlatillos(p);
      setCategorias(c);
    } catch {
      enqueueSnackbar('Error al cargar el menú', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const platillosFiltrados = platillos.filter(p => {
    const matchTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !filtroCategoria || Number(p.categoriaId) === Number(filtroCategoria);
    return matchTexto && matchCategoria;
  });

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleToggle = async (platillo) => {
    try {
      await platilloService.actualizar(platillo.id, { ...platillo, disponible: !platillo.disponible });
      enqueueSnackbar(
        `"${platillo.nombre}" ${!platillo.disponible ? 'activado' : 'desactivado'}`,
        { variant: 'info' }
      );
      cargarDatos();
    } catch {
      enqueueSnackbar('Error al cambiar disponibilidad', { variant: 'error' });
    }
  };

  const handleEliminar = async () => {
    try {
      await platilloService.eliminar(eliminar.id);
      enqueueSnackbar('Platillo eliminado', { variant: 'success' });
      cargarDatos();
    } catch {
      enqueueSnackbar('Error al eliminar platillo', { variant: 'error' });
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Gestión de Menú"
        subtitle="Administra platillos y categorías del restaurante"
        icon={<MenuIcon />}
        action={
          tab === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditando(null); setDialogOpen(true); }}>
              Nuevo Platillo
            </Button>
          )
        }
      />

      {/* ── Pestañas ─────────────────────────────────────────────────────── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }} variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab icon={<MenuIcon />} iconPosition="start" label="Platillos" />
          <Tab icon={<CategoryIcon />} iconPosition="start" label="Categorías" />
        </Tabs>
      </Paper>

      {/* ── Pestaña Platillos ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          {/* Buscador y filtros */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" placeholder="Buscar platillos..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth select size="small" label="Categoría"
                value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              >
                <MenuItem value="">Todas las categorías</MenuItem>
                {categorias.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                {platillosFiltrados.length} resultado{platillosFiltrados.length !== 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>

          {/* Grilla de tarjetas */}
          {loading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                  <PlatilloCardSkeleton />
                </Grid>
              ))}
            </Grid>
          ) : platillosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin platillos"
              message={busqueda ? `No hay resultados para "${busqueda}"` : 'Agrega el primer platillo al menú'}
              icon={<MenuIcon />}
            />
          ) : (
            <Grid container spacing={3}>
              {platillosFiltrados.map(p => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                  <PlatilloCard
                    platillo={p}
                    onEdit={(plat) => { setEditando(plat); setDialogOpen(true); }}
                    onToggle={handleToggle}
                    onDelete={(plat) => { setEliminar(plat); setConfirmOpen(true); }}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* FAB mobile */}
          <Fab
            color="primary" size="medium"
            sx={{ display: { xs: 'flex', sm: 'none' }, position: 'fixed', bottom: 24, right: 24 }}
            onClick={() => { setEditando(null); setDialogOpen(true); }}
          >
            <AddIcon />
          </Fab>
        </>
      )}

      {/* ── Pestaña Categorías ────────────────────────────────────────────── */}
      {tab === 1 && (
        <CategoriasTab categorias={categorias} onReload={cargarDatos} />
      )}

      {/* Diálogo de platillo */}
      <PlatilloDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        platillo={editando}
        categorias={categorias}
        onSaved={cargarDatos}
      />

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar Platillo"
        message={`¿Deseas eliminar "${eliminar?.nombre}" del menú? Esta acción no se puede deshacer.`}
        onConfirm={handleEliminar}
        onClose={() => setConfirmOpen(false)}
        confirmColor="error"
        confirmText="Eliminar"
      />
    </Box>
  );
};

export default MenuPage;