// src/hooks/useReviewState.ts
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { submitClaim, fetchExchangeRates } from '../api/client';
import { CAT_GROUP_MILEAGE, CAT_GROUP_TRANSPORT_LOC, CAT_GROUP_ATTENDEES } from '../constants/expenseConstants';

export const useReviewState = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // --- STATE ---
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

    // Fetch rates on mount
    useEffect(() => {
        const getRates = async () => {
            try {
                const rates = await fetchExchangeRates();
                setExchangeRates(rates);
            } catch (err) {
                console.error("Failed to load rates", err);
            }
        };
        getRates();
    }, []);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [rejectedItems, setRejectedItems] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [reportName, setReportName] = useState('');
    const [openActivities, setOpenActivities] = useState<{ [key: string]: boolean }>({});
    const [previewOpen, setPreviewOpen] = useState(false);
    const [failedModalOpen, setFailedModalOpen] = useState(false);

    // --- DATA LOADING & NORMALIZATION ---
    useEffect(() => {
        const rawState = location.state;
        let incomingGroups: any[] = [];
        let incomingRejected: any[] = [];

        if (rawState) {
            if (rawState.groups) incomingGroups = rawState.groups;
            if (rawState.rejected) incomingRejected = rawState.rejected;
        }

        setRejectedItems(incomingRejected);

        if (incomingRejected.length > 0 && incomingGroups.length === 0) {
            setFailedModalOpen(true);
        }

        if (!incomingGroups || incomingGroups.length === 0) return;

        let globalIdCounter = 0;
        const flatList: any[] = [];
        const activitySet = new Set<string>();

        incomingGroups.forEach((group: any) => {
            const currentActivity = group.activity_name || 'Other';
            activitySet.add(currentActivity);

            if (Array.isArray(group.expenses)) {
                group.expenses.forEach((exp: any) => {
                    flatList.push({
                        id: globalIdCounter++,
                        fileName: exp.blob_name ? exp.blob_name.split('/').pop() : `Receipt ${globalIdCounter}`,
                        status: 'pending',
                        data: {
                            blob_name: exp.blob_name || '',
                            blob_url: exp.blob_url || '',
                            merchant_name: exp.merchant_name || '',
                            date: exp.date || '',
                            category: exp.category || '',
                            currency: exp.currency || 'EUR',
                            description: exp.description || '',
                            total_amount: (exp.total_amount !== null && exp.total_amount !== undefined) ? exp.total_amount : '',
                            mileage: (exp.mileage !== null && exp.mileage !== undefined) ? exp.mileage : '',
                            tax_rate: exp.tax_rate || '',
                            start_location: exp.start_location || '',
                            end_location: exp.end_location || '',
                            attendees: exp.attendees || '',
                            activity: currentActivity
                        }
                    });
                });
            }
        });

        setReceipts(flatList);

        const initialOpenState: any = {};
        let isFirst = true;
        activitySet.forEach(act => {
            initialOpenState[act] = isFirst; // Only open the very first one
            isFirst = false;
        });
        setOpenActivities(initialOpenState);

        if (flatList.length > 0) {
            setSelectedId(flatList[0].id);
            setReportName(incomingGroups[0].report_name || `Expense Report - ${new Date().toISOString().split('T')[0]}`);
        }
    }, [location.state, navigate]);

    // --- COMPUTED PROPERTIES ---
    const currentReceipt = receipts.find(r => r.id === selectedId) || receipts[0];

    const groupedReceipts = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        receipts.forEach(r => {
            const act = r.data.activity || 'Other';
            if (!groups[act]) groups[act] = [];
            groups[act].push(r);
        });
        return groups;
    }, [receipts]);

    const activityNames = useMemo(() => Object.keys(groupedReceipts), [groupedReceipts]);
    const currentActivityName = currentReceipt?.data.activity || 'Other';
    const currentActivityList = groupedReceipts[currentActivityName] || [];
    const currentIndexInActivity = currentActivityList.findIndex(r => r.id === selectedId);

    const totalReceipts = receipts.length;
    const validatedCount = receipts.filter(r => r.status === 'validated').length;
    const pendingCount = receipts.filter(r => r.status === 'pending').length;
    const failedCount = rejectedItems.length;
    const totalAmount = receipts.reduce((sum, r) => sum + (parseFloat(r.data.total_amount) || 0), 0);
    const isAllValidated = totalReceipts > 0 && validatedCount === totalReceipts;

    const isLastInActivity = currentIndexInActivity === currentActivityList.length - 1;
    const currentActivityIndex = activityNames.indexOf(currentActivityName);
    const isLastActivity = currentActivityIndex === activityNames.length - 1;
    const isAbsoluteLast = isLastInActivity && isLastActivity;

    const currentCategory = currentReceipt?.data.category || '';
    const isMileageGroup = CAT_GROUP_MILEAGE.includes(currentCategory);
    const isTransportGroup = CAT_GROUP_TRANSPORT_LOC.includes(currentCategory);
    const isAttendeeGroup = CAT_GROUP_ATTENDEES.includes(currentCategory);
    const showFinancials = !isMileageGroup;
    const showLocationInputs = isMileageGroup || isTransportGroup;

    // --- ACTIONS ---
    // --- DYNAMIC EXCHANGE RATE MATH ---
    const targetCurrency = 'EUR'; // DEFAULT SET TO EUR
    const dynamicCurrencies = Object.keys(exchangeRates).length > 0 ? Object.keys(exchangeRates) : ['EUR', 'USD', 'GBP', 'INR'];
    
    const selectedCurrency = currentReceipt?.data?.currency || 'EUR';
    
    const selectedFactor = exchangeRates[selectedCurrency] || 1;
    const targetFactor = exchangeRates[targetCurrency] || 1; // FALLBACK FACTOR IS NOW 1
    const calcExchangeRate = selectedFactor ? (targetFactor / selectedFactor) : 1;
    
    const incurredAmount = parseFloat(currentReceipt?.data?.total_amount) || 0;
    const reimbAmount = (incurredAmount * calcExchangeRate).toFixed(2);
    
    const handleInputChange = (field: string, value: any) => {
        setReceipts(prev => prev.map(r => r.id === selectedId ? { ...r, data: { ...r.data, [field]: value } } : r));
    };

    const toggleActivityGroup = (activityName: string) => {
        setOpenActivities(prev => ({ ...prev, [activityName]: !prev[activityName] }));
    };

    const handleValidateAndNext = () => {
        const rData = currentReceipt.data;

        if (!rData.date) {
            toast.error("Incurred Date is required for Salesforce.");
            return;
        }
        if (!rData.category) {
            toast.error("Expense Category is required.");
            return;
        }
        if (!rData.merchant_name) {
            toast.error("Vendor / Merchant Name is required.");
            return;
        }
        if (!isMileageGroup && (!rData.total_amount || isNaN(parseFloat(rData.total_amount)))) {
            toast.error("Valid Total Amount is required.");
            return;
        }

        setReceipts(prev => prev.map(r => r.id === selectedId ? { ...r, status: 'validated' } : r));
        toast.success("Receipt Validated", { icon: '✅', duration: 1000 });

        if (!isLastInActivity) {
            setSelectedId(currentActivityList[currentIndexInActivity + 1].id);
            return;
        }

        if (!isLastActivity) {
            const nextActivityName = activityNames[currentActivityIndex + 1];
            setSelectedId(groupedReceipts[nextActivityName][0].id);
            setOpenActivities(prev => ({ ...prev, [currentActivityName]: false, [nextActivityName]: true }));
        }
    };

    const handlePreview = () => {
        if (!currentReceipt?.data?.blob_url) {
            toast.error("Preview unavailable");
            return;
        }
        setPreviewOpen(true);
    };

    const handleSubmit = async () => {
        if (!isAllValidated) {
            toast.error("Please validate all receipts before submitting.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading('Saving Claim...');

        try {
            const groupsMap: { [key: string]: any[] } = {};
            receipts.forEach(r => {
                const act = r.data.activity || 'Other';
                if (!groupsMap[act]) groupsMap[act] = [];

                const cleanFloat = (val: any) => (val === '' || val == null) ? null : (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
                const cleanString = (val: any) => val ? String(val) : "";

                groupsMap[act].push({
                    blob_name: cleanString(r.data.blob_name),
                    blob_url: cleanString(r.data.blob_url),
                    report_name: cleanString(reportName),
                    merchant_name: cleanString(r.data.merchant_name) || "Unknown Merchant",
                    date: cleanString(r.data.date),
                    category: cleanString(r.data.category),
                    currency: cleanString(r.data.currency) || 'GBP',
                    description: cleanString(r.data.description) || r.data.category,
                    total_amount: cleanFloat(r.data.total_amount),
                    mileage: cleanFloat(r.data.mileage),
                    tax_rate: cleanString(r.data.tax_rate),
                    start_location: cleanString(r.data.start_location),
                    end_location: cleanString(r.data.end_location),
                    attendees: cleanString(r.data.attendees)
                });
            });

            const submissionPayload = {
                groups: Object.keys(groupsMap).map(activityName => {
                    const exps = groupsMap[activityName];
                    const totalCost = exps.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

                    return {
                        activity_name: activityName,
                        report_name: reportName,
                        total_activity_cost: totalCost,
                        expenses: exps
                    };
                })
            };

            const response = await submitClaim(submissionPayload);
            setIsSuccess(true);
            toast.success('Claim saved successfully!', { id: toastId });

            setTimeout(() => {
                navigate('/success', {
                    state: { results: response.kantata_sync_results || [], totalAmount, itemCount: totalReceipts }
                });
            }, 1500);

        } catch (error: any) {
            console.error(error);
            toast.error(`Failed: ${error.message}`, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        receipts, rejectedItems, selectedId, isSubmitting, isSuccess, reportName, openActivities, previewOpen, failedModalOpen,
        currentReceipt, groupedReceipts, activityNames, currentActivityName, currentActivityList, currentIndexInActivity,
        totalReceipts, validatedCount, pendingCount, failedCount, totalAmount, isAllValidated, isAbsoluteLast,
        isMileageGroup, isTransportGroup, isAttendeeGroup, showFinancials, showLocationInputs,
        dynamicCurrencies, calcExchangeRate, reimbAmount, selectedCurrency, targetCurrency,
        setSelectedId, setReportName, setPreviewOpen, setFailedModalOpen, handleInputChange, toggleActivityGroup, handleValidateAndNext, handlePreview, handleSubmit
    };
};