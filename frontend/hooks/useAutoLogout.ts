import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

export const useAutoLogout = (timeoutMs: number = 1800000) => { // Default: 30 minutes
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(() => {
        logout();
        router.push('/');
    }, [router]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(handleLogout, timeoutMs);
    }, [handleLogout, timeoutMs]);

    useEffect(() => {
        // Only activate if authenticated
        const token = localStorage.getItem('token');
        if (!token) return;

        // Events to track activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Reset timer on load
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [resetTimer]);

    return { handleLogout };
};
