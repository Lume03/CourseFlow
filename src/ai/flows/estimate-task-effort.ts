'use server';

/**
 * @fileOverview AI flow to estimate task effort and deadline based on task description.
 *
 * - estimateTaskEffort - Function to estimate task effort and deadline.
 * - EstimateTaskEffortInput - Input type for the estimateTaskEffort function.
 * - EstimateTaskEffortOutput - Return type for the estimateTaskEffort function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateTaskEffortInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('Detailed description of the task for effort estimation.'),
});
export type EstimateTaskEffortInput = z.infer<typeof EstimateTaskEffortInputSchema>;

const EstimateTaskEffortOutputSchema = z.object({
  estimatedEffort: z
    .string()
    .describe(
      'Estimated time (in hours or days) required to complete the task.'
    ),
  suggestedDeadline: z
    .string()
    .describe('Suggested deadline date for the task (format: YYYY-MM-DD).'),
  reasoning:
    z.string()
    .describe('Reasoning behind the effort estimation and deadline.'),
});
export type EstimateTaskEffortOutput = z.infer<typeof EstimateTaskEffortOutputSchema>;

export async function estimateTaskEffort(
  input: EstimateTaskEffortInput
): Promise<EstimateTaskEffortOutput> {
  return estimateTaskEffortFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateTaskEffortPrompt',
  input: {schema: EstimateTaskEffortInputSchema},
  output: {schema: EstimateTaskEffortOutputSchema},
  prompt: `You are an AI assistant specializing in estimating the effort and deadlines for tasks.

  Based on the task description provided, estimate the effort required to complete the task and suggest a reasonable deadline.
  Provide a brief reasoning for your estimation.

  Task Description: {{{taskDescription}}}
`,
});

const estimateTaskEffortFlow = ai.defineFlow(
  {
    name: 'estimateTaskEffortFlow',
    inputSchema: EstimateTaskEffortInputSchema,
    outputSchema: EstimateTaskEffortOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
