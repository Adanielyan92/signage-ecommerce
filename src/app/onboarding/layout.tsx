export const metadata = {
  title: "Set Up Your Sign Shop - GatSoft Signs",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}
