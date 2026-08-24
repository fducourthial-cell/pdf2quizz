// components/Dropzone.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, Image as ImageIcon } from 'lucide-react';

interface DropzoneProps {
  onFileAccepted: (file: File) => void;
}

export default function Dropzone({ onFileAccepted }: DropzoneProps) {
  // États pour gérer l'interaction
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestionnaires d'événements Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Erreur : Veuillez déposer un fichier PDF ou une image (PNG, JPG, WEBP).');
      return;
    }
    
    // NOUVELLE LIMITE : 10 Mo pour sécuriser l'API et éviter les timeouts
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Erreur : Le fichier est trop lourd (Maximum ${MAX_SIZE_MB} Mo). Réduisez la taille du document pour garantir une analyse rapide par l'IA.`);
      return;
    }
    
    setSelectedFile(file);
    onFileAccepted(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }, [onFileAccepted]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  if (selectedFile) {
    const isImage = selectedFile.type.startsWith('image/');
    
    return (
      <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
          {isImage ? <ImageIcon size={24} /> : <FileText size={24} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo - {selectedFile.name.split('.').pop()?.toUpperCase()}
          </p>
        </div>
        <button 
          onClick={() => setSelectedFile(null)}
          className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
      className={`
        relative group cursor-pointer
        border-2 border-dashed rounded-2xl p-12
        flex flex-col items-center justify-center text-center
        transition-all duration-150 ease-in-out
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}
      `}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf, image/png, image/jpeg, image/webp" 
        className="hidden" 
      />

      <div className={`p-4 rounded-full mb-6 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
        <UploadCloud size={32} strokeWidth={1.5} />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Glissez-déposez votre document ou image ici ou <span className="text-blue-600 underline">parcourir</span>
      </h3>
      <p className="text-sm text-gray-500">
        Formats acceptés : PDF, PNG, JPG, WEBP (Max 10 Mo)
      </p>

      {isDragActive && (
        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl flex items-center justify-center">
          <p className="text-2xl font-bold text-blue-600 opacity-0">Déposez</p>
        </div>
      )}
    </div>
  );
}
