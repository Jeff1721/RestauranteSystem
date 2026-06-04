// ============================================================
// RestauranteAPI.Infrastructure — DbContext y Repositorios
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RestauranteAPI.Application.Interfaces;
using RestauranteAPI.Domain.Entities;
using RestauranteAPI.Domain.Enums;

// ── DbContext ─────────────────────────────────────────────────────────────────
namespace RestauranteAPI.Infrastructure.Data
{
    public class RestauranteDbContext : DbContext
    {
        public RestauranteDbContext(DbContextOptions<RestauranteDbContext> options)
            : base(options) { }

        public DbSet<Cliente> Clientes => Set<Cliente>();
        public DbSet<Categoria> Categorias => Set<Categoria>();
        public DbSet<Platillo> Platillos => Set<Platillo>();
        public DbSet<Pedido> Pedidos => Set<Pedido>();
        public DbSet<DetallePedido> DetallesPedido => Set<DetallePedido>();
        public DbSet<PersonalizacionDetalle> Personalizaciones => Set<PersonalizacionDetalle>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Cliente ──────────────────────────────────────────
            modelBuilder.Entity<Cliente>(e =>
            {
                e.ToTable("Clientes");
                e.HasKey(x => x.Id);
                e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
                e.Property(x => x.Apellido).HasMaxLength(100).IsRequired();
                e.Property(x => x.Telefono).HasMaxLength(20);
                e.Property(x => x.Email).HasMaxLength(150);
                e.HasIndex(x => x.Email).IsUnique();                
                e.Ignore(x => x.NombreCompleto);
            });

            // ── Categoria ─────────────────────────────────────────
            modelBuilder.Entity<Categoria>(e =>
            {
                e.ToTable("Categorias");
                e.HasKey(x => x.Id);
                e.Property(x => x.Nombre).HasMaxLength(80).IsRequired();
                e.HasIndex(x => x.Nombre).IsUnique();
            });

