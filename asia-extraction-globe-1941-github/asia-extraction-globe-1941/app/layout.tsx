import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "帝國的輸血線｜1941—1945亞洲與太平洋佔領運輸網絡",
  description: "以1935航空交通圖與1941日本宣傳地圖為史料，批判性重構東亞與太平洋運輸網絡的互動歷史地球。",
  openGraph: {
    title: "帝國的輸血線",
    description: "1941—1945亞洲與太平洋佔領、資源攫取與抗戰勝利時間線",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
