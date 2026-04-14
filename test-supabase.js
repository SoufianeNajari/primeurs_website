const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Clés manquantes dans .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log(`Test de connexion à ${supabaseUrl}...`);
  
  // Test 1: Tenter de récupérer les produits
  const { data, error } = await supabase.from('produits').select('*').limit(1);
  
  if (error) {
    console.error("\n❌ Erreur lors de la requête 'produits' :");
    console.error(error);
    
    // Si l'erreur est liée au cache de schéma, on peut tenter de forcer le rafraîchissement (sur Supabase, PostgREST met parfois un peu de temps)
  } else {
    console.log("\n✅ Succès ! La table 'produits' a été trouvée.");
    console.log("Données :", data);
  }
}

testConnection();
