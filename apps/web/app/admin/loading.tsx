// Shown the moment a link is tapped, while the next admin page fetches. A phone
// on a slow connection otherwise sees nothing happen and taps again.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-[10px] bg-line" />
      <div className="mt-2 h-4 w-72 max-w-full rounded-[10px] bg-line" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[14px] border-2 border-line bg-sand" />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-[14px] border-2 border-line bg-sand" />
    </main>
  );
}
