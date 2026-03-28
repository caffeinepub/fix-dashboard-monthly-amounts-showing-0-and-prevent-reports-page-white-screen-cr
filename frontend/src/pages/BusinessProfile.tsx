import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Users, Utensils, Calendar, Save, Loader2 } from 'lucide-react';
import { useGetBusinessProfile, useSaveBusinessProfile } from '@/hooks/useQueries';
import { BusinessProfile as BusinessProfileType, OfferType, SeasonalActivity } from '@/backend';
import { toast } from 'sonner';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';

export default function BusinessProfile() {
  const { isReadOnly } = useReadOnlyMode();
  const { data: profile, isLoading } = useGetBusinessProfile();
  const saveProfileMutation = useSaveBusinessProfile();

  const [location, setLocation] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState('');
  const [offerType, setOfferType] = useState<OfferType | ''>('');
  const [seasonalActivity, setSeasonalActivity] = useState<SeasonalActivity | ''>('');

  useEffect(() => {
    if (profile) {
      setLocation(profile.location);
      setNumberOfSeats(profile.numberOfSeats.toString());
      setOfferType(profile.offerType);
      setSeasonalActivity(profile.seasonalActivity);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error('Operacija nije dostupna u načinu samo za čitanje');
      return;
    }

    if (!location.trim()) {
      toast.error('Molimo unesite lokaciju');
      return;
    }

    const seats = parseInt(numberOfSeats);
    if (isNaN(seats) || seats <= 0) {
      toast.error('Molimo unesite valjan broj sjedećih mjesta');
      return;
    }

    if (!offerType) {
      toast.error('Molimo odaberite tip ponude');
      return;
    }

    if (!seasonalActivity) {
      toast.error('Molimo odaberite sezonsku aktivnost');
      return;
    }

    const profileData: BusinessProfileType = {
      location: location.trim(),
      numberOfSeats: BigInt(seats),
      offerType: offerType as OfferType,
      seasonalActivity: seasonalActivity as SeasonalActivity,
    };

    try {
      await saveProfileMutation.mutateAsync(profileData);
      toast.success('Profil objekta uspješno spremljen');
    } catch (error) {
      toast.error('Greška pri spremanju profila objekta');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Učitavanje profila objekta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ReadOnlyBanner />

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-primary sm:text-4xl">Profil objekta</h1>
        <p className="text-muted-foreground">
          Unesite kontekstualne parametre vašeg objekta za poboljšanu prediktivnu analizu
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informacije o objektu
            </CardTitle>
            <CardDescription>
              Ovi podaci će se koristiti za prilagođavanje financijskih projekcija i analiza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Lokacija (grad/regija)
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="npr. Zagreb, Split, Dubrovnik..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full"
                  disabled={isReadOnly}
                />
              </div>

              {/* Number of Seats */}
              <div className="space-y-2">
                <Label htmlFor="numberOfSeats" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Broj sjedećih mjesta
                </Label>
                <Input
                  id="numberOfSeats"
                  type="number"
                  min="1"
                  placeholder="npr. 50"
                  value={numberOfSeats}
                  onChange={(e) => setNumberOfSeats(e.target.value)}
                  className="w-full"
                  disabled={isReadOnly}
                />
              </div>

              {/* Offer Type */}
              <div className="space-y-2">
                <Label htmlFor="offerType" className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Tip ponude
                </Label>
                <Select value={offerType} onValueChange={(value) => setOfferType(value as OfferType)} disabled={isReadOnly}>
                  <SelectTrigger id="offerType" className="w-full">
                    <SelectValue placeholder="Odaberite tip ponude" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restoran">Restoran</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="kafic">Kafić</SelectItem>
                    <SelectItem value="brzaHrana">Brza hrana</SelectItem>
                    <SelectItem value="ostalo">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seasonal Activity */}
              <div className="space-y-2">
                <Label htmlFor="seasonalActivity" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sezonska aktivnost
                </Label>
                <Select
                  value={seasonalActivity}
                  onValueChange={(value) => setSeasonalActivity(value as SeasonalActivity)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="seasonalActivity" className="w-full">
                    <SelectValue placeholder="Odaberite sezonsku aktivnost" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ljeto">Ljeto</SelectItem>
                    <SelectItem value="zima">Zima</SelectItem>
                    <SelectItem value="oboje">Cijela godina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="submit"
                  disabled={saveProfileMutation.isPending || isReadOnly}
                  className="w-full sm:w-auto"
                >
                  {saveProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Spremanje...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Spremi profil
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Kako se koriste ovi podaci?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Lokacija:</strong> Prilagođava projekcije prema regionalnim ekonomskim faktorima
            </p>
            <p>
              • <strong>Broj sjedećih mjesta:</strong> Koristi se za procjenu potencijala prihoda
            </p>
            <p>
              • <strong>Tip ponude:</strong> Prilagođava analize prema različitim operativnim obrascima
            </p>
            <p>
              • <strong>Sezonska aktivnost:</strong> Uzima u obzir sezonske varijacije u poslovanju
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
