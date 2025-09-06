"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import type { ProjectForDashboard } from "@/lib/types";

interface ExportDialogProps {
  project: ProjectForDashboard;
  trigger?: React.ReactNode;
}

export function ExportDialog({ project, trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("txt");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/protected/export/project/${project.id}?format=${format}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get("Content-Disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
          : `${project.title
              .replace(/[^a-z0-9]/gi, "_")
              .toLowerCase()}.${format}`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setOpen(false);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: "txt",
      label: "Plain Text (.txt)",
      description: "Simple text file with sentences",
      icon: FileText,
    },
    {
      value: "json",
      label: "JSON (.json)",
      description: "Structured data with metadata",
      icon: FileJson,
    },
    {
      value: "csv",
      label: "CSV (.csv)",
      description: "Spreadsheet format with details",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Choose the format for exporting "{project.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={format} onValueChange={setFormat}>
            {formatOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <option.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>

          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <strong>Export includes:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{project.stats.totalSentences} sentences</li>
              <li>Project metadata and statistics</li>
              <li>Creation and update timestamps</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
