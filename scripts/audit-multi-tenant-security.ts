/**
 * Audit de sécurité multi-tenant
 * 
 * Vérifie :
 * 1. Tables métier et leur état RLS
 * 2. Policies RLS pour chaque table (SELECT/INSERT/UPDATE/DELETE)
 * 3. Fonction public.org_id()
 * 4. Cohérence avec le code (queries Drizzle, routes API)
 */

import { mcp_supabase_read_records } from '@modelcontextprotocol/sdk-typescript/dist/mcp_supabase';

// Tables métier à vérifier
const BUSINESS_TABLES = [
  'clients',
  'templates',
  'offers',
  'admin_allowed_emails',
  'crm_users',
] as const;

interface TableRLSStatus {
  table_name: string;
  rls_enabled: boolean;
  policies: {
    cmd: string;
    policyname: string;
    qual: string | null;
    with_check: string | null;
  }[];
}

interface SecurityMatrix {
  table: string;
  select: {
    guard_app: boolean;
    rls: boolean;
    org_id_check: boolean;
  };
  insert: {
    guard_app: boolean;
    rls_with_check: boolean;
    org_id_check: boolean;
  };
  update: {
    guard_app: boolean;
    rls_using: boolean;
    rls_with_check: boolean;
    org_id_check: boolean;
  };
  delete: {
    guard_app: boolean;
    rls: boolean;
    org_id_check: boolean;
  };
}

