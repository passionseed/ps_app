-- Mock Data for Testing Career Path Mapping

-- 1. Insert seed Jobs
INSERT INTO public.jobs (id, title, industry, required_degrees, required_skills, viability_score, demand_trend, automation_risk, median_salary, top_hiring_regions)
VALUES 
('11111111-1111-1111-1111-111111111111', 'UX Designer', 'Technology', '{"Bachelor of Design", "Bachelor of IT"}', '{"user research", "prototyping", "systems thinking"}', 81, 'growing', 0.21, 95000, '{"Sydney", "Melbourne", "Remote"}'),
('22222222-2222-2222-2222-222222222222', 'Data Analyst', 'Data Science', '{"Bachelor of Data Science", "Bachelor of IT"}', '{"sql", "python", "data visualization"}', 88, 'growing', 0.15, 85000, '{"Sydney", "Remote"}'),
('33333333-3333-3333-3333-333333333333', 'Product Manager', 'Technology', '{"Bachelor of Business", "Bachelor of IT"}', '{"agile", "stakeholder management", "product strategy"}', 92, 'stable', 0.10, 120000, '{"Sydney", "Melbourne"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert seed Universities
INSERT INTO public.universities (id, name, country, programs, linked_job_ids)
VALUES 
('44444444-4444-4444-4444-444444444444', 'University of New South Wales (UNSW)', 'Australia', 
  array['{"name": "Bachelor of Design", "duration_yrs": 3, "majors": ["UX Design", "Industrial Design"], "admission_band": "ATAR 85+"}'::jsonb, 
        '{"name": "Bachelor of Data Science", "duration_yrs": 3, "majors": ["Data Analysis", "Machine Learning"], "admission_band": "ATAR 90+"}'::jsonb],
  '{"11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"}'
),
('55555555-5555-5555-5555-555555555555', 'University of Sydney', 'Australia', 
  array['{"name": "Bachelor of Commerce", "duration_yrs": 3, "majors": ["Business Information Systems"], "admission_band": "ATAR 95+"}'::jsonb],
  '{"33333333-3333-3333-3333-333333333333"}'
)
ON CONFLICT (id) DO NOTHING;
