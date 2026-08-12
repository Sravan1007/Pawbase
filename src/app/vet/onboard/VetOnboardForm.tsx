"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { onboardVet } from "./actions";

const speciesOptions = ["Dog", "Cat", "Bird", "Rabbit", "Exotic"];

export default function VetOnboardForm({ userId }: { userId: string }) {
  const [clinicName, setClinicName] = useState("");
  const [credentials, setCredentials] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [designation, setDesignation] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [amenities, setAmenities] = useState("");
  const [speciesFocus, setSpeciesFocus] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [clinicPhotos, setClinicPhotos] = useState<File[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSpecies(s: string) {
    setSpeciesFocus((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function useCurrentLocation() {
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location — check browser permissions.");
        setLocating(false);
      },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      let photoUrl: string | null = null;
      if (photo) {
        const path = `${userId}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
      }

      const clinicPhotoUrls: string[] = [];
      for (const file of clinicPhotos) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("clinic-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        clinicPhotoUrls.push(supabase.storage.from("clinic-photos").getPublicUrl(path).data.publicUrl);
      }

      await onboardVet({
        clinicName,
        credentials,
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        designation,
        photoUrl,
        clinicAddress,
        amenities: amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        speciesFocus,
        clinicPhotos: clinicPhotoUrls,
        lat,
        lng,
      });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <label className="field-label">
        Clinic name
        <input
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Sunrise Pet Clinic"
          className="input"
        />
      </label>
      <label className="field-label">
        Designation
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. DVM, Senior Veterinarian"
          className="input"
        />
      </label>
      <label className="field-label">
        Credentials
        <textarea
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          rows={3}
          placeholder="e.g. DVM, board certifications"
          className="input"
        />
      </label>
      <label className="field-label">
        Years of experience
        <input
          type="number"
          min={0}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          className="input"
        />
      </label>
      <label className="field-label">
        Clinic address
        <input
          value={clinicAddress}
          onChange={(e) => setClinicAddress(e.target.value)}
          placeholder="Street, city"
          className="input"
        />
      </label>
      <div className="field-label">
        Clinic location (for the &quot;nearby&quot; lookup while a pet owner is traveling)
        <div className="mt-1 flex items-center gap-2">
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="btn-secondary btn-sm">
            {locating ? "Locating..." : lat != null ? "Update to current location" : "Use my current location"}
          </button>
          {lat != null && lng != null && (
            <span className="text-xs text-stone-400">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          )}
        </div>
        {locationError && <p className="mt-1 text-xs text-[var(--danger)]">{locationError}</p>}
      </div>
      <label className="field-label">
        Amenities (comma-separated)
        <input
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          placeholder="Parking, 24/7 emergency, X-ray"
          className="input"
        />
      </label>
      <fieldset className="field-label">
        Species you specialize in
        <div className="mt-1 flex flex-wrap gap-2">
          {speciesOptions.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm font-normal text-stone-600">
              <input
                type="checkbox"
                checked={speciesFocus.includes(s)}
                onChange={() => toggleSpecies(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field-label">
        Your photo (optional)
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-stone-600"
        />
      </label>
      <label className="field-label">
        Clinic photos (optional, add more any time)
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setClinicPhotos(Array.from(e.target.files ?? []))}
          className="mt-1 block w-full text-sm text-stone-600"
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
