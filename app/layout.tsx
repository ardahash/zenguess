import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Web3Provider } from "@/components/providers/web3-provider"
import { Toaster } from "sonner"
import { serverEnv } from "@/lib/env/server"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

void serverEnv

function resolveMetadataBase(): URL | undefined {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000"

  const normalizedBaseUrl = rawBaseUrl.startsWith("http")
    ? rawBaseUrl
    : `https://${rawBaseUrl}`

  try {
    return new URL(normalizedBaseUrl)
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "ZenGuess - Prediction Markets on Horizen",
    template: "%s | ZenGuess",
  },
  description:
    "Trade on the future. Decentralized prediction markets powered by Horizen L3.",
  generator: "v0.app",
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "ZenGuess - Prediction Markets on Horizen",
    description:
      "Trade on the future. Decentralized prediction markets powered by Horizen L3.",
    type: "website",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 1200,
        alt: "ZenGuess logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZenGuess - Prediction Markets on Horizen",
    description:
      "Trade on the future. Decentralized prediction markets powered by Horizen L3.",
    images: ["/logo.jpg"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <Web3Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  )
}
