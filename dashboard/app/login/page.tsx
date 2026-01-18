'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface SheetColumn {
  column: string;
  name: string;
  index: number;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [userMappings, setUserMappings] = useState<string[] | null>(null);

  useEffect(() => {
    loadUserMappings();
  }, []);

  useEffect(() => {
    // Load columns once userMappings are loaded (even if empty)
    if (userMappings !== null) {
      loadColumns();
    }
  }, [userMappings]);

  const loadUserMappings = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/user-mappings`);
      if (response.ok) {
        const data = await response.json();
        const mappedColumnNames = data.mappings.map((m: any) => m.sheetColumnName);
        setUserMappings(mappedColumnNames);
      }
    } catch (error) {
      console.error('Failed to load user mappings:', error);
    }
  };

  const loadColumns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/sheet-columns`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show columns with Discord user mappings
        const filteredColumns = data.columns.filter((col: SheetColumn) => 
          !userMappings || userMappings.length === 0 || userMappings.includes(col.name)
        );
        setColumns(filteredColumns);
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
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
                  <SelectContent position="popper" className="w-full">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
