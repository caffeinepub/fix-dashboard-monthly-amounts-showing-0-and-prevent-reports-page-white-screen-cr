import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '@/hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChefHat, LogIn, UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { identity, login, loginStatus, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const isLoggingIn = loginStatus === 'logging-in';

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Greška pri prijavi', {
        description: error.message || 'Molimo pokušajte ponovno',
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !restaurantName.trim()) {
      toast.error('Molimo ispunite sva polja');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        restaurantName: restaurantName.trim(),
      });

      toast.success('Dobrodošli!', {
        description: 'Vaš profil je uspješno kreiran.',
      });
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast.error('Greška pri spremanju profila', {
        description: error.message || 'Molimo pokušajte ponovno',
      });
    }
  };

  // Show loading state while initializing or loading profile
  if (isInitializing || (isAuthenticated && profileLoading && !isFetched)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Restoran Financije</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sustav za praćenje prihoda i rashoda vašeg restorana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3 sm:p-4 text-xs sm:text-sm">
              <p className="mb-2 font-medium">Dobrodošli!</p>
              <p className="text-muted-foreground">
                Za korištenje aplikacije potrebno je prijaviti se pomoću Internet Identity sustava.
                Vaši podaci su sigurni i šifrirani.
              </p>
            </div>
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Prijava u tijeku...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Prijavi se
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Prijavom prihvaćate korištenje Internet Identity sustava za autentifikaciju
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show profile setup if user is authenticated but has no profile
  if (isAuthenticated && isFetched && userProfile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary">
              <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Postavi profil</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Molimo unesite svoje podatke kako biste nastavili
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Vaše ime</Label>
                <Input
                  id="name"
                  placeholder="npr. Ivan Horvat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saveProfile.isPending}
                  className="h-10 sm:h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurantName" className="text-sm">Naziv restorana</Label>
                <Input
                  id="restaurantName"
                  placeholder="npr. Restoran Dubrovnik"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                  disabled={saveProfile.isPending}
                  className="h-10 sm:h-11 text-base"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={saveProfile.isPending}
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Spremanje...
                  </>
                ) : (
                  'Pokreni aplikaciju'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and has a profile - show the app
  return <>{children}</>;
}
