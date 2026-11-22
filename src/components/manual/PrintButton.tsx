"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
      Save PDF
    </button>
  );
}
