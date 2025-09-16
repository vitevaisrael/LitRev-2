import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export type UserRow = { id: string; email: string; name: string | null; passwordHash: string };

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

export async function createUser(
  email: string, 
  password: string, 
  name?: string
): Promise<{ id: string; email: string; name: string | null }> {
  // Hash password with higher salt rounds for better security
  const passwordHash = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0]
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
  
  return user;
}

