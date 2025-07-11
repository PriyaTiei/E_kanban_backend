export const apps = [
    {
        name: 'E-Kanban-bd',
        script: 'dist/src/index.js', 
        interpreter: 'node', 
        watch: false,
        env: {
            NODE_ENV: 'production',
        },
    },
];