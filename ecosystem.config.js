module.exports = {
  apps: [
    {
      name: 'ecokuku-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
    {
      name: 'ecokuku-admin',
      cwd: './apps/admin',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
