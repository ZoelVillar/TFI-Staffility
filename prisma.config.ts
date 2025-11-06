import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: "postgresql://neondb_owner:npg_ajJ7HXfx9Ehl@ep-patient-meadow-ac7d901m-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    // url: env("DATABASE_URL"),
  },
});
