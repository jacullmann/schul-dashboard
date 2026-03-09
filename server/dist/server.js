import { httpServer } from './app.js';
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || 'error / check environment';
httpServer.listen(PORT, () => console.log(`Backend läuft nun auf: ${PORT} | Version 1.0.0 = ${VERSION}`));
//# sourceMappingURL=server.js.map