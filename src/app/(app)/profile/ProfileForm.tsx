"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { updateProfile } from "./actions";

type Profile = {
  full_name: string;
  dob: string | null;
  phone: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
};

export function ProfileForm({ userId, profile }: { userId: string; profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [dob, setDob] = useState(profile.dob ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [emergencyName, setEmergencyName] = useState(profile.emergency_contact_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergency_contact_phone ?? "");
  const [emergencyEmail, setEmergencyEmail] = useState(profile.emergency_contact_email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDone(false);

    try {
      let photoUrl: string | null = null;
      if (photo) {
        const supabase = createClient();
        const path = `${userId}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
      }

      await updateProfile({
        fullName,
        dob: dob || null,
        phone,
        photoUrl,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        emergencyContactEmail: emergencyEmail,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      {profile.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photo_url}
          alt=""
          className="h-20 w-20 rounded-full object-cover"
        />
      )}
      <label className="field-label">
        Name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" />
      </label>
      <label className="field-label">
        Date of birth
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="input" />
      </label>
      <label className="field-label">
        Phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
      </label>
      <label className="field-label">
        Photo
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-stone-600"
        />
      </label>

      <div className="mt-2 border-t border-[var(--border)] pt-4">
        <h2 className="section-title mb-1">Emergency contact</h2>
        <p className="mb-3 text-sm text-stone-500">
          Who to notify if you tap the SOS button.
        </p>
      </div>
      <label className="field-label">
        Contact name
        <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="input" />
      </label>
      <label className="field-label">
        Contact phone
        <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="input" />
      </label>
      <label className="field-label">
        Contact email
        <input
          type="email"
          value={emergencyEmail}
          onChange={(e) => setEmergencyEmail(e.target.value)}
          className="input"
        />
      </label>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {done && <p className="text-sm text-[var(--success)]">Saved.</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
