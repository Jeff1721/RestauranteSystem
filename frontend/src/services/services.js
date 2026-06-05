// src/services/services.js
import axios from 'axios';

// ── Cache simple en memoria ────────────────────────────────────
const cache = {};
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

function cachedGet(key, fn) {
  const now = Date.now();
  if (cache[key] && (now - cache[key].time) < CACHE_TIME) {
    return Promise.resolve(cache[key].data);
  }
  return fn().then(data => {
    cache[key] = { data, time: now };
    return data;
  });
}

// ── Instancia axios ───────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      'Error de conexión con el servidor';
    return Promise.reject(new Error(message));
  }
);

export default api;

// ── clienteService ────────────────────────────────────────────
export const clienteService = {
  getAll:  ()           => api.get('/clientes').then(r => r.data),
  getById: (id)         => api.get(`/clientes/${id}`).then(r => r.data),
  buscar:  (q)          => api.get('/clientes/buscar', { params: { q } }).then(r => r.data),
  create:  (data)       => api.post('/clientes', data).then(r => r.data),
  update:  (id, data)   => api.put(`/clientes/${id}`, data).then(r => r.data),
  delete:  (id)         => api.delete(`/clientes/${id}`),
};

// ── categoriaService ──────────────────────────────────────────
export const categoriaService = {
  obtenerTodas: ()         => cachedGet('categorias', () => api.get('/categorias').then(r => r.data)),
  getAll:       ()         => cachedGet('categorias', () => api.get('/categorias').then(r => r.data)),
  crear:        (data)     => api.post('/categorias', data).then(r => r.data),
  create:       (data)     => api.post('/categorias', data).then(r => r.data),
  actualizar:   (id, data) => api.put(`/categorias/${id}`, data).then(r => r.data),
  update:       (id, data) => api.put(`/categorias/${id}`, data).then(r => r.data),
  eliminar:     (id)       => api.delete(`/categorias/${id}`),
  delete:       (id)       => api.delete(`/categorias/${id}`),
};

// ── platilloService ───────────────────────────────────────────
export const platilloService = {
  obtenerTodos:       ()         => cachedGet('platillos', () => api.get('/platillos').then(r => r.data)),
  obtenerDisponibles: ()         => cachedGet('platillos_disponibles', () => api.get('/platillos/disponibles').then(r => r.data)),
  obtenerDestacados:  ()         => cachedGet('platillos_destacados', () => api.get('/platillos/destacados').then(r => r.data)),
  getAll:             ()         => cachedGet('platillos', () => api.get('/platillos').then(r => r.data)),
  getDisponibles:     ()         => cachedGet('platillos_disponibles', () => api.get('/platillos/disponibles').then(r => r.data)),
  getById:            (id)       => api.get(`/platillos/${id}`).then(r => r.data),
  crear:              (data)     => api.post('/platillos', data).then(r => r.data),
  create:             (data)     => api.post('/platillos', data).then(r => r.data),
  actualizar:         (id, data) => api.put(`/platillos/${id}`, data).then(r => r.data),
  update:             (id, data) => api.put(`/platillos/${id}`, data).then(r => r.data),
  eliminar:           (id)       => api.delete(`/platillos/${id}`),
  delete:             (id)       => api.delete(`/platillos/${id}`),
};

// ── pedidoService ─────────────────────────────────────────────
export const pedidoService = {
  obtenerTodos:   ()           => api.get('/pedidos').then(r => r.data),
  obtenerActivos: ()           => api.get('/pedidos/activos').then(r => r.data),
  obtenerFactura: (id)         => api.get(`/pedidos/${id}/factura`).then(r => r.data),
  getAll:         ()           => api.get('/pedidos').then(r => r.data),
  getActivos:     ()           => api.get('/pedidos/activos').then(r => r.data),
  getFactura:     (id)         => api.get(`/pedidos/${id}/factura`).then(r => r.data),
  crear:          (data)       => api.post('/pedidos', data).then(r => r.data),
  create:         (data)       => api.post('/pedidos', data).then(r => r.data),
  cambiarEstado:  (id, estado) => api.put(`/pedidos/${id}/estado`, { estado }).then(r => r.data),
  cancelar:       (id)         => api.delete(`/pedidos/${id}`),
};