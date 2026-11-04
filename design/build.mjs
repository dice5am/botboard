import fs from 'fs';
const t = fs.readFileSync(new URL('./mock.template.html', import.meta.url), 'utf8');
const tok = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../data/usage.json', import.meta.url), 'utf8');
fs.writeFileSync(new URL('./mock.html', import.meta.url), t.replace('/*TOKENS*/', tok).replace('/*DATA*/', data));
