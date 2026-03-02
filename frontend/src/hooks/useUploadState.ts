// src/hooks/useUploadState.ts
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uploadReceipts } from '../api/client';

export type FileStatus = 'pending' | 'processing' | 'success' | 'error';

export const useUploadState = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
    const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const MAX_FILE_SIZE = 120 * 1024; // 120KB limit

    const filterDuplicates = (newFiles: File[]) => {
        return newFiles.filter(newFile => {
            return !files.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size);
        });
    };

    const isValidFile = (file: File) => {
        return ACCEPTED_TYPES.includes(file.type) ||
            /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
    };

    const addFiles = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFiles((prev) => {
                const updated = [...prev, ...newFiles];
                setFileStatuses(new Array(updated.length).fill('pending'));
                return updated;
            });
            toast.success(`${newFiles.length} receipt(s) added.`);
        }
    };

    const handlePreview = (file: File) => {
        if (previewFile) URL.revokeObjectURL(previewFile.url);
        const url = URL.createObjectURL(file);
        setPreviewFile({ file, url });
    };

    const closePreview = () => {
        if (previewFile) URL.revokeObjectURL(previewFile.url);
        setPreviewFile(null);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            const formatValidFiles = droppedFiles.filter(isValidFile);
            
            if (formatValidFiles.length === 0) {
                toast.error('Only PDF, JPG, and PNG files are supported.');
                return;
            }

            // Size validation logic
            const sizeValidFiles = formatValidFiles.filter(f => f.size <= MAX_FILE_SIZE);
            if (sizeValidFiles.length < formatValidFiles.length) {
                toast.error('Please upload files less than 120kb');
            }

            addFiles(filterDuplicates(sizeValidFiles));
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            const formatValidFiles = selectedFiles.filter(isValidFile);
            
            // Size validation logic
            const sizeValidFiles = formatValidFiles.filter(f => f.size <= MAX_FILE_SIZE);
            if (sizeValidFiles.length < formatValidFiles.length) {
                toast.error('Please upload files less than 120kb');
            }

            addFiles(filterDuplicates(sizeValidFiles));
            e.target.value = '';
        }
    };

    const removeFile = (indexToRemove: number) => {
        if (previewFile?.file === files[indexToRemove]) closePreview();
        setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
        setFileStatuses((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const clearAllFiles = () => {
        setFiles([]);
        closePreview();
    };

    const handleUploadAll = async () => {
        if (files.length === 0) return;
        closePreview();
        setUploading(true);
        setCurrentFileIndex(0);
        const allGroups: any[] = [];
        const allRejected: any[] = [];
        setFileStatuses(new Array(files.length).fill('pending'));

        try {
            for (let i = 0; i < files.length; i++) {
                setCurrentFileIndex(i + 1);
                setFileStatuses(prev => {
                    const newStatus = [...prev];
                    newStatus[i] = 'processing';
                    return newStatus;
                });

                const element = document.getElementById(`file-item-${i}`);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                try {
                    const response = await uploadReceipts([files[i]]);
                    if (response.groups && Array.isArray(response.groups)) {
                        response.groups.forEach((newGroup: any) => {
                            const existingGroup = allGroups.find(g => g.activity_name === newGroup.activity_name);
                            if (existingGroup) {
                                existingGroup.expenses.push(...newGroup.expenses);
                            } else {
                                allGroups.push(newGroup);
                            }
                        });
                    }
                    if (response.rejected && Array.isArray(response.rejected)) {
                        allRejected.push(...response.rejected);
                    }
                    setFileStatuses(prev => {
                        const newStatus = [...prev];
                        newStatus[i] = 'success';
                        return newStatus;
                    });
                } catch (error) {
                    // SILENT FAILURE CATCH - Pushes network/API crashes straight to the UI
                    console.error(`Error processing file ${i}:`, error);
                    setFileStatuses(prev => {
                        const newStatus = [...prev];
                        newStatus[i] = 'error';
                        return newStatus;
                    });
                    
                    allRejected.push({
                        filename: files[i].name,
                        reason: "Network or server failure during processing. Please retry."
                    });
                }
            }
            toast.success("All files processed!");
            setTimeout(() => navigate('/review', { state: { groups: allGroups, rejected: allRejected } }), 1000);
        } catch (error) {
            console.error(error);
            toast.error("Process interrupted.");
        } finally {
            setUploading(false);
        }
    };

    return {
        files, fileStatuses, previewFile, uploading, isDragging, currentFileIndex,
        handlePreview, closePreview, handleDragOver, handleDragLeave, handleDrop,
        handleFileSelect, removeFile, clearAllFiles, handleUploadAll
    };
};