import fs from 'fs';
import path from 'path';

const files = [
    'routes/admin.js',
    'routes/items.js',
    'routes/mfa.js',
    'routes/public.js',
    'routes/system.js',
    'routes/todos.js',
    'routes/user.js'
];

for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace deps extraction
    content = content.replace(/appGateSecret,\s*userSecret,/g, 'authSecret,');
    content = content.replace(/appGateSecret,/g, 'authSecret,');

    // Methods extraction
    content = content.replace(/requireAppGate,\s*requireUser,/g, 'requireAuth,');
    content = content.replace(/checkAppGate,\s*checkUser,/g, 'checkAuth,');
    content = content.replace(/requireAppGate,\s*checkUser,/g, 'requireAuth,\n        checkAuth,');
    content = content.replace(/checkAppGate,\s*requireUser,/g, 'checkAuth,\n        requireAuth,');

    content = content.replace(/requireAppGate,/g, 'requireAuth,');
    content = content.replace(/checkAppGate,/g, 'checkAuth,');
    content = content.replace(/requireUser,/g, 'requireAuth,');
    content = content.replace(/checkUser,/g, 'checkAuth,');

    // Replace middleware application
    content = content.replace(/requireAppGate\(appGateSecret\),\s*requireUser\(userSecret, supabase\),/g, 'requireAuth(authSecret, supabase),');
    content = content.replace(/checkAppGate\(appGateSecret\),\s*checkUser\(userSecret, supabase\),/g, 'checkAuth(authSecret),');
    content = content.replace(/checkAppGate\(appGateSecret\),\s*requireUser\(userSecret, supabase\),/g, 'checkAuth(authSecret),\n        requireAuth(authSecret, supabase),');
    content = content.replace(/requireAppGate\(appGateSecret\),\s*checkUser\(userSecret, supabase\),/g, 'requireAuth(authSecret, supabase),\n        checkAuth(authSecret),');

    // Naked middleware calls
    content = content.replace(/requireAppGate\(appGateSecret\)/g, 'requireAuth(authSecret, supabase)');
    content = content.replace(/requireUser\(userSecret, supabase\)/g, 'requireAuth(authSecret, supabase)');
    content = content.replace(/checkAppGate\(appGateSecret\)/g, 'checkAuth(authSecret)');
    content = content.replace(/checkUser\(userSecret, supabase\)/g, 'checkAuth(authSecret)');

    fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Replacements completed.');
