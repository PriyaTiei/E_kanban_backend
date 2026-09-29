export const apps = [
    {
        name: 'E-Kanban-backup-worker',
        script: 'dist/src/scripts/worker/preparationBackupWorker.js', 
        interpreter: 'node', 
        watch: false,
        env: {
            NODE_ENV: 'production',
        },
    },
];
