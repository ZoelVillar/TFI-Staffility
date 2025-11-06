// src/app/(marketing)/layout.tsx
import { HeaderLanding } from "../../components/landing/HeaderLanding";
import { FooterLanding } from "../../components/landing/FooterLanding";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderLanding />
      <main className="flex-1">{children}</main>
      <FooterLanding />
    </div>
  );
}
