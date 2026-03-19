/**
 * PathLab Generator Orchestrator
 * 
 * Coordinates 5 agents in sequence using backward design:
 * 1. Objective Extractor → What should students learn?
 * 2. Evidence Designer → How will we know they learned it?
 * 3. Researcher → What content grounds this learning?
 * 4. Learning Designer → What activities build to the evidence?
 * 5. Quality Reviewer → Is this coherent and complete?
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  OrchestratorState, 
  ExpertProfile, 
  ObjectiveOutput, 
  EvidenceOutput, 
  ResearchOutput, 
  LearningOutput,
  ReviewOutput 
} from './types';
import { agent1_extractObjectives } from './agents/agent1-objectives';
import { agent2_designEvidence } from './agents/agent2-evidence';
import { agent3_research } from './agents/agent3-research';
import { agent4_designLearning } from './agents/agent4-learning';
import { agent5_review } from './agents/agent5-review';

interface OrchestratorOptions {
  dryRun?: boolean;
}

interface OrchestratorResult {
  success: boolean;
  seedId?: string;
  pathId?: string;
  daysCreated?: number;
  activitiesCreated?: number;
  contentCreated?: number;
  duration?: number;
  error?: string;
}

export async function orchestrator(
  supabase: SupabaseClient,
  expertProfileId: string,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const { dryRun = false } = options;
  
  const state: OrchestratorState = {
    expertProfileId,
    expertProfile: null,
    seedId: null,
    pathId: null,
    objectives: [],
    evidence: [],
    research: [],
    learning: [],
    review: null,
    status: 'pending',
    error: null,
    startedAt: new Date(),
    completedAt: null,
  };
  
  try {
    // ─── Step 0: Fetch expert profile ─────────────────────────────────────
    console.log('📋 Step 0: Fetching expert profile...');
    
    const { data: expert, error: fetchError } = await supabase
      .from('expert_profiles')
      .select('*')
      .eq('id', expertProfileId)
      .single();
    
    if (fetchError || !expert) {
      throw new Error(`Expert not found: ${fetchError?.message || 'Unknown error'}`);
    }
    
    state.expertProfile = expert as ExpertProfile;
    console.log(`   ✓ Found: ${expert.name} (${expert.title} at ${expert.company})`);
    
    // Check for existing expert_pathlab
    const { data: existingPathlab } = await supabase
      .from('expert_pathlabs')
      .select('id, seed_id, path_id, generation_status')
      .eq('expert_profile_id', expertProfileId)
      .single();
    
    if (existingPathlab) {
      state.seedId = existingPathlab.seed_id;
      state.pathId = existingPathlab.path_id;
      console.log(`   ✓ Existing PathLab found (status: ${existingPathlab.generation_status})`);
    }
    
    // Update status to generating
    if (!dryRun) {
      await supabase
        .from('expert_pathlabs')
        .upsert({
          expert_profile_id: expertProfileId,
          seed_id: state.seedId,
          path_id: state.pathId,
          generation_status: 'generating',
        }, { onConflict: 'expert_profile_id' });
    }
    
    state.status = 'generating';
    
    // ─── Agent 1: Extract Objectives ──────────────────────────────────────
    console.log('\n🎯 Agent 1: Extracting learning objectives...');
    
    state.objectives = await agent1_extractObjectives(state.expertProfile);
    console.log(`   ✓ Extracted ${state.objectives.length} objectives`);
    state.objectives.forEach((obj, i) => {
      console.log(`      Day ${obj.dayNumber}: ${obj.title}`);
    });
    
    // ─── Agent 2: Design Evidence ─────────────────────────────────────────
    console.log('\n📊 Agent 2: Designing evidence & assessments...');
    
    state.evidence = await agent2_designEvidence(state.expertProfile, state.objectives);
    console.log(`   ✓ Designed evidence for ${state.evidence.length} days`);
    
    // ─── Agent 3: Research Grounded Content ───────────────────────────────
    console.log('\n🔍 Agent 3: Researching grounded content...');
    
    state.research = await agent3_research(state.expertProfile, state.objectives);
    console.log(`   ✓ Researched content for ${state.research.length} days`);
    state.research.forEach((r, i) => {
      console.log(`      Day ${r.dayNumber}: ${r.groundedContent.length} items, ${r.resources.length} resources`);
    });
    
    // ─── Agent 4: Design Learning Activities ─────────────────────────────
    console.log('\n📚 Agent 4: Designing learning activities...');
    
    state.learning = await agent4_designLearning(
      state.expertProfile,
      state.objectives,
      state.evidence,
      state.research
    );
    console.log(`   ✓ Designed activities for ${state.learning.length} days`);
    
    // ─── Agent 5: Quality Review ─────────────────────────────────────────
    console.log('\n✅ Agent 5: Quality review...');
    
    state.review = await agent5_review(
      state.expertProfile,
      state.objectives,
      state.evidence,
      state.learning
    );
    
    if (!state.review?.approved) {
      console.log(`   ⚠ Review feedback: ${state.review?.feedback || 'No feedback'}`);
      console.log(`   ⚠ Revisions needed: ${state.review?.revisions?.length || 0}`);
      // For now, continue anyway - in future, could loop back
    } else {
      console.log(`   ✓ Approved: ${state.review.feedback}`);
    }
    
    // ─── Write to Database ───────────────────────────────────────────────
    if (dryRun) {
      console.log('\n⚠️  DRY RUN - Skipping database writes');
      console.log('\n   Would create:');
      console.log(`   - ${state.learning.length} path_days`);
      const totalActivities = state.learning.reduce((sum, l) => sum + l.activities.length, 0);
      console.log(`   - ${totalActivities} path_activities`);
      const totalContent = state.learning.reduce((sum, l) => 
        sum + l.activities.reduce((s, a) => s + a.content.length, 0), 0);
      console.log(`   - ${totalContent} path_content`);
    } else {
      console.log('\n💾 Writing to database...');
      
      const writeResult = await writeToDatabase(supabase, state);
      
      state.seedId = writeResult.seedId;
      state.pathId = writeResult.pathId;
      
      // Update expert_pathlabs status
      await supabase
        .from('expert_pathlabs')
        .update({
          seed_id: state.seedId,
          path_id: state.pathId,
          generation_status: 'completed',
          generated_at: new Date().toISOString(),
        })
        .eq('expert_profile_id', expertProfileId);
      
      console.log(`   ✓ Created ${writeResult.daysCreated} path_days`);
      console.log(`   ✓ Created ${writeResult.activitiesCreated} path_activities`);
      console.log(`   ✓ Created ${writeResult.contentCreated} path_content`);
    }
    
    state.status = 'completed';
    state.completedAt = new Date();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    return {
      success: true,
      seedId: state.seedId || undefined,
      pathId: state.pathId || undefined,
      daysCreated: state.learning.length,
      activitiesCreated: state.learning.reduce((sum, l) => sum + l.activities.length, 0),
      contentCreated: state.learning.reduce((sum, l) => 
        sum + l.activities.reduce((s, a) => s + a.content.length, 0), 0),
      duration,
    };
    
  } catch (error) {
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : String(error);
    
    // Update status in DB
    if (!dryRun) {
      await supabase
        .from('expert_pathlabs')
        .update({
          generation_status: 'failed',
          generation_error: state.error,
        })
        .eq('expert_profile_id', expertProfileId);
    }
    
    return {
      success: false,
      error: state.error,
    };
  }
}

async function writeToDatabase(
  supabase: SupabaseClient,
  state: OrchestratorState
): Promise<{ seedId: string; pathId: string; daysCreated: number; activitiesCreated: number; contentCreated: number }> {
  // Get or create seed
  let seedId = state.seedId;
  let pathId = state.pathId;
  
  if (!seedId) {
    // Create seed
    const { data: seed, error: seedError } = await supabase
      .from('seeds')
      .insert({
        map_id: await getDefaultMapId(supabase),
        title: `${state.expertProfile!.field_category}: Learn from ${state.expertProfile!.name}`,
        description: `A 5-day learning journey based on ${state.expertProfile!.name}'s experience as a ${state.expertProfile!.title}.`,
        seed_type: 'pathlab',
      })
      .select('id')
      .single();
    
    if (seedError) throw new Error(`Failed to create seed: ${seedError.message}`);
    seedId = seed.id;
  }
  
  if (!pathId) {
    // Create path
    const { data: path, error: pathError } = await supabase
      .from('paths')
      .insert({
        seed_id: seedId,
        total_days: state.learning.length,
        created_by: await getSystemUserId(supabase),
      })
      .select('id')
      .single();
    
    if (pathError) throw new Error(`Failed to create path: ${pathError.message}`);
    pathId = path.id;
  }
  
  // Clear existing path_days (for re-generation)
  await supabase.from('path_days').delete().eq('path_id', pathId);
  
  let activitiesCreated = 0;
  let contentCreated = 0;
  
  // Create path_days, activities, and content
  for (const dayLearning of state.learning) {
    // Create path_day
    const { data: pathDay, error: dayError } = await supabase
      .from('path_days')
      .insert({
        path_id: pathId,
        day_number: dayLearning.dayNumber,
        context_text: dayLearning.contextText,
        reflection_prompts: state.evidence.find(e => e.dayNumber === dayLearning.dayNumber)?.reflectionPrompts || [],
      })
      .select('id')
      .single();
    
    if (dayError) throw new Error(`Failed to create path_day: ${dayError.message}`);
    
    // Create activities
    for (const activity of dayLearning.activities) {
      const { data: activityRecord, error: activityError } = await supabase
        .from('path_activities')
        .insert({
          path_day_id: pathDay.id,
          title: activity.title,
          instructions: activity.instructions,
          display_order: activity.displayOrder,
          is_required: true,
        })
        .select('id')
        .single();
      
      if (activityError) throw new Error(`Failed to create activity: ${activityError.message}`);
      activitiesCreated++;
      
      // Create content
      for (const [idx, content] of activity.content.entries()) {
        const { error: contentError } = await supabase
          .from('path_content')
          .insert({
            activity_id: activityRecord.id,
            content_type: content.contentType,
            content_title: content.contentTitle,
            content_body: content.contentBody,
            content_url: content.contentUrl || null,
            display_order: idx,
          });
        
        if (contentError) throw new Error(`Failed to create content: ${contentError.message}`);
        contentCreated++;
      }
      
      // Create assessment if present
      if (activity.assessment) {
        const { data: assessment, error: assessmentError } = await supabase
          .from('path_assessments')
          .insert({
            activity_id: activityRecord.id,
            assessment_type: activity.assessment.assessmentType,
            metadata: {},
          })
          .select('id')
          .single();
        
        if (assessmentError) throw new Error(`Failed to create assessment: ${assessmentError.message}`);
        
        // Create quiz questions if present
        if (activity.assessment.questions) {
          for (const q of activity.assessment.questions) {
            await supabase
              .from('path_quiz_questions')
              .insert({
                assessment_id: assessment.id,
                question_text: q.question,
                options: q.options,
                correct_option: q.correctOption,
              });
          }
        }
      }
    }
  }
  
  return {
    seedId: seedId!,
    pathId: pathId!,
    daysCreated: state.learning.length,
    activitiesCreated,
    contentCreated,
  };
}

async function getDefaultMapId(supabase: SupabaseClient): Promise<string> {
  // Get or create a default learning map for PathLabs
  const { data: existingMap } = await supabase
    .from('learning_maps')
    .select('id')
    .eq('title', 'Expert PathLabs')
    .single();
  
  if (existingMap) return existingMap.id;
  
  const { data: newMap, error } = await supabase
    .from('learning_maps')
    .insert({
      title: 'Expert PathLabs',
      description: 'Learning paths generated from expert interviews',
    })
    .select('id')
    .single();
  
  if (error) throw new Error(`Failed to create default map: ${error.message}`);
  return newMap.id;
}

async function getSystemUserId(supabase: SupabaseClient): Promise<string> {
  // Get a system user ID for created_by field
  const { data: adminUser } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(1)
    .single();
  
  if (adminUser) return adminUser.user_id;
  
  // Fallback: use first user
  const { data: firstUser } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();
  
  return firstUser?.id || '00000000-0000-0000-0000-000000000000';
}