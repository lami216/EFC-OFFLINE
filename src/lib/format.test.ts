import {describe,it,expect} from 'vitest';import {addDuration,money} from './format';
describe('business formatting',()=>{it('handles month ends',()=>expect(addDuration('2024-01-31',1,'month')).toBe('2024-02-29'));it('formats MRU',()=>expect(money(5000)).toContain('أوقية'))});
