"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; name: string };

export default function TravelSelector({
  petId,
  airlines,
  countries,
  selectedAirline,
  selectedCountry,
}: {
  petId: string;
  airlines: Option[];
  countries: Option[];
  selectedAirline: string;
  selectedCountry: string;
}) {
  const router = useRouter();

  function navigate(airline: string, country: string) {
    const params = new URLSearchParams();
    if (airline) params.set("airline", airline);
    if (country) params.set("country", country);
    const qs = params.toString();
    router.push(`/pets/${petId}/travel${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="field-label">
        Airline
        <select
          className="input"
          value={selectedAirline}
          onChange={(e) => navigate(e.target.value, selectedCountry)}
        >
          <option value="">Any / not flying</option>
          {airlines.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Destination country
        <select
          className="input"
          value={selectedCountry}
          onChange={(e) => navigate(selectedAirline, e.target.value)}
        >
          <option value="">Choose a destination</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
