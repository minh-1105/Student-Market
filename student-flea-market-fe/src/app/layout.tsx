///////////////////////////////////////////////////////////
//                                                       //
//                    ROOT LAYOUT                        //
//                                                       //
///////////////////////////////////////////////////////////

import type { Metadata } from "next";
import "./globals.css";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import { MitosisTransition } from '@/components/MitosisTransition';

// Typography — both families ship full Vietnamese glyph sets (dấu thanh + dấu mũ chồng nhau),
// self-hosted by next/font: no render-blocking @import, no layout shift.
//  • Be Vietnam Pro — UI/body text. Designed for Vietnamese, reads equally well in English.
//  • Fraunces       — headings, prices, wordmark. Soft, warm variable serif (opsz auto).
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

const serif = Fraunces({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "FLea – Chợ đồ cũ sinh viên",
  description: "Nền tảng mua bán, trao đổi và tặng đồ 0đ dành cho học sinh, sinh viên.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans"><MitosisTransition>{children}</MitosisTransition></body>
    </html>
  );
}
