import toast from 'react-hot-toast';
import type { Toast } from 'react-hot-toast';
import { IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

export const LargeFileToast = ({ t }: { t: Toast }) => {
    return (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-xl pointer-events-auto flex items-center p-3 ring-1 ring-black/5 border-l-4 border-[#21b0be] transition-all duration-300`}>

            <div className="flex-shrink-0 mr-3 text-lg">
                🗜️
            </div>

            <div className="flex-1">
                <p className="text-[13px] text-gray-700 font-medium m-0 leading-snug">
                    Files over <strong>120KB</strong> will be auto-compressed to save space.
                </p>
            </div>

            <div className="ml-2 flex-shrink-0">
                <IconButton
                    size="small"
                    onClick={() => toast.dismiss(t.id)}
                    className="!text-gray-400 hover:!bg-gray-100 transition-colors"
                >
                    <Close fontSize="small" className="!w-4 !h-4" />
                </IconButton>
            </div>

        </div>
    );
};