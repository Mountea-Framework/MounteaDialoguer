import { createDefinitionStore } from './createDefinitionStore';
import { trackFirstDecoratorCreated } from '@/lib/achievements/achievementTracker';
export const useDecoratorStore = createDefinitionStore('decorators', 'Decorator', trackFirstDecoratorCreated);
