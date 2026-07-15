# 🏢 SIPRO - Sistema Web de Control Financiero de Obras Públicas y Privadas

Plataforma Full-Stack de nivel arquitectónico desarrollada en **Next.js (App Router) + TypeScript + Prisma ORM + Tailwind CSS + Recharts**, diseñada para el control exhaustivo de presupuestos, partidas, tesorería, conciliación bancaria y registro ágil de egresos amarrados a partida en campo u oficina.

---

## 🚂 Guía de Despliegue en Railway (`railway.app`)

Este proyecto ya está configurado con `railway.json` y `nixpacks.toml` para un despliegue automático en **Railway**.

### Opción A: Conectando una Base de Datos PostgreSQL de Railway (Recomendado para Producción)
1. En tu panel de **Railway**, haz clic en **+ New** -> **Database** -> **Add PostgreSQL**.
2. Una vez creada la base de datos PostgreSQL, haz clic en **+ New** -> **GitHub Repo** y selecciona tu repositorio `PremHer/control-financiero-obras`.
3. En los ajustes de tu nuevo servicio web de Next.js en Railway:
   * Ve a **Variables** y agrega una variable referenciando la BD: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway te la autocompleta).
4. Como la base de datos es PostgreSQL en Railway, antes del primer deploy o en tu repositorio local, edita `prisma/schema.prisma` cambiando:
   ```prisma
   datasource db {
     provider = "postgresql" // Cambiar "sqlite" por "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. ¡Listo! Al hacer push, Railway ejecutará automáticamente las migraciones (`prisma db push`) y levantará la aplicación en vivo con SSL gratis.

---

### Opción B: Usando SQLite en Railway con Volumen Persistente
Si prefieres mantener `sqlite` sin provisionar un servicio extra de PostgreSQL:
1. En tu servicio de Railway, ve a la pestaña **Volumes** y haz clic en **+ New Volume**.
2. Asigna la ruta de montaje en el contenedor: `/app/prisma/data`
3. En la pestaña **Variables** de tu servicio, define:
   ```env
   DATABASE_URL="file:/app/prisma/data/prod.db"
   ```
4. ¡Listo! El comando automático `"start:prod": "prisma db push && next start"` creará las tablas dentro del volumen persistente y tus datos de obra se mantendrán intactos entre reinicios y actualizaciones.

---

## 🌱 Semilla de Datos de Prueba (Seed Data)
El proyecto incluye un script precargado con datos de prueba reales para el **Mejoramiento del Canal de Riego Jesús - Chuco** y contactos asociados:
* Para poblar tu base de datos de producción recién creada con estos datos iniciales, puedes abrir la consola (Terminal) de tu contenedor en Railway y correr:
  ```bash
  npm run db:seed
  ```

---

## 🛠️ Desarrollo Local
1. Instalar dependencias: `npm install`
2. Inicializar BD local: `npm run db:init`
3. Correr servidor: `npm run dev`
4. Abrir en el navegador: [http://localhost:3000](http://localhost:3000)
