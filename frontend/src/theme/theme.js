// src/theme/theme.js
// Tema Material UI personalizado para el restaurante
import { createTheme } from '@mui/material/styles';

const restauranteTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#B5451B',      // Rojo ladrillo — elegante, gastronómico
      light: '#E8724A',
      dark: '#7D2E0D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2C3E50',      // Azul pizarra oscuro
      light: '#5D6D7E',
      dark: '#1A252F',
      contrastText: '#FFFFFF',
    },
    success: { main: '#27AE60' },
    warning: { main: '#F39C12' },
    error:   { main: '#E74C3C' },
    info:    { main: '#2980B9' },
    background: {
      default: '#F5F5F0',
      paper:   '#FFFFFF',
    },
    // Colores de estado de pedido
    estado: {
      pendiente:  { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
      preparando: { bg: '#E3F2FD', text: '#0D47A1', border: '#2196F3' },
      listo:      { bg: '#E8F5E9', text: '#1B5E20', border: '#4CAF50' },
      entregado:  { bg: '#EDE7F6', text: '#4527A0', border: '#9C27B0' },
      pagado:     { bg: '#ECEFF1', text: '#455A64', border: '#90A4AE' },
      cancelado:  { bg: '#FFEBEE', text: '#B71C1C', border: '#F44336' },
    }
  },
  typography: {
    fontFamily: '"Nunito", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
    h2: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
    h3: { fontFamily: '"Playfair Display", serif', fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #B5451B 0%, #E8724A 100%)',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
          transition: 'box-shadow 0.3s ease',
        }
      }
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#2C3E50',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(181,69,27,0.04)' },
          '&:nth-of-type(even)': { backgroundColor: 'rgba(0,0,0,0.02)' }
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #2C3E50 0%, #B5451B 100%)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#1A252F',
          color: '#ECF0F1',
        }
      }
    },
  }
});

export default restauranteTheme;
