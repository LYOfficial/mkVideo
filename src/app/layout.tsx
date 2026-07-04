import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import { PlayerProvider } from '@/lib/PlayerContext';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'mkVideo - 马克视频',
  description: '一款可以在视频上打标记的 Windows 视频播放器，用遮罩遮挡水印、字幕等不想看到的内容。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <I18nProvider>
          <AppProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </AppProvider>
        </I18nProvider>
      </body>
    </html>
  );
}