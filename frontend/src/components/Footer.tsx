import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex h-12 sm:h-14 items-center justify-center px-4 text-xs sm:text-sm text-muted-foreground">
        <p className="flex items-center gap-1 text-center">
          © 2025. Napravljeno s <Heart className="h-3 w-3 fill-red-500 text-red-500" /> koristeći{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
