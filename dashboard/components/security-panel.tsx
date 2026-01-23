'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, RefreshCw, Key, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export function SecurityPanel() {
  const [newPassword, setNewPassword] = useState('');
  const [generatedSalt, setGeneratedSalt] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [customSalt, setCustomSalt] = useState('');
  const [passwordForCustomSalt, setPasswordForCustomSalt] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSalt = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/admin/security/generate-salt`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedSalt(data.salt);
        toast.success('New salt generated!');
      } else {
        toast.error('Failed to generate salt');
      }
    } catch (error) {
      console.error('Error generating salt:', error);
      toast.error('Failed to generate salt');
    } finally {
      setLoading(false);
    }
  };

  const generateHashWithCurrentSalt = async () => {
    if (!newPassword) {
      toast.error('Please enter a password');
      return;
    }

    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/admin/security/hash-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedHash(data.hash);
        toast.success('Password hash generated with current salt!');
      } else {
        toast.error('Failed to generate hash');
      }
    } catch (error) {
      console.error('Error generating hash:', error);
      toast.error('Failed to generate hash');
    } finally {
      setLoading(false);
    }
  };

  const generateHashWithCustomSalt = async () => {
    if (!passwordForCustomSalt || !customSalt) {
      toast.error('Please enter both password and salt');
      return;
    }

    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/admin/security/hash-password-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          password: passwordForCustomSalt,
          salt: customSalt 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedHash(data.hash);
        toast.success('Password hash generated with custom salt!');
      } else {
        toast.error('Failed to generate hash');
      }
    } catch (error) {
      console.error('Error generating hash:', error);
      toast.error('Failed to generate hash');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Generate New Salt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Generate New Salt
          </CardTitle>
          <CardDescription>
            Generate a new random salt for password hashing. Update your .env file with the new salt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generateSalt} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Generate New Salt
          </Button>

          {generatedSalt && (
            <div className="space-y-2">
              <Label>Generated Salt</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedSalt}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedSalt, 'Salt')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add this to your .env file as: PASSWORD_SALT={generatedSalt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Hash Password with Current Salt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Hash Password with Current Salt
          </CardTitle>
          <CardDescription>
            Generate a password hash using the current salt from your .env file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <Button onClick={generateHashWithCurrentSalt} disabled={loading || !newPassword}>
            <Lock className="mr-2 h-4 w-4" />
            Generate Hash
          </Button>

          {generatedHash && (
            <div className="space-y-2">
              <Label>Generated Hash</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedHash}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedHash, 'Hash')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add this to your .env file as: ADMIN_PASSWORD_HASH={generatedHash}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Hash Password with Custom Salt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Hash Password with Custom Salt
          </CardTitle>
          <CardDescription>
            Generate a password hash using a custom salt (e.g., the newly generated salt above).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customSalt">Custom Salt</Label>
            <Input
              id="customSalt"
              type="text"
              value={customSalt}
              onChange={(e) => setCustomSalt(e.target.value)}
              placeholder="Enter custom salt"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordForCustomSalt">Password</Label>
            <Input
              id="passwordForCustomSalt"
              type="password"
              value={passwordForCustomSalt}
              onChange={(e) => setPasswordForCustomSalt(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <Button 
            onClick={generateHashWithCustomSalt} 
            disabled={loading || !passwordForCustomSalt || !customSalt}
          >
            <Lock className="mr-2 h-4 w-4" />
            Generate Hash with Custom Salt
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-sm">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• After generating a new salt, you must update your .env file with both the new salt AND a new password hash.</p>
          <p>• The password hash must be generated with the same salt that is in your .env file.</p>
          <p>• Restart the bot after updating the .env file for changes to take effect.</p>
          <p>• Keep your salt and password hash secure - never commit them to version control.</p>
        </CardContent>
      </Card>
    </div>
  );
}
