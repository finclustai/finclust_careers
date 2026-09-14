import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusLookup } from "./status-lookup";

export const metadata: Metadata = {
  title: "Check your application",
  description: "Check the status of your FINCLUST application with your reference and mobile number.",
};

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <Link href="/" className="text-link text-mid">
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        All open roles
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">Check your application</h1>
      <p className="mt-1.5 text-sm text-body">
        Enter the reference from your confirmation screen and the mobile number you applied with.
      </p>
      <StatusLookup />
    </main>
  );
}
