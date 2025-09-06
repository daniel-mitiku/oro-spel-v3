"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Download,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { ProjectForDashboard as Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onExport: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onExport }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      setIsDeleting(true);
      try {
        await onDelete(project.id!.toString());
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusColor = (completionRate: number) => {
    if (completionRate >= 100) return "bg-chart-1";
    if (completionRate >= 70) return "bg-chart-4";
    if (completionRate >= 30) return "bg-chart-2";
    return "bg-muted";
  };

  const getStatusText = (completionRate: number) => {
    if (completionRate >= 100) return "Complete";
    if (completionRate >= 70) return "Nearly Done";
    if (completionRate >= 30) return "In Progress";
    return "Getting Started";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">
              {project.title}
            </CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </Link>
              </DropdownMenuItem>
              {project.stats.completionRate === 100 && (
                <DropdownMenuItem onClick={() => onExport(project)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Text
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={getStatusColor(project.stats.completionRate)}
          >
            {getStatusText(project.stats.completionRate)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {Math.round(project.stats.completionRate)}% complete
          </span>
        </div>

        <Progress value={project.stats.completionRate} className="h-2" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{project.stats.totalSentences} sentences</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-chart-1" />
            <span>{project.stats.completeSentences} complete</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-chart-4" />
            <span>{project.stats.partialSentences} partial</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>{project.stats.unknownWords} unknown words</span>
          </div>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full">
            <Link href={`/projects/${project.id}`}>Open Project</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
