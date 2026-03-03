import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import { Assessment } from '@mui/icons-material';
 
// --- IMPORTS ---
import versionLogo from '../assets/Version1-Logo.png';
import claimLogo from '../assets/logo.png';
 
export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
 
  // Hide the analytics button if we are already on the analytics page
  const isAnalyticsPage = location.pathname === '/analytics';
 
  return (
    <header className="sticky top-0 z-50 w-full px-6 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300 h-[72px] flex items-center">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
 
        {/* --- LEFT: LOGO SECTION --- */}
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => navigate('/')}
        >
          {/* First Logo (Version 1) */}
          <img
            src={versionLogo}
            alt="Version 1"
            className="h-8 w-auto object-contain"
          />
 
          {/* Vertical Divider */}
          <div className="h-8 w-px bg-gray-300/50"></div>
 
          {/* Second Logo (1ClickClaim) */}
          <img
            src={claimLogo}
            alt="1ClickClaim"
            className="h-10 w-auto object-contain"
          />
        </div>
 
        {/* --- RIGHT: ACTIONS --- */}
        <div className="flex items-center gap-4">
 
          {/* Analytics Button with Tooltip */}
          {!isAnalyticsPage && (
            <Tooltip title="Analytics" arrow>
              <IconButton
                onClick={() => navigate('/analytics')}
                size="small"
                className="!text-gray-400 hover:!text-[#21b0be] hover:!bg-[#21b0be]/10 !transition-all"
              >
                <Assessment className="!w-6 !h-6" />
              </IconButton>
            </Tooltip>
          )}
 
        </div>
      </div>
    </header>
  );
};
 