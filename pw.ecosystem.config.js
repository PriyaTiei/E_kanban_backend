export const apps = [
    {
        name: 'E-Kanban-worker',
        script: 'dist/src/scripts/worker/productEntryWatcher.js', 
        interpreter: 'node', 
        watch: false,
        env: {
            NODE_ENV: 'production',
        },
    },
];