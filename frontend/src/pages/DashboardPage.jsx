import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, CardActionArea, Typography,
  Chip, Avatar, Divider, List, ListItem, ListItemAvatar,
  ListItemText, ListItemSecondaryAction, Skeleton, Paper,
  useTheme, alpha,
} from '@mui/material';
import {
  RestaurantMenu as MenuIcon,
  ShoppingCart as PedidoIcon,
  People as ClientesIcon,
  Kitchen as CocinaIcon,
  PointOfSale as CajaIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  LocalDining as DiningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pedidoService } from '../services/services';
import { EstadoChip, PageHeader } from '../components/common/CommonComponents';

// ─── Tarjeta de estadística ───────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, subtitle, loading }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.75)} 100%)`,
        color: '#fff',
        boxShadow: `0 8px 24px ${alpha(color, 0.35)}`,
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.85, mb: 0.5, fontWeight: 600 }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={60} sx={{ bgcolor: alpha('#fff', 0.3) }} />
            ) : (
              <Typography variant="h3" fontWeight={800}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha('#fff', 0.2),
              width: 56,
              height: 56,
              backdropFilter: 'blur(4px)',
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Acceso rápido ────────────────────────────────────────────────────────────
const QuickAccessCard = ({ title, description, icon, color, path, onClick }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: 3,
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 28px ${alpha(color, 0.2)}`,
          borderColor: color,
        },
      }}
    >
      <CardActionArea sx={{ p: 2.5, height: '100%' }} onClick={() => onClick(path)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), width: 64, height: 64 }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 32 } })}
          </Avatar>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const DashboardPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [pedidosRecientes, setPedidosRecientes] = useState([]);
  const [stats, setStats] = useState({ pendientes: 0, preparando: 0, listos: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // ── Carga de datos del dashboard ──────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [activos, todos] = await Promise.all([
        pedidoService.obtenerActivos().catch(() => []),
        pedidoService.obtenerTodos().catch(() => []),
      ]);

      // Calcular estadísticas rápidas
      const pendientes = activos.filter(p => p.estado === 'Pendiente'  || p.estado === 0).length;
      const preparando = activos.filter(p => p.estado === 'Preparando' || p.estado === 1).length;
      const listos    = activos.filter(p => p.estado === 'Listo'      || p.estado === 2).length;

      const visibles = todos.filter(p => p.estado !== 'Cancelado');
      setStats({ pendientes, preparando, listos, total: visibles.length });
      // Mostrar los 6 más recientes (sin cancelados)
      setPedidosRecientes(visibles.slice(0, 6));
    } catch {
      // Si no hay conexión con el backend, mostramos estructura vacía
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    // Actualización automática cada 30 segundos
    const interval = setInterval(cargarDatos, 30_000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

  // ── Accesos rápidos ───────────────────────────────────────────────────────
  const accesosRapidos = [
    {
      title: 'Nuevo Pedido',
      description: 'Tomar un pedido de mesa o para llevar',
      icon: <PedidoIcon />,
      color: theme.palette.primary.main,
      path: '/nuevo-pedido',
    },
    {
      title: 'Cocina',
      description: 'Ver y gestionar los pedidos en preparación',
      icon: <CocinaIcon />,
      color: theme.palette.warning.main,
      path: '/cocina',
    },
    {
      title: 'Caja',
      description: 'Facturación y cobro de pedidos terminados',
      icon: <CajaIcon />,
      color: theme.palette.success.main,
      path: '/caja',
    },
    {
      title: 'Clientes',
      description: 'Administrar la base de clientes',
      icon: <ClientesIcon />,
      color: theme.palette.secondary.main,
      path: '/clientes',
    },
    {
      title: 'Menú',
      description: 'Platillos, categorías y precios',
      icon: <MenuIcon />,
      color: theme.palette.info.main,
      path: '/menu',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={`Bienvenido al sistema — ${new Date().toLocaleDateString('es-CR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })}`}
        icon={<DiningIcon />}
      />

      {/* ── Estadísticas rápidas ─────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Pendientes',
            value: stats.pendientes,
            icon: <PendingIcon />,
            color: theme.palette.warning.main,
            subtitle: 'Esperando en cocina',
          },
          {
            title: 'En Preparación',
            value: stats.preparando,
            icon: <CocinaIcon />,
            color: theme.palette.info.main,
            subtitle: 'Chef trabajando',
          },
          {
            title: 'Listos para cobrar',
            value: stats.listos,
            icon: <CheckIcon />,
            color: theme.palette.success.main,
            subtitle: 'Ir a caja',
          },
          {
            title: 'Pedidos hoy',
            value: stats.total,
            icon: <TrendingUpIcon />,
            color: theme.palette.primary.main,
            subtitle: 'Total del día',
          },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.title}>
            <StatCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }} elevation={0} variant="outlined">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
              Accesos Rápidos
            </Typography>
            <Grid container spacing={2}>
              {accesosRapidos.map((a) => (
                <Grid item xs={6} sm={4} key={a.title}>
                  <QuickAccessCard {...a} onClick={navigate} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* ── Pedidos recientes ─────────────────────────────────────────────── */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }} elevation={0} variant="outlined">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Pedidos Recientes
              </Typography>
              <Chip
                label="Ver todos"
                size="small"
                onClick={() => navigate('/caja')}
                clickable
                color="primary"
                variant="outlined"
              />
            </Box>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
              ))
            ) : pedidosRecientes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <DiningIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay pedidos registrados aún
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {pedidosRecientes.map((pedido, idx) => (
                  <React.Fragment key={pedido.id}>
                    {idx > 0 && <Divider variant="inset" component="li" />}
                    <ListItem disableGutters sx={{ py: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <PedidoIcon color="primary" fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={600}>
                            {pedido.clienteNombre || 'Sin nombre'} — Mesa {pedido.mesa || '—'}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <TimeIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption">
                              {pedido.fechaCreacion
                                ? new Date(pedido.fechaCreacion).toLocaleTimeString('es-CR', {
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <EstadoChip estado={pedido.estado} size="small" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
