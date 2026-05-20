import type { Metadata } from 'next'
import './globals.css'
import Navbar from './components/Navbar'
import BotonesFlotantes from './components/BotonesFlotantes'

export const metadata = {
  title: {
    default: 'Hecatombe Coleccionables',
    template: '%s | Hecatombe Coleccionables',
  },
  description: 'Tienda de coleccionables geek en Querétaro. Funkos, figuras y cultura pop. Preventas, dinámicas y envíos a todo México.',
  keywords: ['coleccionables', 'funkos', 'figuras', 'cultura pop', 'querétaro', 'mexico', 'preventa'],
  openGraph: {
    siteName: 'Hecatombe Coleccionables',
    locale: 'es_MX',
    type: 'website',
    url: 'https://www.hecatombe.com.mx',
    images: [{ url: '/logo.png', width: 818, height: 83 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        {children}
        <BotonesFlotantes />
      </body>
    </html>
  )
}