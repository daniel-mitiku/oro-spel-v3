import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Edit, Users, TrendingUp } from "lucide-react";

export default async function HomePage() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("auth-token")?.value;

  const user = token ? await verifyToken(token).catch(() => null) : null;

  // If user is logged in, redirect to dashboard
  if (token && user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-accent" />
              <span className="font-bold text-lg">Oromo Writing Assistant</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
            Master <span className="text-accent">Oromo Writing</span> with
            AI-Powered Assistance
          </h1>
          <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
            Learn proper letter duplication, improve your Oromo language skills,
            and write with confidence using our intelligent writing assistant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Start Writing Today</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Powerful Features for Oromo Learners
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to master Oromo writing and language skills
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Edit className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Smart Writing Assistant</CardTitle>
                <CardDescription>
                  Get real-time feedback on letter duplication and word usage
                  with contextual examples from authentic Oromo texts.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Interactive Quizzes</CardTitle>
                <CardDescription>
                  Practice with guided exercises and quizzes designed to improve
                  your understanding of Oromo phonetics and spelling.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Progress Tracking</CardTitle>
                <CardDescription>
                  Monitor your improvement with detailed analytics, completion
                  rates, and personalized learning insights.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Personal Corpus</CardTitle>
                <CardDescription>
                  Build your own collection of sentences and expand the learning
                  database with your contributions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Project Management</CardTitle>
                <CardDescription>
                  Organize your writing into projects, track completion, and
                  export your finished work.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Edit className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Dual Writing Modes</CardTitle>
                <CardDescription>
                  Choose between freestyle writing with assistance or guided
                  sentence-by-sentence composition.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Improve Your Oromo Writing?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join our community of learners and start your journey to mastering
            Oromo language writing today.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">Create Your Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>
            &copy; 2024 Oromo Writing Assistant. Built with care for the Oromo
            language community.
          </p>
        </div>
      </footer>
    </div>
  );
}
