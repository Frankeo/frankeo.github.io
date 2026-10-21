"use client";

import { Printer } from "lucide-react";

export default function PdfButton({ label = "Save as PDF" }: { label?: string }) {
  return (
    <button className="pdf-button" aria-label={label} title={label} onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      {label}
    </button>
  );
}