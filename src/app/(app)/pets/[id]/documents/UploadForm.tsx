"use client";

import { createClient } from "@/lib/supabase/client";
import { useRef, useState } from "react";
import { createDocument } from "./actions";

const types = [
  { value: "vaccination", label: "Vaccination" },
  { value: "vet_record", label: "Vet record" },
  { value: "prescription", label: "Prescription" },
  { value: "travel_doc", label: "Travel document" },
  { value: "insurance", label: "Insurance" },
];

export default function UploadForm({ petId }: { petId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("vaccination");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${petId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;

      await createDocument(petId, {
        type,
        filePath: path,
        expiryDate: expiryDate || null,
      });

      setFile(null);
      setExpiryDate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <h2 className="section-title">Upload a document</h2>
      <label className="field-label">
        Type
        <select value={type} onChange={(e) => setType(e.target.value)} className="input">
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        File
        <input
          ref={fileInputRef}
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-stone-600"
        />
      </label>
      <label className="field-label">
        Expiry date (optional)
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="input"
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
