module.exports = {
  apps: [
    {
      name: "bunkpulse",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1, // Single instance to ensure Pulse cron jobs (5 PM & 11:30 PM) execute once without duplicates
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
