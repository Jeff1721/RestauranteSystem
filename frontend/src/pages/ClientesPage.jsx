// src/pages/ClientesPage.jsx
import React, { useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  InputAdornment, Typography, Grid, Tooltip, Skeleton, Alert
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon, CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useClientes } from '../hooks/hooks';
import { useNotificacion } from '../hooks/hooks';
import { ConfirmDialog, PageHeader, EmptyState } from '../components/common/CommonComponents';

// ── Formulario de Cliente ──────────────────────────────────────
function ClienteForm({ cliente, onSave, onClose }) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      nombre:    cliente?.nombre    || '',
      apellido:  cliente?.apellido  || '',
      telefono:  cliente?.telefono  || '',
      email:     cliente?.email     || '',
      direccion: cliente?.direccion || '',
      activo:    cliente?.activo    ?? true,
    }
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onSave)} noValidate>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller name="nombre" control={control}
            rules={{ required: 'Nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } }}
            render={({ field }) => (
              <TextField {...field} label="Nombre *" fullWidth
                error={!!errors.nombre} helperText={errors.nombre?.message} />
            )} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller name="apellido" control={control}
            rules={{ required: 'Apellido es requerido' }}
            render={({ field }) => (
              <TextField {...field} label="Apellido *" fullWidth
                error={!!errors.apellido} helperText={errors.apellido?.message} />
            )} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller name="telefono" control={control}
            rules={{ pattern: { value: /^[0-9\-\+\s\(\)]{7,15}$/, message: 'Teléfono inválido' } }}
            render={({ field }) => (
              <TextField {...field} label="Teléfono" fullWidth
                error={!!errors.telefono} helperText={errors.telefono?.message} />
            )} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller name="email" control={control}
            rules={{ pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email inválido' } }}
            render={({ field }) => (
              <TextField {...field} label="Email" fullWidth type="email"
                error={!!errors.email} helperText={errors.email?.message} />
            )} />
        </Grid>
        <Grid item xs={12}>
          <Controller name="direccion" control={control}
            render={({ field }) => (
              <TextField {...field} label="Dirección" fullWidth multiline rows={2} />
            )} />
        </Grid>
      </Grid>

      <DialogActions sx={{ px: 0, pt: 3 }}>
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}
          startIcon={<PersonAddIcon />}>
          {isSubmitting ? 'Guardando...' : (cliente ? 'Actualizar' : 'Crear Cliente')}
        </Button>
      </DialogActions>
    </Box>
  );
}

// ── Página Principal ──────────────────────────────────────────
export default function ClientesPage() {
  const { clientes, loading, error, cargar, crear, actualizar, eliminar } = useClientes();
  const { exito, error: notifError } = useNotificacion();

  const [busqueda,     setBusqueda]     = useState('');
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [clienteEdit,  setClienteEdit]  = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [clienteElim,  setClienteElim]  = useState(null);
  const [delLoading,   setDelLoading]   = useState(false);

  // Filtrado local
  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return !busqueda ||
      c.nombreCompleto?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.includes(q);
  });

  const handleOpenCrear = () => { setClienteEdit(null); setDialogOpen(true); };
  const handleOpenEditar = (c) => { setClienteEdit(c); setDialogOpen(true); };
  const handleConfirmEliminar = (c) => { setClienteElim(c); setConfirmOpen(true); };

  const handleGuardar = async (data) => {
    try {
      if (clienteEdit) {
        await actualizar(clienteEdit.id, { ...data, activo: true });
        exito('Cliente actualizado exitosamente');
      } else {
        await crear(data);
        exito('Cliente creado exitosamente');
      }
      setDialogOpen(false);
    } catch (err) {
      notifError(err.message);
    }
  };

  const handleEliminar = async () => {
    setDelLoading(true);
    try {
      await eliminar(clienteElim.id);
      exito('Cliente eliminado');
      setConfirmOpen(false);
    } catch (err) {
      notifError(err.message);
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.filter(c => c.activo).length} clientes activos`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Recargar">
              <IconButton onClick={cargar} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCrear}>
              Nuevo Cliente
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Búsqueda */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon="👥"
                      title="No se encontraron clientes"
                      message={busqueda ? `No hay resultados para "${busqueda}"` : 'Agrega tu primer cliente'}
                      action={!busqueda && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCrear}>
                          Agregar Cliente
                        </Button>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{cliente.nombreCompleto || `${cliente.nombre} ${cliente.apellido}`}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {cliente.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{cliente.telefono || '—'}</TableCell>
                    <TableCell>{cliente.email || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography noWrap variant="body2">
                        {cliente.direccion || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={cliente.activo ? <ActiveIcon /> : <InactiveIcon />}
                        label={cliente.activo ? 'Activo' : 'Inactivo'}
                        color={cliente.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEditar(cliente)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleConfirmEliminar(cliente)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && clientesFiltrados.length > 0 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Mostrando {clientesFiltrados.length} de {clientes.length} clientes
            </Typography>
          </Box>
        )}
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {clienteEdit ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <ClienteForm
            cliente={clienteEdit}
            onSave={handleGuardar}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleEliminar}
        loading={delLoading}
        title="¿Eliminar cliente?"
        message={`¿Estás seguro de eliminar a "${clienteElim?.nombreCompleto || ''}"? Esta acción eliminará el registro permanentemente.`}
      />
    </Box>
  );
}
