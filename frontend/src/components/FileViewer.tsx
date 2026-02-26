import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close, Visibility, ReceiptLongOutlined } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface FileRendererProps {
  url: string | null;
  fileName: string;
}

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
}

// --- 1. The Core Renderer (Logic for PDF vs Image) ---
export const FileRenderer = ({ url, fileName }: FileRendererProps) => {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
        <ReceiptLongOutlined className="!text-[48px] opacity-50" />
        <Typography>No preview available</Typography>
      </div>
    );
  }

  // Determine file type
  const isPdf =
    fileName.toLowerCase().endsWith('.pdf') ||
    url.toLowerCase().includes('application/pdf') ||
    url.toLowerCase().includes('.pdf');

  if (isPdf) {
    return (
      <iframe
        src={url}
        className="w-full h-full border-none rounded-lg"
        title="File Preview"
      />
    );
  }

  // Fallback to Image
  return (
    <img
      src={url}
      alt="Receipt"
      className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
        toast.error("Failed to render image.");
      }}
    />
  );
};

// --- 2. The Modal Wrapper (Used in ReviewPage) ---
export const FilePreviewModal = ({ open, onClose, url, fileName }: FilePreviewModalProps) => {
  const handleOpenNewTab = () => {
    if (url) window.open(url, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: "!rounded-2xl !h-[85vh]" }}
    >
      <DialogTitle className="flex justify-between items-center border-b p-4 bg-white">
        <div className="flex items-center gap-2 overflow-hidden w-full">
          <Typography variant="h6" className="font-bold text-gray-700 truncate max-w-[80%]">
            {fileName}
          </Typography>
        </div>
        <div className="flex gap-2 shrink-0">
          {url && (
            <IconButton onClick={handleOpenNewTab} size="small" title="Open in new tab">
              <Visibility fontSize="small" />
            </IconButton>
          )}
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent className="p-0 bg-gray-100 flex justify-center items-center h-full overflow-hidden relative">
        <div className="w-full h-full p-4 flex items-center justify-center">
          <FileRenderer url={url} fileName={fileName} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
