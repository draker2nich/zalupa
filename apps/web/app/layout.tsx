import "./globals.css";

export const metadata = {
  title: "Psyche Mirror",
  description: "AI-дневник рефлексии",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}