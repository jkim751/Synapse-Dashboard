import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StatsContainer from "@/components/stats/StatsContainer";

const StatsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Only allow admins to access stats
  if (role !== "admin") {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Statistics</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-4 self-end">
          </div>
        </div>
      </div>
      
      {/* CONTENT */}
      <StatsContainer searchParams={resolvedSearchParams} />
    </div>
  );
};

export default StatsPage;
