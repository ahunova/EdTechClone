// @ts-nocheck — Deno Edge Function, type-checked by Deno runtime, not tsc
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { username, full_name, password, role } = await req.json();

    // ── Basic field validation ──────────────────────────────────
    if (!username || !password) {
      return json({ error: 'Username va parol majburiy' }, 400);
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return json(
        { error: 'Username faqat harf, raqam va _ belgisidan iborat, 3-30 belgi' },
        400
      );
    }

    if (password.length < 6) {
      return json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' }, 400);
    }

    // ── Role permission check ───────────────────────────────────
    // Determine whether the caller is an authenticated admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('authorization') ?? '';
    let callerIsAdmin = false;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();
        callerIsAdmin = profile?.role === 'admin';
      }
    }

    // Only admins may assign teacher or admin roles
    const requestedRole: string = role ?? 'student';
    if (!['student', 'teacher', 'admin'].includes(requestedRole)) {
      return json({ error: "Noto'g'ri rol" }, 400);
    }
    if (['teacher', 'admin'].includes(requestedRole) && !callerIsAdmin) {
      return json(
        { error: 'Faqat admin teacher yoki admin rolini belgilashi mumkin' },
        403
      );
    }

    // Public self-registration is always student
    const finalRole = callerIsAdmin ? requestedRole : 'student';

    // ── Duplicate username check ────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return json({ error: 'Bu username band, boshqa tanlang' }, 409);
    }

    // ── Create auth user ────────────────────────────────────────
    const email = `${username}@eduai.internal`;
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: full_name?.trim() || username,
        role: finalRole,
      },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    // ── Ensure profile row has correct role ─────────────────────
    if (authData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: finalRole, full_name: full_name?.trim() || username })
        .eq('id', authData.user.id);
    }

    return json({ success: true, user_id: authData.user?.id });
  } catch (err) {
    console.error('register-user error:', err);
    return json({ error: 'Server xatosi' }, 500);
  }
});
