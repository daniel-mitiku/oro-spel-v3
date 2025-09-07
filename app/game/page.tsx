import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { getCurrentUser } from "@/lib/actions/auth";
import { GamePageContent } from "@/components/writing/game-page-content";

export default async function GamePage() {
  const user = await getCurrentUser();
  if (!user || !user.name || !user.email) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={{ name: user.name, email: user.email }} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GamePageContent />
      </main>
    </div>
  );
}
