import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ProjectEditor } from "@/components/projects/project-editor";
import { getCurrentUser } from "@/lib/actions/auth";
import { getProjectById } from "@/lib/actions/projects";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.name || !user.email) {
    redirect("/login");
  }
  const { id } = await params;
  const { project, error } = await getProjectById(id);

  if (error || !project) {
    console.error("Error Getting project:", error);
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={{ name: user.name, email: user.email }} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectEditor project={project} />
      </main>
    </div>
  );
}
