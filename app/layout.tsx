import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stitch',
  description:'Easier Frontend Tests',
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
      <body>{children}</body>
    </html>
  )
}
