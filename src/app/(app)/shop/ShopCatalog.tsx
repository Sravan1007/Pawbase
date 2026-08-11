"use client";

import Link from "next/link";
import { useState } from "react";
import type { OwnedPet } from "@/lib/pets";
import { orderProduct } from "./actions";

type Product = { name: string; price: string; unit: string };
type Category = { name: string; products: Product[] };

const catalog: Category[] = [
  {
    name: "Dog Food",
    products: [
      { name: "Everyday Adult Dry Food", price: "₹950", unit: "3kg" },
      { name: "Puppy Starter Kibble", price: "₹650", unit: "1.5kg" },
    ],
  },
  {
    name: "Cat Food",
    products: [
      { name: "Adult Cat Dry Food", price: "₹820", unit: "2kg" },
      { name: "Kitten Formula", price: "₹520", unit: "800g" },
    ],
  },
  {
    name: "Treats",
    products: [
      { name: "Training Treat Pouch", price: "₹250", unit: "200g" },
      { name: "Dental Chew Sticks", price: "₹300", unit: "pack of 6" },
    ],
  },
  {
    name: "Accessories",
    products: [
      { name: "Adjustable Nylon Collar", price: "₹350", unit: "1pc" },
      { name: "Padded Walking Leash", price: "₹450", unit: "1pc" },
      { name: "Travel Water Bottle", price: "₹399", unit: "1pc" },
    ],
  },
  {
    name: "Wellness",
    products: [
      { name: "Omega-3 Skin & Coat Supplement", price: "₹700", unit: "60 caps" },
      { name: "Probiotic Chews", price: "₹550", unit: "30 chews" },
    ],
  },
];

export default function ShopCatalog({ pets }: { pets: OwnedPet[] }) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<Set<string>>(new Set());

  async function handleAdd(product: Product) {
    if (!petId) return;
    setPending(product.name);
    const formData = new FormData();
    formData.set("pet_id", petId);
    formData.set("product_name", `${product.name} (${product.unit})`);
    formData.set("price", product.price);
    try {
      await orderProduct(formData);
      setOrdered((prev) => new Set(prev).add(product.name));
    } finally {
      setPending(null);
    }
  }

  if (pets.length === 0) {
    return (
      <p className="empty-state">
        Add a pet first before ordering — head to{" "}
        <Link href="/pets/new" className="font-medium text-[var(--accent)] hover:underline">
          Add a pet
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <label className="field-label max-w-xs">
        Ordering for
        <select value={petId} onChange={(e) => setPetId(e.target.value)} className="input">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.species})
            </option>
          ))}
        </select>
      </label>

      {catalog.map((category) => (
        <section key={category.name}>
          <h2 className="section-title mb-3">{category.name}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {category.products.map((product) => (
              <div key={product.name} className="card-compact flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-900">{product.name}</p>
                  <p className="text-sm text-stone-500">
                    {product.unit} · {product.price}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(product)}
                  disabled={pending === product.name}
                  className={ordered.has(product.name) ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                >
                  {ordered.has(product.name)
                    ? "Added ✓"
                    : pending === product.name
                      ? "Adding..."
                      : "Add to order"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
