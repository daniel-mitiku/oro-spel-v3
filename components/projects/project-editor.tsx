"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/useDebouce";
import { updateProject } from "@/lib/actions/projects";
import type { ProjectForDashboard } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // ADDED
import { AdvancedWritingAssistant } from "@/components/writing/advanced-writing-assistant";
import { ExportDialog } from "@/components/projects/export-dialog"; // ADDED
import {
  ArrowLeft,
  Edit,
  Edit3,
  MoreVertical,
  Save,
  Download,
} from "lucide-react"; // MODIFIED
import { toast } from "sonner";

interface ProjectEditorProps {
  project: ProjectForDashboard;
}

export function ProjectEditor({ project: initialProject }: ProjectEditorProps) {
  const [project, setProject] = useState(initialProject);
  const [content, setContent] = useState(initialProject.content);
  const [mode, setMode] = useState<"textarea" | "guided">("textarea");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // MODIFIED: Debounce timer increased to 15 seconds (15000ms)
  const debouncedContent = useDebounce(content, 15000);

  const handleSetContent = (newContent: string) => {
    if (newContent === content || mode === "guided") return; // Prevent unnecessary updates
    setContent(newContent);
  };

  // NEW: Manual save handler
  const handleManualSave = async () => {
    setIsSaving(true);
    const result = await updateProject(project.id, {
      content: content, // Save the current, non-debounced content
    });
    if (result && "project" in result) {
      setProject(result.project);
      toast.success("Project Saved", {
        description: "Your writing has been successfully saved.",
      });
    } else {
      toast.error("Save Failed", {
        description: result.error || "Could not save your changes.",
      });
    }
    setIsSaving(false);
  };

  useEffect(() => {
    const autoSaveContent = async () => {
      // MODIFIED: Only autosave if the content has changed AND we are in 'textarea' mode.
      if (debouncedContent !== project.content && mode === "textarea") {
        setIsSaving(true);
        const result = await updateProject(project.id, {
          content: debouncedContent,
        });
        if (result && "project" in result) {
          setProject(result.project);
          toast.success("Progress Saved", {
            description: "Your writing has been auto-saved.",
          });
        } else {
          toast.warning("Save Failed", {
            description: "Could not save your changes.",
          });
        }
        setIsSaving(false);
      }
    };

    autoSaveContent();
  }, [debouncedContent, project.id, project.content, mode]); // MODIFIED: Added mode dependency

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-sm text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
          <div className="flex items-center gap-2 p-1 rounded-lg border bg-muted">
            <Button
              variant={mode === "textarea" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("textarea")}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Freestyle
            </Button>
            <Button
              variant={mode === "guided" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("guided")}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Guided
            </Button>
          </div>
          {/* ADDED: Dropdown Menu for Save and Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleManualSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                <span>Save Project</span>
              </DropdownMenuItem>
              {/* The ExportDialog is now triggered from here */}
              <ExportDialog
                project={project}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export</span>
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdvancedWritingAssistant
        projectContent={content}
        onContentChange={handleSetContent}
        mode={mode}
      />
    </div>
  );
}
