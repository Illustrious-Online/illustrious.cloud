import SteamAuth from "npm:node-steam-openid";
import { createClient } from "jsr:@supabase/supabase-js";
import { serve } from "https://deno.land/x/supabase_edge_serve@1.0.0/mod.ts";
import { corsHeaders } from "../../supabase/_shared/cors.js";

// Supabase credentials
const SUPABASE_ID = Deno.env.get("IDENTIFIER");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STEAM_API_KEY = Deno.env.get("STEAM_API_KEY");

// Initialize Supabase client (for managing users)
const supabase = createClient(
  `https://${SUPABASE_ID}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY,
);

const steam = new SteamAuth({
  realm: "http://localhost:3000",
  returnUrl: "http://localhost:3000/profile/steam/link/callback",
  apiKey: STEAM_API_KEY,
});

async function handleAuthUrl() {
  const authUrl = await steam.getRedirectUrl();

  return new Response(JSON.stringify({ url: authUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// Callback handler after Steam authentication
async function handleCallback(req: Request) {
  try {
    const data = await req.json();
    const { url, userId } = data;

    const parsedUrl = new URL(url);
    const queryParams: { [key: string]: string } = {};
    parsedUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Mock up the Request object (simplified version)
    const request = {
      url: url,
      method: "GET", // Assuming GET request; change accordingly
      query: queryParams, // Parsed query parameters
      params: {}, // Assume no path parameters for simplicity
      body: {}, // Empty body (mocked)
      headers: {}, // Empty headers (mocked)
    };

    const auth = await steam.authenticate(request);
    const steamId = auth.steamId;

    const { user: updatedUser, error: updateError } =
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { steamId },
      });

    if (!updatedUser || updateError) {
      return new Response("User update error", { status: 500 });
    }

    return new Response(JSON.stringify({ message: "Steam profile linked" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling callback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Main function to handle Steam authentication
serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (url.pathname === "/steam-auth") {
    handleAuthUrl();
  } else if (url.pathname === "/steam-auth/authenticate") {
    handleCallback(req);
  }

  return new Response("Not found", {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 404,
  });
});
