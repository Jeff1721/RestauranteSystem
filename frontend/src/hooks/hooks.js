// src/hooks/hooks.js
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { clienteService, pedidoService, platilloService, categoriaService } from '../services/services';

// ── useClientes ───────────────────────────────────────────────
export const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clienteService.getAll();   // ya retorna el array directo
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (formData) => {
    const nuevo = await clienteService.create(formData);
    setClientes(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const actualizar = async (id, formData) => {
    const actualizado = await clienteService.update(id, formData);
    setClientes(prev => prev.map(c => c.id === id ? actualizado : c));
    return actualizado;
  };

  const eliminar = async (id) => {
    await clienteService.delete(id);
    setClientes(prev => prev.filter(c => c.id !== id));
  };

  return { clientes, loading, error, cargar, crear, actualizar, eliminar };
};

// ── usePedidos ────────────────────────────────────────────────
export const usePedidos = (soloActivos = false) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = soloActivos
        ? await pedidoService.getActivos()
        : await pedidoService.getAll();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [soloActivos]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (id, estado) => {
    const actualizado = await pedidoService.cambiarEstado(id, estado);
    setPedidos(prev => prev.map(p => p.id === id ? actualizado : p));
    return actualizado;
  };

  return { pedidos, loading, error, cargar, cambiarEstado };
};

// ── usePlatillos ──────────────────────────────────────────────
export const usePlatillos = () => {
  const [platillos, setPlatillos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]       = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [plats, cats] = await Promise.all([
        platilloService.getDisponibles(),
        categoriaService.getAll(),
      ]);
      setPlatillos(Array.isArray(plats) ? plats : []);
      setCategorias(Array.isArray(cats) ? cats : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { platillos, categorias, loading, cargar };
};

// ── useNotificacion ───────────────────────────────────────────
export const useNotificacion = () => {
  const { enqueueSnackbar } = useSnackbar();
  return {
    exito: (msg) => enqueueSnackbar(msg, { variant: 'success', autoHideDuration: 3000 }),
    error: (msg) => enqueueSnackbar(msg, { variant: 'error',   autoHideDuration: 4000 }),
    info:  (msg) => enqueueSnackbar(msg, { variant: 'info',    autoHideDuration: 3000 }),
    aviso: (msg) => enqueueSnackbar(msg, { variant: 'warning', autoHideDuration: 3500 }),
  };
};