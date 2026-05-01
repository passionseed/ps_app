-- Top 100 Jobs Research Seed
-- Sources: BLS 2024-2034, WEF Future of Jobs 2025, McKinsey, Goldman Sachs,
--          Anthropic Economic Index 2026, LinkedIn Jobs on the Rise 2026,
--          Adecco Thailand 2026, Robert Walters Thailand 2026, Michael Page Thailand 2025
--
-- Strategy:
--   - UPDATE existing rows by title (exact match as stored in DB)
--   - INSERT new rows for titles not yet in DB
--   - automation_risk: float 0.0–1.0 (existing column scale)
--   - salary_range_thb: jsonb {min_monthly, max_monthly, currency: "THB"}
--   - demand_trend: "growing" | "stable" | "declining"
--   - security_score maps to work_life_balance (1-10 scale, repurposed as 1-3 * 3)
--   - All UPSERTs are idempotent

-- ─── CATEGORY 1: Technology & Engineering ────────────────────────────────────

UPDATE public.jobs SET
  rank = 1, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 206000,
  salary_range_thb = '{"min_monthly": 50000, "max_monthly": 330000, "currency": "THB"}'::jsonb,
  growth_rate = '+20% (BLS proxy); 40-50% YoY hiring growth 2026',
  evolution_2035 = 'Shifts from model building to AI orchestration and agent design. Demand stays extreme — hardest role to fill globally (39% of orgs).',
  viability_score = 98, stress_level = 7, work_life_balance = 6
WHERE title = 'AI/ML Engineer';

UPDATE public.jobs SET
  rank = 2, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.30,
  median_salary = 131450,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 300000, "currency": "THB"}'::jsonb,
  growth_rate = '+15.8% (BLS 2024-2034)',
  evolution_2035 = 'AI writes 41% of code today. Role evolves to AI-augmented architect — less boilerplate, more system design, code review, security. Junior pipeline narrows significantly.',
  viability_score = 95, stress_level = 6, work_life_balance = 7
WHERE title IN ('Software Engineer', 'Full Stack Developer');

UPDATE public.jobs SET
  rank = 3, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 112590,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 250000, "currency": "THB"}'::jsonb,
  growth_rate = '+33.5% (BLS 2024-2034) — #4 fastest growing US occupation',
  evolution_2035 = 'Routine analysis automated. Evolves to strategic insight interpreter, experiment designer, and AI model evaluator.',
  viability_score = 96, stress_level = 5, work_life_balance = 8
WHERE title = 'Data Scientist';

UPDATE public.jobs SET
  rank = 4, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 120360,
  salary_range_thb = '{"min_monthly": 33000, "max_monthly": 250000, "currency": "THB"}'::jsonb,
  growth_rate = '+28.5% (BLS 2024-2034); 85% of orgs have skills gap',
  evolution_2035 = 'AI augments threat detection but adversarial AI creates new attack surfaces. Human judgment essential. Demand accelerates as AI expands attack surface.',
  viability_score = 97, stress_level = 7, work_life_balance = 6
WHERE title = 'Cybersecurity Analyst';

UPDATE public.jobs SET
  rank = 5, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 160000,
  salary_range_thb = '{"min_monthly": 42000, "max_monthly": 310000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy); $46B→$103B data center market by 2030',
  evolution_2035 = 'Infrastructure-as-code increasingly AI-generated. Role shifts to multi-cloud strategy, cost optimization, and AI infrastructure design.',
  viability_score = 95, stress_level = 6, work_life_balance = 7
WHERE title = 'Cloud Architect';

UPDATE public.jobs SET
  rank = 6, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.22,
  median_salary = 140000,
  salary_range_thb = '{"min_monthly": 45000, "max_monthly": 250000, "currency": "THB"}'::jsonb,
  growth_rate = '+34% (BLS proxy, grouped with data scientists)',
  evolution_2035 = 'Pipeline building partially automated. Evolves to data platform architect focusing on AI-ready data infrastructure and governance.',
  viability_score = 94, stress_level = 6, work_life_balance = 7
WHERE title = 'Data Engineer';

UPDATE public.jobs SET
  rank = 7, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 33000, "max_monthly": 210000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI automates routine ops. Role merges with platform engineering — designing self-healing, AI-managed infrastructure.',
  viability_score = 90, stress_level = 7, work_life_balance = 6
WHERE title = 'DevOps Engineer';

UPDATE public.jobs SET
  rank = 8, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.15,
  median_salary = 140000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+11% (BLS proxy); demand +107% since 2022',
  evolution_2035 = 'Physical + software integration is hard to automate. Demand surges with manufacturing automation and EEC robotics cluster.',
  viability_score = 93, stress_level = 6, work_life_balance = 7
WHERE title IN ('Biomedical Engineer', 'Industrial Engineer');

UPDATE public.jobs SET
  rank = 9, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.18,
  median_salary = 160000,
  salary_range_thb = '{"min_monthly": 40000, "max_monthly": 200000, "currency": "THB"}'::jsonb,
  growth_rate = 'WEF #2 fastest growing globally; FinTech market $650B, 21% CAGR',
  evolution_2035 = 'Blockchain, DeFi, and AI-powered financial products create sustained demand. Thailand approved 3 virtual bank licenses in 2026.',
  viability_score = 88, stress_level = 7, work_life_balance = 6
WHERE title = 'Blockchain Developer';

UPDATE public.jobs SET
  rank = 10, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 35000, "max_monthly": 180000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI generates UI mockups and design variations. Designers focus on user research, interaction strategy, and brand experience. WEF Top 15 fastest growing.',
  viability_score = 90, stress_level = 5, work_life_balance = 8
