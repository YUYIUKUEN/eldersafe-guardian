import { createSupabaseServerClient } from "@eldersafe/shared";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(toSet) {
      try {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Elder app does not use Auth sessions; ignore read-only cookie writes.
      }
    },
  });
}
