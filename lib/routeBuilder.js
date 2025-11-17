const express = require('express');

function ensureMethod(router, method) {
    if (typeof router[method] !== 'function') {
        throw new Error(`Invalid HTTP method: ${method}`);
    }
}

// helper pour transform un params definition in OpenAPI param
function mapParamToOpenApi(p) {
    return {
        name: p.name,
        in: p.in || 'query',
        required: !!p.required,
        description: p.description || '',
        schema: p.schema || { type: 'string' },
    };
}

/**
 * createRouter({ version, basePath, routes, tag })
 * - version: number|string (ex: 1 -> /v1 prefix)
 * - basePath: string, e.g. '/books' (used for swagger tags + path building convenience)
 * - routes: array of route definitions:
 *    { method, url, middlewares = [], handler,
 *      swagger: {
 *        summary, description, parameters: [], requestBody, responses, tags
 *      }
 *    }
 */
function createRouter({ version, basePath = '', routes = [], tag }) {
    const router = express.Router();
    const versionPrefix = version ? `/v${version}` : '';
    const fullBasePath = `${versionPrefix}${basePath}`.replace(/\/+$/, ''); // e.g. /v1/books

    // OpenAPI skeleton produced by this router
    const swaggerPaths = {};
    const swaggerComponents = { schemas: {} };

    routes.forEach((r) => {
        const method = r.method.toLowerCase();
        ensureMethod(router, method);

        const handlers = Array.isArray(r.middlewares) ? [...r.middlewares, r.handler] : [r.middlewares, r.handler];
        router[method](r.url, ...handlers);

        // Build OpenAPI path key (combine basePath + r.url)
        // We want the path expressed under the base (without version prefix) in swagger:
        const swaggerPathKey = (fullBasePath + r.url).replace(/\/+/g, '/'); // e.g. /books/:id => /books/:id
        // Convert Express :param to OpenAPI {param}
        const openApiPath = swaggerPathKey.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

        // Prepare operation object
        const op = {
            summary: r.swagger?.summary || '',
            description: r.swagger?.description || '',
            tags: r.swagger?.tags || (tag ? [tag] : []),
            parameters: (r.swagger?.parameters || []).map(mapParamToOpenApi),
            responses: r.swagger?.responses || {
                200: { description: 'Success' }
            }
        };

        if (r.swagger?.requestBody) {
            // requestBody should be an object following OpenAPI requestBody format
            op.requestBody = r.swagger.requestBody;
            if (r.swagger.requestBody?.content) {
            }
        }

        if (r.swagger?.security) op.security = r.swagger.security;

        swaggerPaths[openApiPath] = swaggerPaths[openApiPath] || {};
        swaggerPaths[openApiPath][method] = op;

        if (r.swagger?.components) {
            Object.entries(r.swagger.components).forEach(([k, v]) => {
                swaggerComponents[k] = { ...(swaggerComponents[k] || {}), ...v };
            });
        }
    });

    // OpenAPI root produd for this router
    const swagger = {
        openapi: '3.0.1',
        info: {
            title: `API ${fullBasePath || '/'}`,
            version: version ? `v${version}` : '1.0.0',
        },
        paths: swaggerPaths,
        components: swaggerComponents,
    };

    return { versionPrefix, basePath, router, swagger };
}

module.exports = createRouter;
