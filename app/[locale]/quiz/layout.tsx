export default function QuizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div suppressHydrationWarning>
      {children}
    </div>
  );
}
