import { prisma } from "../lib/prisma";

export async function userOwnsProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId
    }
  });
  return !!project;
}

