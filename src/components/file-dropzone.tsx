"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
  className?: string
}

export function FileDropzone({
  onFileSelect,
  accept = ".pdf,.docx",
  maxSize = 10485760,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `Le fichier est trop volumineux (max ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
    }

    const acceptedTypes = accept.split(",").map((t) => t.trim())
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
    if (!acceptedTypes.includes(fileExtension)) {
      return `Type de fichier non accepté. Formats acceptés: ${accept}`
    }

    return null
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setError(null)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        const file = files[0]
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          return
        }
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect, accept, maxSize],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          error && "border-destructive",
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="sr-only"
          accept={accept}
          onChange={handleFileInput}
          aria-label="Upload file"
        />

        {!selectedFile ? (
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                document.getElementById("file-upload")?.click()
              }
            }}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">
              Glissez-déposez votre fichier ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-muted-foreground">
              Formats acceptés: {accept} (max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </label>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}