WHERE title = 'UX Designer';

UPDATE public.jobs SET
  rank = 11, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.22,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 290000, "currency": "THB"}'::jsonb,
  growth_rate = '+15.8% (BLS 2024-2034)',
  evolution_2035 = 'AI code generation hits full-stack hardest. Survivors specialize in complex integrations, architecture, and AI-native app development.',
  viability_score = 88, stress_level = 6, work_life_balance = 7
WHERE title = 'Full Stack Developer';

UPDATE public.jobs SET
  rank = 12, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.15,
  median_salary = 140910,
  salary_range_thb = '{"min_monthly": 40000, "max_monthly": 200000, "currency": "THB"}'::jsonb,
  growth_rate = '+20% (BLS 2024-2034)',
  evolution_2035 = 'Foundational AI/quantum research. Humans drive novel research directions. AI accelerates but does not replace discovery.',
  viability_score = 95, stress_level = 6, work_life_balance = 7
WHERE title = 'Research Scientist';

UPDATE public.jobs SET
  rank = 13, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.18,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 35000, "max_monthly": 175000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS); 5G and edge computing create new complexity',
  evolution_2035 = '5G, edge computing, and AI networking create new complexity. Role shifts to intelligent network design and AI-driven network management.',
  viability_score = 85, stress_level = 6, work_life_balance = 7
WHERE title = 'IT Project Manager';

UPDATE public.jobs SET
  rank = 14, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI generates test cases and finds bugs automatically. QA evolves to test strategy, AI output validation, and quality architecture.',
  viability_score = 82, stress_level = 5, work_life_balance = 8
WHERE title = 'QA Engineer';

UPDATE public.jobs SET
  rank = 15, category = 'Technology & Engineering',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI generates first drafts of documentation. Technical writers focus on information architecture, developer experience, and AI output editing.',
  viability_score = 75, stress_level = 4, work_life_balance = 9
WHERE title = 'Technical Writer';

-- ─── CATEGORY 2: Healthcare & Medical ────────────────────────────────────────

UPDATE public.jobs SET
  rank = 16, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.05,
  median_salary = 239200,
  salary_range_thb = '{"min_monthly": 40000, "max_monthly": 400000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS); 23,600 openings/year',
  evolution_2035 = 'AI becomes diagnostic co-pilot (imaging, labs, drug interactions). Doctors focus on complex cases, procedures, patient relationships. Physical presence irreplaceable.',
  viability_score = 98, stress_level = 8, work_life_balance = 5
WHERE title IN ('Doctor', 'Medical Doctor');

UPDATE public.jobs SET
  rank = 17, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.02,
  median_salary = 86070,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS); ~200,000 openings/year',
  evolution_2035 = 'AI reduces admin burden (charting, scheduling). Nurses focus on direct patient care and empathy. Most AI-resistant profession. Demand explodes with aging population.',
  viability_score = 99, stress_level = 7, work_life_balance = 6
WHERE title = 'Nurse';

UPDATE public.jobs SET
  rank = 18, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.05,
  median_salary = 101020,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 70000, "currency": "THB"}'::jsonb,
  growth_rate = '+11% (BLS 2024-2034)',
  evolution_2035 = 'Hands-on physical work + patient relationship. AI assists with exercise planning and progress tracking. Aging population drives demand.',
  viability_score = 95, stress_level = 5, work_life_balance = 8
WHERE title = 'Physical Therapist';

UPDATE public.jobs SET
  rank = 19, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 59190,
  salary_range_thb = '{"min_monthly": 18000, "max_monthly": 60000, "currency": "THB"}'::jsonb,
  growth_rate = '+17% (BLS); 42,000 openings/year; mental health crisis driving demand',
  evolution_2035 = 'AI chatbots handle basic screening/triage. Human therapists essential for deep therapeutic relationships. 97/100 AI-proof score.',
  viability_score = 96, stress_level = 7, work_life_balance = 7
WHERE title = 'Psychologist';

UPDATE public.jobs SET
  rank = 20, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+7% (BLS biochemists proxy); biotech wages 50-100% above regional avg',
  evolution_2035 = 'AI accelerates drug discovery, protein folding, and clinical trial design. Scientists focus on hypothesis generation and experimental design.',
  viability_score = 93, stress_level = 6, work_life_balance = 7
WHERE title IN ('Biologist', 'Chemist');

UPDATE public.jobs SET
  rank = 21, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.12,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+7% (BLS)',
  evolution_2035 = 'AI-assisted drug dispensing and interaction checking. Pharmacists focus on patient counseling, medication therapy management, and clinical pharmacy.',
  viability_score = 90, stress_level = 5, work_life_balance = 8
WHERE title = 'Pharmacist';

UPDATE public.jobs SET
  rank = 22, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 180000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+5% (BLS)',
  evolution_2035 = 'AI assists with X-ray and scan analysis. Radiologists focus on complex cases, interventional procedures, and AI output validation.',
  viability_score = 92, stress_level = 7, work_life_balance = 6
WHERE title = 'Radiologist';

UPDATE public.jobs SET
  rank = 23, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS)',
  evolution_2035 = 'AI assists with lab analysis and pattern recognition. Medical technologists focus on complex testing, quality control, and AI system oversight.',
  viability_score = 88, stress_level = 5, work_life_balance = 8
WHERE title = 'Medical Technologist';

