import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { BoardsProvider } from "@/contexts/BoardsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";

export const metadata: Metadata = {
  title: "PinSpace - Collaborative Pin-up Board",
  description: "Collaborative pin-up board for architecture students and studios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* NEW: Wrap app with AuthProvider for authentication */}
        <AuthProvider>
          <ProfileProvider>
            <ThemeProvider>
              <UserProvider>
                <BoardsProvider>
                  {children}
                </BoardsProvider>
              </UserProvider>
            </ThemeProvider>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
