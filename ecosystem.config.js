module.exports = {
  apps: [
    {
      name: 'ecokuku-web',
      cwd: '/var/www/ecokuku',
      script: './node_modules/.bin/next',
      args: 'start apps/web -p 3000',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
    },
    {
      name: 'ecokuku-admin',
      cwd: '/var/www/ecokuku',
      script: './node_modules/.bin/next',
      args: 'start apps/admin -p 3001',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
    },
  ],
};
