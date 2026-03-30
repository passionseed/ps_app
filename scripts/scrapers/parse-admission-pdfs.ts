import Buffer from "node:buffer";
import pdf from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNIVERSITY_PDFS = [
    { universityName: "จุฬาลงกรณ์มหาวิทยาลัย", url: "https://www.admissions.chula.ac.th/pdf/admissions2567.pdf" },
    { universityName: "มหาวิทยาลัยธรรมศาสตร์", url: "https://admission.tu.ac.th/pdf/tu-admission-67.pdf" },
    { universityName: "มหาวิทยาลัยมหิดล", url: "https://op.mahidol.ac.th/sa/admission/pdf/mu-67.pdf" },
];

async function parsePdf(uni: typeof UNIVERSITY_PDFS[0]) {
    console.log(`\n📄 Parsing PDF for: ${uni.universityName}`);
    console.log(`   URL: ${uni.url}`);

    try {
        const response = await fetch(uni.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Using a Buffer-like approach for node environment compatibility since we're in a script
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.Buffer.from(arrayBuffer);

        const data = await pdf(buffer);
        const text = data.text;

        // Heuristic extraction using regex
        // This is hard because PDFs vary wildly. 
        // Ideally we would send chunks of this text to a LLM for extraction.

        // Example: Searching for "บาท" (Baht) near "ค่าธรรมเนียม" (Fee) or "ภาคการศึกษา" (Semester)
        const tuitionRegex = /(\d{1,3}(?:,\d{3})*)\s*บาท/g;
        const matches = Array.from(text.matchAll(tuitionRegex));

        // Pick a likely number (heuristic: usually between 10k and 100k)
        let tuitionValue = 0;
        let note = "สกัดจากไฟล์ PDF";

        for (const match of matches) {
            const matchVal = (match as RegExpMatchArray)[1];
            const val = parseInt(matchVal.replace(/,/g, ""));
            if (val > 15000 && val < 150000) {
                tuitionValue = val;
                break;
            }
        }

        console.log(`   ✅ Estimated Tuition (per year/sem): ${tuitionValue} THB`);

        // Update static data entry if it exists (partial update)
        // Here we might want to update multiple faculties if the PDF covers all
        // For this script, we'll just log or update a specific one if found
        const { data: staticEntries } = await supabase
            .from("university_static_data")
            .select("id, faculty_name")
            .eq("university_name", uni.universityName);

        if (staticEntries && staticEntries.length > 0) {
            for (const entry of staticEntries) {
                await supabase
                    .from("university_static_data")
                    .update({
                        tuition_per_year: tuitionValue * 2, // Assuming semester fee * 2
                        tuition_note: note,
                        duration: text.includes("6 ปี") ? "6 ปี" : "4 ปี",
                        source_urls: [uni.url]
                    })
                    .eq("id", entry.id);
                console.log(`   💾 Updated tuition for: ${entry.faculty_name}`);
            }
        }

    } catch (err) {
        console.error(`   ❌ Error parsing PDF for ${uni.universityName}:`, err);
    }
}

async function main() {
    for (const uni of UNIVERSITY_PDFS) {
        await parsePdf(uni);
        await new Promise(r => setTimeout(r, 2000));
    }
}

main().catch(console.error);
