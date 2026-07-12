/**
 * Processor registry — registers all intent processors.
 * Add new processors here. Each is independent.
 */
import { registerProcessor } from '../intent';
import { proxyProcessor } from './proxy';
import { apiProcessor } from './api';
import { subscriptionProcessor } from './subscription';
import { installProcessor } from './install';
import { telegramProcessor } from './telegram';
import { staticProcessor } from './static';

// Register processors in order of priority
registerProcessor('proxy', proxyProcessor);
registerProcessor('install', installProcessor);
registerProcessor('telegram', telegramProcessor);
registerProcessor('subscription', subscriptionProcessor);
registerProcessor('api', apiProcessor);
registerProcessor('static', staticProcessor);
