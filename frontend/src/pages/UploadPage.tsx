// src/pages/UploadPage.tsx
import { useRef, useEffect } from 'react';
import { Button, IconButton, CircularProgress, LinearProgress } from '@mui/material';
import {
  CloudUpload, DeleteOutline, ReceiptLongOutlined,
  CloudUploadOutlined, CheckCircle, ErrorOutline, VisibilityOutlined
} from '@mui/icons-material';
import { MainLayout } from '../layout/MainLayout';
import { Toaster } from 'react-hot-toast';
import { ProgressBar } from '../components/ProgressBar';
import { FilePreviewModal } from '../components/FileViewer';
import { useUploadState } from '../hooks/useUploadState';
 
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
 
const UploadPage = () => {
  const {
    files, fileStatuses, previewFile, uploading, isDragging, currentFileIndex,
    handlePreview, closePreview, handleDragOver, handleDragLeave, handleDrop,
    handleFileSelect, removeFile, clearAllFiles, handleUploadAll
  } = useUploadState();
 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
 
  // 1. Create a ref for the file viewer section
  const fileViewerRef = useRef<HTMLDivElement>(null);
 
  // 2. Add auto-scroll logic when files are loaded
  useEffect(() => {
    if (files && files.length > 0 && !uploading) {
      setTimeout(() => {
        fileViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [files, uploading]);
 
  return (
    <MainLayout>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <ProgressBar currentStep={uploading ? 2 : 1} isLoading={uploading} />
 
      <div className="flex-1 flex flex-col items-center p-6 sm:p-10 pt-0 overflow-y-auto font-sans">
 
        {/* TOP CONTENT */}
        <div className="w-full max-w-4xl mb-8 text-center sm:text-left mt-0">
          {uploading ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h1 className="text-4xl font-bold text-[#21b0be] mb-2">Scanning the receipts</h1>
              <p className="text-gray-500 text-lg flex items-center gap-2 sm:justify-start justify-center">
                Processing file <span className="font-bold text-gray-800">{currentFileIndex}</span> of {files.length}...
              </p>
              <div className="mt-6 w-full max-w-xl">
                <LinearProgress
                  variant="determinate"
                  value={(currentFileIndex / files.length) * 100}
                  className="!h-3 !rounded-full !bg-teal-50 [&>.MuiLinearProgress-bar]:!bg-[#21b0be]"
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-[#21b0be] mb-2 drop-shadow-sm">Ingest Receipts</h1>
              <p className="text-gray-500 text-lg max-w-3xl">
                Upload your invoices and receipts for processing. Key data is extracted from your files and formatted using an LLM, and finally sent to Kantata for claiming.
              </p>
            </>
          )}
        </div>
 
        {/* DRAG & DROP BOX */}
        {!uploading && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              w-full max-w-4xl relative border-[3px] border-dashed rounded-3xl p-10 text-center transition-all duration-300 ease-in-out mb-8
              flex flex-col items-center justify-center min-h-[250px] bg-white group
              ${isDragging ? 'border-[#21b0be] bg-teal-50/50 scale-[1.01] shadow-xl' : 'border-gray-200 hover:border-[#21b0be]/60 hover:bg-gray-50/50 hover:shadow-sm'}
            `}
          >
            <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-white' : 'bg-gray-100 group-hover:bg-white'}`}>
              <ReceiptLongOutlined className={`!w-12 !h-12 transition-colors ${isDragging ? 'text-[#21b0be]' : 'text-gray-400 group-hover:text-[#21b0be]'}`} />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Drag & Drop Receipts</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">Support for JPG, PNG, and PDF formats.</p>
 
            <div className="flex flex-wrap justify-center gap-4 z-10">
              <input type="file" multiple accept={ACCEPTED_EXTENSIONS} ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              <Button onClick={() => fileInputRef.current?.click()} variant="contained" startIcon={<CloudUploadOutlined />} className="!bg-[#21b0be] hover:!bg-[#159da9] !text-white !font-bold !px-8 !py-3 !rounded-xl !shadow-md hover:!-translate-y-1 !transition-all !normal-case">Select Files</Button>
 
              <input type="file"
                // @ts-ignore
                webkitdirectory="" directory="" multiple ref={folderInputRef} className="hidden" onChange={handleFileSelect}
              />
            </div>
          </div>
        )}
 
        {/* FILES LIST (Only renders if files > 0) */}
        {files.length > 0 && (
          <div ref={fileViewerRef} className="w-full flex justify-center transition-all duration-500 scroll-mt-24">
            <div className="w-full max-w-4xl transition-all duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[200px] animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Files
                    {/* Badge only visible if files exist */}
                    {files.length > 0 && (
                      <span className="bg-[#21b0be]/10 text-[#21b0be] px-2 py-0.5 rounded-full text-xs ml-2">
                        {files.length}
                      </span>
                    )}
                  </h3>
                  {!uploading && files.length > 0 && (
                    <button onClick={clearAllFiles} className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wide">Clear All</button>
                  )}
                </div>
               
                <div className={`flex-1 max-h-[400px] mb-6 overflow-y-auto ${files.length > 4 ? 'pr-2 custom-scrollbar' : ''}`}>
                  <div className="space-y-3">
                    {files.map((file, index) => {
                      const status = fileStatuses[index] || 'pending';
                      const isCurrentProcessing = status === 'processing';
                      const isCompleted = status === 'success';
                      const isError = status === 'error';
 
                      return (
                        <div key={`${file.name}-${index}`} id={`file-item-${index}`} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${isCurrentProcessing ? 'bg-[#21b0be]/10 border-[#21b0be] border-2 shadow-md' : 'bg-gray-50 border-gray-100 border'} ${isCompleted ? 'bg-teal-50/40 border-[#21b0be]/30 border' : ''}`}>
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className={`p-2 rounded-lg border shadow-sm transition-all ${isCompleted ? 'bg-white text-[#21b0be] border-[#21b0be]/20' : ''} ${isCurrentProcessing ? 'bg-white text-[#21b0be] border-[#21b0be]' : ''} ${status === 'pending' ? 'bg-white text-gray-400 border-gray-200' : ''}`}>
                              {isCompleted ? <CheckCircle className="!w-6 !h-6" /> : (file.type.includes('image') ? <CloudUpload className="!w-6 !h-6" /> : <ReceiptLongOutlined className="!w-6 !h-6" />)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`font-semibold text-sm truncate block max-w-[200px] ${isCompleted ? 'text-[#21b0be]' : 'text-gray-700'}`}>{file.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <div className="px-2 flex items-center gap-1">
                            {isCurrentProcessing && <div className="flex items-center gap-2"><span className="text-xs font-bold text-[#21b0be] animate-pulse">Analysing...</span><CircularProgress size={18} className="!text-[#21b0be]" /></div>}
                            {isCompleted && <div className="flex items-center gap-2 px-2 py-1 bg-[#21b0be]/10 rounded-lg"><span className="text-xs font-bold text-[#21b0be]">Done</span></div>}
                            {isError && <div className="flex items-center gap-2 text-red-500"><ErrorOutline fontSize="small" /><span className="text-xs font-bold">Failed</span></div>}
                           
                            {!uploading && (
                              <IconButton onClick={() => handlePreview(file)} className="!text-gray-400 hover:!text-[#21b0be]">
                                <VisibilityOutlined className="!w-5 !h-5" />
                              </IconButton>
                            )}
                           
                            {status === 'pending' && !uploading && (
                              <IconButton onClick={() => removeFile(index)} className="!text-gray-400 hover:!text-red-500 hover:!bg-white hover:!shadow-sm !transition-all">
                                <DeleteOutline className="!w-5 !h-5" />
                              </IconButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
 
                {files.length > 0 && !uploading && (
                  <Button onClick={handleUploadAll} fullWidth variant="contained" className="!py-4 !rounded-xl !bg-[#21b0be] hover:!bg-[#159da9] !text-white !font-bold !text-lg !shadow-md hover:!-translate-y-0.5 !transition-all !normal-case !flex !items-center !justify-center !gap-2">
                    <CheckCircle className="!w-6 !h-6" /><span>Start Extraction</span>
                  </Button>
                )}
                {uploading && (
                  <Button disabled fullWidth variant="contained" className="!py-4 !rounded-xl !bg-gray-100 !text-gray-400 !font-bold !text-lg !shadow-none !normal-case !flex !items-center !justify-center !gap-2">
                    <CircularProgress size={20} color="inherit" /><span>Processing Queue...</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
 
      {/* MODAL POPUP */}
      <FilePreviewModal
        open={!!previewFile}
        onClose={closePreview}
        url={previewFile?.url || null}
        fileName={previewFile?.file.name || ''}
      />
 
    </MainLayout>
  );
};
 
export default UploadPage;
 