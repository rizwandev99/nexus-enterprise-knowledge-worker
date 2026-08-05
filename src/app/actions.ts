"use server";

import { prisma } from "../lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function seedDummyData() {
  await prisma.document.createMany({
    data: [
      {
        title: "Sample Document",
        content: "This is a mock document for testing our graph.",
      },
      {
        title: "Company Policies",
        content: "All employees must work from the office 3 days a week. Vacation days are 20 per year.",
      },
      {
        title: "Project Alpha Architecture",
        content: "Project Alpha uses Next.js 15, Tailwind v4, and PostgreSQL. It is a highly scalable enterprise application.",
      }
    ]
  });

  revalidatePath("/");
  return { success: true };
}
