/**
 * University logo mappings and utilities
 * 
 * Maps university IDs and names to CDN URLs for university logos.
 * These are sourced from Supabase Storage (seed-assets bucket).
 * 
 * Run `npx tsx scripts/scrapers/scrape-thai-uni-logos.ts` to update logos.
 */

// CDN URL for university logos (backed by B2)
const CDN_BASE = "https://cdn.passionseed.org";

/**
 * Mapping of English university names (as stored in journey data)
 * to Thai university IDs (as stored in tcas_universities)
 */
export const UNIVERSITY_NAME_TO_ID: Record<string, string> = {
  // English name -> university_id
  "Chulalongkorn University": "001",
  "Kasetsart University": "002",
  "Khon Kaen University": "003",
  "Chiang Mai University": "004",
  "Thammasat University": "005",
  "Mahidol University": "006",
  "Silpakorn University": "008",
  "Prince of Songkla University": "010",
  "Sripatum University": "054",
  "Bangkok University": "051",
  "Ramkhamhaeng University": "034",
  "Rangsit University": "068",
  "Burapha University": "019",
  "Maha Sarakham University": "021",
  "Mae Jo University": "013",
  "Naresuan University": "020",
  "MUT": "061",
  "KMUTT": "014",
  "KMUTNB": "015",
  "Suranaree University": "017",
};

/**
 * Thai university names to IDs (for fuzzy matching)
 */
export const UNIVERSITY_TH_NAME_TO_ID: Record<string, string> = {
  "จุฬาลงกรณ์มหาวิทยาลัย": "001",
  "มหาวิทยาลัยเกษตรศาสตร์": "002",
  "มหาวิทยาลัยขอนแก่น": "003",
  "มหาวิทยาลัยเชียงใหม่": "004",
  "มหาวิทยาลัยธรรมศาสตร์": "005",
  "มหาวิทยาลัยมหิดล": "006",
  "มหาวิทยาลัยศิลปากร": "008",
  "มหาวิทยาลัยสงขลานครินทร์": "010",
  "มหาวิทยาลัยศรีปทุม": "054",
  "มหาวิทยาลัยกรุงเทพ": "051",
  "มหาวิทยาลัยรามคำแหง": "034",
  "มหาวิทยาลัยรังสิต": "068",
  "มหาวิทยาลัยบูรพา": "019",
  "มหาวิทยาลัยมหาสารคาม": "021",
  "มหาวิทยาลัยแม่โจ้": "013",
  "มหาวิทยาลัยนเรศวร": "020",
  "มหาวิทยาลัยเทคโนโลยีมหานคร": "061",
  "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี": "014",
  "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ": "015",
  "มหาวิทยาลัยเทคโนโลยีสุรนารี": "017",
};

/**
 * University IDs that have logos uploaded to storage
 */
const UPLOADED_LOGOS = new Set(["001", "002", "003", "004", "008"]);

/**
 * Get logo URL from CDN for a university
 */
export function getUniversityLogoFromStorage(universityId: string): string {
  return `${CDN_BASE}/universities/${universityId}.png`;
}

/**
 * Get university ID by name (English or Thai)
 */
export function getUniversityIdByName(name: string): string | null {
  // Try exact English match first
  if (UNIVERSITY_NAME_TO_ID[name]) {
    return UNIVERSITY_NAME_TO_ID[name];
  }
  
  // Try Thai match
  if (UNIVERSITY_TH_NAME_TO_ID[name]) {
    return UNIVERSITY_TH_NAME_TO_ID[name];
  }
  
  // Try fuzzy match (contains)
  const lowerName = name.toLowerCase();
  for (const [engName, id] of Object.entries(UNIVERSITY_NAME_TO_ID)) {
    if (lowerName.includes(engName.toLowerCase()) || engName.toLowerCase().includes(lowerName)) {
      return id;
    }
  }
  
  return null;
}

/**
 * Get logo URL for a university by ID.
 * Returns the CDN URL if logo exists, null otherwise.
 */
export function getUniversityLogoUrl(universityId: string): string | null {
  if (UPLOADED_LOGOS.has(universityId)) {
    return getUniversityLogoFromStorage(universityId);
  }
  return null;
}

/**
 * Get logo URL for a university by name.
 * Tries to find the ID first, then returns the logo URL.
 */
export function getLogoUrlByName(name: string): string | null {
  const id = getUniversityIdByName(name);
  if (id) {
    return getUniversityLogoUrl(id);
  }
  return null;
}

/**
 * Get logo info for a university.
 * Returns { url, exists, id } where url is the CDN URL or null.
 */
export function getUniversityLogo(universityId: string): { url: string | null; exists: boolean; id: string } {
  const url = getUniversityLogoUrl(universityId);
  return { url, exists: url !== null, id: universityId };
}
