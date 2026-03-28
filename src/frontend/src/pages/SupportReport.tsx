import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const LIVE_URL = "https://fine-pink-6nd-draft.caffeine.xyz";
const ENV_VAR = "VITE_CANISTER_ID_BACKEND";

const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP ?? "unknown";
const rawCanisterId =
  import.meta.env.VITE_CANISTER_ID_BACKEND ?? "nije postavljeno";

const REPORT_TEXT = `
=============================================================
CAFFEINE SUPPORT REPORT
Subject: Persistent Build Pipeline Failure — VITE_CANISTER_ID_BACKEND Not Injected
Date: ${new Date().toISOString().split("T")[0]}
App URL: ${LIVE_URL}
=============================================================

1. PROBLEM DESCRIPTION
----------------------
The frontend application deployed at ${LIVE_URL} consistently fails to
receive the environment variable ${ENV_VAR} during the automated
Caffeine build pipeline. As a result, every deployed build renders a
full-screen error page titled "Backend Canister ID nije konfiguriran"
instead of the actual application.

The variable resolves to the literal string "nije postavljeno" (Croatian
for "not set") at runtime, which is the application's own fallback label
— confirming the variable was never injected by the build system.

Observed runtime value:
  import.meta.env.${ENV_VAR} = "${rawCanisterId}"

2. TIMELINE
-----------
- The issue has persisted across at least 13 consecutive project versions
  (drafts) and numerous rebuild/redeploy cycles initiated from the
  Caffeine platform UI.
- Every new build triggered via the Caffeine platform produces the same
  result: the env variable is absent from the Vite build context.
- The problem was first observed after the initial deployment and has
  never been resolved by any platform-side rebuild.

3. WHAT HAS BEEN TRIED (Frontend-Side Fixes)
---------------------------------------------
All of the following were implemented in the frontend codebase in
successive attempts to work around or diagnose the issue:

  a) canisterId.ts — Single authoritative utility that reads, validates,
     and diagnoses ${ENV_VAR} from import.meta.env.
     Throws a descriptive error with the raw received value.

  b) BackendCanisterIdGuard.tsx — Full-screen guard component that
     intercepts the missing/invalid canister ID before rendering any
     app content, showing the exact received value and recovery steps.

  c) CanisterMismatchRecoveryBanner.tsx — Persistent recovery banner
     that subscribes to connection failure state and offers immediate
     resync action.

  d) AppErrorBoundary.tsx — Global React error boundary with enhanced
     canister ID mismatch detection and specific recovery guidance.

  e) deploy.sh — Automated deployment script that explicitly verifies
     the canister ID before building, clears all caches (dist/,
     .vite/, node_modules/.vite/), injects VITE_BUILD_TIMESTAMP, and
     prints a deployment summary.

  f) .ic-assets.json5 — Cache-control rules preventing caching of
     index.html and env.json to ensure users always receive the latest
     build.

  g) useResync.ts — 12-step manual resynchronization hook including
     complete cache clearing, actor recreation, and canister ID
     regeneration handling.

  h) DeploymentInfoDialog.tsx — Visual warning indicators when canister
     IDs are "N/A" or missing, with a "Rebuild Required" banner.

  i) useConnectionMonitor.ts — Comprehensive backend availability
     monitoring with automatic recovery.

None of these frontend-side measures can resolve the root issue because
the variable is simply never present in the build environment.

4. CURRENT OBSERVED BEHAVIOR
-----------------------------
Live URL: ${LIVE_URL}
Build timestamp: ${buildTimestamp}

When opening the application, users see:
  - Title: "Backend Canister ID nije konfiguriran"
  - Subtitle: "Greška konfiguracije — Aplikacija ne može uspostaviti
    vezu s backendom"
  - Problem: "Environment variable ${ENV_VAR} is not set"
  - Source: import.meta.env.${ENV_VAR}
  - Value: "nije postavljeno"
  - Status: Nevažeći (Invalid)

The application is completely non-functional for all users.

5. ROOT CAUSE HYPOTHESIS
-------------------------
The Caffeine automated build pipeline does NOT inject the
${ENV_VAR} environment variable into the Vite build
context when building the frontend canister.

Vite requires environment variables prefixed with VITE_ to be present
at build time (not runtime) so they can be statically replaced via
import.meta.env. If the pipeline does not pass this variable to the
"vite build" command (e.g., via a .env file, --define flag, or shell
environment), the variable will be undefined in the compiled output.

The backend canister IS deployed and has a valid canister ID — the
frontend simply never receives it during its build step.

6. SUPPORT ASK
--------------
We need clarification on the following:

  Q1. How does the Caffeine build pipeline inject Vite environment
      variables (specifically VITE_CANISTER_ID_BACKEND) into the
      frontend build context?

  Q2. Is there a required configuration file, manifest entry, or
      platform setting that must be present for the pipeline to
      automatically pass the backend canister ID to the Vite build?

  Q3. Is there a known issue with VITE_* variable injection for
      projects using the Internet Computer / DFX toolchain on the
      Caffeine platform?

  Q4. Can the Caffeine support team inspect the build logs for
      project at ${LIVE_URL} and confirm whether
      ${ENV_VAR} is being passed to the "vite build"
      command?

  Q5. Is there a workaround or platform-level fix that can be applied
      to ensure the variable is correctly injected on the next build?

=============================================================
END OF REPORT
=============================================================
`.trim();

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  };
  children: React.ReactNode;
}