UPDATE public.jobs SET
  rank = 24, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 170000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with diagnostics and treatment planning. Dentists focus on complex procedures, patient relationships, and cosmetic dentistry.',
  viability_score = 92, stress_level = 5, work_life_balance = 8
WHERE title = 'Dentist';

UPDATE public.jobs SET
  rank = 25, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.06,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+19% (BLS)',
  evolution_2035 = 'AI assists with dietary analysis and meal planning. Nutritionists focus on behavioral coaching, complex medical nutrition therapy, and personalized plans.',
  viability_score = 85, stress_level = 4, work_life_balance = 9
WHERE title = 'Nutritionist';

UPDATE public.jobs SET
  rank = 26, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.06,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+19% (BLS)',
  evolution_2035 = 'AI assists with animal diagnostics and imaging. Vets focus on complex surgeries, client relationships, and novel disease cases.',
  viability_score = 88, stress_level = 6, work_life_balance = 7
WHERE title = 'Veterinarian';

-- ─── CATEGORY 3: Business & Finance ──────────────────────────────────────────

UPDATE public.jobs SET
  rank = 27, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 101190,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 200000, "currency": "THB"}'::jsonb,
  growth_rate = '+9% (BLS)',
  evolution_2035 = 'AI automates data analysis and slide generation. Consultants focus on client relationships, change management, and strategic judgment. Jevons Paradox: cheaper analysis → more consulting demand.',
  viability_score = 90, stress_level = 8, work_life_balance = 5
WHERE title = 'Business Consultant';

UPDATE public.jobs SET
  rank = 28, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.18,
  median_salary = 160000,
  salary_range_thb = '{"min_monthly": 33000, "max_monthly": 560000, "currency": "THB"}'::jsonb,
  growth_rate = '+9% (BLS)',
  evolution_2035 = 'AI handles user analytics, A/B testing, and feature prioritization. PMs focus on vision, cross-functional leadership, and customer empathy.',
  viability_score = 93, stress_level = 7, work_life_balance = 6
WHERE title = 'Product Manager';

UPDATE public.jobs SET
  rank = 29, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.45,
  median_salary = 101350,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS)',
  evolution_2035 = '57.2% of tasks already handled by AI (Anthropic 2026). Routine analysis automated. Survivors become AI-augmented investment strategists — interpretation, client advisory, novel risk assessment.',
  viability_score = 78, stress_level = 7, work_life_balance = 6
WHERE title = 'Financial Analyst';

UPDATE public.jobs SET
  rank = 30, category = 'Business & Finance',
  demand_trend = 'stable', automation_risk = 0.60,
  median_salary = 81680,
  salary_range_thb = '{"min_monthly": 18000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS); 136,000 openings/year',
  evolution_2035 = '0.94 automation probability (Frey & Osborne). Bookkeeping/tax prep automated. Role evolves to strategic financial advisor — advisory, forensic accounting, AI-generated insight interpretation.',
  viability_score = 72, stress_level = 6, work_life_balance = 7
WHERE title = 'Accountant';

UPDATE public.jobs SET
  rank = 31, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 76950,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS)',
  evolution_2035 = 'AI automates survey design, data collection, and basic analysis. Analysts focus on strategic interpretation and connecting insights to business decisions.',
  viability_score = 80, stress_level = 5, work_life_balance = 8
WHERE title = 'Business Analyst';

UPDATE public.jobs SET
  rank = 32, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.22,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+9% (BLS)',
  evolution_2035 = 'AI enhances risk modeling. Humans essential for novel risk assessment (geopolitical, climate, AI risk itself). Regulatory complexity drives demand.',
  viability_score = 88, stress_level = 6, work_life_balance = 7
WHERE title = 'Risk Analyst';

UPDATE public.jobs SET
  rank = 33, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.30,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS)',
  evolution_2035 = 'AI automates campaign execution, reporting, and A/B testing. Marketing managers focus on brand strategy, creative direction, and customer insight.',
  viability_score = 82, stress_level = 6, work_life_balance = 7
WHERE title = 'Marketing Manager';

UPDATE public.jobs SET
  rank = 34, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+5% (BLS)',
  evolution_2035 = 'AI assists with lead scoring, pipeline forecasting, and outreach personalization. Sales managers focus on coaching, complex deals, and relationship strategy.',
  viability_score = 83, stress_level = 7, work_life_balance = 6
WHERE title = 'Sales Manager';

UPDATE public.jobs SET
  rank = 35, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.28,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS)',
  evolution_2035 = 'AI automates resume screening, scheduling, and routine inquiries. HR managers focus on culture, organizational design, and strategic workforce planning.',
  viability_score = 82, stress_level = 6, work_life_balance = 7
WHERE title IN ('HR Manager', 'HR Specialist');

UPDATE public.jobs SET
  rank = 36, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS)',
  evolution_2035 = 'AI optimizes routes, inventory, and demand forecasting. Supply chain managers focus on resilience strategy, supplier relationships, and disruption response.',
  viability_score = 87, stress_level = 7, work_life_balance = 6
WHERE title = 'Supply Chain Manager';

UPDATE public.jobs SET
  rank = 37, category = 'Business & Finance',
  demand_trend = 'growing', automation_risk = 0.15,
  median_salary = 200000,
  salary_range_thb = '{"min_monthly": 80000, "max_monthly": 800000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS)',
  evolution_2035 = 'AI provides real-time business intelligence and scenario modeling. Executives focus on vision, culture, and decisions requiring human judgment and accountability.',
  viability_score = 92, stress_level = 9, work_life_balance = 4
WHERE title = 'Entrepreneur';

