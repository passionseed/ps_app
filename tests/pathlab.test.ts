import { getAvailableSeeds } from "../lib/pathlab";
import * as dotenv from "dotenv";

// Try to load .env or .env.local
dotenv.config();
dotenv.config({ path: ".env.local" });

async function testSeededData() {
  console.log("🔍 Checking for seeded UX Designer Pathlab...");
  try {
    const seeds = await getAvailableSeeds();
    const uxSeed = seeds.find(s => s.title === "UX Designer Discovery");
    
    if (uxSeed) {
      console.log("✅ Found seeded UX Designer Pathlab!");
      console.log(`   - ID: ${uxSeed.id}`);
      console.log(`   - Total Days: ${uxSeed.path?.total_days}`);
      
      if (uxSeed.path?.total_days === 5) {
        console.log("✅ Path has correct number of days (5).");
      } else {
        console.log(`❌ Path has incorrect number of days: ${uxSeed.path?.total_days}`);
        process.exit(1);
      }
    } else {
      console.log("❌ UX Designer Pathlab not found in seeds.");
      console.log("   Available seeds:", seeds.map(s => s.title).join(", "));
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

testSeededData();
