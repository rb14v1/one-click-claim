import React from 'react';
import { Check } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
 
interface ProgressBarProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  isLoading?: boolean;
  isFinished?: boolean;
}
 
const steps = [
  "Upload",
  "Scanning",
  "Review",
  "Sent to Kantata",
  "Validation from Kantata"
];
 
export const ProgressBar = ({ currentStep, isLoading = false, isFinished = false }: ProgressBarProps) => {
  return (
    <div className="sticky top-[72px] z-40 w-full bg-white/95 backdrop-blur-sm pt-4 pb-2 mb-2 border-b border-gray-50 shadow-sm">
      {/* --- Sticky wrapper with reduced bottom margin --- */}
      <div className="flex justify-center w-full">
        {/* Increased max-width to allow room for text next to circles */}
        <div className="w-full max-w-6xl flex items-center justify-between px-4">
          {steps.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep || (stepNum === currentStep && isFinished);
            const isActive = stepNum === currentStep && !isFinished;
 
            return (
              <React.Fragment key={label}>
               
                {/* --- Step Container (Horizontal Layout) --- */}
                <div className="flex items-center gap-2 z-10">
                 
                  {/* Step Icon/Circle */}
                  <div className={`
                    w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                    ${isCompleted ? 'bg-[#21b0be] text-white' : ''}
                    ${isActive ? 'bg-white border-2 border-[#21b0be] text-[#21b0be] shadow-md scale-110' : ''}
                    ${!isActive && !isCompleted ? 'bg-white border-2 border-gray-200 text-gray-400' : ''}
                  `}>
                    {isCompleted ? (
                      <Check fontSize="small" />
                    ) : (
                      (isActive && isLoading) ? <CircularProgress size={20} className="!text-[#21b0be]" /> : stepNum
                    )}
                  </div>
 
                  {/* Label - Placed to the RIGHT of the circle */}
                  <span className={`
                    hidden md:block text-[11px] lg:text-xs font-semibold uppercase tracking-wider
                    ${isActive || isCompleted ? 'text-[#21b0be]' : 'text-gray-400'}
                  `}>
                    {label}
                  </span>
 
                </div>
 
                {/* --- Connector Line (Flex stretches to fill gaps horizontally) --- */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-[2px] mx-2 lg:mx-4 overflow-hidden rounded-full bg-gray-100">
                    <div className={`w-full h-full transition-all duration-500 ${stepNum < currentStep ? 'bg-[#21b0be]' : 'bg-transparent'}`} />
                  </div>
                )}
               
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
 