"use client";

// Last resort when the root layout itself fails, so it cannot rely on the app's
// fonts or stylesheet and styles itself inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fffdf8", color: "#15140f", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ color: "#4a463d", fontSize: 14 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, minHeight: 48, padding: "0 20px", fontWeight: 700, background: "#ff8a1e", border: "2px solid #15140f", borderRadius: 10, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
