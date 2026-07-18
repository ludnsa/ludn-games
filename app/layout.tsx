import './globals.css'
import { Cairo } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const cairo = Cairo({ subsets: ['arabic'], weight: ['400', '700', '900'] })

export const metadata = {
  title: 'منصة لدن التقنية',
  description: 'عيش جو التحدي مع ألعاب لدن الجماعية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${cairo.className} relative text-slate-900 dark:text-white bg-slate-50 dark:bg-[#0a0a1a] min-h-screen flex flex-col transition-colors duration-500`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ToastProvider />
            {/* التدرج اللوني بالخلفية للزجاج */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-linear-to-br from-blue-100/50 via-slate-50 to-purple-100/50 dark:from-indigo-950/40 dark:via-[#0a0a1a] dark:to-fuchsia-950/20 transition-colors duration-500"></div>

            <main className="flex-1 flex flex-col w-full relative z-10">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}