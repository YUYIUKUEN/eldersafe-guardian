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
        // Called from a Server Component where cookies are read-only;
        // proxy.ts is responsible for refreshing sessions.
      }
    },
  });
}
