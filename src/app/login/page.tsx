'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { useCartStore } from '@/stores/cart-store';
import { authenticateDevice, api, getCurrentTenant, getActiveStores } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Monitor, MapPin, ChevronRight, ArrowLeft, Store } from 'lucide-react';
import { LanguageSelector } from '@/components/layout/language-selector';
import { useTranslation } from '@/stores/translation-store';
import type { StoreBrief, DeviceAuthResponse } from '@/types';

type LoginStep = 'credentials' | 'store-selection';

export default function LoginPage() {
  const router = useRouter();
  const { setDeviceSession, setTenant, setStore } = useSessionStore();
  const clearCart = useCartStore((state) => state.clearCart);
  const { t } = useTranslation();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Multi-step state
  const [step, setStep] = useState<LoginStep>('credentials');
  const [stores, setStores] = useState<StoreBrief[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<DeviceAuthResponse | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');

  // One name per browser, kept.
  //
  // This used to be `TableTop-${Date.now()}` computed on every mount, so every
  // visit to this page minted a new name and the backend created another
  // device row. They accumulated: a tablet that had signed in a dozen times
  // left a dozen devices, and they all showed up in the POS's own "Select
  // Device" list, burying the real terminal among them.
  //
  // A genuinely new browser is a genuinely new device and still gets its own
  // name. This only stops the same one registering repeatedly.
  useEffect(() => {
    const KEY = 'tabletop-device-name';
    let name = window.localStorage.getItem(KEY);
    if (!name) {
      name = `TableTop-${Date.now()}`;
      window.localStorage.setItem(KEY, name);
    }
    setDeviceName(name);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First authenticate without storeId to check if device is already bound
      const response = await authenticateDevice({
        email,
        password,
        deviceName,
      });

      // Set tenant ID for API calls
      api.setTenantId(response.device.tenantId);

      // If device is already bound to a store, complete login immediately
      if (response.device.storeId) {
        await completeLogin(response);
        return;
      }

      // Device is not bound - need to select a store
      // Save credentials for re-auth, and temp set tokens for API calls
      setPendingAuth(response);

      // Set the session so API client has tokens
      setDeviceSession(response.device, response.accessToken, response.refreshToken, response.expiresIn);

      // Fetch available stores (pass token directly to avoid timing issues)
      setIsLoadingStores(true);
      try {
        const storeList = await getActiveStores(response.accessToken);
        setStores(storeList);

        // If only one store, auto-select it
        if (storeList.length === 1) {
          await handleStoreSelect(storeList[0], response);
          return;
        }

        // Show store selection
        setStep('store-selection');
      } catch (storeErr) {
        console.error('Failed to fetch stores:', storeErr);
        setError('Failed to load stores. Please try again.');
      } finally {
        setIsLoadingStores(false);
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Invalid credentials';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreSelect = async (store: StoreBrief, authResponse?: DeviceAuthResponse) => {
    setError(null);
    setIsLoading(true);

    try {
      // Re-authenticate with storeId to properly bind device to store
      const response = await authenticateDevice({
        email,
        password,
        deviceName,
        storeId: store.id,
      });

      await completeLogin(response, store);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to bind device to store';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = async (response: DeviceAuthResponse, store?: StoreBrief) => {
    // Clear any existing cart from previous session
    clearCart();

    // Set device session in store (include expiresIn for proactive token refresh)
    setDeviceSession(response.device, response.accessToken, response.refreshToken, response.expiresIn);

    // Set tenant ID for API calls
    api.setTenantId(response.device.tenantId);

    // If store was passed, set it
    if (store) {
      setStore(store);
    }

    // Fetch tenant info for branding
    try {
      const tenant = await getCurrentTenant();
      setTenant(tenant.slug, tenant);
    } catch {
      // Tenant fetch is optional for navigation
    }

    // Navigate directly to the store's menu using slug
    const storeSlug = store?.slug || response.device.storeSlug;
    if (storeSlug) {
      router.push(`/store/${storeSlug}/menu`);
    } else {
      router.push('/');
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setPendingAuth(null);
    setStores([]);
    setError(null);
  };

  // Credentials step
  if (step === 'credentials') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
        {/* Language Selector - Top Right */}
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('login.title', 'Device Setup')}</CardTitle>
            <CardDescription>
              {t('login.description', 'Enter administrator credentials to configure this kiosk')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email', 'Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || isLoadingStores}>
                {isLoading || isLoadingStores ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLoadingStores ? t('login.loading_stores', 'Loading stores...') : t('login.signing_in', 'Signing in...')}
                  </>
                ) : (
                  t('button.continue', 'Continue')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Store selection step
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCredentials}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('button.back', 'Back')}
            </Button>
            <LanguageSelector />
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t('store.select_title', 'Select Store')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('store.select_description', 'Choose which store this kiosk will serve')}
            </p>
          </div>
        </div>
      </div>

      {/* Store List */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoadingStores ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('store.no_stores', 'No Stores Available')}</h2>
              <p className="text-muted-foreground">
                {t('store.no_stores_description', 'Create stores in the admin dashboard before setting up kiosks.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <Card
                key={store.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleStoreSelect(store)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{store.name}</h3>
                      {store.address && (
                        <p className="text-sm text-muted-foreground truncate">
                          {store.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ms-2 text-muted-foreground">{t('store.configuring', 'Configuring kiosk...')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
