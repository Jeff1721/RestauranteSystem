// src/pages/InformesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, ToggleButton,
  ToggleButtonGroup, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Divider, Alert,
  CircularProgress, alpha, useTheme,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as InformesIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { pedidoService } from '../services/services';
import { PageHeader } from '../components/common/CommonComponents';

const MONEDA = '₡';
const fmt = (n) => `${MONEDA}${Number(n || 0).toLocaleString('es-CR', { minimumFractionDigits: 0 })}`;

const COLORS = ['#B71C1C', '#1565C0', '#2E7D32', '#E65100', '#4527A0', '#00695C', '#AD1457'];

// ── Utilidades de fecha ───────────────────────────────────────
function startOfDay(d)  { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d){ const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }

function getDayLabel(d) {
  return new Date(d).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function getWeekLabel(d) {
  const start = startOfWeek(new Date(d));
  const end   = new Date(start); end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('es-CR',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('es-CR',{day:'numeric',month:'short'})}`;
}
function getMonthLabel(d) {
  return new Date(d).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
}

// ── Tarjeta de KPI ────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color }) {
  const theme = useTheme();
  return (
    <Card sx={{
      borderRadius: 3,
      background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.75)} 100%)`,
      color: '#fff',
      boxShadow: `0 8px 24px ${alpha(color, 0.3)}`,
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>{title}</Typography>
            <Typography variant="h4" fontWeight={800}>{value}</Typography>
            {subtitle && <Typography variant="caption" sx={{ opacity: 0.8 }}>{subtitle}</Typography>}
          </Box>
          <Box sx={{ bgcolor: alpha('#fff', 0.2), borderRadius: '50%', p: 1, display: 'flex' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function InformesPage() {
  const theme = useTheme();
  const [periodo,   setPeriodo]   = useState('semana');
  const [pedidos,   setPedidos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pedidoService.getAll();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Solo pedidos pagados
  const pagados = pedidos.filter(p => p.estado === 'Pagado');

  // Rango de fechas según periodo
  const ahora = new Date();
  const desde = periodo === 'dia'   ? startOfDay(ahora)
              : periodo === 'semana' ? startOfWeek(ahora)
              : startOfMonth(ahora);

  const enPeriodo = pagados.filter(p => new Date(p.creadoEn) >= desde);

  // KPIs
  const totalVentas   = enPeriodo.reduce((s, p) => s + (p.total || 0), 0);
  const totalPedidos  = enPeriodo.length;
  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
  const totalImpuesto  = enPeriodo.reduce((s, p) => s + (p.impuesto || 0), 0);

  // ── Datos para gráfica de ventas por período ──────────────
  const ventasPorFecha = React.useMemo(() => {
    const mapa = {};
    enPeriodo.forEach(p => {
      const fecha = new Date(p.creadoEn);
      let key;
      if (periodo === 'dia') {
        key = `${fecha.getHours()}:00`;
      } else if (periodo === 'semana') {
        key = fecha.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' });
      } else {
        key = `${fecha.getDate()}/${fecha.getMonth()+1}`;
      }
      if (!mapa[key]) mapa[key] = { fecha: key, ventas: 0, pedidos: 0 };
      mapa[key].ventas  += p.total || 0;
      mapa[key].pedidos += 1;
    });
    return Object.values(mapa).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [enPeriodo, periodo]);

  // ── Top 5 platillos más vendidos ──────────────────────────
  const topPlatillos = React.useMemo(() => {
    const mapa = {};
    enPeriodo.forEach(p => {
      (p.detalles || []).forEach(d => {
        const nombre = d.nombrePlatillo || d.nombre || 'Desconocido';
        if (!mapa[nombre]) mapa[nombre] = { nombre, cantidad: 0, total: 0 };
        mapa[nombre].cantidad += d.cantidad || 0;
        mapa[nombre].total    += d.subtotal || 0;
      });
    });
    return Object.values(mapa)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [enPeriodo]);

  // ── Distribución por estado de todos los pedidos ──────────
  const distribucionEstados = React.useMemo(() => {
    const mapa = {};
    pedidos.forEach(p => {
      mapa[p.estado] = (mapa[p.estado] || 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value }));
  }, [pedidos]);

  const labelPeriodo = periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Esta semana' : 'Este mes';

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Informes de Ventas"
        subtitle="Análisis detallado de ventas y rendimiento"
        icon={<InformesIcon />}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Selector de período */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography fontWeight={600} color="text.secondary">Período:</Typography>
        <ToggleButtonGroup
          value={periodo}
          exclusive
          onChange={(_, v) => v && setPeriodo(v)}
          size="small"
        >
          <ToggleButton value="dia">Hoy</ToggleButton>
          <ToggleButton value="semana">Esta semana</ToggleButton>
          <ToggleButton value="mes">Este mes</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <KpiCard title={`Ventas — ${labelPeriodo}`} value={fmt(totalVentas)}
            icon={<MoneyIcon />} color={theme.palette.success.main}
            subtitle={`${totalPedidos} pedido${totalPedidos !== 1 ? 's' : ''} pagado${totalPedidos !== 1 ? 's' : ''}`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Ticket promedio" value={fmt(ticketPromedio)}
            icon={<ReceiptIcon />} color={theme.palette.primary.main} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="IVA recaudado" value={fmt(totalImpuesto)}
            icon={<TrendingUpIcon />} color={theme.palette.info.main} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Total histórico" value={fmt(pagados.reduce((s,p)=>s+(p.total||0),0))}
            icon={<StarIcon />} color={theme.palette.secondary.main}
            subtitle={`${pagados.length} pedidos totales`} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Gráfica de ventas */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3, borderRadius: 3 }} variant="outlined">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              📊 Ventas — {labelPeriodo}
            </Typography>
            {ventasPorFecha.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                <Typography>No hay ventas en este período</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ventasPorFecha} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <RechartTooltip
                    formatter={(value, name) => [fmt(value), name === 'ventas' ? 'Ventas' : 'Pedidos']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="ventas" fill={theme.palette.primary.main} radius={[4,4,0,0]} name="ventas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        {/* Distribución por estado (pastel) */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%' }} variant="outlined">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🥧 Pedidos por Estado</Typography>
            {distribucionEstados.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                <Typography>Sin datos</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={distribucionEstados} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {distribucionEstados.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} />
                  <RechartTooltip formatter={(v) => [`${v} pedidos`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        {/* Top platillos */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, borderRadius: 3 }} variant="outlined">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              🏆 Top Platillos — {labelPeriodo}
            </Typography>
            {topPlatillos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                <Typography>Sin datos en este período</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>#</TableCell>
                      <TableCell>Platillo</TableCell>
                      <TableCell align="center">Vendidos</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topPlatillos.map((p, i) => (
                      <TableRow key={p.nombre} hover>
                        <TableCell>
                          <Typography fontWeight={700} color={i === 0 ? 'warning.main' : 'text.secondary'}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{p.nombre}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip label={p.cantidad} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="success.main">{fmt(p.total)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        {/* Tabla resumen histórico */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, borderRadius: 3 }} variant="outlined">
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📅 Resumen Histórico</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Período</TableCell>
                    <TableCell align="center">Pedidos</TableCell>
                    <TableCell align="right">Ventas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Hoy */}
                  {[
                    {
                      label: 'Hoy',
                      data: pagados.filter(p => new Date(p.creadoEn) >= startOfDay(ahora)),
                    },
                    {
                      label: 'Esta semana',
                      data: pagados.filter(p => new Date(p.creadoEn) >= startOfWeek(ahora)),
                    },
                    {
                      label: 'Este mes',
                      data: pagados.filter(p => new Date(p.creadoEn) >= startOfMonth(ahora)),
                    },
                    {
                      label: 'Total histórico',
                      data: pagados,
                    },
                  ].map(({ label, data }) => (
                    <TableRow key={label} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{label}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={data.length} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="success.main">
                          {fmt(data.reduce((s, p) => s + (p.total || 0), 0))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
