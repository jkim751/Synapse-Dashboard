import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.synapseeducation-dashboard.com.au"),
  title: {
    default: "Synapse Portal",
    template: "%s · Synapse Portal",
  },
  description:
    "Synapse Education Portal, the portal of Sydney's leading HSC specialist centre used to delivering a holistic education to maximise student potential.",
  keywords: [
    "Synapse Education",
    "Sydney education",
    "synapse portal",
    "HSC specialist centre",
  ],
  authors: [{ name: "Synapse Education" }],
  creator: "Synapse Education",
  publisher: "Synapse Education",
  openGraph: {
    title: "Synapse Portal",
    description: "Synapse Education Portal, the portal of Sydney's leading HSC specialist centre used to delivering a holistic education to maximise student potential.",
    siteName: "Synapse Portal",
    type: "website",
    url: "https://www.synapseeducation-dashboard.com.au",
    locale: "en_AU",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Synapse Education Portal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Synapse Portal",
    description: "Sydney's leading HSC specialist centre portal",
    images: ["/og-image.jpg"]
  },
  alternates: {
    canonical: "https://www.synapseeducation-dashboard.com.au",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification-code",
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        </head>
        <body className={inter.className}>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <ToastContainer 
            position="bottom-right" 
            theme="dark"
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            className="!text-sm md:!text-base"
            toastClassName="!rounded-lg !shadow-lg"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
