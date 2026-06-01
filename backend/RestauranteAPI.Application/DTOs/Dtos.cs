// ============================================================
// RestauranteAPI.Application — DTOs e Interfaces
// ============================================================

using System;
using System.Collections.Generic;

namespace RestauranteAPI.Application.DTOs
{
    // ── Cliente ───────────────────────────────────────────────
    public class ClienteDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string NombreCompleto => $"{Nombre} {Apellido}".Trim();
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Direccion { get; set; }
        public bool Activo { get; set; }
        public DateTime CreadoEn { get; set; }
    }

    public class CreateClienteDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Direccion { get; set; }
    }

    public class UpdateClienteDto : CreateClienteDto
    {
        public bool Activo { get; set; } = true;
    }

    // ── Categoria ─────────────────────────────────────────────
    public class CategoriaDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Icono { get; set; }
        public int Orden { get; set; }
        public bool Activo { get; set; }
    }

    public class CreateCategoriaDto
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Icono { get; set; }
        public int Orden { get; set; }
    }

    // ── Platillo ──────────────────────────────────────────────
    public class PlatilloDto
    {
        public int Id { get; set; }
        public int CategoriaId { get; set; }
        public string NombreCategoria { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public decimal Precio { get; set; }
        public string? ImagenUrl { get; set; }
        public int? TiempoPrep { get; set; }
        public bool Disponible { get; set; }
        public bool Destacado { get; set; }
    }

    public class CreatePlatilloDto
    {
        public int CategoriaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public decimal Precio { get; set; }
        public string? ImagenUrl { get; set; }
        public int? TiempoPrep { get; set; }
        public bool Disponible { get; set; } = true;
        public bool Destacado { get; set; } = false;
    }

    // ── Pedido ────────────────────────────────────────────────
    public class PersonalizacionDto
    {
        public int? Id { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public decimal CostoAdicional { get; set; }
    }

    public class DetallePedidoDto
    {
        public int? Id { get; set; }
        public int PlatilloId { get; set; }
        public string NombrePlatillo { get; set; } = string.Empty;
        public decimal PrecioUnitario { get; set; }
        public int Cantidad { get; set; }
        public decimal Subtotal { get; set; }
        public string? Notas { get; set; }
        public List<PersonalizacionDto> Personalizaciones { get; set; } = new();
    }

    public class PedidoDto
    {
        public int Id { get; set; }
        public int? ClienteId { get; set; }
        public string? NombreCliente { get; set; }
        public string? NumeroMesa { get; set; }
        public string Estado { get; set; } = string.Empty;
        public string? Notas { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public decimal PorcentajeImpuesto { get; set; }
        public string? AtendidoPor { get; set; }
        public DateTime CreadoEn { get; set; }
        public List<DetallePedidoDto> Detalles { get; set; } = new();
    }

    public class CreatePedidoDto
    {
        public int? ClienteId { get; set; }
        public string? NombreCliente { get; set; }
        public string? NumeroMesa { get; set; }
        public string? Notas { get; set; }
        public string? AtendidoPor { get; set; }
        public decimal PorcentajeImpuesto { get; set; } = 13m;
        public List<CreateDetallePedidoDto> Detalles { get; set; } = new();
    }

    public class CreateDetallePedidoDto
    {
        public int PlatilloId { get; set; }
        public int Cantidad { get; set; } = 1;
        public string? Notas { get; set; }
        public List<PersonalizacionDto> Personalizaciones { get; set; } = new();
    }

    public class CambiarEstadoDto
    {
        public string Estado { get; set; } = string.Empty;
    }

    // ── Factura ───────────────────────────────────────────────
    public class FacturaDetalleDto
    {
        public string Nombre { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal Subtotal { get; set; }
        public List<string> Personalizaciones { get; set; } = new();
    }

    public class FacturaDto
    {
        public int PedidoId { get; set; }
        public string? NombreCliente { get; set; }
        public string? NumeroMesa { get; set; }
        public DateTime Fecha { get; set; }
        public string? AtendidoPor { get; set; }
        public List<FacturaDetalleDto> Items { get; set; } = new();
        public decimal Subtotal { get; set; }
        public decimal PorcentajeImpuesto { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
    }
}

// ============================================================
// Interfaces de Repositorios
// ============================================================
namespace RestauranteAPI.Application.Interfaces
{
    using RestauranteAPI.Domain.Entities;

    public interface IRepository<T> where T : class
    {
        Task<IEnumerable<T>> GetAllAsync();
        Task<T?> GetByIdAsync(int id);
        Task<T> CreateAsync(T entity);
        Task<T> UpdateAsync(T entity);
        Task DeleteAsync(int id);
    }

    public interface IClienteRepository : IRepository<Cliente>
    {
        Task<IEnumerable<Cliente>> BuscarAsync(string query);
        Task<Cliente?> GetByEmailAsync(string email);
    }

    public interface ICategoriaRepository : IRepository<Categoria>
    {
        Task<IEnumerable<Categoria>> GetActivasAsync();
    }

    public interface IPlatilloRepository : IRepository<Platillo>
    {
        Task<IEnumerable<Platillo>> GetByCategoriaAsync(int categoriaId);
        Task<IEnumerable<Platillo>> GetDisponiblesAsync();
        Task<IEnumerable<Platillo>> GetDestacadosAsync();
    }

    public interface IPedidoRepository : IRepository<Pedido>
    {
        Task<IEnumerable<Pedido>> GetActivosAsync();
        Task<Pedido?> GetWithDetallesAsync(int id);
        Task<IEnumerable<Pedido>> GetByEstadoAsync(string estado);
    }
}