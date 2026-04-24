import DashboardShell from "@/components/DashboardShell";
import Navbar from "@/components/Navbar";
import { NotificationProvider } from "@/components/NotificationContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <NotificationProvider>
      <DashboardShell navbar={<Navbar />}>
        {children}
      </DashboardShell>
    </NotificationProvider>
  );
}
