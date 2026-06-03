// src/store/carritoSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  clienteId: null,
  nombreCliente: '',
  numeroMesa: '',
  notas: '',
  atendidoPor: '',
  porcentajeImpuesto: 13,
};

const carritoSlice = createSlice({
  name: 'carrito',
  initialState,
  reducers: {
    agregarItem: (state, action) => {
      const { platillo, cantidad = 1, notas = '', personalizaciones = [] } = action.payload;
      const existente = state.items.find(i => i.platillo.id === platillo.id);
      if (existente) {
        existente.cantidad += cantidad;
      } else {
        state.items.push({ platillo, cantidad, notas, personalizaciones });
      }
    },
    actualizarItem: (state, action) => {
      const { index, cantidad, notas, personalizaciones } = action.payload;
      if (state.items[index]) {
        state.items[index].cantidad = cantidad;
        state.items[index].notas = notas;
        state.items[index].personalizaciones = personalizaciones;
      }
    },
    removerItem: (state, action) => {
      state.items.splice(action.payload, 1);
    },
    limpiarCarrito: () => initialState,
    setInfoPedido: (state, action) => {
      const { clienteId, nombreCliente, numeroMesa, notas, atendidoPor } = action.payload;
      state.clienteId     = clienteId;
      state.nombreCliente = nombreCliente;
      state.numeroMesa    = numeroMesa;
      state.notas         = notas;
      state.atendidoPor   = atendidoPor;
    },
  },
});

export const {
  agregarItem, actualizarItem, removerItem,
  limpiarCarrito, setInfoPedido,
} = carritoSlice.actions;

export const selectItems        = (state) => state.carrito.items;
export const selectInfoPedido   = (state) => state.carrito;
export const selectCantidadItems = (state) =>
  state.carrito.items.reduce((sum, i) => sum + i.cantidad, 0);

export const selectSubtotal = (state) =>
  state.carrito.items.reduce((sum, item) => {
    const costoPers = item.personalizaciones.reduce((s, p) => s + (p.costoAdicional || 0), 0);
    return sum + (item.platillo.precio + costoPers) * item.cantidad;
  }, 0);

export const selectTotal = (state) => {
  const subtotal = selectSubtotal(state);
  const impuesto = subtotal * (state.carrito.porcentajeImpuesto / 100);
  return { subtotal, impuesto, total: subtotal + impuesto };
};

export default carritoSlice.reducer;
