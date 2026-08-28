import { defineConfig } from "prisma/config";
import "dotenv/config";
import { env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://dummy:dummy@localhost:5432/dummy",
  },
});