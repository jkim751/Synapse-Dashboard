import { clerkClient } from "@clerk/nextjs/server";

function isNotFound(err: unknown) {
  return !!(err && typeof err === "object" && "status" in err && (err as any).status === 404);
}

export async function safeDeleteClerkUser(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}
