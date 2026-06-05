// src/pages/CajaPage.jsx
import React, { useState, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Divider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Tooltip,
  TextField, InputAdornment, Switch, FormControlLabel, Tabs, Tab,
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
const fmt      = (n) => `${MONEDA}${Number(n||0).toLocaleString('es-CR',{minimumFractionDigits:2})}`;
const fmtFecha = (d) => new Date(d).toLocaleString('es-CR',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

const METODOS = [
  { key:'efectivo', label:'💵 Efectivo' },
  { key:'tarjeta',  label:'💳 Tarjeta' },
  { key:'sinpe',    label:'📱 SINPE' },
];
const metodoLabel = (k) => METODOS.find(m=>m.key===k)?.label || k || '—';

// ── Comprobante POS (80mm) ────────────────────────────────────
const Comprobante = React.forwardRef(({ datos }, ref) => {
  if (!datos?.items) return <Box ref={ref}/>;
  const { items=[], subtotal=0, impuesto=0, total=0,
    aplicarIva=true, porcentajeImpuesto=13,
    pedidoId, fecha, nombreCliente, numeroMesa, atendidoPor,
    nombreFactura, metodoPago, montoRecibido=0 } = datos;
  return (
    <Box ref={ref} sx={{width:'72mm',fontFamily:'"Courier New",monospace',fontSize:'11px',p:'4mm',color:'#000',bgcolor:'#fff','@media print':{width:'72mm',margin:0,padding:'4mm'}}}>
      <Box sx={{textAlign:'center',mb:'3mm'}}>
        <Typography sx={{fontSize:'14px',fontWeight:900,letterSpacing:1}}>🍽 RESTAURANTE</Typography>
        <Typography sx={{fontSize:'10px'}}>Sistema de Pedidos</Typography>
        <Box sx={{borderTop:'1px dashed #000',my:'2mm'}}/>
        <Typography sx={{fontSize:'12px',fontWeight:700}}>COMPROBANTE #{pedidoId}</Typography>
        <Typography sx={{fontSize:'10px'}}>{fecha && fmtFecha(fecha)}</Typography>
      </Box>
      <Box sx={{mb:'2mm'}}>
        {nombreFactura && <Typography><b>Facturar a:</b> {nombreFactura}</Typography>}
        {nombreCliente && <Typography><b>Cliente:</b> {nombreCliente}</Typography>}
        {numeroMesa    && <Typography><b>Mesa:</b> {numeroMesa}</Typography>}
        {atendidoPor   && <Typography><b>Mesero:</b> {atendidoPor}</Typography>}
      </Box>
      <Box sx={{borderTop:'1px dashed #000',mb:'2mm'}}/>
      {items.map((item,i)=>(
        <Box key={i} sx={{mb:'1mm'}}>
          <Box sx={{display:'flex',justifyContent:'space-between'}}>
            <Typography sx={{flex:1,fontWeight:700,fontSize:'11px'}}>{item.nombre}</Typography>
            <Typography sx={{fontSize:'11px'}}>{fmt(item.subtotal)}</Typography>
          </Box>
          <Typography sx={{fontSize:'10px',color:'#444'}}>{item.cantidad} x {fmt(item.precioUnitario)}</Typography>
          {item.personalizaciones?.map((p,pi)=>(
            <Typography key={pi} sx={{fontSize:'10px',color:'#666',pl:'3mm'}}>↳ {p}</Typography>
          ))}
        </Box>
      ))}
      <Box sx={{borderTop:'1px dashed #000',my:'2mm'}}/>
      <Box>
        <Box sx={{display:'flex',justifyContent:'space-between'}}>
          <Typography>Subtotal:</Typography><Typography>{fmt(subtotal)}</Typography>
        </Box>
        <Box sx={{display:'flex',justifyContent:'space-between'}}>
          <Typography>IVA {aplicarIva?`(${porcentajeImpuesto}%):`:'(Exento):'}</Typography>
          <Typography>{aplicarIva?fmt(impuesto):fmt(0)}</Typography>
        </Box>
        <Box sx={{borderTop:'1px solid #000',mt:'1mm',pt:'1mm',display:'flex',justifyContent:'space-between'}}>
          <Typography sx={{fontWeight:900,fontSize:'13px'}}>TOTAL:</Typography>
          <Typography sx={{fontWeight:900,fontSize:'13px'}}>{fmt(total)}</Typography>
        </Box>
      </Box>
      {metodoPago && (
        <Box sx={{mt:'2mm',pt:'2mm',borderTop:'1px dashed #000'}}>
          <Typography><b>Método:</b> {metodoLabel(metodoPago)}</Typography>
          {metodoPago==='efectivo' && montoRecibido>0 && (
            <>
              <Typography><b>Recibido:</b> {fmt(montoRecibido)}</Typography>
              <Typography sx={{fontWeight:900}}><b>Vuelto:</b> {fmt(montoRecibido-total)}</Typography>
            </>
          )}
        </Box>
      )}
      <Box sx={{borderTop:'1px dashed #000',mt:'3mm',textAlign:'center'}}>
        <Typography sx={{fontSize:'10px',mt:'2mm'}}>¡Gracias por su visita! 🙏</Typography>
        <Typography sx={{fontSize:'9px',color:'#666'}}>{new Date().toLocaleString('es-CR')}</Typography>
      </Box>
    </Box>
  );
});

// ── Selector método de pago ───────────────────────────────────
function SelectorMetodoPago({ value, onChange }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{mb:1}}>💳 Método de pago</Typography>
      <Grid container spacing={1}>
        {METODOS.map(m=>(
          <Grid item xs={4} key={m.key}>
            <Card onClick={()=>onChange(m.key)} sx={{
              p:1.5, textAlign:'center', cursor:'pointer', borderRadius:2,
              border:'2px solid', transition:'all .2s',
              borderColor: value===m.key ? 'primary.main' : 'divider',
              bgcolor:      value===m.key ? 'primary.50'  : '#fff',
            }}>
              <Typography variant="body2" fontWeight={value===m.key?800:400}>{m.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── Calculadora vuelto ────────────────────────────────────────
function CalculadoraVuelto({ total, montoRecibido, onChange }) {
  return (
    <Box sx={{mt:1.5}}>
      <TextField fullWidth size="small" label="Monto recibido" type="number"
        placeholder={String(Math.ceil(total/100)*100)}
        value={montoRecibido}
        onChange={e=>onChange(e.target.value)}
        InputProps={{startAdornment:<InputAdornment position="start">₡</InputAdornment>}}
        sx={{mb:1.5}}
      />
      {montoRecibido!=='' && (
        <Box sx={{p:1.5,borderRadius:2,
          bgcolor: Number(montoRecibido)>=total ? 'success.50' : 'error.50',
          border:'1px solid',
          borderColor: Number(montoRecibido)>=total ? 'success.main' : 'error.main',
        }}>
          {Number(montoRecibido)>=total ? (
            <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <Box>
                <Typography variant="body2" color="success.dark">✅ Pago suficiente</Typography>
                <Typography variant="caption" color="text.secondary">Recibido: {fmt(Number(montoRecibido))} · Total: {fmt(total)}</Typography>
              </Box>
              <Box sx={{textAlign:'right'}}>
                <Typography variant="caption" color="text.secondary">VUELTO</Typography>
                <Typography variant="h5" fontWeight={900} color="success.main">{fmt(Number(montoRecibido)-total)}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <Typography variant="body2" color="error.dark">❌ Monto insuficiente</Typography>
              <Typography variant="h6" fontWeight={800} color="error.main">Faltan {fmt(total-Number(montoRecibido))}</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}


// ── Modal Ver Detalle (pedido ya pagado) ──────────────────────
function DetalleModal({ pedidoId, pedido, open, onClose }) {
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const { error: notifError } = useNotificacion();

  React.useEffect(()=>{
    if (!open||!pedidoId) return;
    setLoading(true);
    pedidoService.getFactura(pedidoId)
      .then(setFactura)
      .catch(err=>notifError(err.message))
      .finally(()=>setLoading(false));
  },[open,pedidoId]);

  let detalleDividido = null;
  try {
    if (pedido?.detallePagoDividido) detalleDividido = JSON.parse(pedido.detallePagoDividido);
  } catch {}

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1}}>
          <ReceiptIcon color="success"/>
          <Typography variant="h6" fontWeight={700}>Detalle Pedido #{pedidoId}</Typography>
          <Chip label="✅ PAGADO" color="success" size="small"/>
        </Box>
        <IconButton onClick={onClose}><CloseIcon/></IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? Array.from({length:4}).map((_,i)=><Skeleton key={i} sx={{mb:1}} height={36}/>) :
        factura ? (
          <Box>
            {/* Info básica */}
            <Box sx={{p:2,bgcolor:'grey.50',borderRadius:2,mb:2}}>
              <Grid container spacing={1}>
                {[
                  ['Cliente',  factura.nombreCliente||'—'],
                  ['Mesa',     factura.numeroMesa||'—'],
                  ['Mesero',   factura.atendidoPor||'—'],
                  ['Fecha',    fmtFecha(factura.fecha)],
                ].map(([k,v])=>(
                  <Grid item xs={6} key={k}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{v}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Platillos */}
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{mb:2}}>
              <Table size="small">
                <TableHead><TableRow sx={{bgcolor:'grey.50'}}>
                  <TableCell><b>Platillo</b></TableCell>
                  <TableCell align="center"><b>Cant.</b></TableCell>
                  <TableCell align="right"><b>Subtotal</b></TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {factura.items?.map((item,i)=>(
                    <TableRow key={i}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                        {item.personalizaciones?.map((p,pi)=>(
                          <Typography key={pi} variant="caption" color="text.secondary" display="block">↳ {p}</Typography>
                        ))}
                      </TableCell>
                      <TableCell align="center">{item.cantidad}</TableCell>
                      <TableCell align="right" sx={{fontWeight:700}}>{fmt(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{bgcolor:'grey.50'}}>
                    <TableCell colSpan={2} align="right"><b>Subtotal</b></TableCell>
                    <TableCell align="right">{fmt(factura.subtotal)}</TableCell>
                  </TableRow>
                  <TableRow sx={{bgcolor:'grey.50'}}>
                    <TableCell colSpan={2} align="right"><b>IVA ({factura.porcentajeImpuesto}%)</b></TableCell>
                    <TableCell align="right">{fmt(factura.impuesto)}</TableCell>
                  </TableRow>
                  <TableRow sx={{bgcolor:'primary.main'}}>
                    <TableCell colSpan={2} align="right" sx={{color:'#fff',fontWeight:800}}>TOTAL</TableCell>
                    <TableCell align="right" sx={{color:'#fff',fontWeight:900,fontSize:'1.05rem'}}>{fmt(factura.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Método de pago */}
            <Box sx={{p:2,bgcolor:'grey.50',borderRadius:2}}>
              <Typography variant="subtitle2" fontWeight={700} sx={{mb:1}}>💳 Pago</Typography>
              {detalleDividido ? (
                <>
                  <Chip label="🔀 Pago dividido" color="warning" variant="outlined" size="small" sx={{mb:1.5}}/>
                  <Table size="small">
                    <TableHead><TableRow sx={{bgcolor:'grey.100'}}>
                      <TableCell><b>Persona</b></TableCell>
                      <TableCell><b>Método</b></TableCell>
                      <TableCell align="right"><b>Total</b></TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {detalleDividido.map((d,i)=>(
                        <TableRow key={i}>
                          <TableCell>{d.persona}</TableCell>
                          <TableCell><Chip label={metodoLabel(d.metodoPago)} size="small" variant="outlined"/></TableCell>
                          <TableCell align="right" sx={{fontWeight:700}}>{fmt(d.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <Box sx={{display:'flex',alignItems:'center',gap:2}}>
                  <Chip label={metodoLabel(pedido?.metodoPago)} size="medium"
                    color={pedido?.metodoPago==='efectivo'?'success':pedido?.metodoPago==='tarjeta'?'primary':'info'}
                    variant="outlined"/>
                  <Typography variant="h6" fontWeight={800} color="success.main">{fmt(factura.total)}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{px:3,pb:2}}>
        <Button onClick={onClose} variant="contained">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Modal Factura ─────────────────────────────────────────────
function FacturaModal({ pedidoId, open, onClose, onPagar }) {
  const [factura,      setFactura]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [tab,          setTab]          = useState(0);
  const [aplicarIva,   setAplicarIva]   = useState(true);
  const [nombreFact,   setNombreFact]   = useState('');
  const [pagando,      setPagando]      = useState(false);
  const [metodoPago,   setMetodoPago]   = useState('efectivo');
  const [montoRecibido,setMontoRecibido]= useState('');
  const [grupos, setGrupos] = useState([{nombre:'Persona 1',items:[],metodoPago:'efectivo',montoRecibido:'',nombreFactura:''}]);

  const printRef  = useRef();
  const printData = useRef({});
  const { exito, error: notifError } = useNotificacion();

  const handlePrint = useReactToPrint({
    content: ()=>printRef.current,
    pageStyle:`@page{size:80mm auto;margin:0;}@media print{body{margin:0;}}`,
  });

  React.useEffect(()=>{
    if (!open||!pedidoId) return;
    setLoading(true); setTab(0); setNombreFact('');
    setAplicarIva(true); setMetodoPago('efectivo'); setMontoRecibido('');
    setGrupos([{nombre:'Persona 1',items:[],metodoPago:'efectivo',montoRecibido:'',nombreFactura:''}]);
    pedidoService.getFactura(pedidoId)
      .then(data=>{
        setFactura(data);
        setGrupos([{nombre:'Persona 1',items:(data.items||[]).map((_,i)=>({idx:i,cantidad:data.items[i].cantidad})),metodoPago:'efectivo',montoRecibido:'',nombreFactura:''}]);
      })
      .catch(err=>notifError(err.message))
      .finally(()=>setLoading(false));
  },[open,pedidoId]);

  const subTotal  = factura?.subtotal||0;
  const impTotal  = aplicarIva ? subTotal*((factura?.porcentajeImpuesto||13)/100) : 0;
  const total     = subTotal+impTotal;

  const subGrupo  = (g) => (factura?.items||[]).reduce((s,it,i)=>{
    const asignado = g.items.find(x=>x.idx===i)?.cantidad||0;
    if(asignado===0) return s;
    const precioUnit = it.cantidad>0 ? it.subtotal/it.cantidad : 0;
    return s + precioUnit*asignado;
  },0);
  const impGrupo  = (g) => { const s=subGrupo(g); return aplicarIva ? s*((factura?.porcentajeImpuesto||13)/100) : 0; };
  const totalGrupo= (g) => subGrupo(g)+impGrupo(g);

  // items = [{idx, cantidad}]
  const getCantidadGrupo = (gi, ii) => {
    const g = grupos[gi];
    return g.items.find(x=>x.idx===ii)?.cantidad || 0;
  };

  const setCantidadGrupo = (gi, ii, val) => {
    const itemTotal = factura?.items?.[ii]?.cantidad || 1;
    const nuevaCant = Math.max(0, Math.min(Number(val)||0, itemTotal));

    setGrupos(prev => {
      // Sum of all other groups for this item
      const otroTotal = prev.reduce((s,g,idx)=>{
        if(idx===gi) return s;
        return s + (g.items.find(x=>x.idx===ii)?.cantidad||0);
      },0);
      const maxParaEste = itemTotal - otroTotal;
      const cantFinal = Math.min(nuevaCant, maxParaEste);

      return prev.map((g,idx)=>{
        if(idx!==gi) return g;
        const sinEste = g.items.filter(x=>x.idx!==ii);
        if(cantFinal<=0) return {...g, items: sinEste};
        return {...g, items:[...sinEste,{idx:ii, cantidad:cantFinal}]};
      });
    });
  };

  const doPrint = (datos) => { printData.current=datos; setTimeout(handlePrint,50); };

  const imprimirTotal = ()=> doPrint({
    items:factura?.items||[], subtotal:subTotal, impuesto:impTotal, total,
    aplicarIva, porcentajeImpuesto:factura?.porcentajeImpuesto,
    pedidoId, fecha:factura?.fecha,
    nombreCliente:factura?.nombreCliente, numeroMesa:factura?.numeroMesa,
    atendidoPor:factura?.atendidoPor, nombreFactura:nombreFact,
    metodoPago, montoRecibido:Number(montoRecibido)||0,
  });

  const imprimirGrupo = (g)=>{
    const items=(factura?.items||[]).reduce((arr,item,i)=>{
      const asignado=g.items.find(x=>x.idx===i)?.cantidad||0;
      if(asignado===0) return arr;
      const precioUnit=item.cantidad>0?item.subtotal/item.cantidad:0;
      return [...arr,{...item,cantidad:asignado,subtotal:precioUnit*asignado}];
    },[]);
    const sub=items.reduce((s,i)=>s+i.subtotal,0);
    const imp=aplicarIva?sub*((factura?.porcentajeImpuesto||13)/100):0;
    doPrint({items,subtotal:sub,impuesto:imp,total:sub+imp,aplicarIva,
      porcentajeImpuesto:factura?.porcentajeImpuesto,
      pedidoId,fecha:factura?.fecha,
      nombreCliente:factura?.nombreCliente,numeroMesa:factura?.numeroMesa,
      atendidoPor:factura?.atendidoPor,nombreFactura:g.nombreFactura,
      metodoPago:g.metodoPago,montoRecibido:Number(g.montoRecibido)||0,
    });
  };

  const handlePagar = async () => {
    setPagando(true);
    try {
      const detalle = tab===1
        ? JSON.stringify(grupos.map(g=>({
            persona:g.nombre, metodoPago:g.metodoPago,
            total:totalGrupo(g), nombreFactura:g.nombreFactura,
          })))
        : null;
      const metodo = tab===1 ? 'dividido' : metodoPago;
      await onPagar(pedidoId, metodo, detalle);
      exito(`Pedido #${pedidoId} marcado como PAGADO ✅`);
      onClose();
    } catch(err){ notifError(err.message); }
    finally{ setPagando(false); }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between',pb:1}}>
          <Box sx={{display:'flex',alignItems:'center',gap:1}}>
            <ReceiptIcon color="primary"/>
            <Typography variant="h6" fontWeight={700}>Factura #{pedidoId}</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon/></IconButton>
        </DialogTitle>

        <DialogContent sx={{pt:0}}>
          {loading ? Array.from({length:5}).map((_,i)=><Skeleton key={i} sx={{mb:1}} height={40}/>) :
          factura ? (
            <>
              <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:2}}>
                <Tab icon={<ReceiptIcon fontSize="small"/>} iconPosition="start" label="Pago completo"/>
                <Tab icon={<SplitIcon fontSize="small"/>}   iconPosition="start" label="Pago dividido"/>
              </Tabs>

              {/* ══ TAB 0: PAGO COMPLETO ══ */}
              {tab===0 && (
                <Box>
                  <Grid container spacing={2} sx={{mb:2}}>
                    <Grid item xs={12} sm={7}>
                      <TextField fullWidth size="small" label="Nombre en la factura (opcional)"
                        placeholder="Ej: Juan Pérez / Empresa ABC"
                        value={nombreFact} onChange={e=>setNombreFact(e.target.value)}
                        InputProps={{startAdornment:<InputAdornment position="start"><PersonIcon fontSize="small"/></InputAdornment>}}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Box sx={{display:'flex',alignItems:'center',justifyContent:'flex-end',height:'100%'}}>
                        <FormControlLabel
                          control={<Switch checked={aplicarIva} onChange={e=>setAplicarIva(e.target.checked)} color="primary"/>}
                          label={`IVA ${factura.porcentajeImpuesto}%`}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1.5} sx={{mb:2}}>
                    {[
                      {label:'Subtotal', value:fmt(subTotal)},
                      {label:'IVA',      value:aplicarIva?fmt(impTotal):'Exento'},
                      {label:'TOTAL',    value:fmt(total), big:true},
                    ].map(k=>(
                      <Grid item xs={4} key={k.label}>
                        <Card sx={{textAlign:'center',p:1.5,bgcolor:k.big?'primary.main':'grey.50'}} variant={k.big?'elevation':'outlined'}>
                          <Typography variant="caption" sx={{color:k.big?'#fff':'text.secondary'}}>{k.label}</Typography>
                          <Typography fontWeight={800} sx={{color:k.big?'#fff':'text.primary',fontSize:k.big?'1.1rem':'1rem'}}>{k.value}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  <TableContainer component={Paper} elevation={0} variant="outlined" sx={{mb:2}}>
                    <Table size="small">
                      <TableHead><TableRow sx={{bgcolor:'grey.50'}}>
                        <TableCell><b>Platillo</b></TableCell>
                        <TableCell align="center"><b>Cant.</b></TableCell>
                        <TableCell align="right"><b>Subtotal</b></TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {factura.items?.map((item,i)=>(
                          <TableRow key={i} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                              {item.personalizaciones?.map((p,pi)=>(
                                <Typography key={pi} variant="caption" color="text.secondary" display="block">↳ {p}</Typography>
                              ))}
                            </TableCell>
                            <TableCell align="center">{item.cantidad}</TableCell>
                            <TableCell align="right" sx={{fontWeight:700}}>{fmt(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Método pago + vuelto */}
                  <Box sx={{p:2,bgcolor:'grey.50',borderRadius:2}}>
                    <SelectorMetodoPago value={metodoPago} onChange={setMetodoPago}/>
                    {metodoPago==='efectivo' && (
                      <CalculadoraVuelto total={total} montoRecibido={montoRecibido} onChange={setMontoRecibido}/>
                    )}
                  </Box>
                </Box>
              )}

              {/* ══ TAB 1: PAGO DIVIDIDO ══ */}
              {tab===1 && (
                <Box>
                  <Alert severity="info" sx={{mb:2}}>
                    Asigna cada platillo a quien lo paga. Cada persona puede tener su método de pago y comprobante.
                  </Alert>

                  <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:1.5}}>
                    <FormControlLabel
                      control={<Switch checked={aplicarIva} onChange={e=>setAplicarIva(e.target.checked)} color="primary"/>}
                      label={`IVA ${factura.porcentajeImpuesto}%`}
                    />
                    <Button startIcon={<AddIcon/>} size="small" variant="outlined"
                      onClick={()=>setGrupos(p=>[...p,{nombre:`Persona ${p.length+1}`,items:[],metodoPago:'efectivo',montoRecibido:'',nombreFactura:''}])}>
                      Agregar persona
                    </Button>
                  </Box>

                  {grupos.map((grupo,gi)=>{
                    const tg = totalGrupo(grupo);
                    return (
                      <Card key={gi} variant="outlined" sx={{mb:2,borderRadius:2}}>
                        <CardContent sx={{pb:'12px !important'}}>
                          {/* Header */}
                          <Box sx={{display:'flex',alignItems:'center',gap:1,mb:1.5}}>
                            <TextField size="small" sx={{flex:1}} label="Nombre"
                              value={grupo.nombre}
                              onChange={e=>setGrupos(p=>p.map((g,i)=>i===gi?{...g,nombre:e.target.value}:g))}
                              InputProps={{startAdornment:<InputAdornment position="start"><PersonIcon fontSize="small"/></InputAdornment>}}
                            />
                            <TextField size="small" sx={{flex:1}} label="Nombre en factura"
                              value={grupo.nombreFactura}
                              onChange={e=>setGrupos(p=>p.map((g,i)=>i===gi?{...g,nombreFactura:e.target.value}:g))}
                            />
                            {grupos.length>1 && (
                              <IconButton size="small" color="error" onClick={()=>setGrupos(p=>p.filter((_,i)=>i!==gi))}>
                                <CloseIcon fontSize="small"/>
                              </IconButton>
                            )}
                          </Box>

                          {/* Items con cantidad por persona */}
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{bgcolor:'grey.50'}}>
                                  <TableCell><b>Platillo</b></TableCell>
                                  <TableCell align="center"><b>Total pedido</b></TableCell>
                                  <TableCell align="center" sx={{width:110}}><b>Cant. de {grupo.nombre.split(' ')[0]}</b></TableCell>
                                  <TableCell align="right"><b>Subtotal</b></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {factura.items?.map((item,ii)=>{
                                  const cantAsig = getCantidadGrupo(gi,ii);
                                  const precioUnit = item.cantidad>0 ? item.subtotal/item.cantidad : 0;
                                  const otroTotal = grupos.reduce((s,g,idx)=>idx===gi?s:(s+(g.items.find(x=>x.idx===ii)?.cantidad||0)),0);
                                  const disponible = item.cantidad - otroTotal;
                                  return (
                                    <TableRow key={ii} sx={{bgcolor:cantAsig>0?'primary.50':'inherit'}}>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">{fmt(precioUnit)} c/u</Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        <Chip label={`${item.cantidad} uds`} size="small" variant="outlined"/>
                                        {otroTotal>0&&<Typography variant="caption" display="block" color="text.secondary">{otroTotal} asignado(s)</Typography>}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Box sx={{display:'flex',alignItems:'center',gap:.5,justifyContent:'center'}}>
                                          <IconButton size="small" disabled={cantAsig<=0}
                                            onClick={()=>setCantidadGrupo(gi,ii,cantAsig-1)}>
                                            <span style={{fontSize:16,fontWeight:900}}>−</span>
                                          </IconButton>
                                          <TextField
                                            size="small" type="number"
                                            value={cantAsig}
                                            onChange={e=>setCantidadGrupo(gi,ii,e.target.value)}
                                            inputProps={{min:0,max:disponible+cantAsig,style:{textAlign:'center',width:36,padding:'4px'}}}
                                            sx={{'& fieldset':{borderColor:cantAsig>0?'primary.main':'divider'}}}
                                          />
                                          <IconButton size="small" disabled={cantAsig>=disponible+cantAsig||disponible<=0}
                                            onClick={()=>setCantidadGrupo(gi,ii,cantAsig+1)}>
                                            <span style={{fontSize:16,fontWeight:900}}>+</span>
                                          </IconButton>
                                        </Box>
                                      </TableCell>
                                      <TableCell align="right" sx={{fontWeight:700,color:cantAsig>0?'primary.main':'text.disabled'}}>
                                        {cantAsig>0?fmt(precioUnit*cantAsig):'—'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>

                          {/* Método pago del grupo */}
                          <Box sx={{mt:1.5,p:1.5,bgcolor:'grey.50',borderRadius:2}}>
                            <SelectorMetodoPago
                              value={grupo.metodoPago}
                              onChange={v=>setGrupos(p=>p.map((g,i)=>i===gi?{...g,metodoPago:v,montoRecibido:''}:g))}
                            />
                            {grupo.metodoPago==='efectivo' && (
                              <CalculadoraVuelto
                                total={tg}
                                montoRecibido={grupo.montoRecibido}
                                onChange={v=>setGrupos(p=>p.map((g,i)=>i===gi?{...g,montoRecibido:v}:g))}
                              />
                            )}
                          </Box>

                          {/* Total + imprimir */}
                          <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mt:1.5,pt:1,borderTop:'1px solid',borderColor:'divider'}}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Sub: {fmt(subGrupo(grupo))} {aplicarIva&&`· IVA: ${fmt(impGrupo(grupo))}`}
                              </Typography>
                              <Typography fontWeight={800} color="primary.main" variant="h6">{fmt(tg)}</Typography>
                            </Box>
                            <Button size="small" variant="outlined" startIcon={<PrintIcon/>}
                              disabled={grupo.items.length===0}
                              onClick={()=>imprimirGrupo(grupo)}>
                              Imprimir
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Resumen total dividido */}
                  <Card variant="outlined" sx={{p:2,bgcolor:'primary.50',borderRadius:2}}>
                    <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Total asignado de {grupos.length} persona(s)</Typography>
                        <Typography variant="h5" fontWeight={900} color="primary.main">
                          {fmt(grupos.reduce((s,g)=>s+totalGrupo(g),0))}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color={Math.abs(grupos.reduce((s,g)=>s+totalGrupo(g),0)-total)<0.01?'success.main':'error.main'}>
                        {(() => {
                        const asignado = grupos.reduce((s,g)=>s+totalGrupo(g),0);
                        const diff = Math.abs(asignado-total);
                        return diff<0.5 ? '✅ Cuadra con el total' : `⚠️ Sin asignar: ${fmt(total-asignado)}`;
                      })()}
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>

        <DialogActions sx={{px:3,pb:3,gap:1}}>
          <Button onClick={onClose} variant="outlined">Cerrar</Button>
          {tab===0 && <Button startIcon={<PrintIcon/>} variant="outlined" onClick={imprimirTotal} disabled={!factura}>Imprimir</Button>}
          <Button startIcon={<PagarIcon/>} variant="contained" color="success"
            onClick={handlePagar} disabled={pagando||!factura} sx={{fontWeight:700}}>
            {pagando?'Procesando...':'💳 Marcar como Pagado'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{display:'none'}}>
        <Comprobante ref={printRef} datos={printData.current}/>
      </Box>
    </>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function CajaPage() {
  const { pedidos, loading, error, cargar, cambiarEstado } = usePedidos();
  const [facturaId,   setFacturaId]   = useState(null);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [detalleId,   setDetalleId]   = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [busqueda,    setBusqueda]    = useState('');
  const [eliminarId,  setEliminarId]  = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { exito, error: notifError }  = useNotificacion();

  const abrirFactura = (id) => { setFacturaId(id); setFacturaOpen(true); };

  const handlePagar = async (id, metodoPago, detallePagoDividido) => {
    await pedidoService.cambiarEstado(id, 'Pagado', metodoPago, detallePagoDividido);
    await cargar();
  };

  const handleEliminar = async () => {
    try {
      await pedidoService.cancelar(eliminarId);
      exito(`Pedido #${eliminarId} eliminado`);
      await cargar();
    } catch(err){ notifError(err.message); }
    finally{ setConfirmOpen(false); }
  };

  const pedidosFiltrados = pedidos.filter(p=>{
    if (!['Listo','Entregado','Pagado'].includes(p.estado)) return false;
    if (!busqueda) return true;
    const q=busqueda.toLowerCase();
    return p.id.toString().includes(q)||p.nombreCliente?.toLowerCase().includes(q)||p.numeroMesa?.toLowerCase().includes(q);
  });

  const totalHoy = pedidos.filter(p=>p.estado==='Pagado'&&new Date(p.creadoEn).toDateString()===new Date().toDateString()).reduce((s,p)=>s+(p.total||0),0);
  const cantHoy  = pedidos.filter(p=>p.estado==='Pagado'&&new Date(p.creadoEn).toDateString()===new Date().toDateString()).length;

  return (
    <Box>
      <Box sx={{mb:3,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="secondary.main">💳 Caja y Facturación</Typography>
          <Typography variant="body2" color="text.secondary">Pagos individuales, divididos e impresión de comprobantes</Typography>
        </Box>
        <Tooltip title="Actualizar"><IconButton onClick={cargar}><RefreshIcon/></IconButton></Tooltip>
      </Box>

      <Grid container spacing={2} sx={{mb:3}}>
        {[
          {label:'Ventas hoy',          value:fmt(totalHoy), bgcolor:'success.main', color:'#fff'},
          {label:'Pagados hoy',         value:cantHoy,       bgcolor:'grey.100',    color:'text.primary'},
          {label:'Pendientes de cobro', value:pedidos.filter(p=>['Listo','Entregado'].includes(p.estado)).length, bgcolor:'warning.50', color:'warning.dark'},
          {label:'En lista',            value:pedidosFiltrados.length, bgcolor:'grey.100', color:'text.primary'},
        ].map(k=>(
          <Grid item xs={6} sm={3} key={k.label}>
            <Card sx={{p:2,textAlign:'center',borderRadius:3,bgcolor:k.bgcolor}} variant="outlined">
              <Typography variant="caption" sx={{color:k.color}}>{k.label}</Typography>
              <Typography variant="h6" fontWeight={800} sx={{color:k.color}}>{k.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

      <TextField fullWidth sx={{mb:2}} size="small"
        placeholder="Buscar por #, cliente o mesa..."
        value={busqueda} onChange={e=>setBusqueda(e.target.value)}
        InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon/></InputAdornment>}}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{bgcolor:'grey.50'}}>
                <TableCell><b>#</b></TableCell>
                <TableCell><b>Mesa</b></TableCell>
                <TableCell><b>Cliente</b></TableCell>
                <TableCell><b>Ítems</b></TableCell>
                <TableCell><b>Método pago</b></TableCell>
                <TableCell align="right"><b>Total</b></TableCell>
                <TableCell align="center"><b>Estado</b></TableCell>
                <TableCell align="center"><b>Acciones</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? Array.from({length:5}).map((_,i)=>(
                <TableRow key={i}>{Array.from({length:8}).map((_,j)=><TableCell key={j}><Skeleton/></TableCell>)}</TableRow>
              )) : pedidosFiltrados.length===0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{textAlign:'center',py:6,color:'text.secondary'}}>
                    <CajaIcon sx={{fontSize:48,opacity:.3,mb:1,display:'block',mx:'auto'}}/>
                    <Typography>No hay pedidos en caja</Typography>
                  </TableCell>
                </TableRow>
              ) : pedidosFiltrados.map(p=>(
                <TableRow key={p.id} hover sx={{opacity:p.estado==='Pagado'?.8:1}}>
                  <TableCell><Typography fontWeight={700} color="primary">#{p.id}</Typography></TableCell>
                  <TableCell>{p.numeroMesa||'—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.nombreCliente||'Sin nombre'}</Typography>
                    {p.atendidoPor&&<Typography variant="caption" color="text.secondary">Mesero: {p.atendidoPor}</Typography>}
                  </TableCell>
                  <TableCell><Chip label={`${p.detalles?.length||0} ítems`} size="small"/></TableCell>
                  <TableCell>
                    {p.metodoPago ? (
                      <Chip
                        size="small"
                        label={p.metodoPago==='dividido' ? '🔀 Dividido' : metodoLabel(p.metodoPago)}
                        color={p.metodoPago==='efectivo'?'success':p.metodoPago==='tarjeta'?'primary':p.metodoPago==='sinpe'?'info':'default'}
                        variant="outlined"
                      />
                    ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="right"><Typography fontWeight={800} color="primary.dark">{fmt(p.total)}</Typography></TableCell>
                  <TableCell align="center"><EstadoChip estado={p.estado}/></TableCell>
                  <TableCell align="center">
                    <Box sx={{display:'flex',gap:.5,justifyContent:'center'}}>
                      {p.estado==='Pagado' ? (
                        <Button variant="outlined" size="small" startIcon={<ReceiptIcon/>}
                          onClick={()=>{ setDetalleId(p.id); setDetalleOpen(true); }}>
                          Ver detalle
                        </Button>
                      ) : (
                        <Button variant="contained" size="small" startIcon={<ReceiptIcon/>}
                          onClick={()=>abrirFactura(p.id)} color="primary">
                          Cobrar
                        </Button>
                      )}
                      {p.estado==='Pagado'&&(
                        <Tooltip title="Eliminar registro">
                          <IconButton size="small" color="error"
                            onClick={()=>{setEliminarId(p.id);setConfirmOpen(true);}}>
                            <DeleteIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <FacturaModal pedidoId={facturaId} open={facturaOpen}
        onClose={()=>setFacturaOpen(false)} onPagar={handlePagar}/>

      <DetalleModal pedidoId={detalleId} pedido={pedidos.find(p=>p.id===detalleId)}
        open={detalleOpen} onClose={()=>setDetalleOpen(false)}/>

      <ConfirmDialog open={confirmOpen} title="Eliminar registro"
        message={`¿Eliminar el pedido #${eliminarId}? Esta acción no se puede deshacer.`}
        onConfirm={handleEliminar} onClose={()=>setConfirmOpen(false)}
        confirmColor="error" confirmText="Eliminar"/>
    </Box>
  );
}