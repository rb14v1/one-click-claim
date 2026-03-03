// src/hooks/useSuccessState.ts
import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { checkSyncStatus } from '../api/client';

export const useSuccessState = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Retrieve data passed from ReviewPage
  const { results = [], totalAmount = 0, itemCount = 0 } = location.state || {};
  
  // States
  const [step, setStep] = useState<4 | 5>(4);
  const [batches, setBatches] = useState<any[]>(results);
  const hasStartedPolling = useRef(false);

  useEffect(() => {
    if (step !== 5) return;
    if (hasStartedPolling.current) return;
    hasStartedPolling.current = true;

    const pollSingleBatch = async (batch: any, index: number) => {
      if (!batch.interface_run_id || (batch.import_status !== 'Pending' && batch.import_status)) return;

      // Update UI to show active polling
      setBatches(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], import_status: 'Polling...' };
        return copy;
      });

      let isDone = false;
      let attempt = 0;
      const maxRetries = 3; // The fix we discussed!

      while (!isDone && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempt++;

        try {
          const data = await checkSyncStatus(batch.interface_run_id);
          const currentStatus = data.status || 'Pending';
          const lowerStatus = currentStatus.toLowerCase();
          const terminalStates = ['completed', 'error', 'failed', 'partially completed', 'errored','ready', 'success'];

          if (terminalStates.includes(lowerStatus)) {
            setBatches(prev => {
              const copy = [...prev];
              copy[index] = { ...copy[index], import_status: currentStatus, import_message: data.message };
              return copy;
            });
            isDone = true;
          } else if (attempt >= maxRetries) {
            setBatches(prev => {
              const copy = [...prev];
              copy[index] = { 
                ...copy[index], 
                import_status: currentStatus, 
                import_message: data.message || 'Salesforce returned empty data after 3 checks. Verify in Kantata.' 
              };
              return copy;
            });
            isDone = true;
          }
        } catch (err) {
          console.error(`Polling died on batch ${index}`, err);
          isDone = true;
        }
      }
    };

    Promise.all(results.map((batch: any, index: number) => pollSingleBatch(batch, index)));

  }, [results, step]);

  const handleOpenLink = (url: string) => {
    if (url) window.open(url, '_blank');
    else toast.error("No tracking URL available");
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Run ID copied!");
  };

  // Expose everything the UI needs
  return {
    step,
    setStep,
    batches,
    totalAmount,
    itemCount,
    handleOpenLink,
    handleCopyId,
    navigate
  };
};