import 'dotenv/config';
import { redis } from './utils/redis';
redis.get('worker:heartbeat').then(value => { process.exit(value ? 0 : 1); }).catch(() => process.exit(1));
