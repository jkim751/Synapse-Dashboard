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
  openGraph: {
    title: "Synapse Portal",
    siteName: "Synapse Portal",
    type: "website",
    url: "https://www.synapseeducation-dashboard.com.au",
  },
  twitter: {
    title: "Synapse Portal",
  },
  alternates: {
    canonical: "https://www.synapseeducation-dashboard.com.au",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children} <ToastContainer position="bottom-right" theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
