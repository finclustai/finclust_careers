import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 text-center">
        <p className="font-mono text-sm font-medium text-mid">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-body">
          The link may be old or mistyped. The role you were looking for might still be open.
        </p>
        <Link href="/" className="btn btn-primary mt-5 w-full">
          See open roles
        </Link>
      </div>
    </main>
  );
}
