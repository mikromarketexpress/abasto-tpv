# Migración Supabase → Google Sheets

## Pasos para configurar

### 1. Crear el Google Apps Script

1. Ve a [Google Apps Script](https://script.google.com)
2. Crea un nuevo proyecto (Nuevo proyecto)
3. Borra todo el código existente
4. Copia el contenido de `scripts/google-apps-script.js` y pégalo
5. Reemplaza `TU_SPREADSHEET_ID_AQUI` con el ID de tu Google Sheet:
   - Abre tu Google Sheet
   - La URL será algo como: `https://docs.google.com/spreadsheets/d/XXXXX/edit`
   - El ID es la parte `XXXXX`

### 2. Desplegar como Web App

1. En Google Apps Script, click en **Desplegar** > **Nuevo despliegue**
2. Tipo: **Aplicación web**
3. Configuración:
   - Descripción: `Supabase Migrator`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
4. Click en **Desplegar**
5. Copia la **URL del Web App** (será algo como `https://script.google.com/macros/s/XXXXX/exec`)

### 3. Actualizar .env

Edita el archivo `.env` y actualiza la URL:

```
VITE_GOOGLE_SHEETS_URL=https://script.google.com/macros/s/TU_ID_AQUI/exec
```

### 4. Ejecutar la migración

```bash
node scripts/migrateToSheets.js
```

## Estructura de tablas en Google Sheets

| Hoja | Descripción |
|------|-------------|
| Categorias | Categorías de productos |
| Productos | Lista de productos |
| Vendedores | Vendedores del sistema |
| Ventas | Historial de ventas |
| Caja | Sesiones de caja |

## Notas

- El script reemplaza todos los datos existentes en cada tabla
- Las categorías se migran con sus nombres (no UUIDs)
- Los productos incluyen el nombre de categoría en texto
- Las ventas incluyen los productos como JSON
