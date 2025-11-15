import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assignInitialRoleForNewUser, markEmailAsUsedIfAdmin, isEmailAllowedForAdmin } from '@/lib/auth/adminAllowlist';
import { getRequiredDefaultOrgId } from '@/lib/config/org';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Optionnel

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * POST /api/auth/register
 * 
 * Crée un nouvel utilisateur dans Supabase avec attribution automatique du rôle
 * basé sur l'allowlist admin_allowed_emails.
 * 
 * SÉCURITÉ :
 * - Utilise la clé de service si disponible pour créer l'utilisateur avec le bon rôle
 * - Sinon, crée l'utilisateur avec la clé anonyme et met à jour le rôle après (nécessite service key)
 * - Le rôle est déterminé en vérifiant si l'email est dans admin_allowed_emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;

    // Validation des paramètres
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normaliser l'email
    const normalizedEmail = email.trim().toLowerCase();

    // IMPORTANT : orgId doit être défini, sinon l'attribution du rôle échouera silencieusement
    let orgId: string;
    try {
      orgId = getRequiredDefaultOrgId();
    } catch (error) {
      console.error('[POST /api/auth/register] DEFAULT_ORG_ID is not configured:', error);
      return NextResponse.json(
        { error: 'Server configuration error: DEFAULT_ORG_ID is not configured' },
        { status: 500 }
      );
    }

    // Vérifier si l'email est autorisé AVANT toute création de compte
    const isEmailAllowed = await isEmailAllowedForAdmin(normalizedEmail, orgId);
    if (!isEmailAllowed) {
      console.warn('[POST /api/auth/register] Email not allowed:', normalizedEmail);
      return NextResponse.json(
        { 
          error: 'EMAIL_NOT_ALLOWED',
          message: "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur."
        },
        { status: 403 }
      );
    }
    
    // Déterminer le rôle initial basé sur l'allowlist (sera toujours ADMIN car email autorisé)
    const initialRole = await assignInitialRoleForNewUser(normalizedEmail, orgId);

    // Si la clé de service est disponible, utiliser admin.createUser pour créer l'utilisateur avec le rôle
    if (supabaseServiceKey) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // Auto-confirmer l'email (ou false selon votre config)
        user_metadata: {
          display_name: display_name || normalizedEmail.split('@')[0],
          role: initialRole,
          ...(orgId ? { org_id: orgId } : {}),
        },
      });

      if (error) {
        console.error('[POST /api/auth/register] Admin createUser error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to create account' },
          { status: 400 }
        );
      }

      // Si l'utilisateur a été créé avec succès et que c'est un admin, marquer l'email comme utilisé
      if (data.user && initialRole === 'ADMIN') {
        await markEmailAsUsedIfAdmin(normalizedEmail, orgId);
      }

      return NextResponse.json({
        user: data.user,
        // Note: admin.createUser ne retourne pas de session, l'utilisateur devra se connecter
      });
    }

    // Sinon, utiliser signUp avec la clé anonyme (le rôle sera dans user_metadata)
    const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signUpData, error: signUpError } = await anonSupabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          display_name: display_name || normalizedEmail.split('@')[0],
          role: initialRole,
          ...(orgId ? { org_id: orgId } : {}),
        },
      },
    });

    if (signUpError) {
      console.error('[POST /api/auth/register] SignUp error:', signUpError);
      return NextResponse.json(
        { error: signUpError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // Si l'utilisateur a été créé et que c'est un admin, marquer l'email comme utilisé
    if (signUpData.user && initialRole === 'ADMIN') {
      await markEmailAsUsedIfAdmin(normalizedEmail, orgId);
    }

    return NextResponse.json({
      user: signUpData.user,
      session: signUpData.session,
    });
  } catch (error) {
    console.error('[POST /api/auth/register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

