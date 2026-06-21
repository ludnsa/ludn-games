import './globals.css'
import { Cairo } from 'next/font/google'

// المسارات الصحيحة
//import Header from '../components/layout/Header'
//import Footer from '../components/layout/Footer'

const cairo = Cairo({ subsets: ['arabic'], weight: ['400', '700', '900'] })

export const metadata = {
  title: 'منصة لدن التقنية',
  description: 'شريكك التقني لتطوير مواقع وتطبيقات حديثة',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className={`${cairo.className} relative text-slate-900 dark:text-white bg-slate-50 dark:bg-[#0a0a1a] min-h-screen flex flex-col transition-colors duration-500`}>
        
        {/* التدرج اللوني بالخلفية للزجاج */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-linear-to-br from-blue-100/50 via-slate-50 to-purple-100/50 dark:from-indigo-950/40 dark:via-[#0a0a1a] dark:to-fuchsia-950/20 transition-colors duration-500"></div>

        {/* الهيدر */}
        {/* <Header /> */}
        
        {/* رجعنا الـ relative z-10 عشان المحتوى يطفو فوق الخلفية، والفوتر بأمان لأنه z-40 */}
        <main className="flex-1 flex flex-col w-full relative z-10">
          {children}
        </main>

        {/* الفوتر محمي بطبقة عالية z-40 عشان مستحيل شيء يغطيه */}
        <div className="relative z-40 w-full mt-auto">
          {/* <Footer /> */}
        </div>
        
      </body>
    </html>
  )
}