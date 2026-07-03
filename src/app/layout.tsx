import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import { PlayerProvider } from '@/lib/PlayerContext';

export const metadata: Metadata = {
  title: 'mkVideo - MarkAVideo',
  description: 'A Windows video player with mask drawing tools to hide watermarks, subtitles, and other unwanted content.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </AppProvider>
      </body>
    </html>
  );
}