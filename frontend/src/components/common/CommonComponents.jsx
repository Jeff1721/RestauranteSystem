// src/components/common/CommonComponents.jsx
// Todos los imports al inicio — una sola declaración por nombre

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, CircularProgress, Box,
  Backdrop, Chip,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

// ── ConfirmDialog ─────────────────────────────────────────────
export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  loading = false, confirmColor = 'error', confirmText = 'Confirmar',
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color={confirmColor} />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={confirmColor}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? 'Procesando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── PageHeader ────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, icon }) {
  return (
    <Box sx={{
      mb: 3, display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', flexWrap: 'wrap', gap: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon && (
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}

// ── LoadingOverlay ────────────────────────────────────────────
export function LoadingOverlay({ open, message = 'Cargando...' }) {
  return (
    <Backdrop open={open} sx={{ color: '#fff', zIndex: 9999, flexDirection: 'column', gap: 2 }}>
      <CircularProgress color="inherit" />
      <Typography>{message}</Typography>
    </Backdrop>
  );
}

// ── EstadoChip ────────────────────────────────────────────────
const ESTADO_CONFIG = {
  Pendiente:  { label: 'Pendiente',  color: '#E65100', bg: '#FFF3E0' },
  Preparando: { label: 'Preparando', color: '#0D47A1', bg: '#E3F2FD' },
  Listo:      { label: '✓ Listo',    color: '#1B5E20', bg: '#E8F5E9' },
  Entregado:  { label: 'Entregado',  color: '#4527A0', bg: '#EDE7F6' },
  Pagado:     { label: 'Pagado',     color: '#455A64', bg: '#ECEFF1' },
  Cancelado:  { label: 'Cancelado',  color: '#B71C1C', bg: '#FFEBEE' },
};

export function EstadoChip({ estado, size = 'small' }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#666', bg: '#EEE' };
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        border: `1px solid ${cfg.color}40`,
      }}
    />
  );
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      py: 8, px: 4, textAlign: 'center', color: 'text.secondary',
    }}>
      <Box sx={{ fontSize: 64, mb: 2, opacity: 0.4 }}>{icon}</Box>
      <Typography variant="h6" color="text.primary" gutterBottom>{title}</Typography>
      {message && <Typography variant="body2" sx={{ mb: 3 }}>{message}</Typography>}
      {action}
    </Box>
  );
}