            // ── Platillo ──────────────────────────────────────────
            modelBuilder.Entity<Platillo>(e =>
            {
                e.ToTable("Platillos");
                e.HasKey(x => x.Id);
                e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
                e.Property(x => x.Precio).HasColumnType("decimal(10,2)");
                e.HasOne(x => x.Categoria)
                 .WithMany(c => c.Platillos)
                 .HasForeignKey(x => x.CategoriaId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // ── Pedido ────────────────────────────────────────────
            modelBuilder.Entity<Pedido>(e =>
            {
                e.ToTable("Pedidos");
                e.HasKey(x => x.Id);
                e.Property(x => x.Estado)
                 .HasConversion<string>()
                 .HasMaxLength(20);
                e.Property(x => x.Subtotal).HasColumnType("decimal(10,2)");
                e.Property(x => x.Impuesto).HasColumnType("decimal(10,2)");
                e.Property(x => x.Total).HasColumnType("decimal(10,2)");
                e.Property(x => x.PorcentajeImpuesto).HasColumnType("decimal(5,2)");
                e.HasOne(x => x.Cliente)
                 .WithMany(c => c.Pedidos)
                 .HasForeignKey(x => x.ClienteId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ── DetallePedido ──────────────────────────────────────
            modelBuilder.Entity<DetallePedido>(e =>
            {
                e.ToTable("DetallesPedido");
                e.HasKey(x => x.Id);
                e.Property(x => x.NombrePlatillo).HasMaxLength(100).IsRequired();
                e.Property(x => x.PrecioUnitario).HasColumnType("decimal(10,2)");
                e.Property(x => x.Subtotal).HasColumnType("decimal(10,2)");
                e.HasOne(x => x.Pedido)
                 .WithMany(p => p.Detalles)
                 .HasForeignKey(x => x.PedidoId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Platillo)
                 .WithMany(p => p.DetallesPedido)
                 .HasForeignKey(x => x.PlatilloId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // ── PersonalizacionDetalle ────────────────────────────
            modelBuilder.Entity<PersonalizacionDetalle>(e =>
            {
                e.ToTable("PersonalizacionesDetalle");
                e.HasKey(x => x.Id);
                e.Property(x => x.Tipo).HasMaxLength(50).IsRequired();
                e.Property(x => x.Descripcion).HasMaxLength(200).IsRequired();
                e.Property(x => x.CostoAdicional).HasColumnType("decimal(10,2)");
                e.HasOne(x => x.DetallePedido)
                 .WithMany(d => d.Personalizaciones)
                 .HasForeignKey(x => x.DetallePedidoId)
                 .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}

// ── Repositorios ──────────────────────────────────────────────────────────────
namespace RestauranteAPI.Infrastructure.Repositories
{
    using RestauranteAPI.Infrastructure.Data;

    public class GenericRepository<T> : IRepository<T> where T : class
    {
        protected readonly RestauranteDbContext _context;
        protected readonly DbSet<T> _dbSet;

        public GenericRepository(RestauranteDbContext context)
        {
            _context = context;
            _dbSet = context.Set<T>();
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
            => await _dbSet.AsNoTracking().ToListAsync();

        public virtual async Task<T?> GetByIdAsync(int id)
            => await _dbSet.FindAsync(id);

        public virtual async Task<T> CreateAsync(T entity)
        {
            await _dbSet.AddAsync(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public virtual async Task<T> UpdateAsync(T entity)
        {
            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return entity;
        }

        public virtual async Task DeleteAsync(int id)
        {
            var entity = await GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Entidad con Id={id} no encontrada.");
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }

    public class CategoriaRepository : GenericRepository<Categoria>, ICategoriaRepository
    {
        public CategoriaRepository(RestauranteDbContext context) : base(context) { }

        public async Task<IEnumerable<Categoria>> GetActivasAsync()
            => await _dbSet.AsNoTracking()
                .Where(c => c.Activo)
                .OrderBy(c => c.Orden)
                .ToListAsync();
    }

    public class ClienteRepository : GenericRepository<Cliente>, IClienteRepository
    {
        public ClienteRepository(RestauranteDbContext context) : base(context) { }

        public async Task<IEnumerable<Cliente>> BuscarAsync(string query)
        {
            var q = query.ToLower().Trim();
            return await _dbSet
                .AsNoTracking()
                .Where(c => c.Activo &&
                    (c.Nombre.ToLower().Contains(q) ||
                     c.Apellido.ToLower().Contains(q) ||
                     (c.Email != null && c.Email.ToLower().Contains(q)) ||
                     (c.Telefono != null && c.Telefono.Contains(q))))
                .OrderBy(c => c.Nombre)
                .ToListAsync();
        }

        public async Task<Cliente?> GetByEmailAsync(string email)
            => await _dbSet.FirstOrDefaultAsync(c => c.Email == email);
    }

    public class PlatilloRepository : GenericRepository<Platillo>, IPlatilloRepository
    {
        public PlatilloRepository(RestauranteDbContext context) : base(context) { }

        public override async Task<IEnumerable<Platillo>> GetAllAsync()
            => await _dbSet.AsNoTracking()
                .Include(p => p.Categoria)
                .OrderBy(p => p.CategoriaId).ThenBy(p => p.Nombre)
                .ToListAsync();

        public async Task<IEnumerable<Platillo>> GetByCategoriaAsync(int categoriaId)
            => await _dbSet.AsNoTracking()
                .Include(p => p.Categoria)
                .Where(p => p.CategoriaId == categoriaId)
                .OrderBy(p => p.Nombre)
                .ToListAsync();

        public async Task<IEnumerable<Platillo>> GetDisponiblesAsync()
            => await _dbSet.AsNoTracking()
                .Include(p => p.Categoria)
                .Where(p => p.Disponible)
                .OrderBy(p => p.Categoria!.Orden).ThenBy(p => p.Nombre)
                .ToListAsync();

        public async Task<IEnumerable<Platillo>> GetDestacadosAsync()
            => await _dbSet.AsNoTracking()
                .Include(p => p.Categoria)
                .Where(p => p.Disponible && p.Destacado)
                .ToListAsync();
    }

    public class PedidoRepository : GenericRepository<Pedido>, IPedidoRepository
    {
        public PedidoRepository(RestauranteDbContext context) : base(context) { }

        public override async Task<IEnumerable<Pedido>> GetAllAsync()
            => await _dbSet.AsNoTracking()
                .Include(p => p.Cliente)
                .Include(p => p.Detalles)
                    .ThenInclude(d => d.Personalizaciones)
                .OrderByDescending(p => p.CreadoEn)
                .ToListAsync();

        public async Task<IEnumerable<Pedido>> GetActivosAsync()
        {
            var estadosActivos = new[]
            {
                EstadoPedido.Pendiente, EstadoPedido.Preparando, EstadoPedido.Listo
            };
            return await _dbSet.AsNoTracking()
                .Include(p => p.Cliente)
                .Include(p => p.Detalles)
                    .ThenInclude(d => d.Personalizaciones)
                .Where(p => estadosActivos.Contains(p.Estado))
                .OrderBy(p => p.CreadoEn)
                .ToListAsync();
        }

        public async Task<Pedido?> GetWithDetallesAsync(int id)
            => await _dbSet
                .Include(p => p.Cliente)
                .Include(p => p.Detalles)
                    .ThenInclude(d => d.Platillo)
                .Include(p => p.Detalles)
                    .ThenInclude(d => d.Personalizaciones)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<IEnumerable<Pedido>> GetByEstadoAsync(string estado)
        {
            if (!Enum.TryParse<EstadoPedido>(estado, true, out var estadoEnum))
                return Enumerable.Empty<Pedido>();

            return await _dbSet.AsNoTracking()
                .Include(p => p.Detalles)
                    .ThenInclude(d => d.Personalizaciones)
                .Where(p => p.Estado == estadoEnum)
                .OrderBy(p => p.CreadoEn)
                .ToListAsync();
        }
    }
}