import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNIVERSITY_WEBSITES = [
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", facultyName: "คณะพาณิชยศาสตร์และการบัญชี", url: "https://www.cbs.chula.ac.th/th/curriculum/" },
    { universityName: "มหาวิทยาลัยศิลปากร", facultyName: "คณะมัณฑนศิลป์", url: "https://decorate.su.ac.th/curriculum/" },
    { universityName: "มหาวิทยาลัยเกษตรศาสตร์", facultyName: "คณะวิทยาศาสตร์", url: "https://www.sci.ku.ac.th/curriculum/" },
    { universityName: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี", facultyName: "คณะวิศวกรรมศาสตร์", url: "https://eng.kmutt.ac.th/programs/" },
];

async function scrapeUniversityWebsite(uni: typeof UNIVERSITY_WEBSITES[0]) {
    console.log(`\n🌐 Scraping curriculum for: ${uni.universityName} - ${uni.facultyName}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(uni.url);
        await page.waitForTimeout(2000);

        // Attempt to find a "Course Catalog" or "Handbook" or link that looks like a PDF curriculum
        const curriculumUrl = await page.evaluate(() => {
            // Find links with keywords
            const links = Array.from(document.querySelectorAll("a"));
            const targetKeywords = ["หลักสูตร", "curriculum", "handbook", "course", "pdf"];

            const found = links.find(link => {
                const text = (link.textContent || "").toLowerCase();
                const href = (link.getAttribute("href") || "").toLowerCase();
                return targetKeywords.some(kw => text.includes(kw) || href.includes(kw));
            });

            return found ? found.href : null;
        });

        console.log(`   ✅ Found curriculum URL: ${curriculumUrl || "Not found"}`);

        if (curriculumUrl) {
            const { error } = await supabase
                .from("university_static_data")
                .update({
                    curriculum_url: curriculumUrl,
                    source_urls: [uni.url],
                    scraped_at: new Date().toISOString()
                })
                .eq("university_name", uni.universityName)
                .eq("faculty_name", uni.facultyName);

            if (error) console.error("   ❌ Supabase Error:", error.message);
            else console.log("   💾 Updated curriculum_url in university_static_data");
        }

    } catch (err) {
        console.error(`   ❌ Error scraping ${uni.facultyName}:`, err);
    } finally {
        await browser.close();
    }
}

async function main() {
    for (const uni of UNIVERSITY_WEBSITES) {
        await scrapeUniversityWebsite(uni);
        await new Promise(r => setTimeout(r, 2000));
    }
}

main().catch(console.error);
