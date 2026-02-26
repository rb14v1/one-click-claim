// src/hooks/useAdminData.ts
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';

export const useAdminData = (range: string, catPage: number) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        kpis: {}, finance: [], volume: [], users: [], status: [], topUsers: [], categories: { items: [], total_pages: 1 }
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [k, f, v, u, s, users, cats] = await Promise.all([
                apiClient.get(`/analytics/kpis?range=${range}`),
                apiClient.get(`/analytics/graphs?range=${range}&metric=amount`),
                apiClient.get(`/analytics/graphs?range=${range}&metric=count`),
                apiClient.get(`/analytics/graphs?range=${range}&metric=users`),
                apiClient.get(`/analytics/breakdown?type=status&range=${range}`),
                apiClient.get(`/analytics/top-users?range=${range}`),
                apiClient.get(`/analytics/top-categories-detailed?page=${catPage}&range=${range}`),
            ]);

            const cleanGraphData = (arr: any[]) => {
                if (!Array.isArray(arr)) return [];
                return arr
                    .map(d => ({ ...d, value: Number(d.value) || 0, label: d.label || "Unknown" }))
                    .filter(d => d.value > 0);
            };

            const cleanCategories = (cats.data?.items || [])
                .map((c: any) => ({ ...c, total_amount: Number(c.total_amount) || 0, category: c.category || "Unknown" }))
                .filter((c: any) => c.total_amount > 0);

            setData({
                kpis: k.data || {},
                finance: cleanGraphData(f.data),
                volume: cleanGraphData(v.data),
                users: u.data || [],
                status: s.data || [],
                topUsers: users.data || [],
                categories: { ...cats.data, items: cleanCategories }
            });
        } catch (error) {
            console.error("Admin Data load error:", error);
            toast.error("Failed to load admin dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [range, catPage]);

    return { data, loading, refetch: loadData };
};