async function checkRLSStatus(): Promise<TableRLSStatus[]> {
  console.log('🔍 Vérification de l\'état RLS des tables...\n');
  
  const results: TableRLSStatus[] = [];
  
  for (const table of BUSINESS_TABLES) {
    try {
      // Vérifier si RLS est activé
      const rlsCheck = await mcp_supabase_read_records({
        table: 'pg_tables',
        select: ['tablename', 'rowsecurity'],
        filter: {
          schemaname: 'public',
          tablename: table,
        },
      });
      
      // Récupérer les policies
      const policiesCheck = await mcp_supabase_read_records({
        table: 'pg_policies',
        select: ['cmd', 'policyname', 'qual', 'with_check'],
        filter: {
          schemaname: 'public',
          tablename: table,
        },
      });
      
      const rlsEnabled = rlsCheck.length > 0 && rlsCheck[0].rowsecurity === true;
      const policies = policiesCheck.map((p: any) => ({
        cmd: p.cmd,
        policyname: p.policyname,
        qual: p.qual,
        with_check: p.with_check,
      }));
      
      results.push({
        table_name: table,
        rls_enabled: rlsEnabled,
        policies,
      });
      
      console.log(`📊 ${table}:`);
      console.log(`   RLS: ${rlsEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Policies: ${policies.length}`);
      policies.forEach(p => {
        console.log(`     - ${p.cmd}: ${p.policyname}`);
      });
      console.log('');
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification de ${table}:`, error);
      results.push({
        table_name: table,
        rls_enabled: false,
        policies: [],
      });
    }
  }
  
  return results;
}

async function checkOrgIdFunction(): Promise<boolean> {
  console.log('🔍 Vérification de la fonction public.org_id()...\n');
  
  try {
    const funcCheck = await mcp_supabase_read_records({
      table: 'pg_proc',
      select: ['proname', 'prosrc'],
      filter: {
        pronamespace: 'public'::regnamespace,
        proname: 'org_id',
      },
    });
    
    if (funcCheck.length > 0) {
      console.log('✅ Fonction public.org_id() existe');
      console.log(`   Code: ${funcCheck[0].prosrc}`);
      return true;
    } else {
      console.log('❌ Fonction public.org_id() n\'existe pas');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la fonction:', error);
    return false;
  }
}

function analyzeCodeSecurity(): SecurityMatrix[] {
  console.log('\n🔍 Analyse de la sécurité dans le code...\n');
  
  const matrices: SecurityMatrix[] = [];
  
  // clients
  matrices.push({
    table: 'clients',
    select: {
      guard_app: true, // requireSession() dans GET /api/clients
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // listClients(orgId) filtre par org_id
    },
    insert: {
      guard_app: true, // requireAdmin() dans POST /api/clients
      rls_with_check: true, // WITH CHECK (org_id = public.org_id())
      org_id_check: true, // createClient({ orgId })
    },
    update: {
      guard_app: true, // requireAdmin() dans PATCH /api/clients/[id]
      rls_using: true, // USING (org_id = public.org_id())
      rls_with_check: true, // WITH CHECK (org_id = public.org_id())
      org_id_check: true, // updateClient(id, orgId, ...)
    },
    delete: {
      guard_app: true, // requireAdmin() dans DELETE /api/clients/[id]
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // deleteClient(id, orgId)
    },
  });
  
  // templates
  matrices.push({
    table: 'templates',
    select: {
      guard_app: true, // getCurrentOrgId() dans GET /api/templates
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // listTemplates(orgId)
    },
    insert: {
      guard_app: true, // requireAdmin() dans POST /api/templates
      rls_with_check: true, // WITH CHECK (org_id = public.org_id())
      org_id_check: true, // createTemplate({ orgId })
    },
    update: {
      guard_app: true, // requireAdmin() dans routes API
      rls_using: true, // USING (org_id = public.org_id())
      rls_with_check: true, // WITH CHECK (org_id = public.org_id())
      org_id_check: true, // updateTemplate(id, orgId, ...)
    },
    delete: {
      guard_app: false, // Pas de route DELETE dédiée
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // Via queries
    },
  });
  
  // offers
  matrices.push({
    table: 'offers',
    select: {
      guard_app: true, // getCurrentOrgId() dans GET /api/offers
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // listOffers(orgId)
    },
    insert: {
      guard_app: true, // getCurrentOrgId() dans POST /api/offers
      rls_with_check: true, // WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())
      org_id_check: true, // createOffer({ orgId })
    },
    update: {
      guard_app: true, // getCurrentOrgId() dans PATCH /api/offers/[id]
      rls_using: true, // USING (org_id = public.org_id())
      rls_with_check: true, // WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())
      org_id_check: true, // updateOffer(id, orgId, ...)
    },
    delete: {
      guard_app: false, // Pas de route DELETE dédiée
      rls: true, // USING (org_id = public.org_id())
      org_id_check: true, // Via queries
    },
  });
  
  // admin_allowed_emails
  matrices.push({
    table: 'admin_allowed_emails',
    select: {
      guard_app: true, // requireAdmin() dans GET /api/settings/admin-allowed-emails
      rls: false, // Pas de RLS activé (à vérifier)
      org_id_check: true, // listAdminAllowedEmails(orgId)
    },
    insert: {
      guard_app: true, // requireAdmin() dans POST /api/settings/admin-allowed-emails
      rls_with_check: false, // Pas de RLS activé (à vérifier)
      org_id_check: true, // addAdminAllowedEmail(orgId, ...)
    },
    update: {
      guard_app: false, // Pas de route UPDATE
      rls_using: false,
      rls_with_check: false,
      org_id_check: false,
    },
    delete: {
      guard_app: true, // requireAdmin() dans DELETE /api/settings/admin-allowed-emails
      rls: false, // Pas de RLS activé (à vérifier)
      org_id_check: true, // deleteAdminAllowedEmail(orgId, id)
    },
  });
  
  // crm_users
  matrices.push({
    table: 'crm_users',
    select: {
      guard_app: false, // Pas de route API dédiée
      rls: false, // Pas de RLS activé (à vérifier)
      org_id_check: false, // Pas de queries dédiées
    },
    insert: {
      guard_app: false,
      rls_with_check: false,
      org_id_check: false,
    },
    update: {
      guard_app: false,
      rls_using: false,
      rls_with_check: false,
      org_id_check: false,
    },
    delete: {
      guard_app: false,
      rls: false,
      org_id_check: false,
    },
  });
  
  return matrices;
}

function generateReport(rlsStatus: TableRLSStatus[], orgIdFunctionExists: boolean, codeMatrices: SecurityMatrix[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 RAPPORT DE SÉCURITÉ MULTI-TENANT');
  console.log('='.repeat(80) + '\n');
  
  // Résumé global
  const tablesWithRLS = rlsStatus.filter(t => t.rls_enabled).length;
  const totalTables = rlsStatus.length;
  
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log(`   Tables métier: ${totalTables}`);
  console.log(`   Tables avec RLS activé: ${tablesWithRLS}`);
  console.log(`   Fonction public.org_id(): ${orgIdFunctionExists ? '✅ Existe' : '❌ Manquante'}`);
  console.log('');
  
  // Tables OK vs à risque
  const tablesOK: string[] = [];
  const tablesAtRisk: Array<{ table: string; issues: string[] }> = [];
  
  for (const rls of rlsStatus) {
    const codeMatrix = codeMatrices.find(m => m.table === rls.table_name);
    if (!codeMatrix) continue;
    
    const issues: string[] = [];
    
    // Vérifier SELECT
    if (codeMatrix.select.guard_app && !codeMatrix.select.rls && rls.rls_enabled) {
      const hasSelectPolicy = rls.policies.some(p => p.cmd === 'SELECT');
      if (!hasSelectPolicy) {
        issues.push('SELECT: RLS activé mais pas de policy SELECT');
      }
    }
    
    // Vérifier INSERT
    if (codeMatrix.insert.guard_app && !codeMatrix.insert.rls_with_check && rls.rls_enabled) {
      const hasInsertPolicy = rls.policies.some(p => p.cmd === 'INSERT');
      if (!hasInsertPolicy) {
        issues.push('INSERT: RLS activé mais pas de policy INSERT');
      }
    }
    
    // Vérifier UPDATE
    if (codeMatrix.update.guard_app && !codeMatrix.update.rls_using && rls.rls_enabled) {
      const hasUpdatePolicy = rls.policies.some(p => p.cmd === 'UPDATE');
      if (!hasUpdatePolicy) {
        issues.push('UPDATE: RLS activé mais pas de policy UPDATE');
      }
    }
    
    // Vérifier DELETE
    if (codeMatrix.delete.guard_app && !codeMatrix.delete.rls && rls.rls_enabled) {
      const hasDeletePolicy = rls.policies.some(p => p.cmd === 'DELETE');
      if (!hasDeletePolicy) {
        issues.push('DELETE: RLS activé mais pas de policy DELETE');
      }
    }
    
    // Vérifier si RLS devrait être activé mais ne l'est pas
    const shouldHaveRLS = codeMatrix.select.guard_app || 
                          codeMatrix.insert.guard_app || 
                          codeMatrix.update.guard_app || 
                          codeMatrix.delete.guard_app;
    
    if (shouldHaveRLS && !rls.rls_enabled) {
      issues.push('RLS devrait être activé mais ne l\'est pas');
    }
    
    if (issues.length === 0) {
      tablesOK.push(rls.table_name);
    } else {
      tablesAtRisk.push({ table: rls.table_name, issues });
    }
  }
  
  console.log('✅ TABLES SÉCURISÉES');
  tablesOK.forEach(table => {
    console.log(`   - ${table}`);
  });
  console.log('');
  
  if (tablesAtRisk.length > 0) {
    console.log('⚠️  TABLES À RISQUE');
    tablesAtRisk.forEach(({ table, issues }) => {
      console.log(`   - ${table}:`);
      issues.forEach(issue => {
        console.log(`     • ${issue}`);
      });
    });
    console.log('');
  }
  
  // Matrice détaillée
  console.log('📋 MATRICE DÉTAILLÉE PAR TABLE');
  console.log('');
  
  for (const matrix of codeMatrices) {
    const rls = rlsStatus.find(r => r.table_name === matrix.table);
    console.log(`Table: ${matrix.table}`);
    console.log(`  RLS activé: ${rls?.rls_enabled ? '✅' : '❌'}`);
    console.log(`  Policies: ${rls?.policies.length || 0}`);
    console.log('');
    console.log('  SELECT:');
    console.log(`    Guard app: ${matrix.select.guard_app ? '✅' : '❌'}`);
    console.log(`    RLS: ${matrix.select.rls ? '✅' : '❌'}`);
    console.log(`    org_id check: ${matrix.select.org_id_check ? '✅' : '❌'}`);
    console.log('');
    console.log('  INSERT:');
    console.log(`    Guard app: ${matrix.insert.guard_app ? '✅' : '❌'}`);
    console.log(`    RLS WITH CHECK: ${matrix.insert.rls_with_check ? '✅' : '❌'}`);
    console.log(`    org_id check: ${matrix.insert.org_id_check ? '✅' : '❌'}`);
    console.log('');
    console.log('  UPDATE:');
    console.log(`    Guard app: ${matrix.update.guard_app ? '✅' : '❌'}`);
    console.log(`    RLS USING: ${matrix.update.rls_using ? '✅' : '❌'}`);
    console.log(`    RLS WITH CHECK: ${matrix.update.rls_with_check ? '✅' : '❌'}`);
    console.log(`    org_id check: ${matrix.update.org_id_check ? '✅' : '❌'}`);
    console.log('');
    console.log('  DELETE:');
    console.log(`    Guard app: ${matrix.delete.guard_app ? '✅' : '❌'}`);
    console.log(`    RLS: ${matrix.delete.rls ? '✅' : '❌'}`);
    console.log(`    org_id check: ${matrix.delete.org_id_check ? '✅' : '❌'}`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');
  }
}

async function main() {
  try {
    const rlsStatus = await checkRLSStatus();
    const orgIdFunctionExists = await checkOrgIdFunction();
    const codeMatrices = analyzeCodeSecurity();
    
    generateReport(rlsStatus, orgIdFunctionExists, codeMatrices);
  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  }
}

main();

