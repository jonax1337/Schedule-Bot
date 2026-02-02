"use client";

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '@/lib/auth';
import { BOT_API_URL } from '@/lib/config';

export function useSidebarUserInfo(userName: string | null) {
  const [userRole, setUserRole] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userName) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/user-mappings`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const mapping = data.mappings?.find((m: any) => m.displayName === userName);
        if (mapping) {
          setUserRole(mapping.role || '');
          setAvatarUrl(mapping.avatarUrl || null);
        }
      } catch {
        // silent
      }
    };
    fetchInfo();
  }, [userName]);

  return { userRole, avatarUrl };
}

export function useSidebarNavigation(basePath: string) {
  const [currentTab, setCurrentTab] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setCurrentTab(tab);
  }, []);

  const handleNavigation = (tab: string) => {
    setCurrentTab(tab);
    window.history.pushState({}, '', `${basePath}?tab=${tab}`);
  };

  return { currentTab, setCurrentTab, handleNavigation };
}