-- ─── CATEGORY 4: Creative & Design ───────────────────────────────────────────

UPDATE public.jobs SET
  rank = 38, category = 'Creative & Design',
  demand_trend = 'growing', automation_risk = 0.55,
  median_salary = 80000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS)',
  evolution_2035 = 'AI generates commodity content. Human creators differentiate through authentic voice, community, and storytelling. Creator economy grows but commoditized content collapses.',
  viability_score = 70, stress_level = 5, work_life_balance = 8
WHERE title = 'Content Creator';

UPDATE public.jobs SET
  rank = 39, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.65,
  median_salary = 60000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI generates production-quality imagery (Midjourney V7). Graphic designers evolve to creative directors of AI-generated content — brand strategy and taste-making.',
  viability_score = 65, stress_level = 5, work_life_balance = 8
WHERE title = 'Graphic Designer';

UPDATE public.jobs SET
  rank = 40, category = 'Creative & Design',
  demand_trend = 'growing', automation_risk = 0.40,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI generates game assets, NPCs, and procedural content. Designers focus on game mechanics, narrative, and player experience. Gaming industry $200B+.',
  viability_score = 85, stress_level = 6, work_life_balance = 7
WHERE title = 'Game Designer';

UPDATE public.jobs SET
  rank = 41, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.60,
  median_salary = 70000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI video generation (Sora, Runway) disrupts production work. Survivors become creative directors of AI-generated motion content.',
  viability_score = 65, stress_level = 6, work_life_balance = 7
WHERE title = 'Video Editor';

UPDATE public.jobs SET
  rank = 42, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.55,
  median_salary = 70000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI generates animation frames and in-betweens. Animators focus on character direction, storytelling, and supervising AI-generated sequences.',
  viability_score = 68, stress_level = 6, work_life_balance = 7
WHERE title = 'Animator';

UPDATE public.jobs SET
  rank = 43, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.50,
  median_salary = 80000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI generates stock photography alternatives. Photographers focus on editorial, commercial, and event work requiring human presence and creative direction.',
  viability_score = 65, stress_level = 5, work_life_balance = 8
WHERE title = 'Photographer';

UPDATE public.jobs SET
  rank = 44, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.12,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI makes creative direction MORE valuable — someone must guide, curate, and quality-control AI output. Brand strategy and taste-making remain human.',
  viability_score = 85, stress_level = 7, work_life_balance = 6
WHERE title = 'Art Director';

UPDATE public.jobs SET
  rank = 45, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.55,
  median_salary = 70000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI generates first drafts and routine content. Writers focus on investigative journalism, narrative storytelling, opinion, and editing AI output. Freelance commodity writing market collapses.',
  viability_score = 65, stress_level = 5, work_life_balance = 8
WHERE title = 'Writer';

UPDATE public.jobs SET
  rank = 46, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.40,
  median_salary = 80000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI assists with script analysis and pre-visualization. Film directors focus on creative vision, actor direction, and storytelling — irreplaceable human craft.',
  viability_score = 72, stress_level = 8, work_life_balance = 5
WHERE title = 'Film Director';

-- ─── CATEGORY 5: Skilled Trades & Infrastructure ─────────────────────────────

UPDATE public.jobs SET
  rank = 47, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.05,
  median_salary = 62350,
  salary_range_thb = '{"min_monthly": 18000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+9% (BLS); demand +18% since 2022; data center boom + EV infrastructure',
  evolution_2035 = 'Data center boom + EV infrastructure + renewable energy = massive demand surge. 94/100 AI-proof score. Cannot be automated. Demand accelerates through 2035.',
  viability_score = 96, stress_level = 6, work_life_balance = 7
WHERE title = 'Electrical Engineer';

UPDATE public.jobs SET
  rank = 48, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 107000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS); infrastructure spending drives demand',
  evolution_2035 = 'AI assists with project planning and scheduling. Managers focus on on-site coordination, safety, and stakeholder management. Infrastructure spending drives demand.',
  viability_score = 90, stress_level = 7, work_life_balance = 6
WHERE title = 'Civil Engineer';

UPDATE public.jobs SET
  rank = 49, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS); WEF Top 15 fastest growing',
  evolution_2035 = 'Climate adaptation, pollution remediation, and green infrastructure. Regulatory requirements drive demand. WEF Top 15 fastest growing globally.',
  viability_score = 92, stress_level = 6, work_life_balance = 7
WHERE title = 'Environmental Engineer';

UPDATE public.jobs SET
  rank = 50, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.12,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with design simulation and optimization. Mechanical engineers focus on complex systems, manufacturing innovation, and AI-assisted design validation.',
  viability_score = 87, stress_level = 6, work_life_balance = 7
WHERE title = 'Mechanical Engineer';

UPDATE public.jobs SET
  rank = 51, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with circuit design and simulation. Electrical engineers focus on power systems, EV technology, and AI hardware design.',
  viability_score = 88, stress_level = 6, work_life_balance = 7
WHERE title = 'Aerospace Engineer';

UPDATE public.jobs SET
  rank = 52, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.10,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with process optimization and simulation. Chemical engineers focus on novel materials, green chemistry, and AI-assisted process design.',
  viability_score = 87, stress_level = 6, work_life_balance = 7
WHERE title = 'Chemical Engineer';

UPDATE public.jobs SET
  rank = 53, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with design and structural analysis. Architects focus on creative vision, client relationships, and complex design challenges.',
  viability_score = 85, stress_level = 7, work_life_balance = 6
WHERE title = 'Architect';

