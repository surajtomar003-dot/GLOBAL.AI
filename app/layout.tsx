import "./globals.css";
export const metadata = { title: "GLOBAL.AI — Intelligence Terminal", description: "Live global markets on a 3D globe" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
