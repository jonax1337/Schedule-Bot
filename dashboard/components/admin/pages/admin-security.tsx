'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { stagger, microInteractions } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { BOT_API_URL } from "@/lib/config";

export function Security() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // JWT Secret state
  const [generatedJwtSecret, setGeneratedJwtSecret] = useState('');
  const [generatingJwt, setGeneratingJwt] = useState(false);
  const [copiedJwt, setCopiedJwt] = useState(false);

  const handleGenerateHash = async () => {
    if (!newPassword) {
      toast.error('Please enter a password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setGenerating(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/admin/generate-password-hash`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedHash(data.hash);
        toast.success('Password hash generated successfully!');
      } else {
        toast.error('Failed to generate password hash');
      }
    } catch (error) {
      console.error('Failed to generate hash:', error);
      toast.error('Failed to generate password hash');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(generatedHash);
    setCopied(true);
    toast.success('Hash copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateJwtSecret = async () => {
    setGeneratingJwt(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/admin/generate-jwt-secret`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedJwtSecret(data.secret);
        toast.success('JWT Secret generated successfully!');
      } else {
        toast.error('Failed to generate JWT Secret');
      }
    } catch (error) {
      console.error('Failed to generate JWT secret:', error);
      toast.error('Failed to generate JWT Secret');
    } finally {
      setGeneratingJwt(false);
    }
  };

  const handleCopyJwtSecret = () => {
    navigator.clipboard.writeText(generatedJwtSecret);
    setCopiedJwt(true);
    toast.success('JWT Secret copied to clipboard!');
    setTimeout(() => setCopiedJwt(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className={stagger(0, 'fast', 'slideUpScale')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Admin Password Hash Generator
          </CardTitle>
          <CardDescription>
            Generate a new bcrypt hash for the admin password. This hash should be added to your .env file as ADMIN_PASSWORD_HASH.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new admin password"
                className={cn("pr-10", microInteractions.focusRing)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new admin password"
                className={cn("pr-10", microInteractions.focusRing)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGenerateHash}
            disabled={generating || !newPassword || !confirmPassword}
            className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Hash...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Generate Password Hash
              </>
            )}
          </Button>

          {generatedHash && (
            <div className={cn("space-y-2 p-4 bg-muted rounded-lg", "animate-fadeIn")}>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Generated Hash:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHash}
                  className={cn("h-8", microInteractions.activePress)}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <code className="block p-3 bg-background rounded border text-xs break-all">
                {generatedHash}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={stagger(1, 'fast', 'slideUpScale')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            JWT Secret Generator
          </CardTitle>
          <CardDescription>
            Generate a secure random JWT secret for token signing. This secret should be added to your .env file as JWT_SECRET.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateJwtSecret}
            disabled={generatingJwt}
            className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
          >
            {generatingJwt ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Secret...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Generate JWT Secret
              </>
            )}
          </Button>

          {generatedJwtSecret && (
            <div className={cn("space-y-2 p-4 bg-muted rounded-lg", "animate-fadeIn")}>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Generated Secret:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyJwtSecret}
                  className={cn("h-8", microInteractions.activePress)}
                >
                  {copiedJwt ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <code className="block p-3 bg-background rounded border text-xs break-all">
                {generatedJwtSecret}
              </code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
