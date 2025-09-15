import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

export type UserRow = { id: string; email: string; name: string; passwordHash: string };

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true
    }
  });
  return user || undefined;
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

