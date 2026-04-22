"use client";

export default function PracticePage({ params }: { params: { segments: string[] } }) {
  const { segments } = params;

  return (
    <div className="min-h-screen bg-[#171035] text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Practice Mode</h1>
      <p className="text-gray-300">Segments: {segments.join('/')}</p>
      <p className="text-gray-400 mt-2">Practice module under construction</p>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
