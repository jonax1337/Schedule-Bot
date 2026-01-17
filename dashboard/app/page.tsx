'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface SheetColumn {
  column: string;
  name: string;
  index: number;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export default function HomePage() {
  const router = useRouter();
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColumns();
  }, []);

  const loadColumns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/sheet-columns`);
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      localStorage.setItem('selectedUser', selectedUser);
      router.push('/user');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 max-w-md">
        <div className="flex items-center justify-end mb-8">
          <ThemeToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Player Login
            </CardTitle>
            <CardDescription>
              Select your name to set your availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUserSelect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">Your Name</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loading}>
                  <SelectTrigger id="user-select" className="w-full">
                    <SelectValue placeholder="Select your name..." />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {columns.map((col) => (
                      <SelectItem key={col.column} value={col.name}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit"
                className="w-full" 
                disabled={!selectedUser || loading}
              >
                Continue
              </Button>
            </form>

            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <button
                  type="button"
                  onClick={() => router.push('/admin/login')}
                  className="bg-card px-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  Admin Login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
