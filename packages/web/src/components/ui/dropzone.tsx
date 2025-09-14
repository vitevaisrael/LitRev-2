import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import { Progress } from "./progress"
import { Alert, AlertDescription } from "./alert"

interface DropzoneProps {
  onFileSelect: (file: File) => void
  isUploading?: boolean
  uploadProgress?: number
  error?: string | null
  success?: boolean
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes
  className?: string
}

export function Dropzone({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  error = null,
  success = false,
  acceptedFileTypes = ['.pdf'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className
}: DropzoneProps) {

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        onFileSelect(new Error('File too large') as any)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        onFileSelect(new Error('Invalid file type') as any)
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': acceptedFileTypes
    },
    maxSize: maxFileSize,
    multiple: false,
    disabled: isUploading
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/10",
          isUploading && "cursor-not-allowed opacity-50",
          error && "border-destructive bg-destructive/5",
          success && "border-green-500 bg-green-50",
          "border-muted-foreground/25"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isUploading ? (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="space-y-2 w-full max-w-xs">
                <div className="text-sm font-medium">Uploading PDF...</div>
                <Progress value={uploadProgress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {Math.round(uploadProgress)}% complete
                </div>
              </div>
            </>
          ) : success ? (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-sm font-medium text-green-700">
                PDF uploaded successfully!
              </div>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-sm font-medium text-destructive">
                Upload failed
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {isDragActive ? "Drop PDF here" : "Drag & drop PDF here"}
                </div>
                <div className="text-xs text-muted-foreground">
                  or click to browse files
                </div>
                <div className="text-xs text-muted-foreground">
                  Max size: {formatFileSize(maxFileSize)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {typeof error === 'string' ? error : 'Upload failed. Please try again.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
