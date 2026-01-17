'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Calendar, Save, RefreshCw } from 'lucide-react';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface CellEdit {
  row: number;
  column: string;
  value: string;
}

export function ScheduleEditor() {
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadSheetData();
  }, []);

  const loadSheetData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=50`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setHeaders(result.data[0]);
          setData(result.data.slice(1));
        }
      } else {
        toast.error('Failed to load sheet data');
      }
    } catch (error) {
      console.error('Failed to load sheet data:', error);
      toast.error('Failed to load sheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number, currentValue: string) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(currentValue || '');
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    const { row, col } = editingCell;
    const currentValue = data[row]?.[col] || '';

    if (editValue !== currentValue) {
      await saveCell(row + 2, col, editValue); // +2 because: +1 for header, +1 for 1-based indexing
    }

    setEditingCell(null);
  };

  const saveCell = async (row: number, colIndex: number, value: string) => {
    setSaving(true);
    try {
      const columnLetter = String.fromCharCode(65 + colIndex); // A=65
      const response = await fetch(`${BOT_API_URL}/api/sheet-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row,
          column: columnLetter,
          value,
        }),
      });

      if (response.ok) {
        toast.success('Cell updated successfully');
        // Update local data
        setData(prevData => {
          const newData = [...prevData];
          if (!newData[row - 2]) {
            newData[row - 2] = [];
          }
          newData[row - 2][colIndex] = value;
          return newData;
        });
      } else {
        toast.error('Failed to update cell');
      }
    } catch (error) {
      console.error('Failed to update cell:', error);
      toast.error('Failed to update cell');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Editor
            </CardTitle>
            <CardDescription>
              Click any cell to edit directly. Changes are saved automatically.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSheetData}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index} className="font-semibold sticky top-0 bg-background">
                    {header || `Column ${String.fromCharCode(65 + index)}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((_, colIndex) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                    const cellValue = row[colIndex] || '';

                    return (
                      <TableCell
                        key={colIndex}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => !isEditing && handleCellClick(rowIndex, colIndex, cellValue)}
                      >
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-8 min-w-[100px]"
                          />
                        ) : (
                          <span className={cellValue ? '' : 'text-muted-foreground'}>
                            {cellValue || '—'}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {saving && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving changes...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
