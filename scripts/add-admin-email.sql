-- Script SQL pour ajouter thier0811@gmail.com en admin si ce n'est pas déjà le cas
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE_ORG_ID' par votre org_id réel (ou utilisez la version automatique ci-dessous)
-- 2. Exécutez ce script dans votre base de données PostgreSQL/Supabase
-- 3. Le script crée la table admin_allowed_emails si elle n'existe pas
-- 4. Le script utilise INSERT ... ON CONFLICT pour éviter les doublons

-- ============================================
-- CRÉATION DE LA TABLE (si elle n'existe pas)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_allowed_emails (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Ajoute la colonne org_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_allowed_emails'
        AND column_name = 'org_id'
    ) THEN
        ALTER TABLE admin_allowed_emails ADD COLUMN org_id TEXT;
        -- Mettre à jour les lignes existantes avec une valeur par défaut si nécessaire
        UPDATE admin_allowed_emails SET org_id = 'default-org-id' WHERE org_id IS NULL;
        -- Rendre la colonne NOT NULL après avoir rempli les valeurs
        ALTER TABLE admin_allowed_emails ALTER COLUMN org_id SET NOT NULL;
    END IF;
END $$;

-- Création de l'index unique composite sur (org_id, email) si il n'existe pas
CREATE UNIQUE INDEX IF NOT EXISTS admin_allowed_emails_org_id_email_unique 
ON admin_allowed_emails(org_id, email);

-- ============================================
-- VERSION SIMPLE : Si vous connaissez l'org_id
-- ============================================
-- Décommentez et modifiez cette section si vous connaissez votre org_id :

/*
DO $$
DECLARE
    v_org_id TEXT := 'VOTRE_ORG_ID';  -- Remplacez par votre org_id
    v_email TEXT := LOWER(TRIM('thier0811@gmail.com'));
    v_created_by TEXT;
BEGIN
    -- Récupère un created_by existant ou utilise 'system'
    SELECT COALESCE(
        (SELECT id::text FROM auth.users WHERE email = v_email LIMIT 1),
        (SELECT created_by FROM admin_allowed_emails LIMIT 1),
        'system'
    ) INTO v_created_by;
    
    -- Insère seulement si l'email n'existe pas déjà pour cet org_id
    INSERT INTO admin_allowed_emails (org_id, email, created_by)
    VALUES (v_org_id, v_email, v_created_by)
    ON CONFLICT (admin_allowed_emails_org_id_email_unique) DO NOTHING;
    
    RAISE NOTICE 'Email % ajouté en admin pour org_id % (ou déjà existant)', v_email, v_org_id;
END $$;
*/

-- ============================================
-- VERSION AUTOMATIQUE : Récupère l'org_id automatiquement
-- ============================================
-- Cette version récupère l'org_id depuis les admins existants ou utilise une valeur par défaut

DO $$
DECLARE
    v_org_id TEXT;
    v_email TEXT := LOWER(TRIM('thier0811@gmail.com'));
    v_created_by TEXT;
    v_admin_exists BOOLEAN;
BEGIN
    -- Vérifie si la table admin_allowed_emails a des données
    SELECT EXISTS (
        SELECT 1 FROM admin_allowed_emails LIMIT 1
    ) INTO v_admin_exists;
    
    -- Récupère l'org_id depuis les admins existants, ou utilise une valeur par défaut
    -- ⚠️ IMPORTANT : Remplacez 'default-org-id' par votre org_id réel si nécessaire
    SELECT COALESCE(
        CASE WHEN v_admin_exists THEN (SELECT DISTINCT org_id FROM admin_allowed_emails LIMIT 1) ELSE NULL END,
        'default-org-id'  -- ⚠️ REMPLACEZ par votre org_id par défaut si nécessaire
    ) INTO v_org_id;
    
    -- Récupère un created_by existant ou utilise 'system'
    -- Vérifie d'abord si auth.users existe (Supabase)
    SELECT COALESCE(
        (SELECT id::text FROM auth.users WHERE email = v_email LIMIT 1),
        CASE WHEN v_admin_exists THEN (SELECT created_by FROM admin_allowed_emails LIMIT 1) ELSE NULL END,
        'system'
    ) INTO v_created_by;
    
    -- Vérifie si l'email existe déjà pour cet org_id
    IF EXISTS (
        SELECT 1 FROM admin_allowed_emails 
        WHERE org_id = v_org_id 
        AND email = v_email
    ) THEN
        RAISE NOTICE 'Email % est déjà admin pour org_id %', v_email, v_org_id;
    ELSE
        -- Insère l'email en admin
        INSERT INTO admin_allowed_emails (org_id, email, created_by)
        VALUES (v_org_id, v_email, v_created_by);
        
        RAISE NOTICE 'Email % ajouté en admin pour org_id %', v_email, v_org_id;
    END IF;
END $$;

-- ============================================
-- VÉRIFICATION : Affiche le résultat
-- ============================================
SELECT 
    id,
    org_id,
    email,
    created_by,
    created_at,
    used_at
FROM admin_allowed_emails 
WHERE email = LOWER(TRIM('thier0811@gmail.com'))
ORDER BY created_at DESC;

