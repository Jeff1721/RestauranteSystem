using Microsoft.EntityFrameworkCore;
using RestauranteAPI.Infrastructure.Data;
// ============================================================
// RestauranteAPI.API — Controllers
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using RestauranteAPI.Application.DTOs;
using RestauranteAPI.Application.Interfaces;
using RestauranteAPI.Domain.Entities;
using RestauranteAPI.Domain.Enums;

namespace RestauranteAPI.API.Controllers
{
    // ── ClientesController ────────────────────────────────────
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class ClientesController : ControllerBase
    {
        private readonly IClienteRepository _repo;
        private readonly ILogger<ClientesController> _logger;

        public ClientesController(IClienteRepository repo, ILogger<ClientesController> logger)
        {
            _repo   = repo;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var clientes = await _repo.GetAllAsync();
            return Ok(clientes.Select(MapToDto));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cliente = await _repo.GetByIdAsync(id);
            return cliente is null ? NotFound() : Ok(MapToDto(cliente));
        }

        [HttpGet("buscar")]
        public async Task<IActionResult> Buscar([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                var todos = await _repo.GetAllAsync();
                return Ok(todos.Select(MapToDto));
            }
            var resultados = await _repo.BuscarAsync(q);
            return Ok(resultados.Select(MapToDto));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClienteDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var existente = await _repo.GetByEmailAsync(dto.Email);
                if (existente is not null)
                    return Conflict(new { message = "Ya existe un cliente con ese correo." });
            }

            var cliente = new Cliente
            {
                Nombre    = dto.Nombre.Trim(),
                Apellido  = dto.Apellido.Trim(),
                Telefono  = dto.Telefono?.Trim(),
                Email     = dto.Email?.Trim().ToLower(),
                Direccion = dto.Direccion?.Trim(),
            };

            var creado = await _repo.CreateAsync(cliente);
            _logger.LogInformation("Cliente creado: {Id} — {Nombre}", creado.Id, creado.NombreCompleto);
            return CreatedAtAction(nameof(GetById), new { id = creado.Id }, MapToDto(creado));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateClienteDto dto)
        {
            var cliente = await _repo.GetByIdAsync(id);
            if (cliente is null) return NotFound();

            cliente.Nombre        = dto.Nombre.Trim();
            cliente.Apellido      = dto.Apellido.Trim();
            cliente.Telefono      = dto.Telefono?.Trim();
            cliente.Email         = dto.Email?.Trim().ToLower();
            cliente.Direccion     = dto.Direccion?.Trim();
            cliente.Activo        = dto.Activo;
            cliente.ActualizadoEn = DateTime.UtcNow;

            await _repo.UpdateAsync(cliente);
            return Ok(MapToDto(cliente));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var cliente = await _repo.GetByIdAsync(id);
            if (cliente is null) return NotFound();

            await _repo.DeleteAsync(id);
            _logger.LogInformation("Cliente eliminado: {Id} — {Nombre}", id, cliente.NombreCompleto);
            return NoContent();
        }

