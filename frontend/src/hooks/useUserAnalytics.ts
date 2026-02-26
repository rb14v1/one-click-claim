// src/hooks/useUserAnalytics.ts
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';

export const useUserAnalytics = (range: string) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalAmount: 0, totalReceipts: 0, failedReceipts: 0 });
    const [volumeData, setVolumeData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [trendData, setTrendData] = useState([]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/analytics`, {
                params: { range },
            });

            const data = response.data;
            setStats(data.stats || { totalAmount: 0, totalReceipts: 0, failedReceipts: 0 });
            setVolumeData(data.volumeData || []);
            setStatusData(data.statusData || []);
            setTrendData(data.monthlyTrend || []);
        } catch (error) {
            console.error("Error fetching user analytics:", error);
            toast.error("Failed to load user analytics data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [range]);

    return { stats, volumeData, statusData, trendData, loading, refetch: fetchAnalytics };
};