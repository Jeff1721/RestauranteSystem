// src/components/layout/AppShell.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Badge, Divider, Avatar, Tooltip, useMediaQuery, useTheme,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  MenuBook as MenuBookIcon,
  ShoppingCart as CartIcon,
  Kitchen as KitchenIcon,
  PointOfSale as CajaIcon,
  Restaurant as RestaurantIcon,
  Brightness4 as DarkIcon,
  Close as CloseIcon,
  Assessment as InformesIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectCantidadItems } from '../../store/store';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard',   path: '/',              icon: <DashboardIcon /> },
  { label: 'Clientes',    path: '/clientes',       icon: <PeopleIcon /> },
  { label: 'Menú',        path: '/menu',           icon: <MenuBookIcon /> },
  { label: 'Nuevo Pedido',path: '/nuevo-pedido',   icon: <CartIcon />, badge: true },
  { label: 'Cocina',      path: '/cocina',         icon: <KitchenIcon />, chip: 'Live' },
  { label: 'Caja',        path: '/caja',           icon: <CajaIcon /> },
  { label: 'Informes',    path: '/informes',       icon: <InformesIcon /> },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate    = useNavigate();
  const location    = useLocation();
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down('md'));
  const cantItems   = useSelector(selectCantidadItems);

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const DrawerContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
          <RestaurantIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ color: '#ECF0F1', fontWeight: 700, lineHeight: 1.2 }}>
            El Sabor
          </Typography>
          <Typography variant="caption" sx={{ color: '#95A5A6' }}>
            Sistema de Pedidos
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Nav Items */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNav(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 1.5,
                  bgcolor: isActive ? 'rgba(181,69,27,0.9)' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(181,69,27,0.95)' : 'rgba(255,255,255,0.08)',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <ListItemIcon sx={{
                  color: isActive ? '#FFF' : '#95A5A6',
                  minWidth: 40,
                }}>
                  {item.badge ? (
                    <Badge badgeContent={cantItems} color="error" max={99}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#FFF' : '#BDC3C7',
                  }}
                />
                {item.chip && (
                  <Chip label={item.chip} size="small" color="success"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: '#636E72' }}>
          v1.0.0 — RestauranteSystem
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
            Restaurante El Sabor
          </Typography>

          <Tooltip title="Nuevo pedido en progreso">
            <IconButton color="inherit" onClick={() => navigate('/nuevo-pedido')}>
              <Badge badgeContent={cantItems} color="error">
                <CartIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', top: 64 },
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Sidebar Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        <Toolbar />
        <DrawerContent />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',
          ml: { md: `${DRAWER_WIDTH}px` },
          p: { xs: 2, sm: 3 },
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}