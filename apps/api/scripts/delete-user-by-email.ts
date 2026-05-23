import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { deleteUserByEmail } from "../src/lib/delete-user.js";

const email = (process.argv[2] || "").toLowerCase().trim();

if (!email) {
  console.error("Usage: npx tsx scripts/delete-user-by-email.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

deleteUserByEmail(email)
  .then((result) => console.log(result.message))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
