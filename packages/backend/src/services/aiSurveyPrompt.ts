/**
 * AI Survey → Prompt Pipeline Service
 * 
 * Guests answer a short question (e.g. "What's your dream job?"),
 * the answer gets injected into an AI prompt template to create
 * a personalized AI image.
 * 
 * Flow:
 *   1. Host configures survey questions per event (or uses defaults)
 *   2. Guest picks a question + types answer + selects photo
 *   3. Answer is injected into prompt template: "photorealistic {answer}..."
 *   4. AI generates personalized image (via style transfer pipeline)
 *   5. Result delivered via QR async delivery
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface SurveyQuestion {
  id: string;
  question: string;
  promptTemplate: string;
  negativePrompt: string | null;
  aiFeature: string;
  style: string;
  sortOrder: number;
}

export interface SurveyAnswer {
  questionId: string;
  answer: string;
  photoId: string;
  eventId: string;
}

/**
 * Get available survey questions for an event.
 * Falls back to __default__ templates if no event-specific ones exist.
 */
export async function getSurveyQuestions(eventId: string): Promise<SurveyQuestion[]> {
  // Try event-specific first
  let rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, question, prompt_template, negative_prompt, ai_feature, style, sort_order
     FROM ai_survey_prompts
     WHERE event_id = $1 AND is_active = true
     ORDER BY sort_order ASC`,
    eventId,
  );

  // Fallback to defaults
  if (rows.length === 0) {
    rows = await prisma.$queryRawUnsafe(
      `SELECT id, question, prompt_template, negative_prompt, ai_feature, style, sort_order
       FROM ai_survey_prompts
       WHERE event_id = '__default__' AND is_active = true
       ORDER BY sort_order ASC`,
    );
  }

  return rows.map(mapQuestion);
}

/**
 * Get a specific survey question by ID.
 */
export async function getSurveyQuestion(questionId: string): Promise<SurveyQuestion | null> {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, question, prompt_template, negative_prompt, ai_feature, style, sort_order
     FROM ai_survey_prompts WHERE id = $1 LIMIT 1`,
    questionId,
  );
  if (rows.length === 0) return null;
  return mapQuestion(rows[0]);
}

/**
 * Build the final AI prompt from a survey answer.
 * Replaces {answer} placeholder in the template with the guest's answer.
 */
export function buildSurveyPrompt(template: string, answer: string): string {
  // Sanitize answer: remove prompt injection attempts
  const sanitized = answer
    .replace(/[{}[\]]/g, '') // Remove braces/brackets
    .replace(/\n/g, ' ')     // Single line
    .trim()
    .slice(0, 200);          // Max 200 chars

  return template.replace(/\{answer\}/gi, sanitized);
}

/**
 * Create or update a survey question for an event.
 */
export async function upsertSurveyQuestion(
  eventId: string,
  data: {
    id?: string;
    question: string;
    promptTemplate: string;
    negativePrompt?: string;
    aiFeature?: string;
    style?: string;
    sortOrder?: number;
  },
): Promise<SurveyQuestion> {
  if (data.id) {
    // Update existing
    const rows: any[] = await prisma.$queryRawUnsafe(
      `UPDATE ai_survey_prompts
       SET question = $2, prompt_template = $3, negative_prompt = $4,
           ai_feature = $5, style = $6, sort_order = $7, updated_at = NOW()
       WHERE id = $1 AND event_id = $8
       RETURNING id, question, prompt_template, negative_prompt, ai_feature, style, sort_order`,
      data.id, data.question, data.promptTemplate, data.negativePrompt || null,
      data.aiFeature || 'style_transfer', data.style || 'survey-custom',
      data.sortOrder ?? 0, eventId,
    );
    if (rows.length === 0) throw new Error('Survey-Frage nicht gefunden');
    return mapQuestion(rows[0]);
  } else {
    // Create new
    const rows: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO ai_survey_prompts (event_id, question, prompt_template, negative_prompt, ai_feature, style, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, question, prompt_template, negative_prompt, ai_feature, style, sort_order`,
      eventId, data.question, data.promptTemplate, data.negativePrompt || null,
      data.aiFeature || 'style_transfer', data.style || 'survey-custom',
      data.sortOrder ?? 0,
    );
    logger.info('[SurveyPrompt] Created question', { eventId, question: data.question.slice(0, 50) });
    return mapQuestion(rows[0]);
  }
}

/**
 * Delete a survey question.
 */
export async function deleteSurveyQuestion(questionId: string, eventId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM ai_survey_prompts WHERE id = $1 AND event_id = $2`,
    questionId, eventId,
  );
}

/**
 * Copy default questions to an event (for customization).
 */
export async function copyDefaultsToEvent(eventId: string): Promise<SurveyQuestion[]> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO ai_survey_prompts (event_id, question, prompt_template, negative_prompt, ai_feature, style, sort_order)
     SELECT $1, question, prompt_template, negative_prompt, ai_feature, style, sort_order
     FROM ai_survey_prompts WHERE event_id = '__default__' AND is_active = true`,
    eventId,
  );
  return getSurveyQuestions(eventId);
}

function mapQuestion(row: any): SurveyQuestion {
  return {
    id: row.id,
    question: row.question,
    promptTemplate: row.prompt_template,
    negativePrompt: row.negative_prompt,
    aiFeature: row.ai_feature,
    style: row.style,
    sortOrder: row.sort_order,
  };
}
