export default async function QuizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <div suppressHydrationWarning>
      {children}
    </div>
  );
}
