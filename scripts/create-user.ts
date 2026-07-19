/**
 * Admin CLI to provision a client account (there is no public signup page by design —
 * Luro staff create one account per client company).
 *
 * Usage:
 *   npm run create-user -- user@company.com "somepassword" "Company Name"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Dynamic imports: these modules read process.env.DATABASE_URL at import time,
  // so they must load *after* dotenv has populated it above.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db/client");
  const { users } = await import("../lib/db/schema");
  const { hashPassword } = await import("../lib/auth/password");

  const [email, password, companyName] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run create-user -- user@company.com "password" "Company Name"');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    console.error(`A user with email ${normalizedEmail} already exists (id: ${existing.id}).`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash, companyName: companyName || null })
    .returning();

  console.log(`Created user ${created.email} (id: ${created.id}).`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
