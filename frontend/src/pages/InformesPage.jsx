// src/pages/InformesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, ToggleButton,
  ToggleButtonGroup, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Divider, Alert, Tab, Tabs,
  CircularProgress, alpha, useTheme, LinearProgress, Avatar,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import {
  TrendingUp, Assessment as InformesIcon, AttachMoney,
  Receipt, Star, Schedule, TableRestaurant, People,
  TrendingDown, EmojiEvents, BarChart as BarChartIcon,
} from '@mui/icons-material';
import { pedidoService } from '../services/services';
import { PageHeader, EstadoChip } from '../components/common/CommonComponents';

const MONEDA = '₡';
const fmt    = (n) => `${MONEDA}${Number(n||0).toLocaleString('es-CR',{minimumFractionDigits:0})}`;
const fmtDec = (n) => `${MONEDA}${Number(n||0).toLocaleString('es-CR',{minimumFractionDigits:2})}`;
const pct    = (a, b) => b === 0 ? '0%' : `${((a/b)*100).toFixed(1)}%`;

const COLORS  = ['#B71C1C','#1565C0','#2E7D32','#E65100','#4527A0','#00695C','#AD1457','#F57F17','#00838F'];
const DIAS    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const HORAS   = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);

// ── Fechas ────────────────────────────────────────────────────
const sod  = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const sow  = d => { const x=sod(d); x.setDate(x.getDate()-x.getDay()); return x; };
const som  = d => { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color, trend, trendLabel }) {
  const theme = useTheme();
  const isUp  = trend > 0;
  return (
    <Card sx={{
      borderRadius:3, height:'100%',
      background:`linear-gradient(135deg,${color} 0%,${alpha(color,0.7)} 100%)`,
      color:'#fff', boxShadow:`0 8px 24px ${alpha(color,0.3)}`,
    }}>
      <CardContent sx={{p:2.5}}>
        <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <Box sx={{flex:1}}>
            <Typography variant="caption" sx={{opacity:.85,fontWeight:600,display:'block'}}>{title}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{lineHeight:1.2,my:.5}}>{value}</Typography>
            {subtitle && <Typography variant="caption" sx={{opacity:.8}}>{subtitle}</Typography>}
            {trendLabel && (
              <Box sx={{display:'flex',alignItems:'center',gap:.5,mt:.5}}>
                {isUp ? <TrendingUp sx={{fontSize:14}}/> : <TrendingDown sx={{fontSize:14}}/>}
                <Typography variant="caption" sx={{opacity:.9}}>{trendLabel}</Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{bgcolor:alpha('#fff',.2),width:52,height:52}}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Sección con título ────────────────────────────────────────
function Seccion({ title, icon, children }) {
  return (
    <Card sx={{borderRadius:3,mb:3}} variant="outlined">
      <CardContent>
        <Box sx={{display:'flex',alignItems:'center',gap:1,mb:2}}>
          <Box sx={{color:'primary.main'}}>{icon}</Box>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

// ── Tooltip personalizado para gráficas ───────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{p:1.5,borderRadius:2,minWidth:140}} elevation={4}>
      <Typography variant="caption" fontWeight={700} display="block" sx={{mb:.5}}>{label}</Typography>
      {payload.map((p,i) => (
        <Box key={i} sx={{display:'flex',justifyContent:'space-between',gap:2}}>
          <Typography variant="caption" sx={{color:p.color}}>{p.name}</Typography>
          <Typography variant="caption" fontWeight={700}>
            {typeof p.value === 'number' && p.name?.includes('₡') ? fmtDec(p.value) : p.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function InformesPage() {
  const theme   = useTheme();
  const [periodo,  setPeriodo]  = useState('semana');
  const [seccion,  setSeccion]  = useState(0);
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await pedidoService.getAll();
      setPedidos(Array.isArray(data) ? data : []);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ahora   = new Date();
  const desde   = periodo==='dia' ? sod(ahora) : periodo==='semana' ? sow(ahora) : som(ahora);
  const pagados  = useMemo(() => pedidos.filter(p=>p.estado==='Pagado'), [pedidos]);
  const enPeriodo= useMemo(() => pagados.filter(p=>new Date(p.creadoEn)>=desde), [pagados,desde]);

  // ── KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalVentas    = enPeriodo.reduce((s,p)=>s+(p.total||0),0);
    const totalPedidos   = enPeriodo.length;
    const ticket         = totalPedidos>0 ? totalVentas/totalPedidos : 0;
    const totalImpuesto  = enPeriodo.reduce((s,p)=>s+(p.impuesto||0),0);
    const totalItems     = enPeriodo.reduce((s,p)=>s+(p.detalles?.length||0),0);
    const cancelados     = pedidos.filter(p=>p.estado==='Cancelado').length;
    const totalHistorico = pagados.reduce((s,p)=>s+(p.total||0),0);
    return { totalVentas, totalPedidos, ticket, totalImpuesto, totalItems, cancelados, totalHistorico };
  }, [enPeriodo, pedidos, pagados]);

  // ── Ventas por fecha ─────────────────────────────────────────
  const ventasPorFecha = useMemo(() => {
    const mapa = {};
    enPeriodo.forEach(p => {
      const f    = new Date(p.creadoEn);
      const key  = periodo==='dia'
        ? `${String(f.getHours()).padStart(2,'0')}:00`
        : periodo==='semana'
        ? DIAS[f.getDay()]
        : `${f.getDate()}/${f.getMonth()+1}`;
      if (!mapa[key]) mapa[key] = { fecha:key, ventas:0, pedidos:0, impuesto:0 };
      mapa[key].ventas   += p.total||0;
      mapa[key].pedidos  += 1;
      mapa[key].impuesto += p.impuesto||0;
    });
    return Object.values(mapa);
  }, [enPeriodo, periodo]);

  // ── Top platillos ─────────────────────────────────────────────
  const topPlatillos = useMemo(() => {
    const mapa = {};
    enPeriodo.forEach(p => {
      (p.detalles||[]).forEach(d => {
        const n = d.nombrePlatillo||d.nombre||'?';
        if (!mapa[n]) mapa[n] = { nombre:n, cantidad:0, total:0, pedidos:new Set() };
        mapa[n].cantidad += d.cantidad||0;
        mapa[n].total    += d.subtotal||0;
        mapa[n].pedidos.add(p.id);
      });
    });
    return Object.values(mapa)
      .map(x => ({ ...x, pedidos: x.pedidos.size }))
      .sort((a,b) => b.cantidad-a.cantidad);
  }, [enPeriodo]);

  // ── Ventas por hora del día (todos los días del período) ─────
  const ventasPorHora = useMemo(() => {
    const mapa = {};
    HORAS.forEach(h => { mapa[h] = { hora:h, ventas:0, pedidos:0 }; });
    enPeriodo.forEach(p => {
      const h = `${String(new Date(p.creadoEn).getHours()).padStart(2,'0')}:00`;
      if (mapa[h]) { mapa[h].ventas += p.total||0; mapa[h].pedidos += 1; }
    });
    return Object.values(mapa).filter(x => x.ventas > 0 || x.pedidos > 0);
  }, [enPeriodo]);

  // ── Ventas por día de la semana (histórico) ──────────────────
  const ventasPorDia = useMemo(() => {
    const mapa = {};
    DIAS.forEach(d => { mapa[d] = { dia:d, ventas:0, pedidos:0 }; });
    pagados.forEach(p => {
      const d = DIAS[new Date(p.creadoEn).getDay()];
      mapa[d].ventas += p.total||0; mapa[d].pedidos += 1;
    });
    return DIAS.map(d => mapa[d]);
  }, [pagados]);

  // ── Mesas más activas ────────────────────────────────────────
  const topMesas = useMemo(() => {
    const mapa = {};
    enPeriodo.forEach(p => {
      const m = p.numeroMesa || 'Sin mesa';
      if (!mapa[m]) mapa[m] = { mesa:m, pedidos:0, total:0 };
      mapa[m].pedidos += 1; mapa[m].total += p.total||0;
    });
    return Object.values(mapa).sort((a,b)=>b.total-a.total).slice(0,8);
  }, [enPeriodo]);

  // ── Resumen comparativo ──────────────────────────────────────
  const resumenComparativo = useMemo(() => [
    { label:'Hoy',            data:pagados.filter(p=>new Date(p.creadoEn)>=sod(ahora)) },
    { label:'Esta semana',    data:pagados.filter(p=>new Date(p.creadoEn)>=sow(ahora)) },
    { label:'Este mes',       data:pagados.filter(p=>new Date(p.creadoEn)>=som(ahora)) },
    { label:'Total histórico',data:pagados },
  ].map(r => ({
    ...r,
    ventas:   r.data.reduce((s,p)=>s+(p.total||0),0),
    pedidos:  r.data.length,
    ticket:   r.data.length>0 ? r.data.reduce((s,p)=>s+(p.total||0),0)/r.data.length : 0,
    impuesto: r.data.reduce((s,p)=>s+(p.impuesto||0),0),
  })), [pagados]);

  // ── Distribución estados ─────────────────────────────────────
  const distribucionEstados = useMemo(() => {
    const mapa = {};
    pedidos.forEach(p => { mapa[p.estado]=(mapa[p.estado]||0)+1; });
    return Object.entries(mapa).map(([name,value])=>({name,value}));
  }, [pedidos]);

  // ── Últimos pedidos del período ──────────────────────────────
  const ultimosPedidos = useMemo(() =>
    [...enPeriodo].sort((a,b)=>new Date(b.creadoEn)-new Date(a.creadoEn)).slice(0,10),
  [enPeriodo]);

  const labelPeriodo = periodo==='dia'?'Hoy':periodo==='semana'?'Esta semana':'Este mes';

  if (loading) return (
    <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh',flexDirection:'column',gap:2}}>
      <CircularProgress size={52}/>
      <Typography color="text.secondary">Cargando informes...</Typography>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Informes de Ventas"
        subtitle="Análisis completo de rendimiento, platillos y tendencias"
        icon={<InformesIcon/>}
      />

      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

      {/* ── Selector período ── */}
      <Box sx={{mb:3,display:'flex',alignItems:'center',gap:2,flexWrap:'wrap'}}>
        <Typography fontWeight={600} color="text.secondary">Período:</Typography>
        <ToggleButtonGroup value={periodo} exclusive onChange={(_,v)=>v&&setPeriodo(v)} size="small">
          <ToggleButton value="dia">Hoy</ToggleButton>
          <ToggleButton value="semana">Esta semana</ToggleButton>
          <ToggleButton value="mes">Este mes</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── KPIs ── */}
      <Grid container spacing={2} sx={{mb:3}}>
        {[
          { title:`Ventas — ${labelPeriodo}`,    value:fmt(kpis.totalVentas),   subtitle:`${kpis.totalPedidos} pedidos pagados`,    icon:<AttachMoney/>,   color:theme.palette.success.main },
          { title:'Ticket promedio',              value:fmtDec(kpis.ticket),     subtitle:'Por pedido pagado',                       icon:<Receipt/>,       color:theme.palette.primary.main },
          { title:'IVA recaudado',                value:fmt(kpis.totalImpuesto), subtitle:`${pct(kpis.totalImpuesto,kpis.totalVentas)} de ventas`, icon:<TrendingUp/>, color:theme.palette.info.main },
          { title:'Platillos vendidos',           value:kpis.totalItems,         subtitle:'Ítems en período',                        icon:<Star/>,          color:theme.palette.warning.main },
          { title:'Pedidos cancelados',           value:kpis.cancelados,         subtitle:'Total histórico',                         icon:<TrendingDown/>,  color:theme.palette.error.main },
          { title:'Total histórico',              value:fmt(kpis.totalHistorico),subtitle:`${pagados.length} pedidos pagados`,       icon:<EmojiEvents/>,   color:theme.palette.secondary.main },
        ].map(k=>(
          <Grid item xs={6} md={4} lg={2} key={k.title}>
            <KpiCard {...k}/>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs de secciones ── */}
      <Paper variant="outlined" sx={{mb:3,borderRadius:2}}>
        <Tabs value={seccion} onChange={(_,v)=>setSeccion(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<BarChartIcon fontSize="small"/>} iconPosition="start" label="Ventas"/>
          <Tab icon={<Star fontSize="small"/>}         iconPosition="start" label="Platillos"/>
          <Tab icon={<Schedule fontSize="small"/>}     iconPosition="start" label="Horarios"/>
          <Tab icon={<TableRestaurant fontSize="small"/>} iconPosition="start" label="Mesas"/>
          <Tab icon={<People fontSize="small"/>}       iconPosition="start" label="Pedidos"/>
          <Tab icon={<Receipt fontSize="small"/>}      iconPosition="start" label="Resumen"/>
        </Tabs>
      </Paper>

      {/* ════════════════════════════════════════════════════════
          TAB 0 — VENTAS
      ════════════════════════════════════════════════════════ */}
      {seccion===0 && (
        <Box>
          {/* Gráfica principal ventas */}
          <Seccion title={`Ventas por período — ${labelPeriodo}`} icon={<BarChartIcon/>}>
            {ventasPorFecha.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin ventas en este período</Typography>
              : <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={ventasPorFecha} margin={{top:5,right:20,bottom:5,left:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)}/>
                    <XAxis dataKey="fecha" tick={{fontSize:11}}/>
                    <YAxis yAxisId="left" tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}}/>
                    <RechartTooltip content={<CustomTooltip/>}/>
                    <Legend/>
                    <Bar    yAxisId="left"  dataKey="ventas"   name="Ventas ₡"   fill={theme.palette.primary.main}  radius={[4,4,0,0]}/>
                    <Bar    yAxisId="left"  dataKey="impuesto" name="IVA ₡"      fill={theme.palette.info.light}    radius={[4,4,0,0]}/>
                    <Line   yAxisId="right" dataKey="pedidos"  name="Pedidos"     stroke={theme.palette.warning.main} strokeWidth={2} dot={{r:4}}/>
                  </ComposedChart>
                </ResponsiveContainer>
            }
          </Seccion>

          {/* Gráfica área acumulada */}
          <Seccion title="Ventas acumuladas en el período" icon={<TrendingUp/>}>
            {ventasPorFecha.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin datos</Typography>
              : <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={ventasPorFecha.reduce((acc,cur,i)=>{
                    const prev = i>0 ? acc[i-1].acumulado : 0;
                    return [...acc,{...cur,acumulado:prev+cur.ventas}];
                  },[])}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.05)}/>
                    <XAxis dataKey="fecha" tick={{fontSize:11}}/>
                    <YAxis tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                    <RechartTooltip formatter={v=>[fmtDec(v),'Acumulado']}/>
                    <Area dataKey="acumulado" name="Acumulado" stroke={theme.palette.primary.main}
                      fill="url(#colorVentas)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
            }
          </Seccion>

          {/* Distribución de estados */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Seccion title="Distribución por estado" icon={<Receipt/>}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={distribucionEstados} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      dataKey="value" nameKey="name"
                      label={({name,percent})=>`${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {distribucionEstados.map((_,i)=>(
                        <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={10}/>
                    <RechartTooltip formatter={v=>[`${v} pedidos`]}/>
                  </PieChart>
                </ResponsiveContainer>
              </Seccion>
            </Grid>
            <Grid item xs={12} md={7}>
              <Seccion title="Detalle por estado" icon={<BarChartIcon/>}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{bgcolor:'grey.50'}}>
                      <TableCell><b>Estado</b></TableCell>
                      <TableCell align="center"><b>Cantidad</b></TableCell>
                      <TableCell align="right"><b>%</b></TableCell>
                      <TableCell><b>Proporción</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {distribucionEstados.map(e=>(
                      <TableRow key={e.name} hover>
                        <TableCell><EstadoChip estado={e.name} size="small"/></TableCell>
                        <TableCell align="center" sx={{fontWeight:700}}>{e.value}</TableCell>
                        <TableCell align="right">{pct(e.value,pedidos.length)}</TableCell>
                        <TableCell sx={{width:120}}>
                          <LinearProgress variant="determinate"
                            value={(e.value/pedidos.length)*100}
                            sx={{borderRadius:4,height:8}}/>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Seccion>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 1 — PLATILLOS
      ════════════════════════════════════════════════════════ */}
      {seccion===1 && (
        <Box>
          {/* Gráfica barras top platillos */}
          <Seccion title={`Top platillos — ${labelPeriodo}`} icon={<Star/>}>
            {topPlatillos.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin datos</Typography>
              : <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topPlatillos.slice(0,10)} layout="vertical"
                    margin={{top:5,right:80,bottom:5,left:120}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:11}}/>
                    <YAxis type="category" dataKey="nombre" tick={{fontSize:11}} width={115}/>
                    <RechartTooltip formatter={(v,n)=>[n==='cantidad'?`${v} unid.`:fmtDec(v),n==='cantidad'?'Vendidos':'Total ₡']}/>
                    <Legend/>
                    <Bar dataKey="cantidad" name="Unidades vendidas" fill={theme.palette.primary.main} radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </Seccion>

          {/* Tabla detallada */}
          <Seccion title="Detalle completo de platillos" icon={<Receipt/>}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{bgcolor:'grey.50'}}>
                    <TableCell><b>Pos.</b></TableCell>
                    <TableCell><b>Platillo</b></TableCell>
                    <TableCell align="center"><b>Unidades</b></TableCell>
                    <TableCell align="center"><b>En pedidos</b></TableCell>
                    <TableCell align="right"><b>Total generado</b></TableCell>
                    <TableCell align="right"><b>% ventas</b></TableCell>
                    <TableCell><b>Popularidad</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topPlatillos.map((p,i)=>(
                    <TableRow key={p.nombre} hover>
                      <TableCell>
                        <Typography fontWeight={700} color={i<3?'warning.main':'text.secondary'}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography fontWeight={600}>{p.nombre}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={p.cantidad} size="small" color="primary" variant="outlined"/>
                      </TableCell>
                      <TableCell align="center">{p.pedidos}</TableCell>
                      <TableCell align="right" sx={{fontWeight:700,color:'success.main'}}>{fmtDec(p.total)}</TableCell>
                      <TableCell align="right">{pct(p.total,kpis.totalVentas)}</TableCell>
                      <TableCell sx={{width:100}}>
                        <LinearProgress variant="determinate"
                          value={(p.cantidad/(topPlatillos[0]?.cantidad||1))*100}
                          sx={{borderRadius:4,height:8}}
                          color={i===0?'warning':i===1?'inherit':'primary'}/>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Seccion>

          {/* Pastel ingresos por platillo */}
          <Seccion title="Ingresos por platillo (top 8)" icon={<AttachMoney/>}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={topPlatillos.slice(0,8)} cx="50%" cy="50%"
                  outerRadius={110} dataKey="total" nameKey="nombre"
                  label={({name,percent})=>`${name.substring(0,12)} ${(percent*100).toFixed(0)}%`}
                  labelLine={true}>
                  {topPlatillos.slice(0,8).map((_,i)=>(
                    <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                  ))}
                </Pie>
                <RechartTooltip formatter={v=>[fmtDec(v),'Ingresos']}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </Seccion>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 2 — HORARIOS
      ════════════════════════════════════════════════════════ */}
      {seccion===2 && (
        <Box>
          <Seccion title="Ventas por hora del día" icon={<Schedule/>}>
            <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
              Muestra a qué horas se concentran las ventas en el período seleccionado
            </Typography>
            {ventasPorHora.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin datos</Typography>
              : <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ventasPorHora} margin={{top:5,right:20,bottom:5,left:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)}/>
                    <XAxis dataKey="hora" tick={{fontSize:10}}/>
                    <YAxis yAxisId="left" tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}}/>
                    <RechartTooltip content={<CustomTooltip/>}/>
                    <Legend/>
                    <Bar yAxisId="left"  dataKey="ventas"  name="Ventas ₡" fill={theme.palette.primary.main} radius={[3,3,0,0]}/>
                    <Bar yAxisId="right" dataKey="pedidos" name="Pedidos"   fill={theme.palette.warning.main} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </Seccion>

          <Seccion title="Ventas por día de la semana (histórico)" icon={<BarChartIcon/>}>
            <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
              ¿Cuál es el día más rentable de la semana?
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ventasPorDia} margin={{top:5,right:20,bottom:5,left:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)}/>
                <XAxis dataKey="dia" tick={{fontSize:12}}/>
                <YAxis tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                <RechartTooltip formatter={(v,n)=>[n==='ventas'?fmtDec(v):`${v}`,n==='ventas'?'Ventas':'Pedidos']}/>
                <Legend/>
                <Bar dataKey="ventas"  name="Ventas ₡" fill={theme.palette.success.main}  radius={[4,4,0,0]}/>
                <Bar dataKey="pedidos" name="Pedidos"   fill={theme.palette.primary.light} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Seccion>

          {/* Tabla horas pico */}
          <Seccion title="Top horas de mayor venta" icon={<Schedule/>}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{bgcolor:'grey.50'}}>
                  <TableCell><b>Hora</b></TableCell>
                  <TableCell align="center"><b>Pedidos</b></TableCell>
                  <TableCell align="right"><b>Ventas</b></TableCell>
                  <TableCell align="right"><b>Ticket prom.</b></TableCell>
                  <TableCell><b>Actividad</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...ventasPorHora].sort((a,b)=>b.ventas-a.ventas).slice(0,8).map(h=>(
                  <TableRow key={h.hora} hover>
                    <TableCell sx={{fontWeight:700}}>{h.hora}</TableCell>
                    <TableCell align="center"><Chip label={h.pedidos} size="small" variant="outlined"/></TableCell>
                    <TableCell align="right" sx={{fontWeight:700,color:'success.main'}}>{fmtDec(h.ventas)}</TableCell>
                    <TableCell align="right">{h.pedidos>0?fmtDec(h.ventas/h.pedidos):'—'}</TableCell>
                    <TableCell sx={{width:120}}>
                      <LinearProgress variant="determinate"
                        value={(h.ventas/([...ventasPorHora].sort((a,b)=>b.ventas-a.ventas)[0]?.ventas||1))*100}
                        sx={{borderRadius:4,height:8}} color="success"/>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 3 — MESAS
      ════════════════════════════════════════════════════════ */}
      {seccion===3 && (
        <Box>
          <Seccion title={`Mesas más activas — ${labelPeriodo}`} icon={<TableRestaurant/>}>
            {topMesas.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin datos de mesas</Typography>
              : <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topMesas} margin={{top:5,right:20,bottom:5,left:20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)}/>
                      <XAxis dataKey="mesa" tick={{fontSize:11}}/>
                      <YAxis yAxisId="left" tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}}/>
                      <RechartTooltip content={<CustomTooltip/>}/>
                      <Legend/>
                      <Bar yAxisId="left"  dataKey="total"   name="Ventas ₡" fill={theme.palette.primary.main}  radius={[4,4,0,0]}/>
                      <Bar yAxisId="right" dataKey="pedidos" name="Pedidos"   fill={theme.palette.warning.light} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>

                  <Divider sx={{my:2}}/>

                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{bgcolor:'grey.50'}}>
                        <TableCell><b>Mesa</b></TableCell>
                        <TableCell align="center"><b>Pedidos</b></TableCell>
                        <TableCell align="right"><b>Total</b></TableCell>
                        <TableCell align="right"><b>Ticket prom.</b></TableCell>
                        <TableCell><b>Rendimiento</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topMesas.map(m=>(
                        <TableRow key={m.mesa} hover>
                          <TableCell sx={{fontWeight:700}}>
                            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                              <TableRestaurant fontSize="small" color="action"/>
                              {m.mesa}
                            </Box>
                          </TableCell>
                          <TableCell align="center"><Chip label={m.pedidos} size="small" color="primary" variant="outlined"/></TableCell>
                          <TableCell align="right" sx={{fontWeight:700,color:'success.main'}}>{fmtDec(m.total)}</TableCell>
                          <TableCell align="right">{m.pedidos>0?fmtDec(m.total/m.pedidos):'—'}</TableCell>
                          <TableCell sx={{width:120}}>
                            <LinearProgress variant="determinate"
                              value={(m.total/(topMesas[0]?.total||1))*100}
                              sx={{borderRadius:4,height:8}}/>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
            }
          </Seccion>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 4 — PEDIDOS RECIENTES
      ════════════════════════════════════════════════════════ */}
      {seccion===4 && (
        <Box>
          <Seccion title={`Últimos 10 pedidos pagados — ${labelPeriodo}`} icon={<People/>}>
            {ultimosPedidos.length===0
              ? <Typography color="text.secondary" sx={{textAlign:'center',py:4}}>Sin pedidos en este período</Typography>
              : <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{bgcolor:'grey.50'}}>
                        <TableCell><b>#</b></TableCell>
                        <TableCell><b>Fecha y hora</b></TableCell>
                        <TableCell><b>Cliente</b></TableCell>
                        <TableCell><b>Mesa</b></TableCell>
                        <TableCell><b>Mesero</b></TableCell>
                        <TableCell align="center"><b>Ítems</b></TableCell>
                        <TableCell align="right"><b>Subtotal</b></TableCell>
                        <TableCell align="right"><b>IVA</b></TableCell>
                        <TableCell align="right"><b>Total</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ultimosPedidos.map(p=>(
                        <TableRow key={p.id} hover>
                          <TableCell sx={{fontWeight:700,color:'primary.main'}}>#{p.id}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{new Date(p.creadoEn).toLocaleDateString('es-CR')}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(p.creadoEn).toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'})}
                            </Typography>
                          </TableCell>
                          <TableCell>{p.nombreCliente||'—'}</TableCell>
                          <TableCell>{p.numeroMesa||'—'}</TableCell>
                          <TableCell>{p.atendidoPor||'—'}</TableCell>
                          <TableCell align="center">
                            <Chip label={p.detalles?.length||0} size="small" variant="outlined"/>
                          </TableCell>
                          <TableCell align="right">{fmtDec(p.subtotal)}</TableCell>
                          <TableCell align="right">{fmtDec(p.impuesto)}</TableCell>
                          <TableCell align="right" sx={{fontWeight:800,color:'success.main'}}>{fmtDec(p.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
            }
          </Seccion>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 5 — RESUMEN COMPARATIVO
      ════════════════════════════════════════════════════════ */}
      {seccion===5 && (
        <Box>
          <Seccion title="Resumen comparativo por período" icon={<Receipt/>}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{bgcolor:'grey.50'}}>
                  <TableCell><b>Período</b></TableCell>
                  <TableCell align="center"><b>Pedidos</b></TableCell>
                  <TableCell align="right"><b>Subtotal</b></TableCell>
                  <TableCell align="right"><b>IVA</b></TableCell>
                  <TableCell align="right"><b>Total ventas</b></TableCell>
                  <TableCell align="right"><b>Ticket prom.</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenComparativo.map(r=>(
                  <TableRow key={r.label} hover sx={{'&:last-child td':{fontWeight:900,bgcolor:'grey.50'}}}>
                    <TableCell sx={{fontWeight:600}}>{r.label}</TableCell>
                    <TableCell align="center"><Chip label={r.pedidos} size="small" color="primary" variant="outlined"/></TableCell>
                    <TableCell align="right">{fmtDec(r.ventas - r.impuesto)}</TableCell>
                    <TableCell align="right">{fmtDec(r.impuesto)}</TableCell>
                    <TableCell align="right" sx={{fontWeight:700,color:'success.main'}}>{fmtDec(r.ventas)}</TableCell>
                    <TableCell align="right">{r.pedidos>0?fmtDec(r.ticket):'—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>

          {/* Gráfica comparativa */}
          {/* Métodos de pago */}
          <Seccion title="Métodos de pago — histórico" icon={<Receipt/>}>
            {(() => {
              const metodos = { efectivo:0, tarjeta:0, sinpe:0, dividido:0 };
              const totales = { efectivo:0, tarjeta:0, sinpe:0, dividido:0 };
              pagados.forEach(p => {
                const m = p.metodoPago || 'efectivo';
                metodos[m] = (metodos[m]||0) + 1;
                totales[m] = (totales[m]||0) + (p.total||0);
              });
              const data = [
                { name:'💵 Efectivo', pedidos:metodos.efectivo||0, total:totales.efectivo||0, color:'#2E7D32' },
                { name:'💳 Tarjeta',  pedidos:metodos.tarjeta||0,  total:totales.tarjeta||0,  color:'#1565C0' },
                { name:'📱 SINPE',    pedidos:metodos.sinpe||0,    total:totales.sinpe||0,    color:'#00695C' },
                { name:'🔀 Dividido', pedidos:metodos.dividido||0, total:totales.dividido||0, color:'#E65100' },
              ].filter(d => d.pedidos > 0);
              if (data.length === 0) return <Typography color="text.secondary" sx={{textAlign:'center',py:3}}>Sin datos de métodos de pago aún</Typography>;
              return (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={5}>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" outerRadius={90}
                          dataKey="pedidos" nameKey="name"
                          label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        </Pie>
                        <Legend iconType="circle" iconSize={10}/>
                        <RechartTooltip formatter={v=>[`${v} pedidos`]}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Table size="small">
                      <TableHead><TableRow sx={{bgcolor:'grey.50'}}>
                        <TableCell><b>Método</b></TableCell>
                        <TableCell align="center"><b>Pedidos</b></TableCell>
                        <TableCell align="right"><b>Total recaudado</b></TableCell>
                        <TableCell align="right"><b>% pedidos</b></TableCell>
                        <TableCell><b>Uso</b></TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {data.map(d=>(
                          <TableRow key={d.name} hover>
                            <TableCell sx={{fontWeight:700}}>{d.name}</TableCell>
                            <TableCell align="center"><Chip label={d.pedidos} size="small" variant="outlined"/></TableCell>
                            <TableCell align="right" sx={{fontWeight:700,color:'success.main'}}>{fmtDec(d.total)}</TableCell>
                            <TableCell align="right">{pct(d.pedidos,pagados.length)}</TableCell>
                            <TableCell sx={{width:100}}>
                              <LinearProgress variant="determinate"
                                value={(d.pedidos/(data[0]?.pedidos||1))*100}
                                sx={{borderRadius:4,height:8,bgcolor:'grey.200',
                                  '& .MuiLinearProgress-bar':{bgcolor:d.color}}}/>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              );
            })()}
          </Seccion>

          <Seccion title="Comparativa visual de períodos" icon={<BarChartIcon/>}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={resumenComparativo.slice(0,3)} margin={{top:5,right:20,bottom:5,left:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000',.06)}/>
                <XAxis dataKey="label" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v=>`₡${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
                <RechartTooltip formatter={v=>[fmtDec(v),'Ventas']}/>
                <Legend/>
                <Bar dataKey="ventas"   name="Ventas ₡"  fill={theme.palette.success.main}  radius={[4,4,0,0]}/>
                <Bar dataKey="impuesto" name="IVA ₡"     fill={theme.palette.info.main}     radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Seccion>
        </Box>
      )}
    </Box>
  );
}