// src/components/DownloadMenu.tsx
import React, { useState } from "react";
import { Button, Menu, MenuItem, Fade } from "@mui/material";
import { CloudDownload } from '@mui/icons-material';
import { generateExcelReport, generateWordReport } from "../utils/exportUtils";

interface DownloadMenuProps {
  data: any;
  range: string;
  kpiElementId: string;
  chartsElementId: string;
}

export const DownloadMenu: React.FC<DownloadMenuProps> = ({
  data,
  range,
  kpiElementId,
  chartsElementId
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleCloseMenu = () => setAnchorEl(null);

  const handleExcelClick = () => {
    generateExcelReport(data, range);
    handleCloseMenu();
  };

  const handleWordClick = () => {
    generateWordReport(range, kpiElementId, chartsElementId);
    handleCloseMenu();
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<CloudDownload />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className="!text-slate-500 !border-slate-200 hover:!bg-slate-50 !normal-case"
      >
        Download
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        TransitionComponent={Fade}
      >
        <MenuItem onClick={handleExcelClick} className="!text-xs">Download as Excel</MenuItem>
        <MenuItem onClick={handleWordClick} className="!text-xs">Download as Word</MenuItem>
      </Menu>
    </>
  );
};