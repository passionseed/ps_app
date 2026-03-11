import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_PROGRAMS = [
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะแพทยศาสตร์", searchTerms: "แพทย์ จุฬา" },
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะวิศวกรรมศาสตร์", searchTerms: "วิศวะ จุฬา" },
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะพาณิชยศาสตร์และการบัญชี", searchTerms: "บัญชี จุฬา" },
    { universityName: "มหาวิทยาลัยมหิดล", facultyName: "คณะแพทยศาสตร์ศิริราช", searchTerms: "แพทย์ ศิริราช" },
    { universityName: "มหาวิทยาลัยธรรมศาสตร์", facultyName: "คณะนิติศาสตร์", searchTerms: "นิติ ธรรมศาสตร์" },
    { universityName: "มหาวิทยาลัยธรรมศาสตร์", facultyName: "คณะวิศวกรรมศาสตร์", searchTerms: "วิศวะ ธรรมศาสตร์" },
    { universityName: "มหาวิทยาลัยศิลปากร", facultyName: "คณะมัณฑนศิลป์", searchTerms: "มัณฑนศิลป์ ศิลปากร" },
    { universityName: "มหาวิทยาลัยเกษตรศาสตร์", facultyName: "คณะวิทยาศาสตร์", searchTerms: "วิทยาศาสตร์ เกษตร" },
    { universityName: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี", facultyName: "คณะวิศวกรรมศาสตร์", searchTerms: "วิศวะ บางมด KMUTT" },
    { universityName: "มหาวิทยาลัยมหิดล", facultyName: "คณะวิทยาศาสตร์", searchTerms: "วิทยาศาสตร์ มหิดล" },
];

async function scrapeMyTcas(program: typeof TARGET_PROGRAMS[0]) {
    console.log(`\n🔍 Scraping MyTCAS for: ${program.universityName} - ${program.facultyName}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Navigate to Search
        await page.goto("https://www.mytcas.com/search");

        // Type and search
        await page.fill('input[type="text"]', program.searchTerms);
        await page.keyboard.press("Enter");

        // Wait for results
        await page.waitForTimeout(3000);

        // Click the first matching program (heuristic)
        // In a real scenario, we would match more precisely by text
        const programLink = page.locator("a", { hasText: program.facultyName }).first();
        if (await programLink.count() > 0) {
            await programLink.click();
        } else {
            // Fallback: click first result if faculty name doesn't match exactly
            await page.locator(".card-body a").first().click();
        }

        await page.waitForTimeout(2000);

        // Extract GPAX cutoff and Acceptance numbers
        // Note: MyTCAS UI changes, this is a best-effort selector based on current structure
        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll("table tr"));
            let gpax = "";
            let seats = "";

            // Look for rows containing "GPAX" or seat count
            for (const row of rows) {
                const text = row.textContent || "";
                if (text.includes("GPAX")) {
                    gpax = text.trim().replace(/\s+/g, " ");
                }
                if (text.includes("จำนวนรับ") || text.includes("รับเข้า")) {
                    seats = text.trim().replace(/\s+/g, " ");
                }
            }

            return { gpax, seats };
        });

        console.log(`   ✅ Found: GPAX: ${data.gpax}, Seats: ${data.seats}`);

        // Upsert to Supabase
        const { error } = await supabase
            .from("university_static_data")
            .upsert({
                university_name: program.universityName,
                faculty_name: program.facultyName,
                gpax_cutoff: data.gpax || "ติดต่อส่วนงาน",
                acceptance_rate: data.seats || "ผันแปรตามรอบ",
                source_urls: [page.url()],
                scraped_at: new Date().toISOString()
            }, { onConflict: "university_name,faculty_name" });

        if (error) console.error("   ❌ Supabase Error:", error.message);
        else console.log("   💾 Saved to university_static_data");

    } catch (err) {
        console.error(`   ❌ Error scraping ${program.facultyName}:`, err);
    } finally {
        await browser.close();
    }
}

async function main() {
    for (const program of TARGET_PROGRAMS) {
        await scrapeMyTcas(program);
        // Rate limiting
        await new Promise(r => setTimeout(r, 2000));
    }
}

main().catch(console.error);
