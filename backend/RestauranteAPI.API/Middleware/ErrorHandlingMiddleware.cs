// ============================================================
// RestauranteAPI.API — Middleware/ErrorHandlingMiddleware.cs
// ============================================================

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace RestauranteAPI.API.Middleware
{
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
        {
            _next   = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Recurso no encontrado");
                context.Response.StatusCode  = 404;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { statusCode = 404, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Operación inválida");
                context.Response.StatusCode  = 500;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { statusCode = 400, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en {Path}", context.Request.Path);
                context.Response.StatusCode  = 500;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    statusCode = 500,
                    message    = "Error interno del servidor. Por favor intente más tarde."
                });
            }
        }
    }
}