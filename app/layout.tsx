export const metadata = {
  title: "Global Intelligence Terminal",
  description: "Institutional Financial Terminal & Telemetry",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#05070A", color: "#F2F5F7" }}>
        {children}
      </body>
    </html>
  );
}
