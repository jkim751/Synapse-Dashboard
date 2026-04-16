"use client";

import { useState } from "react";
import { toast } from "react-toastify";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

interface FileUploadProps {
  label: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  existingFiles?: string[];
  onFilesChange: (files: string[]) => void;
}

const FileUpload = ({
  label,
  name,
  accept = ".pdf,.doc,.docx,.txt",
  multiple = true,
  existingFiles = [],
  onFilesChange,
}: FileUploadProps) => {
  const [files, setFiles] = useState<string[]>(existingFiles);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    // Client-side validation before uploading
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 10 MB limit.`);
        event.target.value = "";
        return;
      }

      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        toast.error(`"${file.name}" is not an allowed file type. Use PDF, DOC, DOCX, or TXT.`);
        event.target.value = "";
        return;
      }
    }

    setUploading(true);
    const newFiles: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", name);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          newFiles.push(url);
        } else {
          const { error } = await response.json().catch(() => ({}));
          toast.error(error || `Failed to upload ${file.name}`);
        }
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
        toast.success(`${newFiles.length} file(s) uploaded successfully`);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = files[index];
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    try {
      const response = await fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fileToRemove }),
      });

      if (!response.ok) {
        toast.error("Failed to delete file from storage.");
        setFiles(files);
        onFilesChange(files);
      } else {
        toast.success("File removed successfully.");
      }
    } catch {
      toast.error("Error removing file.");
      setFiles(files);
      onFilesChange(files);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileUpload}
        disabled={uploading}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
      />
      {uploading && <p className="text-xs text-blue-500">Uploading...</p>}

      {files.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Uploaded Documents:</p>
          <div className="space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                <span className="truncate">{decodeURIComponent(file.split("/").pop() || "")}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
