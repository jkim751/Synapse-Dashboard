import { clerkClient } from "@clerk/nextjs/server";

export async function createClerkUserWithRollback(userData: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  publicMetadata: { role: string };
}) {
  const clerk = await clerkClient();
  const user = await clerk.users.createUser(userData);
  
  return {
    user,
    rollback: async () => {
      try {
        await clerk.users.deleteUser(user.id);
        console.log(`Rolled back Clerk user: ${user.id}`);
      } catch (error) {
        console.error(`Failed to rollback Clerk user ${user.id}:`, error);
      }
    }
  };
}
