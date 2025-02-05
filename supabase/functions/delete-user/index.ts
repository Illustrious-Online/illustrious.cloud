import { createClient } from "jsr:@supabase/supabase-js";
import { serve } from "https://deno.land/x/supabase_edge_serve@1.0.0/mod.ts";

// Supabase credentials
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Initialize Supabase client (for managing users)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

async function handle(user?: string) {
  if (!user) {
    return new Response("Missing user ID for authentication delete", { status: 409 });
  }

  const { data, error } = await supabase.auth.admin.deleteUser(user);

  if (error) {
    console.error("Error handling action:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response(JSON.stringify({ data, message: "User has been removed from IAM" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

// Main function to handle Steam authentication
serve(async (req: Request) => {
  const data = await req.json();
  const url = new URL(req.url);

  if (url.pathname.includes("/delete-user")) {
    handle(data.user);
  }

  return new Response("Not found", {
    headers: { "Content-Type": "application/json" },
    status: 404,
  });
});
