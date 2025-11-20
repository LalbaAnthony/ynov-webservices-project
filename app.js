const express = require('express');
const swaggerUi = require('swagger-ui-express');
const bookRoutes = require('./routes/bookRoutes');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Middleware pour lire le JSON
app.use(express.json());

// Sécuriser les en-têtes HTTP avec Helmet
app.use(helmet.frameguard({ action: 'deny' }));

// Configurer CORS
// Create a JS array of the comma-separated origins from env variable
const origin = process.env.APP_CORS_ALLOWED_ORIGINS ? process.env.APP_CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];
app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? ['*'] : origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204, // pour le preflight
}));

// Build des routes
app.use(bookRoutes.prefix, bookRoutes.router); // as http://localhost:3000/api/v1/books

// Construire le spec OpenAPI global en agrégeant les specs partielles
function mergeSwaggers(modules) {
    const merged = {
        openapi: '3.0.1',
        info: { title: process.env.APP_NAME, version: '1.0.0' },
        servers: [{ url: `http://localhost:${process.env.APP_PORT}` }],
        paths: {},
        components: { schemas: {} }
    };

    modules.forEach((m) => {
        const s = m.swagger || {};
        // merge paths
        Object.entries(s.paths || {}).forEach(([p, obj]) => {
            // si path existe déjà, merge les méthodes
            merged.paths[p] = merged.paths[p] || {};
            Object.entries(obj).forEach(([method, op]) => {
                merged.paths[p][method] = op;
            });
        });
        // merge components.schemas
        if (s.components?.schemas) {
            merged.components.schemas = Object.assign({}, merged.components.schemas, s.components.schemas);
        }
    });

    return merged;
}

const apiSpec = mergeSwaggers([bookRoutes /* , other route modules here */]);

// Mount swagger UI
app.use(process.env.APP_SWAGGER_URL, swaggerUi.serve, swaggerUi.setup(apiSpec));

// Handle unhandled routes
app.use((req, res, next) => {
    res.status(404).send('<h1>404 - Not Found</h1><img src="https://media1.tenor.com/m/4kNeXAOr2TMAAAAC/kaamelott-arthur.gif" alt="Not Found"/>');
})

module.exports = app;
