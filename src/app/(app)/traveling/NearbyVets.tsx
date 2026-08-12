"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VetListing } from "@/lib/vets";

// Haversine distance in km — good enough for "which vet is closest", no
// external maps/routing API involved.
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyVets({ vets }: { vets: VetListing[] }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Always starts as "locating" on both server and client — `navigator`
  // doesn't exist during SSR, so branching on it here (as this used to)
  // renders "denied" server-side and "locating" client-side and Next.js
  // throws a hydration mismatch. The real geolocation-availability check
  // only happens once, client-side, inside the effect below.
  const [status, setStatus] = useState<"locating" | "found" | "denied">("locating");

  useEffect(() => {
    if (!navigator.geolocation) {
      // Deferred to a callback (not called synchronously in the effect
      // body) to satisfy react-hooks/set-state-in-effect — same shape as
      // the getCurrentPosition callbacks below.
      const timer = setTimeout(() => setStatus("denied"), 0);
      return () => clearTimeout(timer);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("found");
      },
      () => setStatus("denied"),
    );
  }, []);

  const withDistance = vets
    .map((v) => ({
      vet: v,
      distanceKm:
        coords && v.lat != null && v.lng != null ? distanceKm(coords.lat, coords.lng, v.lat, v.lng) : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  return (
    <div className="flex flex-col gap-4">
      {status === "locating" && <p className="text-sm text-stone-500">Finding your location...</p>}
      {status === "denied" && (
        <p className="text-sm text-stone-500">
          Location unavailable — showing all vets with a listed clinic location, unsorted by
          distance.
        </p>
      )}

      {withDistance.length === 0 ? (
        <div className="empty-state">No vets with a clinic location on file yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {withDistance.map(({ vet, distanceKm: d }) => (
            <Link
              key={vet.id}
              href={`/clinics/${vet.id}`}
              className="card-compact flex flex-col gap-1 hover:border-[var(--accent)]"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-900">{vet.full_name}</p>
                {d != null && <span className="text-xs font-medium text-[var(--accent)]">{d.toFixed(1)} km</span>}
              </div>
              {vet.clinic_name && <p className="text-sm text-stone-700">{vet.clinic_name}</p>}
              {vet.clinic_address && <p className="text-xs text-stone-400">{vet.clinic_address}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
