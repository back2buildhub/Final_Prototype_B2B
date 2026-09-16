import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Back2Build Demo',
  description: 'Construction marketplace demo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0A1628; color: #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }
          input, textarea, select { background: #111E2E; color: #E2E8F0; border: 1px solid #1E3A5A; border-radius: 6px; padding: 10px 12px; width: 100%; font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.15s; }
          input:focus, textarea:focus, select:focus { border-color: #E8622A; }
          input::placeholder, textarea::placeholder { color: #475569; }
          select option { background: #111E2E; }
          a { text-decoration: none; }
          button { cursor: pointer; font-family: inherit; }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: #0A1628; }
          ::-webkit-scrollbar-thumb { background: #1E3A5A; border-radius: 3px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
