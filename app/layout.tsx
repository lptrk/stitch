import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundaryWrapper } from '@/components/error-boundary-wrapper'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Stitch',
  description: 'Easier Frontend Tests',
  icons: {
    icon: "favicon.ico"
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundaryWrapper>
          {children}
        </ErrorBoundaryWrapper>
        <Toaster />
      </body>
    </html>
  )
}
