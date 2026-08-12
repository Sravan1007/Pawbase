import { createClient } from "@/lib/supabase/server";
import { getAccessiblePets } from "@/lib/pets";
import { one } from "@/lib/supabase/relations";
import PostForm from "./PostForm";
import Reveal from "@/components/motion/Reveal";
import StaggerGrid from "@/components/motion/StaggerGrid";

export default async function CommunityPage() {
  const supabase = await createClient();
  const [pets, { data: posts }] = await Promise.all([
    getAccessiblePets(),
    supabase
      .from("community_posts")
      .select("id, content, created_at, profiles(full_name), pets(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <Reveal className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Paw Community</h1>
        <p className="page-subtitle">
          Tips, questions, and wins from other pet parents on Pet Passport.
        </p>
      </div>

      <PostForm pets={pets} />

      <StaggerGrid className="flex flex-col gap-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => {
            const author = one(post.profiles);
            const pet = one(post.pets);
            return (
              <div key={post.id} className="card-compact">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-medium text-stone-900">{author?.full_name ?? "Pet parent"}</span>
                  {pet && <span className="text-stone-400">· {pet.name}</span>}
                  <span className="text-stone-400">
                    · {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-stone-800">{post.content}</p>
              </div>
            );
          })
        ) : (
          <div className="empty-state">No posts yet — be the first to share something.</div>
        )}
      </StaggerGrid>
    </Reveal>
  );
}
