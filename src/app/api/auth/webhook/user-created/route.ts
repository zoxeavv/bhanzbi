import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isEmailAllowedForAdmin, markEmailAsUsedIfAdmin } from '@/lib/auth/adminAllowlist';
import { getRequiredDefaultOrgId } from '@/lib/config/org';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.AUTH_WEBHOOK_SECRET;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * POST /api/auth/webhook/user-created
 * 
 * Webhook appelé par Supabase après la création d'un utilisateur (via Database Trigger ou Auth Hook).
 * Met à jour le rôle de l'utilisateur basé sur l'allowlist admin_allowed_emails.
 * 
 * COMPORTEMENT :
 * - Si le rôle est déjà défini dans user_metadata.role → ne rien faire (idempotence)
 * - Si l'email est dans l'allowlist → attribuer user_metadata.role = "ADMIN"
 * - Si l'email n'est PAS dans l'allowlist → NE PAS attribuer de rôle, logger un warning
 * 
 * IMPORTANT :
 * - Ce webhook ne crée JAMAIS de compte avec rôle "USER"
 * - Seuls les emails autorisés dans l'allowlist peuvent recevoir un rôle
 * - Si un compte est créé manuellement avec un email non autorisé, aucun rôle ne sera attribué
 * 
 * SÉCURITÉ :
 * - Nécessite SUPABASE_SERVICE_ROLE_KEY pour mettre à jour user_metadata
 * - Nécessite le header "x-webhook-secret" avec la valeur de AUTH_WEBHOOK_SECRET pour authentifier la requête
 * - Peut être configuré comme webhook dans Supabase Dashboard > Database > Webhooks
 * - Ou comme Auth Hook dans Supabase Dashboard > Authentication > Hooks
 * 
 * CONFIGURATION DU SECRET :
 * - Définir AUTH_WEBHOOK_SECRET dans les variables d'environnement
 * - Configurer le header "x-webhook-secret" dans Supabase Dashboard lors de la création du webhook
 * - La valeur du header doit correspondre exactement à AUTH_WEBHOOK_SECRET
 * 
 * Payload attendu (exemple pour Database Trigger) :
 * {
 *   "type": "INSERT",
 *   "table": "auth.users",
 *   "record": {
 *     "id": "user-uuid",
 *     "email": "user@example.com",
 *     ...
 *   }
 * }
 * 
 * Payload attendu (exemple pour Auth Hook) :
 * {
 *   "type": "user.created",
 *   "user": {
 *     "id": "user-uuid",
 *     "email": "user@example.com",
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification du secret webhook pour authentifier la requête
    if (webhookSecret) {
      const providedSecret = request.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.warn('[POST /api/auth/webhook/user-created] Invalid or missing webhook secret');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    if (!supabaseServiceKey) {
      console.warn('[POST /api/auth/webhook/user-created] SUPABASE_SERVICE_ROLE_KEY not configured, skipping role assignment');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await request.json();
    
    // Extraire l'utilisateur depuis le payload (supporte différents formats de webhook)
    let userId: string | undefined;
    let userEmail: string | undefined;

    // Format Database Trigger
    if (body.record && body.record.id && body.record.email) {
      userId = body.record.id;
      userEmail = body.record.email;
    }
    // Format Auth Hook
    else if (body.user && body.user.id && body.user.email) {
      userId = body.user.id;
      userEmail = body.user.email;
    }
    // Format direct
    else if (body.id && body.email) {
      userId = body.id;
      userEmail = body.email;
    }

    if (!userId || !userEmail) {
      console.error('[POST /api/auth/webhook/user-created] Invalid payload:', body);
      return NextResponse.json(
        { error: 'Invalid payload: missing user id or email' },
        { status: 400 }
      );
    }

    // Normaliser l'email
    const normalizedEmail = userEmail.trim().toLowerCase();

    // Vérifier si le rôle est déjà défini dans user_metadata
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId);

    if (getUserError) {
      console.error('[POST /api/auth/webhook/user-created] Error getting user:', getUserError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 500 }
      );
    }

    // Si le rôle est déjà défini, ne pas le modifier (idempotence)
    if (userData.user?.user_metadata?.role) {
      console.log('[POST /api/auth/webhook/user-created] User already has role:', userData.user.user_metadata.role);
      return NextResponse.json({ ok: true, skipped: true, reason: 'role_already_set' });
    }

    // IMPORTANT : orgId doit être défini pour vérifier l'allowlist
    let orgId: string;
    try {
      orgId = getRequiredDefaultOrgId();
    } catch (error) {
      console.error('[POST /api/auth/webhook/user-created] DEFAULT_ORG_ID is not configured:', error);
      return NextResponse.json(
        { error: 'Server configuration error: DEFAULT_ORG_ID is not configured' },
        { status: 500 }
      );
    }
    
    // Vérifier si l'email est autorisé dans l'allowlist
    const isEmailAllowed = await isEmailAllowedForAdmin(normalizedEmail, orgId);
    
    if (!isEmailAllowed) {
      // Email non autorisé : ne PAS attribuer de rôle (ne jamais créer de USER)
      // Ce cas ne devrait normalement pas arriver car /api/auth/register bloque l'inscription
      // Mais peut arriver si un compte est créé manuellement dans Supabase Dashboard
      console.warn('[POST /api/auth/webhook/user-created] Email not allowed in allowlist:', {
        userId,
        email: normalizedEmail,
        message: 'User created with non-authorized email. No role assigned. This user should not exist according to product model.',
      });
      
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'email_not_allowed',
        userId,
        email: normalizedEmail,
        message: 'Email not in allowlist. No role assigned.',
      });
    }

    // Email autorisé : attribuer le rôle ADMIN
    const role = 'ADMIN';

    // Mettre à jour user_metadata avec le rôle ADMIN
    const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...userData.user?.user_metadata,
          role,
          ...(orgId ? { org_id: orgId } : {}),
        },
      }
    );

    if (updateError) {
      console.error('[POST /api/auth/webhook/user-created] Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    // Marquer l'email comme utilisé dans l'allowlist
    await markEmailAsUsedIfAdmin(normalizedEmail, orgId);

    console.log('[POST /api/auth/webhook/user-created] User role assigned:', {
      userId,
      email: normalizedEmail,
      role,
    });

    return NextResponse.json({
      ok: true,
      userId,
      email: normalizedEmail,
      role,
    });
  } catch (error) {
    console.error('[POST /api/auth/webhook/user-created] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

