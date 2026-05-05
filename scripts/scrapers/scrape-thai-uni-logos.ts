/**
 * Thai University Logo Scraper - Uses Wikipedia/Wikimedia Commons logos
 * More reliable than scraping individual university websites
 * 
 * Usage: npx tsx scripts/scrapers/scrape-thai-uni-logos.ts
 * 
 * Logos source: Wikimedia Commons (public domain)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Thai university name mappings to search queries for Wikimedia Commons
const UNIVERSITY_LOGOS: Record<string, { names: string[]; searchQuery: string }> = {
  "001": {
    names: ["จุฬาลงกรณ์มหาวิทยาลัย", "Chulalongkorn University"],
    searchQuery: "Chulalongkorn University logo"
  },
  "002": {
    names: ["มหาวิทยาลัยเกษตรศาสตร์", "Kasetsart University"],
    searchQuery: "Kasetsart University logo"
  },
  "003": {
    names: ["มหาวิทยาลัยขอนแก่น", "Khon Kaen University"],
    searchQuery: "Khon Kaen University logo"
  },
  "004": {
    names: ["มหาวิทยาลัยเชียงใหม่", "Chiang Mai University"],
    searchQuery: "Chiang Mai University logo"
  },
  "005": {
    names: ["มหาวิทยาลัยธรรมศาสตร์", "Thammasat University"],
    searchQuery: "Thammasat University logo"
  },
  "006": {
    names: ["มหาวิทยาลัยมหิดล", "Mahidol University"],
    searchQuery: "Mahidol University logo"
  },
  "008": {
    names: ["มหาวิทยาลัยศิลปากร", "Silpakorn University"],
    searchQuery: "Silpakorn University logo"
  },
  "010": {
    names: ["มหาวิทยาลัยสงขลานครินทร์", "Prince of Songkla University"],
    searchQuery: "Prince of Songkla University logo"
  },
  "014": {
    names: ["มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี", "KMUTT"],
    searchQuery: "KMUTT logo"
  },
  "017": {
    names: ["มหาวิทยาลัยเทคโนโลยีสุรนารี", "Suranaree University"],
    searchQuery: "Suranaree University logo"
  },
  "051": {
    names: ["มหาวิทยาลัยกรุงเทพ", "Bangkok University"],
    searchQuery: "Bangkok University logo"
  },
  "054": {
    names: ["มหาวิทยาลัยศรีปทุม", "Sripatum University"],
    searchQuery: "Sripatum University logo"
  },
  "034": {
    names: ["มหาวิทยาลัยรามคำแหง", "Ramkhamhaeng University"],
    searchQuery: "Ramkhamhaeng University logo"
  },
  "068": {
    names: ["มหาวิทยาลัยรังสิต", "Rangsit University"],
    searchQuery: "Rangsit University logo"
  },
  "019": {
    names: ["มหาวิทยาลัยบูรพา", "Burapha University"],
    searchQuery: "Burapha University logo"
  },
  "021": {
    names: ["มหาวิทยาลัยมหาสารคาม", "Maha Sarakham University"],
    searchQuery: "Maha Sarakham University logo"
  },
  "013": {
    names: ["มหาวิทยาลัยแม่โจ้", "Mae Jo University"],
    searchQuery: "Maejo University logo"
  },
  "020": {
    names: ["มหาวิทยาลัยนเรศวร", "Naresuan University"],
    searchQuery: "Naresuan University logo"
  },
  "015": {
    names: ["มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", "KMUTNB"],
    searchQuery: "KMUTNB logo"
  },
};

const TEMP_DIR = "/tmp/uni-logos";
const OUTPUT_DIR = "./assets/universities";

async function getWikimediaUrl(searchQuery: string): Promise<string | null> {
  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&srnamespace=6&srlimit=5`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = data.query?.search || [];
    
    // Find first SVG or PNG result
    for (const result of results) {
      const title = result.title;
      if (title.match(/\.(svg|png|jpg)$/i)) {
        // Get the actual URL for this file
        const fileApiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
        const fileResponse = await fetch(fileApiUrl);
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const pages = fileData.query?.pages || {};
          for (const page of Object.values(pages) as any[]) {
            if (page.imageinfo?.[0]?.url) {
              return page.imageinfo[0].url;
            }
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.log(`  API error: ${err}`);
    return null;
  }
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`  Downloading: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  Failed: ${response.status}`);
      return false;
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    const stats = fs.statSync(outputPath);
    console.log(`  Downloaded: ${stats.size} bytes`);
    return stats.size > 100;
  } catch (err) {
    console.log(`  Error: ${err}`);
    return false;
  }
}

function optimizeWithMagick(inputPath: string, outputPath: string, size = 128): boolean {
  try {
    const isSvg = inputPath.toLowerCase().endsWith('.svg');
    console.log(`  Optimizing with ImageMagick v7 (${size}x${size})...`);
    
    if (isSvg) {
      // For SVG: convert to PNG with sizing
      execSync(
        `magick -background none "${inputPath}" -resize ${size}x${size} PNG8:"${outputPath}"`,
        { stdio: "pipe" }
      );
    } else {
      // For PNG: resize and optimize
      execSync(
        `magick "${inputPath}" -resize ${size}x${size}^ -gravity center -extent ${size}x${size} -colors 256 PNG8:"${outputPath}"`,
        { stdio: "pipe" }
      );
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`  Optimized: ${stats.size} bytes`);
    return true;
  } catch (err: any) {
    console.log(`  ImageMagick error: ${err?.message?.split('\n')[0] || err}`);
    return false;
  }
}

async function uploadToStorage(filePath: string, storagePath: string): Promise<string | null> {
  try {
    // Use B2 via Python subprocess - more reliable than Supabase Storage
    const bucketName = process.env.B2_BUCKET_NAME || 'pseed-dev';
    const bucketPrefix = 'universities';
    
    const destName = `${bucketPrefix}/${path.basename(storagePath)}`;
    const pythonScript = `
from b2sdk.v2 import B2Api
import os, sys

env = {}
with open('.env', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v

b2_api = B2Api()
b2_api.authorize_account('production', env.get('B2_APPLICATION_KEY_ID', ''), env.get('B2_APPLICATION_KEY', ''))
bucket = b2_api.get_bucket_by_name(env.get('B2_BUCKET_NAME', 'pseed-dev'))
bucket.upload_local_file(local_file=sys.argv[1], file_name=sys.argv[2])
print('ok')
`;

    const result = execSync(`python3 -c "${pythonScript.replace(/\n/g, '; ')}" "${filePath}" "${destName}"`, { cwd: process.cwd() });
    
    if (result.toString().includes('ok')) {
      // CDN URL: https://cdn.passionseed.org/{path}
      const cdnUrl = `https://cdn.passionseed.org/${destName}`;
      console.log(`  Uploaded to B2, CDN: ${cdnUrl}`);
      return cdnUrl;
    }
    
    console.log(`  Upload failed`);
    return null;
  } catch (err: any) {
    console.log(`  B2 upload error: ${err?.message?.split('\n')[0] || err}`);
    // Fallback: save locally
    const localDest = path.join(OUTPUT_DIR, path.basename(filePath));
    fs.copyFileSync(filePath, localDest);
    console.log(`  Saved locally: ${localDest}`);
    return localDest;
  }
}

async function updateUniversityLogo(universityId: string, logoUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("tcas_universities")
      .update({ logo_url: logoUrl })
      .eq("university_id", universityId);

    if (error) {
      console.log(`  DB error: ${error.message}`);
      return false;
    }
    console.log(`  Updated DB`);
    return true;
  } catch (err) {
    console.log(`  DB error: ${err}`);
    return false;
  }
}

async function processUniversity(universityId: string, info: { names: string[]; searchQuery: string }) {
  console.log(`\nProcessing: ${info.names[0]} (${universityId})`);

  // Ensure directories exist
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get download URL from Wikimedia search
  console.log(`  Searching: ${info.searchQuery}`);
  const logoUrl = await getWikimediaUrl(info.searchQuery);
  if (!logoUrl) {
    console.log("  Could not find logo URL");
    return { universityId, success: false };
  }
  console.log(`  Found: ${logoUrl}`);

  // Determine temp file extension (SVG or PNG)
  const isSvg = logoUrl.toLowerCase().includes('.svg');
  const tempPath = path.join(TEMP_DIR, `${universityId}_original${isSvg ? '.svg' : '.png'}`);
  
  // Download logo
  if (!await downloadImage(logoUrl, tempPath)) {
    return { universityId, success: false };
  }

  // Optimize with ImageMagick
  const outputPath = path.join(OUTPUT_DIR, `${universityId}.png`);
  if (!optimizeWithMagick(tempPath, outputPath)) {
    // If optimization fails, just copy the original
    console.log("  Using original without optimization");
    fs.copyFileSync(tempPath, outputPath);
  }

  // Upload to Supabase Storage (backed by B2)
  const storagePath = `universities/${universityId}.png`;
  const publicUrl = await uploadToStorage(outputPath, storagePath);

  if (publicUrl) {
    // Update database
    const updated = await updateUniversityLogo(universityId, publicUrl);
    if (updated) {
      console.log(`  SUCCESS: ${publicUrl}`);
      return { universityId, success: true, url: publicUrl };
    }
  }

  return { universityId, success: false };
}

async function main() {
  console.log("Thai University Logo Scraper");
  console.log("============================\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results: { universityId: string; success: boolean; url?: string }[] = [];

  // Process each university
  for (const [universityId, info] of Object.entries(UNIVERSITY_LOGOS)) {
    const result = await processUniversity(universityId, info);
    results.push(result);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  // Summary
  console.log("\n\n============================");
  console.log("SUMMARY");
  console.log("============================");
  const successful = results.filter(r => r.success).length;
  console.log(`Successful: ${successful}/${results.length}`);
  
  if (successful > 0) {
    console.log("\nUploaded logos:");
    results.filter(r => r.success).forEach(r => {
      console.log(`  ${r.universityId}: ${r.url}`);
    });
  }
  
  const failed = results.filter(r => !r.success).map(r => r.universityId);
  if (failed.length > 0) {
    console.log("\nFailed:");
    failed.forEach(id => {
      const info = UNIVERSITY_LOGOS[id];
      console.log(`  ${id}: ${info?.names[0] || 'Unknown'}`);
    });
  }
}

main().catch(console.error);
