import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUserProjects } from "@/lib/actions/projects";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.name || !user.email) {
    redirect("/login");
  }

  const { projects, error } = await getUserProjects();

  if (error || !projects) {
    console.error("Error Getting project:", error);
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={{ name: user.name, email: user.email }} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardContent user={user} initialProjects={projects} />
      </main>
    </div>
  );
}
