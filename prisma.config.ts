import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "postgresql://neondb_owner:npg_1akhQwKJlz7H@ep-restless-hill-bd2ofj6j-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});
