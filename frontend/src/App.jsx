// src/App.jsx — Punto de entrada y configuración de rutas
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { SnackbarProvider } from 'notistack';

// Infraestructura
import restauranteTheme from './theme/theme';
import { store } from './store/store';
import AppShell from './components/layout/AppShell';

// Servicios
import { categoriaService, platilloService } from './services/services';

// Páginas
import DashboardPage    from './pages/DashboardPage';
import ClientesPage     from './pages/ClientesPage';
import MenuPage         from './pages/MenuPage';
import NuevoPedidoPage  from './pages/NuevoPedidoPage';
import CocinaPage       from './pages/CocinaPage';
import CajaPage         from './pages/CajaPage';
import InformesPage     from './pages/InformesPage';

// ── NOTA: Agrega estas fuentes en public/index.html dentro de <head>:
// <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />

export default function App() {

  useEffect(() => {
    // Precarga silenciosa al iniciar la app
    // Cuando el usuario navegue a Nuevo Pedido o Menú, los datos ya están en caché
    categoriaService.getAll().catch(() => {});
    platilloService.obtenerDisponibles().catch(() => {});
    platilloService.obtenerTodos().catch(() => {});
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider theme={restauranteTheme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3500}
        >
          <BrowserRouter>
            <Routes>
              {/* AppShell provee el sidebar/layout y renderiza cada página via <Outlet /> */}
              <Route path="/" element={<AppShell />}>
                <Route index               element={<DashboardPage />} />
                <Route path="clientes"     element={<ClientesPage />} />
                <Route path="menu"         element={<MenuPage />} />
                <Route path="nuevo-pedido" element={<NuevoPedidoPage />} />
                <Route path="cocina"       element={<CocinaPage />} />
                <Route path="caja"         element={<CajaPage />} />
                <Route path="informes"     element={<InformesPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
}