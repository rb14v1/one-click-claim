// src/pages/ReviewPage.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom';
import {
    Button, TextField, MenuItem, Paper, InputAdornment, Divider,
    List, ListItemText, ListItemIcon, Collapse, ListItemButton, Typography,
    Dialog, DialogContent, DialogTitle, IconButton, Tooltip
} from '@mui/material';
import {
    Category, Storefront,
    LocalOffer, ExpandLess, ExpandMore, MapOutlined,
    PeopleAltOutlined, AttachMoney, CommuteOutlined, CheckCircleOutline,
    WarningAmber, DoneAll, ReceiptLongOutlined, Visibility, Close,
    ErrorOutline, ArrowBack
} from '@mui/icons-material';
import { MainLayout } from '../layout/MainLayout';
import { Toaster } from 'react-hot-toast';
import { ProgressBar } from '../components/ProgressBar';
import { FilePreviewModal } from '../components/FileViewer';
import { useReviewState } from '../hooks/useReviewState';

import { ACTIVITIES, EXPENSE_CATEGORIES, TAX_RATES } from '../constants/expenseConstants';

export const ReviewPage = () => {
    const navigate = useNavigate();
    const {
        receipts, rejectedItems, selectedId, isSubmitting, isSuccess, reportName, openActivities, previewOpen, failedModalOpen,
        currentReceipt, groupedReceipts, activityNames, currentActivityName, currentActivityList, currentIndexInActivity,
        totalReceipts, validatedCount, pendingCount, failedCount, totalAmount, isAllValidated, isAbsoluteLast,
        isMileageGroup, isAttendeeGroup, showFinancials, showLocationInputs,
        dynamicCurrencies, calcExchangeRate, reimbAmount, selectedCurrency, targetCurrency,
        setSelectedId, setPreviewOpen, setFailedModalOpen, handleInputChange, toggleActivityGroup, handleValidateAndNext, handlePreview, handleSubmit
    } = useReviewState();

    const hasVal = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';

    // Dynamic validation check for the currently active receipt
    const d = currentReceipt?.data || {};
    const canValidate = Boolean(
        hasVal(d.activity) &&
        hasVal(d.category) &&
        hasVal(d.date) &&
        hasVal(d.merchant_name) &&
        (!isMileageGroup || hasVal(d.mileage)) &&
        (!showFinancials || (hasVal(d.currency) && hasVal(d.total_amount) && hasVal(d.tax_rate))) &&
        (!showLocationInputs || (hasVal(d.start_location) && hasVal(d.end_location))) &&
        (!isAttendeeGroup || hasVal(d.attendees))
    );

    // 1. Initial Loading
    if (receipts.length === 0 && rejectedItems.length === 0) {
        return (
            <MainLayout>
                <div className="p-10 flex justify-center text-gray-400 font-bold">Loading data...</div>
            </MainLayout>
        );
    }

    // 2. Empty State (Only Rejected Items)
    if (receipts.length === 0 && rejectedItems.length > 0) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
                        <ErrorOutline className="!text-[48px]" />
                    </div>
                    <Typography variant="h5" className="font-bold text-gray-800 mb-2">No Valid Receipts Found</Typography>
                    <Typography className="text-gray-500 max-w-md mb-8">
                        We couldn't identify any valid financial receipts in your upload. Please check the rejected files list for details.
                    </Typography>
                    <div className="flex gap-4">
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/uploadpage')} className="!border-gray-300 !text-gray-600 !rounded-xl !px-6 !py-3 !normal-case !font-bold">
                            Back to Upload
                        </Button>
                        <Button variant="contained" onClick={() => setFailedModalOpen(true)} className="!bg-red-500 hover:!bg-red-600 !text-white !rounded-xl !px-6 !py-3 !normal-case !font-bold">
                            View Rejected Files ({rejectedItems.length})
                        </Button>
                    </div>

                    <Dialog open={failedModalOpen} onClose={() => setFailedModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ className: "!rounded-2xl" }}>
                        <DialogTitle className="flex justify-between items-center border-b p-4 bg-red-50">
                            <div className="flex items-center gap-2 text-red-700">
                                <ErrorOutline />
                                <Typography variant="h6" className="font-bold">Rejected Files</Typography>
                            </div>
                            <IconButton onClick={() => setFailedModalOpen(false)} size="small"><Close /></IconButton>
                        </DialogTitle>
                        <DialogContent className="p-4">
                            <List>
                                {rejectedItems.map((item, index) => (
                                    <div key={index} className="mb-2 border border-red-100 bg-red-50/50 rounded-lg p-3">
                                        <div className="font-semibold text-sm text-gray-800 break-all">{item.filename}</div>
                                        <div className="text-xs text-red-600 mt-1">{item.reason}</div>
                                    </div>
                                ))}
                            </List>
                        </DialogContent>
                    </Dialog>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

            <div className="flex flex-col px-6 pb-12 max-w-[1600px] mx-auto w-full min-h-screen">
                <ProgressBar currentStep={3} />

                {/* SUMMARY STATS */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl hover:shadow-md transition-all p-6 flex flex-col justify-center items-center">
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-4xl">{totalReceipts}</Typography>
                        <Typography variant="body2" className="text-gray-600 font-bold uppercase tracking-wider text-xs">Total Receipts</Typography>
                    </div>
                    <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-xl hover:shadow-md transition-all p-6 flex flex-col justify-center items-center">
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-4xl">{validatedCount}</Typography>
                        <Typography variant="body2" className="text-green-800 font-bold uppercase tracking-wider text-xs">Validated</Typography>
                    </div>
                    <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl hover:shadow-md transition-all p-6 flex flex-col justify-center items-center">
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-4xl">{pendingCount}</Typography>
                        <Typography variant="body2" className="text-amber-800 font-bold uppercase tracking-wider text-xs">Needs Review</Typography>
                    </div>
                    <div
                        onClick={() => failedCount > 0 && setFailedModalOpen(true)}
                        className={`bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl transition-all p-6 flex flex-col justify-center items-center ${failedCount > 0 ? 'cursor-pointer hover:shadow-md hover:bg-red-100' : ''}`}
                    >
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-4xl">{failedCount}</Typography>
                        <Typography variant="body2" className="text-red-800 font-bold uppercase tracking-wider text-xs">Failed to Load</Typography>
                    </div>
                    <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl hover:shadow-md transition-all p-6 flex flex-col justify-center items-center">
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-2xl lg:text-3xl text-center break-all">
                            {totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                        </Typography>
                        <Typography variant="body2" className="text-blue-800 font-bold uppercase tracking-wider text-xs">Total Amount</Typography>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* SIDEBAR */}
                    <Paper elevation={0} className="w-full lg:w-1/4 flex flex-col bg-white border border-gray-200 rounded-xl h-fit shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <ReceiptLongOutlined className="text-[#21b0be]" />
                            <h2 className="font-bold text-gray-700">Activities</h2>
                        </div>
                        <div className="p-2">
                            <List component="nav">
                                {activityNames.map((activityName) => (
                                    <div key={activityName} className="mb-2 bg-white border border-gray-100 rounded-lg overflow-hidden">
                                        <ListItemButton onClick={() => toggleActivityGroup(activityName)} className="bg-gray-50/50 hover:bg-gray-100 !py-2">
                                            <ListItemIcon className="min-w-[32px]"><LocalOffer fontSize="small" className="text-[#21b0be]" /></ListItemIcon>
                                            <ListItemText primary={activityName} primaryTypographyProps={{ className: '!text-[0.85rem] !font-semibold !text-gray-700' }} />
                                            {openActivities[activityName] ? <ExpandLess fontSize="small" className="text-gray-400" /> : <ExpandMore fontSize="small" className="text-gray-400" />}
                                        </ListItemButton>
                                        <Collapse in={openActivities[activityName]} timeout="auto" unmountOnExit>
                                            <List component="div" disablePadding className="bg-white">
                                                {groupedReceipts[activityName].map((receipt) => {
                                                    const isSelected = selectedId === receipt.id;
                                                    const isValidated = receipt.status === 'validated';
                                                    return (
                                                        <React.Fragment key={receipt.id}>
                                                            {/* Clean, edge-to-edge teal highlight */}
                                                            <ListItemButton
                                                                onClick={() => setSelectedId(receipt.id)}
                                                                className={`!py-3 transition-all ${isSelected
                                                                    ? '!pl-[36px] !bg-[#EAF6F8] !border-l-4 !border-[#21b0be]'
                                                                    : '!pl-10 !border-l-4 !border-transparent hover:!bg-gray-50'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3 w-full overflow-hidden">
                                                                    {isValidated ? (
                                                                        <CheckCircleOutline className={`!text-[18px] shrink-0 ${isSelected ? '!text-green-600' : '!text-green-500'}`} />
                                                                    ) : (
                                                                        <WarningAmber className={`!text-[18px] shrink-0 ${isSelected ? '!text-orange-500' : '!text-orange-400'}`} />
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className={`text-xs truncate ${isSelected ? '!text-black font-bold' : '!text-gray-600 font-medium'}`}>
                                                                            {receipt.fileName}
                                                                        </span>
                                                                        <span className={`text-[10px] truncate ${isSelected ? '!text-gray-800 font-semibold' : '!text-gray-400'}`}>
                                                                            {receipt.data.total_amount ? `€${receipt.data.total_amount}` : 'No Amount'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </ListItemButton>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    </div>
                                ))}
                            </List>
                        </div>
                    </Paper>

                    {/* MAIN EDITOR PANEL */}
                    <div className="w-full lg:w-3/4 flex flex-col gap-4">
                        <div className="flex flex-col">
                            <Typography
                                variant="caption"
                                className="text-gray-400 uppercase font-bold text-[11px] tracking-widest mb-1 ml-1"
                            >
                                Name
                            </Typography>

                            <div className="flex items-center justify-between py-2">
                                <Typography variant="h6" className="text-gray-700 font-bold">
                                    {reportName}
                                </Typography>

                                <div className="flex items-center gap-2">
                                    <Tooltip title="Preview Receipt Image">
                                        <IconButton
                                            onClick={handlePreview}
                                            className="!bg-teal-50 hover:!bg-teal-100 !text-[#21b0be]"
                                        >
                                            <Visibility />
                                        </IconButton>
                                    </Tooltip>

                                    <div
                                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors duration-300 ${currentReceipt.status === 'validated'
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : 'bg-orange-100 text-orange-700 border-orange-200'
                                            }`}
                                    >
                                        {currentReceipt.status === 'validated'
                                            ? 'Validated'
                                            : 'Please review before claiming'}
                                    </div>
                                </div>
                            </div>
                        </div>


                        <Paper elevation={0} className="w-full flex flex-col bg-white border border-gray-200 rounded-xl h-fit shadow-sm overflow-hidden">
                            <div className="p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Receipt Details</span>
                                </div>
                                <Divider className="!mb-8" />
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <TextField select label="Activity" value={currentReceipt.data.activity || ''} onChange={(e) => handleInputChange('activity', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }}>
                                            {ACTIVITIES.map((act) => <MenuItem key={act} value={act}>{act}</MenuItem>)}
                                        </TextField>
                                        <TextField select label="Expense Category" value={currentReceipt.data.category || ''} onChange={(e) => handleInputChange('category', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><Category fontSize="small" className="text-gray-400" /></InputAdornment> }} SelectProps={{ MenuProps: { PaperProps: { className: '!max-h-[300px]' } } }}>
                                            {EXPENSE_CATEGORIES.map((cat) => <MenuItem key={cat} value={cat} className="!text-xs">{cat}</MenuItem>)}
                                        </TextField>
                                    </div>
                                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <TextField
                                            type="date"
                                            label="Incurred Date"
                                            value={currentReceipt.data.date || ''}
                                            onChange={(e) => handleInputChange('date', e.target.value)}
                                            fullWidth
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <div className="md:col-span-2">
                                            <TextField label="Vendor / Merchant" placeholder="Who did you pay?" value={currentReceipt.data.merchant_name || ''} onChange={(e) => handleInputChange('merchant_name', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><Storefront fontSize="small" className="text-gray-400" /></InputAdornment> }} />
                                        </div>
                                    </div>
                                    <div className="md:col-span-12 p-6 bg-teal-50/20 rounded-xl border border-teal-100/50">
                                        {isMileageGroup && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-4 text-[#21b0be] font-bold text-xs uppercase tracking-wide"><CommuteOutlined fontSize="small" /> Mileage Data</div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <TextField label="Distance (Mileage)" placeholder="e.g. 150" value={currentReceipt.data.mileage || ''} onChange={(e) => handleInputChange('mileage', e.target.value)} fullWidth size="small" className="!bg-white" InputLabelProps={{ shrink: true }} />
                                                </div>
                                            </div>
                                        )}
                                        {showFinancials && (
                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 mb-4 text-[#21b0be] font-bold text-xs uppercase tracking-wide"><AttachMoney fontSize="small" /> Financials</div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                                                    {/* INCURRED AMOUNT & CURRENCY */}
                                                    <div className="flex gap-2 col-span-1 xl:col-span-2">
                                                        <TextField select label="Currency" value={currentReceipt.data.currency || 'EUR'} onChange={(e) => handleInputChange('currency', e.target.value)} className="!bg-white w-28 shrink-0" size="small" InputLabelProps={{ shrink: true }}>
                                                            {dynamicCurrencies.map((cur) => <MenuItem key={cur} value={cur}>{cur}</MenuItem>)}
                                                        </TextField>
                                                        <TextField label="Incurred Amount" placeholder="0.00" value={currentReceipt.data.total_amount || ''} onChange={(e) => handleInputChange('total_amount', e.target.value)} fullWidth size="small" className="!bg-white" InputLabelProps={{ shrink: true }} />
                                                    </div>

                                                    {/* TAX */}
                                                    <div className="col-span-1 xl:col-span-2">
                                                        <TextField select label="Tax Rate" value={currentReceipt.data.tax_rate || ''} onChange={(e) => handleInputChange('tax_rate', e.target.value)} fullWidth className="!bg-white" size="small" InputLabelProps={{ shrink: true }}>
                                                            {TAX_RATES.map((rate) => <MenuItem key={rate} value={rate}>{rate}</MenuItem>)}
                                                        </TextField>
                                                    </div>

                                                    {/* DYNAMIC EXCHANGE RATE UI */}
                                                    <div className="col-span-1 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                                                        <TextField
                                                            label={`Exchange Rate (${selectedCurrency} to ${targetCurrency})`}
                                                            value={calcExchangeRate.toFixed(4)}
                                                            InputProps={{ readOnly: true }}
                                                            fullWidth size="small" className="!bg-white !text-gray-600" InputLabelProps={{ shrink: true }}
                                                        />
                                                        <TextField
                                                            label={`Reimb Amount ${targetCurrency}`}
                                                            value={reimbAmount}
                                                            InputProps={{ readOnly: true }}
                                                            fullWidth size="small" className="!bg-white font-bold" InputLabelProps={{ shrink: true }}
                                                        />
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {showLocationInputs && (
                                                <>
                                                    <TextField label="Start Location" value={currentReceipt.data.start_location || ''} onChange={(e) => handleInputChange('start_location', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><MapOutlined fontSize="small" className="text-gray-400" /></InputAdornment> }} />
                                                    <TextField label="End Location" value={currentReceipt.data.end_location || ''} onChange={(e) => handleInputChange('end_location', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><MapOutlined fontSize="small" className="text-gray-400" /></InputAdornment> }} />
                                                </>
                                            )}
                                            {isAttendeeGroup && (
                                                <div className="md:col-span-2">
                                                    <TextField label="Attendees (Staff/Clients)" value={currentReceipt.data.attendees || ''} onChange={(e) => handleInputChange('attendees', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><PeopleAltOutlined fontSize="small" className="text-gray-400" /></InputAdornment> }} />
                                                </div>
                                            )}
                                            <div className="md:col-span-2">
                                                <TextField label="Description / Notes" multiline rows={3} fullWidth value={currentReceipt.data.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} InputLabelProps={{ shrink: true }} placeholder="Enter description..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                                <div className="text-xs text-gray-400 font-mono hidden sm:block">{currentActivityName} • {currentIndexInActivity + 1} / {currentActivityList.length}</div>
                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    {!(isAbsoluteLast && currentReceipt.status === "validated") && (
                                        <Button
                                            onClick={handleValidateAndNext}
                                            disabled={!canValidate}
                                            disableElevation
                                            className={`
    font-bold px-6 py-3 rounded-xl shadow-sm normal-case transition-all duration-300
    ${canValidate
                                                    ? "bg-brand-teal hover:bg-brand-tealDark text-white"
                                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                }
  `}
                                        >

                                            {currentReceipt.status === "validated"
                                                ? "Next"
                                                : "Validate & Next"}
                                        </Button>
                                    )}


                                    {isAllValidated && (
                                        <Button onClick={handleSubmit} disabled={isSubmitting || isSuccess} variant="contained" startIcon={<DoneAll />} className="!bg-[#21b0be] hover:!bg-[#159da9] !text-white !font-bold !px-8 !py-3 !rounded-xl !shadow-md !normal-case">
                                            {isSubmitting ? 'Processing...' : 'Create Claim'}
                                        </Button>
                                    )}

                                </div>
                            </div>
                        </Paper>
                    </div>
                </div>

                {/* MODALS */}
                <FilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} url={currentReceipt?.data?.blob_url || null} fileName={currentReceipt?.data?.blob_name || 'Receipt'} />

                <Dialog open={failedModalOpen} onClose={() => setFailedModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ className: "!rounded-2xl" }}>
                    <DialogTitle className="flex justify-between items-center border-b p-4 bg-red-50">
                        <div className="flex items-center gap-2 text-red-700"><ErrorOutline /><Typography variant="h6" className="font-bold">Rejected Files</Typography></div>
                        <IconButton onClick={() => setFailedModalOpen(false)} size="small"><Close /></IconButton>
                    </DialogTitle>
                    <DialogContent className="p-4">
                        {rejectedItems.length === 0 ? <div className="text-gray-500 text-center py-4">No rejected files.</div> : (
                            <List>
                                {rejectedItems.map((item, index) => (
                                    <div key={index} className="mb-2 border border-red-100 bg-red-50/50 rounded-lg p-3">
                                        <div className="font-semibold text-sm text-gray-800 break-all">{item.filename}</div>
                                        <div className="text-xs text-red-600 mt-1">{item.reason}</div>
                                    </div>
                                ))}
                            </List>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default ReviewPage;