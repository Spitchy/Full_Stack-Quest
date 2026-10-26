import { createApp } from './app.js';
import { config } from './config.js';

createApp(config).listen(config.port, () => {
  console.log(`API Classement prête sur http://localhost:${config.port}/api/v1/classement`);
});
