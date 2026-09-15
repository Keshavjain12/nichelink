import { z } from 'zod';
import { CONTENT_LIMITS } from '../constants/content.js';
import { nameSchema, usernameSchema } from './authValidators.js';

const profileList = z
  .array(z.string().trim().min(1).max(40))
  .max(CONTENT_LIMITS.PROFILE_MAX_SKILLS, `At most ${CONTENT_LIMITS.PROFILE_MAX_SKILLS} items`);

const website = z.union([
  z.literal(''),
  z
    .url('Enter a valid URL')
    .max(200)
    .refine((value) => /^https?:\/\//i.test(value), 'Website must start with http:// or https://'),
]);

export const usernameParams = z.object({ username: usernameSchema });

export const updateProfileBody = z
  .object({
    name: nameSchema,
    headline: z.string().trim().max(120),
    bio: z.string().trim().max(600),
    location: z.string().trim().max(80),
    website,
    skills: profileList,
    interests: profileList,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
