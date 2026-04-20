import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Depto. Operaciones",
  description: "Gestión de servicios y logística",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
