// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import carritoReducer from './carritoSlice';
 
export const store = configureStore({
  reducer: {
    carrito: carritoReducer,
  },
});

export {
  agregarItem,
  actualizarItem,
  removerItem,
  limpiarCarrito,
  setInfoPedido,
  selectItems,
  selectInfoPedido,
  selectSubtotal,
  selectTotal,
  selectCantidadItems,
} from './carritoSlice';