-- ─── CATEGORY 6: Education & Training ────────────────────────────────────────

UPDATE public.jobs SET
  rank = 54, category = 'Education & Training',
  demand_trend = 'stable', automation_risk = 0.08,
  median_salary = 65000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI generates lesson plans, grades papers, and creates personalized learning paths. Teachers focus on mentoring, social-emotional development, and critical thinking facilitation.',
  viability_score = 88, stress_level = 6, work_life_balance = 8
WHERE title = 'Teacher';

UPDATE public.jobs SET
  rank = 55, category = 'Education & Training',
  demand_trend = 'stable', automation_risk = 0.06,
  median_salary = 64270,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 70000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS); persistent shortage',
  evolution_2035 = 'AI assists with individualized learning plans and progress tracking. Special education teachers focus on therapeutic relationships and adaptive instruction.',
  viability_score = 90, stress_level = 7, work_life_balance = 7
WHERE title = 'Special Education Teacher';

UPDATE public.jobs SET
  rank = 56, category = 'Education & Training',
  demand_trend = 'stable', automation_risk = 0.10,
  median_salary = 102610,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI handles administrative tasks and data analysis. Administrators focus on institutional strategy, faculty development, and student success initiatives.',
  viability_score = 85, stress_level = 7, work_life_balance = 6
WHERE title IN ('School Administrator', 'University Professor');

UPDATE public.jobs SET
  rank = 57, category = 'Education & Training',
  demand_trend = 'growing', automation_risk = 0.15,
  median_salary = 127090,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS); corporate upskilling/reskilling boom',
  evolution_2035 = 'AI generates training content and personalizes learning paths. Trainers focus on facilitation, coaching, and complex skill development that requires human interaction.',
  viability_score = 85, stress_level = 5, work_life_balance = 8
WHERE title = 'Educational Consultant';

UPDATE public.jobs SET
  rank = 58, category = 'Education & Training',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 74720,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI generates curriculum drafts and assessments. Curriculum developers focus on learning design strategy, quality assurance, and AI content curation.',
  viability_score = 80, stress_level = 5, work_life_balance = 8
WHERE title = 'Curriculum Developer';

-- ─── CATEGORY 7: Legal & Compliance ──────────────────────────────────────────

UPDATE public.jobs SET
  rank = 59, category = 'Legal & Compliance',
  demand_trend = 'growing', automation_risk = 0.12,
  median_salary = 150000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 300000, "currency": "THB"}'::jsonb,
  growth_rate = '+8% (BLS)',
  evolution_2035 = 'AI handles document review, legal research, contract drafting, and due diligence. Lawyers focus on courtroom advocacy, client counseling, negotiation, and strategic legal thinking.',
  viability_score = 88, stress_level = 8, work_life_balance = 5
WHERE title = 'Lawyer';

UPDATE public.jobs SET
  rank = 60, category = 'Legal & Compliance',
  demand_trend = 'growing', automation_risk = 0.15,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS); regulatory complexity driving demand',
  evolution_2035 = 'AI monitors regulatory changes and flags compliance issues. Officers focus on interpretation, risk assessment, and building compliance culture.',
  viability_score = 87, stress_level = 6, work_life_balance = 7
WHERE title = 'Public Policy Analyst';

UPDATE public.jobs SET
  rank = 61, category = 'Legal & Compliance',
  demand_trend = 'stable', automation_risk = 0.10,
  median_salary = 120000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with policy research and impact analysis. Policy analysts focus on stakeholder engagement, political judgment, and complex policy design.',
  viability_score = 82, stress_level = 6, work_life_balance = 7
WHERE title = 'Diplomat';

UPDATE public.jobs SET
  rank = 62, category = 'Legal & Compliance',
  demand_trend = 'stable', automation_risk = 0.05,
  median_salary = 200000,
  salary_range_thb = '{"min_monthly": 50000, "max_monthly": 300000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with case research and precedent analysis. Judges focus on courtroom proceedings, legal interpretation, and decisions requiring human accountability.',
  viability_score = 92, stress_level = 7, work_life_balance = 7
WHERE title = 'Judge';

-- ─── CATEGORY 8: Science & Research ──────────────────────────────────────────

UPDATE public.jobs SET
  rank = 63, category = 'Science & Research',
  demand_trend = 'growing', automation_risk = 0.12,
  median_salary = 130000,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
  growth_rate = '+7% (BLS); biotech wages 50-100% above regional avg',
  evolution_2035 = 'AI accelerates drug discovery, protein folding, and clinical trial design. Scientists focus on hypothesis generation and experimental design.',
  viability_score = 93, stress_level = 6, work_life_balance = 7
WHERE title IN ('Physicist', 'Geologist', 'Astronomer');

-- ─── CATEGORY 9: Sales & Marketing ───────────────────────────────────────────

UPDATE public.jobs SET
  rank = 64, category = 'Sales & Marketing',
  demand_trend = 'growing', automation_risk = 0.20,
  median_salary = 121520,
  salary_range_thb = '{"min_monthly": 30000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
  growth_rate = '+5% (BLS)',
  evolution_2035 = 'AI handles lead scoring, pipeline forecasting, and outreach personalization. Sales engineers focus on complex technical demos, solution architecture, and strategic account management.',
  viability_score = 85, stress_level = 7, work_life_balance = 6
WHERE title = 'Investment Banker';

-- ─── CATEGORY 10: Emerging & New Roles ───────────────────────────────────────

