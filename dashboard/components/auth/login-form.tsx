'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  discord: {
    allowDiscordAuth: boolean;
  };
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [columns, setColumns] = useState<Array<{ displayName: string; discordId: string }>>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUserMappings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadUserMappings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/user-mappings`);
      if (response.ok) {
        const data = await response.json();
        // Map to display names for dropdown
        const mappedUsers = data.mappings.map((m: any) => ({
          displayName: m.displayName,
          discordId: m.discordId,
        }));
        setColumns(mappedUsers);
      }
    } catch (error) {
      console.error('Failed to load user mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Get JWT token for user
      const response = await fetch(`${BOT_API_URL}/api/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: selectedUser }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Import auth helpers
        const { setAuthToken, setUser } = await import('@/lib/auth');
        
        // Store token and user info
        setAuthToken(data.token);
        setUser(data.user);
        
        // Also keep selectedUser for backwards compatibility
        localStorage.setItem('selectedUser', selectedUser);
        
        toast.success('Login successful!');
        router.push('/');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to connect to server');
    }
  };

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/auth/discord`);
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to initiate Discord login');
        setDiscordLoading(false);
      }
    } catch (error) {
      console.error('Discord login error:', error);
      toast.error('Failed to connect to authentication server');
      setDiscordLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="animate-scaleIn">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            {settingsLoading 
              ? 'Loading...'
              : settings?.discord?.allowDiscordAuth 
                ? 'Sign in with Discord to continue' 
                : 'Choose your player profile to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !settings?.discord?.allowDiscordAuth ? (
            <form onSubmit={handleUserSelect}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user-select">Player name</FieldLabel>
                  <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loading}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {columns.map((user) => (
                        <SelectItem key={user.discordId} value={user.displayName}>
                          {user.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!selectedUser || loading}
                  >
                    {loading ? 'Loading...' : 'Continue'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <FieldGroup>
              <Field>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleDiscordLogin}
                  disabled={discordLoading}
                >
                  {discordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0)">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
                        </g>
                        <defs>
                          <clipPath id="clip0">
                            <rect width="71" height="55" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                      Continue with Discord
                    </>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
