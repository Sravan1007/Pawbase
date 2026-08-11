import { getAccessiblePets } from "@/lib/pets";
import ShopCatalog from "./ShopCatalog";

export default async function ShopPage() {
  const pets = await getAccessiblePets();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Pet Shopping</h1>
        <p className="page-subtitle">
          Food, treats, accessories, and wellness essentials for your pet.
        </p>
      </div>
      <ShopCatalog pets={pets} />
    </div>
  );
}
