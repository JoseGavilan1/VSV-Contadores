export const validateSchema = (schema) => (req, res, next) => {
    try {
        const validatedData = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (validatedData.body) {
            req.body = validatedData.body;
        }

        if (validatedData.query) {
            Object.assign(req.query, validatedData.query);
        }

        if (validatedData.params) {
            Object.assign(req.params, validatedData.params);
        }

        next(); 

    } catch (error) {
        const validationErrors = error.errors 
            ? error.errors.map((err) => ({
                field: err.path[1] || err.path[0],
                message: err.message
              }))
            : [{ message: error.message || "Error de validación desconocido" }];

        console.error("⚠️ Validación fallida en el búnker:", validationErrors);

        return res.status(400).json({
            success: false,
            message: validationErrors[0].message, 
            errors: validationErrors
        });
    }
};