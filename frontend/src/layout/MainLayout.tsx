import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface LayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative font-sans text-[#212121]">

            {/* 1. Header Component */}
            <Header />

            {/* 2. Main Content Area */}
            {/* Added 'pb-16' to prevent content from being hidden behind the fixed footer */}
            <main className="flex-1 flex flex-col relative w-full max-w-7xl mx-auto pb-16">
                {children}
            </main>

            {/* 3. Footer Component */}
            <Footer />

        </div>
    );
};