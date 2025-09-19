export const apps = [
    {
        name: 'E-Kanban-supply-worker',
        script: 'dist/src/scripts/worker/supplysheetUpdateWorker.js', 
        interpreter: 'node', 
        watch: false,
        env: {
            NODE_ENV: 'production',
        },
    },
];