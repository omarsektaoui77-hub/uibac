export default async function Page({ params }: { params: { locale: string } }) {
  const { locale } = params;
  
  // Safe i18n loading - per-page strategy
  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    messages = null;
  }

  return (
    <div>
      <h1>App is working ✅</h1>
      {messages && <p>Locale: {locale}</p>}
    </div>
  );
}
