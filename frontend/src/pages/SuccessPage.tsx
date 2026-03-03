// src/pages/SuccessPage.tsx
import { Button, Tooltip, CircularProgress } from '@mui/material';
import {
  OpenInNew, CheckCircle,
  FactCheckOutlined, ReceiptLong, ContentCopy, ErrorOutline,
  PlayArrow, Send
} from '@mui/icons-material';
import { MainLayout } from '../layout/MainLayout';
import { Toaster } from 'react-hot-toast';
import { ProgressBar } from '../components/ProgressBar';
import { useSuccessState } from '../hooks/useSuccessState';
 
const SuccessPage = () => {
  const { 
    step, setStep, batches, totalAmount, itemCount, 
    handleOpenLink, handleCopyId, navigate 
  } = useSuccessState();
 
  return (
    <MainLayout>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <ProgressBar currentStep={step} isFinished={step === 5} />
 
      <div className="flex-1 flex flex-col items-center justify-start p-6 font-sans">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#21b0be]"></div>
 
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm ring-1 ring-teal-100">
              {step === 4 ? <Send className="!text-[#21b0be] !text-4xl ml-1" /> : <CheckCircle className="!text-[#21b0be] !text-5xl" />}
            </div>
 
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {step === 4 ? 'Claim Processing' : 'Claim Processed'}
            </h1>
            <p className="text-gray-500 mb-8 text-base">
              {step === 4
                ? "Your claim has been sent Kantata. Click validate to check the sync status."
                : "Do not refresh or close the window until the final success message is displayed."}
            </p>
 
            {/* --- STATS GRID --- */}
            {step === 5 && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Amount</div>
                  <div className="text-[#21b0be] text-2xl font-bold">
                    €{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Receipts Processed</div>
                  <div className="text-gray-700 text-2xl font-bold">{itemCount}</div>
                </div>
              </div>
            )}
 
            <div className="text-left mb-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <ReceiptLong className="text-gray-400 text-sm" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Kantata Sync Status</span>
              </div>
 
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {batches.length > 0 ? (
                  batches.map((batch: any, index: number) => {
                    const displayStatus = step === 4 ? 'Pending Validation' : (batch.import_status || batch.status || 'Pending');
                    const isSuccess = displayStatus === 'ready' || displayStatus === 'Completed' || (displayStatus === 'success' && displayStatus !== 'Polling...');
                    const isPolling = displayStatus === 'Polling...';
 
                    let badgeColor = 'bg-gray-50 text-gray-500 border-gray-200';
                    if (isSuccess) badgeColor = 'bg-green-50 text-green-700 border-green-200';
                    else if (isPolling) badgeColor = 'bg-teal-50 text-teal-700 border-blue-200 animate-pulse';
                    else if (displayStatus === 'Failed' || displayStatus === 'Error') badgeColor = 'bg-red-50 text-red-700 border-red-200';
 
                    return (
                      <div key={index} className="flex flex-col p-4 bg-white border border-gray-200 rounded-xl transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col overflow-hidden mr-3">
                            <span className="text-sm font-bold text-gray-800 truncate">
                              {batch.activity || 'Unassigned Activity'}
                            </span>
 
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                ID: {batch.interface_run_id || 'PENDING'}
                              </span>
                              {batch.interface_run_id && (
                                <Tooltip title="Copy Run ID">
                                  <ContentCopy onClick={() => handleCopyId(batch.interface_run_id)} className="text-gray-300 hover:text-gray-500 cursor-pointer !w-3 !h-3" />
                                </Tooltip>
                              )}
                              {step === 5 && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badgeColor}`}>
                                  {isPolling && <CircularProgress size={10} className="!text-blue-700" />}
                                  {displayStatus}
                                </span>
                              )}
                            </div>
                          </div>
                         
                          {step === 5 && (
                            <Button
                              onClick={() => handleOpenLink(batch.target_url)}
                              variant="contained" disabled={!batch.target_url} endIcon={<OpenInNew />}
                              className={`!rounded-lg !px-4 !py-2 !text-xs !font-bold !normal-case !shadow-none hover:!shadow-md transition-all ${!batch.target_url ? '!bg-gray-100 !text-gray-400' : '!bg-[#21b0be] hover:!bg-[#159da9] !text-white'}`}
                            >
                              Track
                            </Button>
                          )}
                        </div>
 
                        {step === 5 && (batch.import_message || batch.error) && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                            <ErrorOutline className="text-red-500 !w-4 !h-4 mt-0.5 shrink-0" />
                            <span className="text-xs text-red-700 font-medium break-words">
                              <strong className="font-bold">Message: </strong>{batch.import_message || batch.error}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-4 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 text-sm">
                    Saved to Database, but no Kantata batches were generated.
                  </div>
                )}
              </div>
            </div>
 
            {step === 4 ? (
              <Button fullWidth onClick={() => setStep(5)} variant="contained" className="!py-3 !rounded-xl !bg-[#21b0be] hover:!bg-[#159da9] !text-white !font-bold !text-base !normal-case flex items-center gap-2">
                <PlayArrow /> Validate Sync Status
              </Button>
            ) : (
              <Button fullWidth onClick={() => navigate('/uploadpage')} variant="outlined" className="!py-3 !rounded-xl !border-gray-300 !text-gray-600 hover:!bg-gray-50 hover:!border-gray-400 !font-bold !text-base !normal-case flex items-center gap-2">
                <FactCheckOutlined /> Scan More Receipts
              </Button>
            )}
 
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
 
export default SuccessPage;