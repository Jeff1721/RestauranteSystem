// ============================================================
// RestauranteAPI.Domain — Entities + Enums
// Todas las entidades del dominio en un único archivo
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;

// ─── Enums ───────────────────────────────────────────────────────────────────
namespace RestauranteAPI.Domain.Enums
{
    public enum EstadoPedido
    {
        Pendiente  = 0,
        Preparando = 1,
        Listo      = 2,
        Entregado  = 3,
        Pagado     = 4,
        Cancelado  = 5
    }
}

// ─── Entities ────────────────────────────────────────────────────────────────
namespace RestauranteAPI.Domain.Entities
{
    using RestauranteAPI.Domain.Enums;

    /// <summary>Entidad base con campos de auditoría comunes.</summary>
    public abstract class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
        public DateTime? ActualizadoEn { get; set; }
    }

    public class Cliente : BaseEntity
    {
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Direccion { get; set; }
        public bool Activo { get; set; } = true;

        public string NombreCompleto => $"{Nombre} {Apellido}".Trim();

        public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
    }

    public class Categoria : BaseEntity
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Icono { get; set; }
        public int Orden { get; set; }
        public bool Activo { get; set; } = true;

        public ICollection<Platillo> Platillos { get; set; } = new List<Platillo>();
    }

    public class Platillo : BaseEntity
    {
        public int CategoriaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public decimal Precio { get; set; }
        public string? ImagenUrl { get; set; }
        public int? TiempoPrep { get; set; }
        public bool Disponible { get; set; } = true;
        public bool Destacado { get; set; } = false;

        public Categoria? Categoria { get; set; }
        public ICollection<DetallePedido> DetallesPedido { get; set; } = new List<DetallePedido>();
    }

    public class Pedido : BaseEntity
    {
        public int? ClienteId { get; set; }
        public string? NumeroMesa { get; set; }
        public string? NombreCliente { get; set; }
        public EstadoPedido Estado { get; set; } = EstadoPedido.Pendiente;
        public string? Notas { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public decimal PorcentajeImpuesto { get; set; } = 13m;
        public string? AtendidoPor { get; set; }

        public Cliente? Cliente { get; set; }
        public ICollection<DetallePedido> Detalles { get; set; } = new List<DetallePedido>();

        public void RecalcularTotales()
        {
            Subtotal = Detalles.Sum(d => d.Subtotal + d.Personalizaciones.Sum(p => p.CostoAdicional * d.Cantidad));
            Impuesto = Math.Round(Subtotal * (PorcentajeImpuesto / 100), 2);
            Total    = Subtotal + Impuesto;
        }
    }

    public class DetallePedido
    {
        public int Id { get; set; }
        public int PedidoId { get; set; }
        public int PlatilloId { get; set; }
        public string NombrePlatillo { get; set; } = string.Empty;
        public decimal PrecioUnitario { get; set; }
        public int Cantidad { get; set; } = 1;
        public decimal Subtotal { get; set; }
        public string? Notas { get; set; }

        public Pedido? Pedido { get; set; }
        public Platillo? Platillo { get; set; }
        public ICollection<PersonalizacionDetalle> Personalizaciones { get; set; }
            = new List<PersonalizacionDetalle>();
    }

    public class PersonalizacionDetalle
    {
        public int Id { get; set; }
        public int DetallePedidoId { get; set; }
        public string Tipo { get; set; } = string.Empty; // SIN, EXTRA, AL_GUSTO, OTRO
        public string Descripcion { get; set; } = string.Empty;
        public decimal CostoAdicional { get; set; } = 0;

        public DetallePedido? DetallePedido { get; set; }
    }
}