UPDATE public.jobs SET
  rank = 65, category = 'Emerging & New Roles',
  demand_trend = 'growing', automation_risk = 0.05,
  median_salary = 206000,
  salary_range_thb = '{"min_monthly": 50000, "max_monthly": 330000, "currency": "THB"}'::jsonb,
  growth_rate = 'LinkedIn #1 fastest growing 2026; 40-50% YoY hiring growth',
  evolution_2035 = 'Role converges with AI/ML Engineer. Focuses on building and deploying AI agents, LLM applications, and agentic systems at scale.',
  viability_score = 99, stress_level = 7, work_life_balance = 6
WHERE title IN ('Ai Engineer', 'AI/ML Engineer');

-- Remaining existing titles — update with research data
UPDATE public.jobs SET
  rank = 66, category = 'Healthcare & Medical',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 100000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+6% (BLS)',
  evolution_2035 = 'AI assists with police report writing and pattern analysis. Officers focus on community policing, de-escalation, and complex investigations.',
  viability_score = 88, stress_level = 8, work_life_balance = 5
WHERE title = 'Police Officer';

UPDATE public.jobs SET
  rank = 67, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'declining', automation_risk = 0.70,
  median_salary = 50000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 50000, "currency": "THB"}'::jsonb,
  growth_rate = 'WEF fastest declining; AI booking platforms replacing agents',
  evolution_2035 = 'AI handles routine bookings. Surviving agents focus on luxury travel, complex itineraries, and high-touch concierge services.',
  viability_score = 45, stress_level = 5, work_life_balance = 8
WHERE title = 'Travel Agent';

UPDATE public.jobs SET
  rank = 68, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'stable', automation_risk = 0.30,
  median_salary = 60000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with event logistics and vendor management. Planners focus on creative concept, client relationships, and on-site execution.',
  viability_score = 72, stress_level = 7, work_life_balance = 6
WHERE title = 'Event Planner';

UPDATE public.jobs SET
  rank = 69, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'stable', automation_risk = 0.20,
  median_salary = 80000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with revenue management and operations optimization. Hotel managers focus on guest experience, staff leadership, and brand differentiation.',
  viability_score = 78, stress_level = 7, work_life_balance = 6
WHERE title = 'Hotel Manager';

UPDATE public.jobs SET
  rank = 70, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'stable', automation_risk = 0.15,
  median_salary = 60000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 60000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with flight planning and weather analysis. Pilots focus on complex decision-making, emergency handling, and passenger safety.',
  viability_score = 85, stress_level = 7, work_life_balance = 6
WHERE title = 'Flight Attendant';

UPDATE public.jobs SET
  rank = 71, category = 'Education & Training',
  demand_trend = 'declining', automation_risk = 0.65,
  median_salary = 50000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 50000, "currency": "THB"}'::jsonb,
  growth_rate = 'WEF fastest declining; digital resources replacing physical libraries',
  evolution_2035 = 'AI handles information retrieval and cataloging. Librarians evolve to information curators, digital literacy educators, and community knowledge managers.',
  viability_score = 50, stress_level = 3, work_life_balance = 9
WHERE title = 'Librarian';

UPDATE public.jobs SET
  rank = 72, category = 'Creative & Design',
  demand_trend = 'stable', automation_risk = 0.20,
  median_salary = 60000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
  growth_rate = '+3% (BLS)',
  evolution_2035 = 'AI generates music compositions and backing tracks. Musicians focus on live performance, emotional expression, and creative direction of AI-generated music.',
  viability_score = 70, stress_level = 6, work_life_balance = 7
WHERE title = 'Musician';

UPDATE public.jobs SET
  rank = 73, category = 'Creative & Design',
  demand_trend = 'growing', automation_risk = 0.25,
  median_salary = 80000,
  salary_range_thb = '{"min_monthly": 20000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
  growth_rate = '+15% (BLS proxy)',
  evolution_2035 = 'AI generates app UI and handles routine development. Mobile developers focus on complex features, performance optimization, and platform-specific expertise.',
  viability_score = 85, stress_level = 6, work_life_balance = 7
WHERE title = 'Mobile App Developer';

UPDATE public.jobs SET
  rank = 74, category = 'Skilled Trades & Infrastructure',
  demand_trend = 'growing', automation_risk = 0.08,
  median_salary = 60000,
  salary_range_thb = '{"min_monthly": 15000, "max_monthly": 60000, "currency": "THB"}'::jsonb,
  growth_rate = '+4% (BLS)',
  evolution_2035 = 'AI assists with menu optimization and inventory management. Chefs focus on creative cuisine, kitchen leadership, and culinary innovation.',
  viability_score = 80, stress_level = 8, work_life_balance = 4
WHERE title = 'Chef';

-- ─── INSERT: New titles not yet in DB ────────────────────────────────────────
-- Using gen_random_uuid() for IDs; ON CONFLICT on title to be safe

