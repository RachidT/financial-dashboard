import bcrypt from "bcryptjs";
import postgres from "postgres";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

// Configuration optimisée
const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: "require",
  prepare: false, // Essentiel
  max: 1,
  idle_timeout: 5,
  transform: {
    undefined: null, // Gère les valeurs undefined
  },
});

async function seedTables() {
  // Exécution séparée des commandes DDL
  await sql`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    )
  `;
}

async function seedData() {
  // Users
  for (const user of users) {
    await sql`
      INSERT INTO users (id, name, email, password)
      VALUES (
        ${user.id},
        ${user.name},
        ${user.email},
        ${bcrypt.hashSync(user.password, 10)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Customers
  for (const customer of customers) {
    await sql`
      INSERT INTO customers ${sql(customer)}
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Invoices
  for (const invoice of invoices) {
    await sql`
      INSERT INTO invoices ${sql(invoice)}
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Revenue
  for (const rev of revenue) {
    await sql`
      INSERT INTO revenue ${sql(rev)}
      ON CONFLICT (month) DO NOTHING
    `;
  }
}

export async function GET() {
  try {
    // 1. Création des tables
    await seedTables();

    // 2. Insertion des données
    await seedData();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database seeded successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } finally {
    await sql.end();
  }
}
