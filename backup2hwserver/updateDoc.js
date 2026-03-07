import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'routes/doc.js');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/userSecret/g, 'authSecret');
content = content.replace(/appGateSecret/g, 'authSecret');
content = content.replace(/user_token/g, 'auth_token');

// Replace dual middleware in deps
content = content.replace(/requireAppGate,\s*requireUser,/g, 'requireAuth,');

// Replace dual middleware application
content = content.replace(/requireAppGate\(authSecret\),\s*requireUser\(authSecret, supabase\),/g, 'requireAuth(authSecret, supabase),');

fs.writeFileSync(filePath, content, 'utf8');
console.log('doc.js updated.');
