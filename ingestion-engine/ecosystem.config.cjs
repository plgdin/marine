module.exports = {
  apps: [{
    name: "anchor-ingestion",
    script: "./index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G", // Kills and reboots if it leaks memory
    env: {
      NODE_ENV: "production",
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    exp_backoff_restart_delay: 100, // Prevents spam-crashing
  }]
};
