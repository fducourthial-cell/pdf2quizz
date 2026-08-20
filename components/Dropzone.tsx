// components/Dropzone.tsx
'use client'; // Obligatoire pour utiliser useState/useEffect

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface DropzoneProps {
  onFileAccepted: (file: File) => void; // Fonction callback pour le parent
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
    setIsDragActive(true); // Active l'effet visuel
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false); // Désactive l'effet visuel
  }, []);

  const validateAndSetFile = (file: File) => {
    // Vérification basique du type MIME
    if (file.type !== 'application/pdf') {
      alert('Erreur : Veuillez déposer un fichier PDF uniquement.');
      return;
    }
    // Vérification de la taille (10Mo max)
    if (file.size > 50 * 1024 * 1024) {
      alert('Erreur : Le fichier est trop lourd (Max 50Mo).');
      return;
    }
    setSelectedFile(file);
    onFileAccepted(file); // Envoie le fichier validé au composant parent (page.tsx)
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

  // Permet de cliquer sur la zone pour ouvrir l'explorateur de fichiers
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  // 1. État : Fichier déjà sélectionné
  if (selectedFile) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
          <FileText size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} Mo - PDF</p>
        </div>
        <button 
          onClick={() => setSelectedFile(null)} // Annuler
          className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  // 2. État : Zone d'attente (Drag Active ou Inactive)
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
      {/* Input caché requis pour le clic */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf" 
        className="hidden" 
      />

      <div className={`p-4 rounded-full mb-6 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
        <UploadCloud size={32} strokeWidth={1.5} />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Glissez-déposez votre document PDF ici ou <span className="text-blue-600 underline">parcourir</span>
      </h3>
      <p className="text-sm text-gray-500">
        Formats acceptés : PDF uniquement (Max 10Mo)
      </p>

      {/* Overlay visuel subtil pendant le drag */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl flex items-center justify-center">
          <p className="text-2xl font-bold text-blue-600">Déposez le PDF</p>
        </div>
      )}
    </div>
  );
}
