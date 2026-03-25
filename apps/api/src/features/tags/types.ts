import { z } from 'zod';
import { TAG_MAX_COUNT, TAG_MAX_LENGTH, TAG_PATTERN } from './constants.js';

const tagSchema = z
  .string()
  .min(1)
  .max(TAG_MAX_LENGTH)
  .regex(TAG_PATTERN, 'Tag must be lowercase alphanumeric with hyphens or underscores only')
  .transform((t) => t.toLowerCase());

export const TagsBodySchema = z.object({
  tags: z.array(tagSchema).min(1).max(TAG_MAX_COUNT),
});

export type TagsBody = z.infer<typeof TagsBodySchema>;
