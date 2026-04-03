import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { scrypt } from "https://esm.sh/@noble/hashes@1.4.0/scrypt";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function verifyPassword(password: string, stored: string, email: string): boolean {
  try {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) {
      console.log(`[${email}] Invalid stored hash format:`, stored);
      return false;
    }
    const expectedHash = hexToBytes(hashHex);
    const saltBytes = hexToBytes(saltHex);
    
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Try method 1: Salt as hex string chars (legacy?)
    const derived1 = scrypt(passwordBytes, encoder.encode(saltHex), { N: 16384, r: 8, p: 1, dkLen: 64 });
    if (timingSafeEqual(derived1, expectedHash)) {
      console.log(`[${email}] SUCCESS: Matched using salt-as-chars (method 1)`);
      return true;
    }

    // Try method 2: Salt as actual bytes (standard)
    const derived2 = scrypt(passwordBytes, saltBytes, { N: 16384, r: 8, p: 1, dkLen: 64 });
    if (timingSafeEqual(derived2, expectedHash)) {
      console.log(`[${email}] SUCCESS: Matched using salt-as-bytes (method 2)`);
      return true;
    }

    console.log(`[${email}] FAILED: Both salt hashing methods mismatched`);
    return false;
  } catch (e) {
    console.error(`[${email}] Error in verifyPassword:`, e);
    return false;
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: participant, error: fetchError } = await supabase
      .from("hackathon_participants")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (fetchError || !participant) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!verifyPassword(password, participant.password_hash, email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: sessionError } = await supabase
      .from("hackathon_sessions")
      .insert({
        participant_id: participant.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) throw sessionError;

    const { password_hash: _, ...safe } = participant;

    return new Response(
      JSON.stringify({ participant: safe, token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("hackathon-login error:", err);
    return new Response(
      JSON.stringify({ error: "Login failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