        private static ClienteDto MapToDto(Cliente c) => new()
        {
            Id        = c.Id,
            Nombre    = c.Nombre,
            Apellido  = c.Apellido,
            Telefono  = c.Telefono,
            Email     = c.Email,
            Direccion = c.Direccion,
            Activo    = c.Activo,
            CreadoEn  = c.CreadoEn,
        };
    }

    // ── CategoriasController ──────────────────────────────────
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriasController : ControllerBase
    {
        private readonly ICategoriaRepository _repo;
        public CategoriasController(ICategoriaRepository repo) => _repo = repo;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cats = await _repo.GetAllAsync();
            return Ok(cats.Select(c => new CategoriaDto
            {
                Id = c.Id, Nombre = c.Nombre, Descripcion = c.Descripcion,
                Icono = c.Icono, Orden = c.Orden, Activo = c.Activo
            }));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _repo.GetByIdAsync(id);
            return c is null ? NotFound() : Ok(c);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoriaDto dto)
        {
            var cat = new Categoria
            {
                Nombre = dto.Nombre, Descripcion = dto.Descripcion,
                Icono = dto.Icono, Orden = dto.Orden
            };
            var creado = await _repo.CreateAsync(cat);
            return CreatedAtAction(nameof(GetById), new { id = creado.Id }, creado);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateCategoriaDto dto)
        {
            var cat = await _repo.GetByIdAsync(id);
            if (cat is null) return NotFound();
            cat.Nombre = dto.Nombre; cat.Descripcion = dto.Descripcion;
            cat.Icono = dto.Icono; cat.Orden = dto.Orden;
            await _repo.UpdateAsync(cat);
            return Ok(cat);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _repo.DeleteAsync(id);
            return NoContent();
        }
    }

    // ── PlatillosController ───────────────────────────────────
    [ApiController]
    [Route("api/[controller]")]
    public class PlatillosController : ControllerBase
    {
        private readonly IPlatilloRepository _repo;
        private readonly RestauranteDbContext _context;

        public PlatillosController(IPlatilloRepository repo, RestauranteDbContext context)
        {
            _repo    = repo;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok((await _repo.GetAllAsync()).Select(MapToDto));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _repo.GetByIdAsync(id);
            return p is null ? NotFound() : Ok(MapToDto(p));
        }

        [HttpGet("disponibles")]
        public async Task<IActionResult> GetDisponibles()
            => Ok((await _repo.GetDisponiblesAsync()).Select(MapToDto));

        [HttpGet("destacados")]
        public async Task<IActionResult> GetDestacados()
            => Ok((await _repo.GetDestacadosAsync()).Select(MapToDto));

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePlatilloDto dto)
        {
            var p = new Platillo
            {
                CategoriaId = dto.CategoriaId, Nombre = dto.Nombre,
                Descripcion = dto.Descripcion, Precio = dto.Precio,
                ImagenUrl   = dto.ImagenUrl,   TiempoPrep = dto.TiempoPrep,
                Disponible  = dto.Disponible,  Destacado  = dto.Destacado
            };
            var creado = await _repo.CreateAsync(p);
            return CreatedAtAction(nameof(GetById), new { id = creado.Id }, MapToDto(creado));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreatePlatilloDto dto)
        {
            var p = await _repo.GetByIdAsync(id);
            if (p is null) return NotFound();
            p.CategoriaId = dto.CategoriaId; p.Nombre = dto.Nombre;
            p.Descripcion = dto.Descripcion; p.Precio = dto.Precio;
            p.ImagenUrl   = dto.ImagenUrl;   p.TiempoPrep = dto.TiempoPrep;
            p.Disponible  = dto.Disponible;  p.Destacado  = dto.Destacado;
            p.ActualizadoEn = DateTime.UtcNow;
            await _repo.UpdateAsync(p);
            return Ok(MapToDto(p));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var platillo = await _repo.GetByIdAsync(id);
            if (platillo is null) return NotFound();

            // Eliminar físicamente usando SQL directo para evitar restricción FK
            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM PersonalizacionesDetalle WHERE DetallePedidoId IN (SELECT Id FROM DetallesPedido WHERE PlatilloId = {0})", id);
            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM DetallesPedido WHERE PlatilloId = {0}", id);
            await _context.Database.ExecuteSqlRawAsync(
                "DELETE FROM Platillos WHERE Id = {0}", id);

            return NoContent();
        }

        private static PlatilloDto MapToDto(Platillo p) => new()
        {
            Id = p.Id, CategoriaId = p.CategoriaId,
            NombreCategoria = p.Categoria?.Nombre ?? "",
            Nombre = p.Nombre, Descripcion = p.Descripcion,
            Precio = p.Precio, ImagenUrl = p.ImagenUrl,
            TiempoPrep = p.TiempoPrep, Disponible = p.Disponible, Destacado = p.Destacado
        };
    }

    // ── PedidosController ─────────────────────────────────────
    [ApiController]
    [Route("api/[controller]")]
    public class PedidosController : ControllerBase
    {
        private readonly IPedidoRepository _pedidoRepo;
        private readonly IPlatilloRepository _platilloRepo;
        private readonly ILogger<PedidosController> _logger;

        public PedidosController(
            IPedidoRepository pedidoRepo,
            IPlatilloRepository platilloRepo,
            ILogger<PedidosController> logger)
        {
            _pedidoRepo   = pedidoRepo;
            _platilloRepo = platilloRepo;
            _logger       = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok((await _pedidoRepo.GetAllAsync()).Select(MapToDto));

        [HttpGet("activos")]
        public async Task<IActionResult> GetActivos()
            => Ok((await _pedidoRepo.GetActivosAsync()).Select(MapToDto));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var pedido = await _pedidoRepo.GetWithDetallesAsync(id);
            return pedido is null ? NotFound() : Ok(MapToDto(pedido));
        }

        [HttpGet("{id:int}/factura")]
        public async Task<IActionResult> GetFactura(int id)
        {
            var pedido = await _pedidoRepo.GetWithDetallesAsync(id);
            if (pedido is null) return NotFound();

            var factura = new FacturaDto
            {
                PedidoId           = pedido.Id,
                NombreCliente      = pedido.NombreCliente ?? pedido.Cliente?.NombreCompleto,
                NumeroMesa         = pedido.NumeroMesa,
                Fecha              = pedido.CreadoEn,
                AtendidoPor        = pedido.AtendidoPor,
                Subtotal           = pedido.Subtotal,
                PorcentajeImpuesto = pedido.PorcentajeImpuesto,
                Impuesto           = pedido.Impuesto,
                Total              = pedido.Total,
                Items = pedido.Detalles.Select(d => new FacturaDetalleDto
                {
                    Nombre         = d.NombrePlatillo,
                    Cantidad       = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Subtotal       = d.Subtotal,
                    Personalizaciones = d.Personalizaciones
                        .Select(p => p.CostoAdicional > 0
                            ? $"{p.Descripcion} (+₡{p.CostoAdicional:N0})"
                            : p.Descripcion)
                        .ToList()
                }).ToList()
            };

            return Ok(factura);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePedidoDto dto)
        {
            if (!dto.Detalles.Any())
                return BadRequest(new { message = "El pedido debe tener al menos un platillo." });

            var pedido = new Pedido
            {
                ClienteId          = dto.ClienteId,
                NombreCliente      = dto.NombreCliente?.Trim(),
                NumeroMesa         = dto.NumeroMesa?.Trim(),
                Notas              = dto.Notas?.Trim(),
                AtendidoPor        = dto.AtendidoPor?.Trim(),
                PorcentajeImpuesto = dto.PorcentajeImpuesto,
            };

            foreach (var itemDto in dto.Detalles)
            {
                var platillo = await _platilloRepo.GetByIdAsync(itemDto.PlatilloId);
                if (platillo is null)
                    return BadRequest(new { message = $"Platillo Id={itemDto.PlatilloId} no existe." });
                if (!platillo.Disponible)
                    return BadRequest(new { message = $"El platillo '{platillo.Nombre}' no está disponible." });

                var detalle = new DetallePedido
                {
                    PlatilloId     = platillo.Id,
                    NombrePlatillo = platillo.Nombre,
                    PrecioUnitario = platillo.Precio,
                    Cantidad       = itemDto.Cantidad,
                    Subtotal       = platillo.Precio * itemDto.Cantidad,
                    Notas          = itemDto.Notas?.Trim(),
                    Personalizaciones = itemDto.Personalizaciones.Select(p => new PersonalizacionDetalle
                    {
                        Tipo           = p.Tipo,
                        Descripcion    = p.Descripcion,
                        CostoAdicional = p.CostoAdicional
                    }).ToList()
                };
                pedido.Detalles.Add(detalle);
            }

            pedido.RecalcularTotales();
            var creado = await _pedidoRepo.CreateAsync(pedido);
            _logger.LogInformation("Pedido creado: #{Id} — Mesa {Mesa} — Total: {Total}",
                creado.Id, creado.NumeroMesa, creado.Total);

            return CreatedAtAction(nameof(GetById), new { id = creado.Id }, MapToDto(creado));
        }

        [HttpPut("{id:int}/estado")]
        public async Task<IActionResult> CambiarEstado(int id, [FromBody] CambiarEstadoDto dto)
        {
            var pedido = await _pedidoRepo.GetWithDetallesAsync(id);
            if (pedido is null) return NotFound();

            if (!Enum.TryParse<EstadoPedido>(dto.Estado, true, out var nuevoEstado))
                return BadRequest(new { message = $"Estado '{dto.Estado}' no válido." });

            pedido.Estado        = nuevoEstado;
            pedido.ActualizadoEn = DateTime.UtcNow;
            await _pedidoRepo.UpdateAsync(pedido);

            _logger.LogInformation("Pedido #{Id} → Estado: {Estado}", id, nuevoEstado);
            return Ok(MapToDto(pedido));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Cancelar(int id)
        {
            var pedido = await _pedidoRepo.GetByIdAsync(id);
            if (pedido is null) return NotFound();

            pedido.Estado        = EstadoPedido.Cancelado;
            pedido.ActualizadoEn = DateTime.UtcNow;
            await _pedidoRepo.UpdateAsync(pedido);
            return NoContent();
        }

        private static PedidoDto MapToDto(Pedido p) => new()
        {
            Id                 = p.Id,
            ClienteId          = p.ClienteId,
            NombreCliente      = p.NombreCliente ?? p.Cliente?.NombreCompleto,
            NumeroMesa         = p.NumeroMesa,
            Estado             = p.Estado.ToString(),
            Notas              = p.Notas,
            Subtotal           = p.Subtotal,
            Impuesto           = p.Impuesto,
            Total              = p.Total,
            PorcentajeImpuesto = p.PorcentajeImpuesto,
            AtendidoPor        = p.AtendidoPor,
            CreadoEn           = p.CreadoEn,
            Detalles           = p.Detalles.Select(d => new DetallePedidoDto
            {
                Id              = d.Id,
                PlatilloId      = d.PlatilloId,
                NombrePlatillo  = d.NombrePlatillo,
                PrecioUnitario  = d.PrecioUnitario,
                Cantidad        = d.Cantidad,
                Subtotal        = d.Subtotal,
                Notas           = d.Notas,
                Personalizaciones = d.Personalizaciones.Select(per => new PersonalizacionDto
                {
                    Id = per.Id, Tipo = per.Tipo,
                    Descripcion = per.Descripcion,
                    CostoAdicional = per.CostoAdicional
                }).ToList()
            }).ToList()
        };
    }
}