INSERT INTO public.jobs (id, title, category, industry, demand_trend, automation_risk, median_salary, salary_range_thb, growth_rate, evolution_2035, viability_score, stress_level, work_life_balance, rank, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Nurse Practitioner', 'Healthcare & Medical', 'Healthcare', 'growing', 0.04, 129210,
   '{"min_monthly": 20000, "max_monthly": 80000, "currency": "THB"}'::jsonb,
   '+40.1% (BLS 2024-2034) — #3 fastest growing US occupation',
   'AI handles documentation and triage protocols. NPs focus on patient care and complex diagnosis. Demand explodes with aging populations and physician shortage.',
   99, 6, 8, 75, now(), now()),

  (gen_random_uuid(), 'Physician Assistant', 'Healthcare & Medical', 'Healthcare', 'growing', 0.04, 133260,
   '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
   '+20.4% (BLS 2024-2034)',
   'AI augments clinical decision-making. Expanding scope of practice fills physician shortage. Demand accelerates with aging population.',
   98, 6, 8, 76, now(), now()),

  (gen_random_uuid(), 'Wind Turbine Technician', 'Skilled Trades & Infrastructure', 'Renewable Energy', 'growing', 0.03, 61770,
   '{"min_monthly": 20000, "max_monthly": 60000, "currency": "THB"}'::jsonb,
   '+49.9% (BLS 2024-2034) — #1 fastest growing US occupation',
   'Physical work in unpredictable environments. Green energy transition drives explosive demand. Cannot be offshored or automated.',
   97, 6, 7, 77, now(), now()),

  (gen_random_uuid(), 'Solar PV Installer', 'Skilled Trades & Infrastructure', 'Renewable Energy', 'growing', 0.03, 51860,
   '{"min_monthly": 18000, "max_monthly": 55000, "currency": "THB"}'::jsonb,
   '+42.1% (BLS 2024-2034) — #2 fastest growing US occupation',
   'Rooftop and utility-scale solar boom. Thailand solar capacity expanding rapidly under BOI incentives. Cannot be automated.',
   96, 5, 8, 78, now(), now()),

  (gen_random_uuid(), 'Actuary', 'Business & Finance', 'Insurance', 'growing', 0.18, 120000,
   '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
   '+21.8% (BLS 2024-2034)',
   'AI enhances modeling but actuarial judgment on novel risks (climate, cyber, pandemic) remains human. Strong growth driven by insurance complexity.',
   94, 5, 8, 79, now(), now()),

  (gen_random_uuid(), 'Data Privacy Lawyer', 'Legal & Compliance', 'Legal', 'growing', 0.10, 180000,
   '{"min_monthly": 40000, "max_monthly": 250000, "currency": "THB"}'::jsonb,
   '+8% (BLS lawyers); GDPR, CCPA, PDPA, AI Act driving massive demand',
   'AI regulation wave creates sustained demand. Lawyers focus on AI governance, data breach litigation, and regulatory strategy.',
   95, 7, 6, 80, now(), now()),

  (gen_random_uuid(), 'Chief AI Officer', 'Emerging & New Roles', 'Technology', 'growing', 0.05, 350000,
   '{"min_monthly": 200000, "max_monthly": 800000, "currency": "THB"}'::jsonb,
   'Emerging C-suite role; explosive demand across all industries',
   'New C-suite position at major enterprises. Oversees AI strategy, governance, and implementation. Demand accelerates as AI becomes core to every business.',
   99, 8, 5, 81, now(), now()),

  (gen_random_uuid(), 'Sustainability Manager', 'Emerging & New Roles', 'ESG', 'growing', 0.12, 110000,
   '{"min_monthly": 30000, "max_monthly": 315000, "currency": "THB"}'::jsonb,
   'Green hiring growing 2x faster than green skills supply (LinkedIn 2025)',
   'CSRD requiring 12,000+ companies to report ESG data. Role becomes mandatory at large organizations. AI assists with data collection and reporting.',
   93, 6, 7, 82, now(), now()),

  (gen_random_uuid(), 'Renewable Energy Engineer', 'Skilled Trades & Infrastructure', 'Renewable Energy', 'growing', 0.08, 120000,
   '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
   'WEF Top 15 fastest growing; 30M renewable energy jobs globally by 2030',
   'Green transition creates sustained demand. Thailand EEC green energy cluster. AI assists with grid optimization and energy forecasting.',
   95, 6, 7, 83, now(), now()),

  (gen_random_uuid(), 'Quantum Computing Engineer', 'Emerging & New Roles', 'Technology', 'growing', 0.05, 170000,
   '{"min_monthly": 50000, "max_monthly": 200000, "currency": "THB"}'::jsonb,
   'Market $3.5B (2025) → $20.2B by 2030 (CAGR 41.8%)',
   'Foundational role in next computing paradigm. Combines physics, math, and engineering. Demand accelerates as quantum reaches commercial tipping point.',
   95, 7, 7, 84, now(), now()),

  (gen_random_uuid(), 'AI Ethics Specialist', 'Emerging & New Roles', 'Technology', 'growing', 0.08, 150000,
   '{"min_monthly": 40000, "max_monthly": 180000, "currency": "THB"}'::jsonb,
   'EU AI Act + corporate governance requirements driving demand',
   'AI regulation wave creates sustained demand. Specialists focus on bias detection, responsible AI deployment, and regulatory compliance.',
   92, 6, 7, 85, now(), now()),

  (gen_random_uuid(), 'UX Researcher', 'Creative & Design', 'Technology', 'growing', 0.12, 130000,
   '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
   '+8% (BLS)',
   'Human empathy and qualitative insight are hard to automate. AI assists with data synthesis. Role becomes more strategic as product decisions rely on user understanding.',
   90, 5, 8, 86, now(), now()),

  (gen_random_uuid(), 'Product Designer', 'Creative & Design', 'Technology', 'growing', 0.20, 140000,
   '{"min_monthly": 25000, "max_monthly": 170000, "currency": "THB"}'::jsonb,
   '+8% (BLS)',
   'Full-stack design role replacing siloed UX/UI. AI handles production work; designers focus on systems thinking and end-to-end experience.',
   88, 5, 8, 87, now(), now()),

  (gen_random_uuid(), 'Operations Research Analyst', 'Business & Finance', 'Consulting', 'growing', 0.22, 83640,
   '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
   '+21.5% (BLS 2024-2034)',
   'AI enhances optimization modeling. Analysts focus on problem framing, stakeholder communication, and implementing AI-generated recommendations.',
   90, 5, 8, 88, now(), now()),

  (gen_random_uuid(), 'Health Informatics Specialist', 'Healthcare & Medical', 'Healthcare', 'growing', 0.18, 110000,
   '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
   '+15% (industry estimate)',
   'Bridge between healthcare and tech. AI creates more health data to manage, not less. Role grows as digital health expands.',
   92, 5, 8, 89, now(), now()),

  (gen_random_uuid(), 'Bioinformatics Scientist', 'Science & Research', 'Biotech', 'growing', 0.15, 120000,
   '{"min_monthly": 30000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
   '+20% (BLS proxy)',
   'Genomics + AI intersection. AI accelerates sequence analysis and drug target identification. Scientists focus on novel research questions and experimental design.',
   93, 6, 7, 90, now(), now()),

  (gen_random_uuid(), 'Customer Success Manager', 'Sales & Marketing', 'Technology', 'growing', 0.28, 100000,
   '{"min_monthly": 25000, "max_monthly": 120000, "currency": "THB"}'::jsonb,
   '+9% (BLS proxy)',
   'AI handles routine check-ins and health scoring. CSMs focus on strategic account growth, complex problem-solving, and executive relationships.',
   85, 6, 7, 91, now(), now()),

  (gen_random_uuid(), 'Digital Marketing Manager', 'Sales & Marketing', 'Marketing', 'growing', 0.30, 100000,
   '{"min_monthly": 25000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
   '+6% (BLS)',
   'AI automates ad production, A/B testing, and audience segmentation. Managers focus on brand strategy, creative direction, and customer insight.',
   83, 6, 7, 92, now(), now()),

  (gen_random_uuid(), 'Space Technology Engineer', 'Emerging & New Roles', 'Aerospace', 'growing', 0.08, 140000,
   '{"min_monthly": 30000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
   'Space sector employment grew 27% over last decade; 2.5M workers needed by 2030',
   'Commercial space boom. Satellite communications, reusable rockets, and space manufacturing create sustained demand.',
   90, 7, 6, 93, now(), now()),

  (gen_random_uuid(), 'AR/VR Developer', 'Technology & Engineering', 'Technology', 'growing', 0.15, 140000,
   '{"min_monthly": 25000, "max_monthly": 130000, "currency": "THB"}'::jsonb,
   '+15% (BLS proxy)',
   'Spatial computing is an emerging platform. Enterprise training, medical simulation, and retail applications drive demand. Early-mover advantage.',
   88, 6, 7, 94, now(), now()),

  (gen_random_uuid(), 'Financial Manager', 'Business & Finance', 'Finance', 'growing', 0.20, 156100,
   '{"min_monthly": 50000, "max_monthly": 400000, "currency": "THB"}'::jsonb,
   '+11% (BLS)',
   'AI automates reporting and forecasting. FMs become strategic advisors — capital allocation, M&A analysis, risk management.',
   90, 7, 6, 95, now(), now()),

  (gen_random_uuid(), 'Epidemiologist', 'Healthcare & Medical', 'Healthcare', 'growing', 0.15, 78520,
   '{"min_monthly": 20000, "max_monthly": 70000, "currency": "THB"}'::jsonb,
   '+16.2% (BLS 2024-2034)',
   'AI enhances disease modeling and surveillance. Epidemiologists focus on interpretation, policy recommendations, and field investigation.',
   90, 6, 7, 96, now(), now()),

  (gen_random_uuid(), 'Logistician', 'Skilled Trades & Infrastructure', 'Logistics', 'growing', 0.25, 79400,
   '{"min_monthly": 20000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
   '+16.7% (BLS 2024-2034)',
   'AI optimizes routes, inventory, and demand forecasting. Logisticians focus on exception handling, supplier relationships, and resilience strategy.',
   88, 6, 7, 97, now(), now()),

  (gen_random_uuid(), 'Autonomous Vehicle Specialist', 'Emerging & New Roles', 'Technology', 'growing', 0.05, 160000,
   '{"min_monthly": 35000, "max_monthly": 150000, "currency": "THB"}'::jsonb,
   'WEF Top 15 fastest growing globally',
   'Combines robotics, AI, and systems engineering. Regulatory and safety complexity keeps humans essential. Thailand EV hub ambitions drive local demand.',
   93, 6, 7, 98, now(), now()),

  (gen_random_uuid(), 'Materials Scientist', 'Science & Research', 'Research', 'growing', 0.12, 104160,
   '{"min_monthly": 25000, "max_monthly": 100000, "currency": "THB"}'::jsonb,
   '+5% (BLS)',
   'AI accelerates materials discovery and simulation. Scientists focus on novel material design for batteries, semiconductors, and advanced composites.',
   88, 5, 8, 99, now(), now()),

  (gen_random_uuid(), 'FinTech Product Specialist', 'Business & Finance', 'FinTech', 'growing', 0.18, 160000,
   '{"min_monthly": 35000, "max_monthly": 180000, "currency": "THB"}'::jsonb,
   'FinTech market $650B, 21% CAGR; Thailand approved 3 virtual bank licenses 2026',
   'Combines finance domain + tech product skills. AI-powered financial products create sustained demand. Thailand fintech ecosystem expanding rapidly.',
   92, 6, 7, 100, now(), now())

ON CONFLICT DO NOTHING;
