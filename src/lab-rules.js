// Explicit, per-battle experimental coefficients. Ordinary battles use defaults.
export const RULES=Object.freeze({health:1,damage:1,reduction:1,resistance:1,movement:1,timing:1,recovery:1,expenditure:1});
export function normalizeRules(input={}){if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid ruleset');const out={};for(const k of Object.keys(input))if(!Object.hasOwn(RULES,k))throw Error('Unknown coefficient: '+k);for(const k of Object.keys(RULES)){const v=input[k]??1;if(typeof v!=='number'||!Number.isFinite(v)||v<.25||v>4)throw Error(`${k}: coefficient must be 0.25–4`);out[k]=v;}return out;}
export const coefficient=(u,k)=>u.rules?.[k]??1;
export function experimentalStats(s,keys,budget){return Number.isInteger(budget)&&budget>=100&&budget<=1600&&keys.every(k=>Number.isInteger(s?.[k])&&s[k]>=Math.ceil(budget/20)&&s[k]<=Math.floor(budget/5))&&keys.reduce((n,k)=>n+s[k],0)===budget;}