function ReportSection({ icon, title, badge, children }: SectionProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          <span>{title}</span>
          {badge && (
            <Badge variant={badge.variant} className="ml-auto text-xs">
              {badge.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}

export default function SupportReport() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(REPORT_TEXT);
      setCopied(true);
      toast.success("Izvještaj kopiran u međuspremnik");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Kopiranje nije uspjelo — odaberite tekst ručno");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([REPORT_TEXT], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caffeine-support-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Izvještaj preuzet");
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Caffeine Support Izvještaj
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Sažetak perzistentnog problema s{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {ENV_VAR}
              </code>{" "}
              koji nije riješen kroz više verzija projekta.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <FileText className="mr-2 h-4 w-4" />
              Preuzmi .txt
            </Button>
            <Button size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Kopirano!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopiraj izvještaj
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Aplikacija nefunkcionalna
          </div>
          <div className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            Traje kroz 13+ verzija
          </div>
          <div className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-mono">
            {LIVE_URL}
          </div>
        </div>
      </div>

      {/* Report Sections */}
      <div className="flex flex-col gap-4">
        {/* 1. Problem Description */}
        <ReportSection
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          title="1. Opis problema"
          badge={{ label: "Kritično", variant: "destructive" }}
        >
          <p className="mb-3">
            Frontend aplikacija na{" "}
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {LIVE_URL}
            </a>{" "}
            konzistentno ne prima environment varijablu{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {ENV_VAR}
            </code>{" "}
            tijekom automatiziranog Caffeine build procesa.
          </p>
          <p className="mb-3">
            Svaki deployani build prikazuje full-screen error stranicu umjesto
            aplikacije. Varijabla se razrješava na literal string{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              "nije postavljeno"
            </code>{" "}
            — što je aplikacijski fallback label koji potvrđuje da varijabla
            nikada nije injektirana od strane build sustava.
          </p>
          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 font-mono text-xs">
            <div className="text-destructive font-semibold mb-1">
              Opažena runtime vrijednost:
            </div>
            <div>
              import.meta.env.{ENV_VAR} ={" "}
              <span className="text-destructive">"{rawCanisterId}"</span>
            </div>
          </div>
        </ReportSection>

        {/* 2. Timeline */}
        <ReportSection
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          title="2. Vremenski okvir"
        >
          <ul className="space-y-2 list-none">
            {[
              "Problem perzistira kroz najmanje 13 uzastopnih verzija projekta (draftova) i brojne rebuild/redeploy cikluse pokrenute s Caffeine platforme.",
              "Svaki novi build pokrenut putem Caffeine platforme daje isti rezultat: env varijabla je odsutna iz Vite build konteksta.",
              "Problem je prvi put opažen nakon inicijalnog deploymenta i nikada nije riješen nijednim platform-side rebuildom.",
              "Svi frontend-side pokušaji rješavanja (guard komponente, error boundaries, deploy skripte) ne mogu riješiti temeljni uzrok jer varijabla jednostavno nije prisutna u build okruženju.",
            ].map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list with no reordering
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </ReportSection>

        {/* 3. What has been tried */}
        <ReportSection
          icon={<Wrench className="h-4 w-4 text-blue-500" />}
          title="3. Što je isprobano (frontend-side)"
        >
          <p className="mb-3 text-foreground font-medium">
            Sve sljedeće implementirano je u frontend kodu u uzastopnim
            pokušajima zaobilaženja ili dijagnoze problema:
          </p>
          <div className="space-y-2">
            {[
              {
                label: "canisterId.ts",
                desc: "Jedinstven autoritativni utility koji čita, validira i dijagnosticira VITE_CANISTER_ID_BACKEND iz import.meta.env. Baca opisnu grešku s primljenom raw vrijednošću.",
              },
              {
                label: "BackendCanisterIdGuard.tsx",
                desc: "Full-screen guard komponenta koja presreće nedostajući/nevažeći canister ID prije renderiranja bilo kojeg sadržaja aplikacije.",
              },
              {
                label: "CanisterMismatchRecoveryBanner.tsx",
                desc: "Perzistentni recovery banner koji se pretplaćuje na stanje connection failure i nudi trenutnu resync akciju.",
              },
              {
                label: "AppErrorBoundary.tsx",
                desc: "Globalni React error boundary s poboljšanom detekcijom canister ID mismatch-a i specifičnim uputama za oporavak.",
              },
              {
                label: "deploy.sh",
                desc: "Automatizirana deployment skripta koja eksplicitno verificira canister ID prije builda, briše sve cache-ove i ispisuje deployment sažetak.",
              },
              {
                label: ".ic-assets.json5",
                desc: "Cache-control pravila koja sprječavaju cachiranje index.html i env.json kako bi korisnici uvijek dobili najnoviji build.",
              },
              {
                label: "useResync.ts",
                desc: "12-koračni hook za ručnu resinkronizaciju uključujući potpuno brisanje cache-a, rekreaciju actora i rukovanje canister ID regeneracijom.",
              },
              {
                label: "DeploymentInfoDialog.tsx",
                desc: 'Vizualni indikatori upozorenja kada su canister ID-ovi "N/A" ili nedostaju, s "Rebuild Required" bannerom.',
              },
              {
                label: "useConnectionMonitor.ts",
                desc: "Sveobuhvatno praćenje dostupnosti backenda s automatskim oporavkom.",
              },
            ].map((item, i) => (
              <div
                key={item.label}
                className="flex items-start gap-2 bg-muted/40 rounded-md p-2.5"
              >
                <span className="flex-shrink-0 text-blue-500 font-mono text-xs bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5">
                  {String.fromCharCode(97 + i)})
                </span>
                <div>
                  <span className="font-mono text-xs text-foreground font-semibold">
                    {item.label}
                  </span>
                  <span className="text-xs ml-2">— {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 text-amber-700 dark:text-amber-400">
            ⚠️ Nijedna od ovih frontend-side mjera ne može riješiti temeljni
            uzrok jer varijabla jednostavno nije prisutna u build okruženju.
          </p>
        </ReportSection>

        {/* 4. Current observed behavior */}
        <ReportSection
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          title="4. Trenutno opaženo ponašanje"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 rounded p-2">
                <div className="text-muted-foreground mb-0.5">Live URL</div>
                <a
                  href={LIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-mono break-all"
                >
                  {LIVE_URL}
                </a>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="text-muted-foreground mb-0.5">
                  Build timestamp
                </div>
                <div className="font-mono">{buildTimestamp}</div>
              </div>
            </div>
            <p>Kada korisnici otvore aplikaciju, vide:</p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 text-xs space-y-1 font-mono">
              <div>
                <span className="text-muted-foreground">Naslov:</span> "Backend
                Canister ID nije konfiguriran"
              </div>
              <div>
                <span className="text-muted-foreground">Problem:</span>{" "}
                "Environment variable {ENV_VAR} is not set"
              </div>
              <div>
                <span className="text-muted-foreground">Izvor:</span>{" "}
                import.meta.env.{ENV_VAR}
              </div>
              <div>
                <span className="text-muted-foreground">Vrijednost:</span>{" "}
                <span className="text-destructive">"{rawCanisterId}"</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="text-destructive">Nevažeći</span>
              </div>
            </div>
            <p className="text-destructive font-medium text-xs">
              Aplikacija je potpuno nefunkcionalna za sve korisnike.
            </p>
          </div>
        </ReportSection>

        {/* 5. Root cause hypothesis */}
        <ReportSection
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          title="5. Hipoteza o temeljnom uzroku"
        >
          <p className="mb-3">
            Caffeine automatizirana build pipeline{" "}
            <strong className="text-foreground">NE injektira</strong>{" "}
            environment varijablu{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {ENV_VAR}
            </code>{" "}
            u Vite build kontekst pri izgradnji frontend canistera.
          </p>
          <p className="mb-3">
            Vite zahtijeva da environment varijable s prefiksom{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              VITE_
            </code>{" "}
            budu prisutne u{" "}
            <strong className="text-foreground">build-time</strong> (ne runtime)
            kako bi bile statički zamijenjene putem{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              import.meta.env
            </code>
            . Ako pipeline ne proslijedi ovu varijablu naredbi{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              vite build
            </code>{" "}
            (npr. putem .env datoteke, --define flaga ili shell okruženja),
            varijabla će biti{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              undefined
            </code>{" "}
            u kompajliranom outputu.
          </p>
          <p>
            Backend canister <strong className="text-foreground">JE</strong>{" "}
            deployiran i ima važeći canister ID — frontend ga jednostavno nikada
            ne prima tijekom svog build koraka.
          </p>
        </ReportSection>

        {/* 6. Support ask */}
        <ReportSection
          icon={<HelpCircle className="h-4 w-4 text-primary" />}
          title="6. Što tražimo od Caffeine Supporta"
          badge={{ label: "Action Required", variant: "default" }}
        >
          <div className="space-y-3">
            {[
              {
                q: "Q1",
                text: `Kako Caffeine build pipeline injektira Vite environment varijable (konkretno ${ENV_VAR}) u frontend build kontekst?`,
              },
              {
                q: "Q2",
                text: "Postoji li obavezna konfiguracijska datoteka, manifest unos ili platform postavka koja mora biti prisutna da bi pipeline automatski proslijedio backend canister ID Vite buildu?",
              },
              {
                q: "Q3",
                text: "Postoji li poznati problem s VITE_* varijabla injekcijom za projekte koji koriste Internet Computer / DFX toolchain na Caffeine platformi?",
              },
              {
                q: "Q4",
                text: `Može li Caffeine support tim pregledati build logove za projekt na ${LIVE_URL} i potvrditi je li ${ENV_VAR} proslijeđen naredbi "vite build"?`,
              },
              {
                q: "Q5",
                text: "Postoji li workaround ili platform-level fix koji se može primijeniti kako bi se osiguralo da varijabla bude ispravno injektirana u sljedećem buildu?",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-md p-3"
              >
                <span className="flex-shrink-0 font-bold text-primary text-sm">
                  {item.q}.
                </span>
                <p className="text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <Separator />

        {/* Copyable raw text */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sirovi tekst izvještaja (za slanje e-mailom / ticketom)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  Preuzmi .txt
                </Button>
                <Button size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-3.5 w-3.5" />
                      Kopirano!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Kopiraj sve
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-md p-4 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto select-all">
              {REPORT_TEXT}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
