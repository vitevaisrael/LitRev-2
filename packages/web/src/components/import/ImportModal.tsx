import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { useToast } from '../../hooks/useToast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function ImportModal({ isOpen, onClose, projectId }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return api.post(`/projects/${projectId}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (response) => {
      const result = response.data as any;
      const extension = selectedFile?.name.toLowerCase().split('.').pop();
      
      // Show success message with confidence warning if applicable
      let message = `Successfully imported ${result.imported} references. ${result.duplicates} duplicates found.`;
      if ((extension === 'pdf' || extension === 'docx') && result.metadata?.warning) {
        message += ` Note: ${result.metadata.warning}`;
      }
      
      showSuccess(message);
      
      // Refetch candidates, PRISMA data, and audit logs
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.prisma(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(projectId) });
      
      onClose();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error?.message || 'Failed to import references');
    }
  });

  const handleFileSelect = (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['ris', 'bib', 'bibtex', 'pdf', 'docx'].includes(extension || '')) {
      showError('Only .ris, .bib, .bibtex, .pdf, and .docx files are supported');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Import References</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Import references from RIS, BibTeX, PDF, or DOCX files. Supported formats: .ris, .bib, .bibtex, .pdf, .docx
          </p>
          <p className="text-xs text-gray-500">
            For PDF or DOCX files, we'll extract the References section automatically. For best accuracy, prefer RIS/BibTeX files.
          </p>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="text-green-600">
                <div className="text-sm font-medium">Selected file:</div>
                <div className="text-sm">{selectedFile.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                <div className="text-sm">Drag and drop a file here, or</div>
                <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                  browse to select
                  <input
                    type="file"
                    accept=".ris,.bib,.bibtex,.pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* File Input (hidden) */}
          <input
            type="file"
            accept=".ris,.bib,.bibtex,.pdf,.docx"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
