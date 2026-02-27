import { z } from 'zod';

export const productSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    precio_costo: z.number().min(0, "El costo no puede ser negativo"),
    precio_unitario: z.number().min(0, "El precio de venta no puede ser negativo"),
    categoria_id: z.string().uuid("Seleccione una categoría válida"),
    stock_actual: z.number().int().min(0, "El stock no puede ser negativo"),
    numero_unidades: z.number().min(0.01, "El número de unidades debe ser mayor a 0"),
    unidad_medida: z.enum(['UNIDAD', 'KILOGRAMO', 'GRAMO', 'LITRO', 'MILILITRO', 'BULTO', 'PAQUETE', 'CAJA', 'SACO']),
    codigo_barras: z.string().optional(),
    descripcion_corta: z.string().max(200, "Descripción demasiado larga").optional(),
    imagen_url: z.string().url().nullable().optional().or(z.string().startsWith('data:image')).or(z.literal(null))
});
