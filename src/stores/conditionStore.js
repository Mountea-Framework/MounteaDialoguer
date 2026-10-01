import { createDefinitionStore } from './createDefinitionStore';
import { trackFirstConditionCreated } from '@/lib/achievements/achievementTracker';
export const useConditionStore = createDefinitionStore('conditions', 'Condition', trackFirstConditionCreated);
