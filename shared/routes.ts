import { z } from 'zod';
import { 
  insertFinancialModelSchema, 
  financialModels,
  insertUserPreferencesSchema,
  userPreferences,
  insertPortfolioSchema,
  portfolios,
  insertPortfolioModelSchema,
  portfolioModels,
  insertPrecedentTransactionSchema,
  precedentTransactions,
  insertLboAssumptionsSchema,
  lboAssumptions,
  insertScenarioSchema,
  scenarios,
  insertModelNoteSchema,
  modelNotes
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  models: {
    list: {
      method: 'GET' as const,
      path: '/api/models',
      responses: {
        200: z.array(z.custom<typeof financialModels.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/models/:id',
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/models',
      input: insertFinancialModelSchema,
      responses: {
        201: z.custom<typeof financialModels.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/models/:id',
      input: insertFinancialModelSchema.partial(),
      responses: {
        200: z.custom<typeof financialModels.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/models/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    export: {
      method: 'GET' as const,
      path: '/api/models/:id/export',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    }
  },
  
  preferences: {
    get: {
      method: 'GET' as const,
      path: '/api/preferences',
      responses: {
        200: z.custom<typeof userPreferences.$inferSelect>(),
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/preferences',
      input: insertUserPreferencesSchema.partial(),
      responses: {
        200: z.custom<typeof userPreferences.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      },
    }
  },

  portfolios: {
    list: {
      method: 'GET' as const,
      path: '/api/portfolios',
      responses: {
        200: z.array(z.custom<typeof portfolios.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/portfolios/:id',
      responses: {
        200: z.custom<typeof portfolios.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/portfolios',
      input: insertPortfolioSchema,
      responses: {
        201: z.custom<typeof portfolios.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/portfolios/:id',
      input: insertPortfolioSchema.partial(),
      responses: {
        200: z.custom<typeof portfolios.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/portfolios/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    addModel: {
      method: 'POST' as const,
      path: '/api/portfolios/:id/models',
      input: z.object({ modelId: z.number() }),
      responses: {
        201: z.custom<typeof portfolioModels.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    removeModel: {
      method: 'DELETE' as const,
      path: '/api/portfolios/:id/models/:modelId',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/portfolios/:id/stats',
      responses: {
        200: z.object({
          modelCount: z.number(),
          avgGrowth: z.number(),
          avgMultiple: z.number(),
          totalRevenue: z.number(),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },

  scenarios: {
    list: {
      method: 'GET' as const,
      path: '/api/models/:modelId/scenarios',
      responses: {
        200: z.array(z.custom<typeof scenarios.$inferSelect>()),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/models/:modelId/scenarios',
      input: insertScenarioSchema.omit({ modelId: true }),
      responses: {
        201: z.custom<typeof scenarios.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/scenarios/:id',
      input: insertScenarioSchema.partial(),
      responses: {
        200: z.custom<typeof scenarios.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/scenarios/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },

  sensitivity: {
    calculate: {
      method: 'POST' as const,
      path: '/api/models/:id/sensitivity',
      input: z.object({
        variable: z.string(),
        minValue: z.number(),
        maxValue: z.number(),
        steps: z.number().optional().default(5),
      }),
      responses: {
        200: z.array(z.object({
          value: z.number(),
          result: z.number(),
        })),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    }
  },

  precedents: {
    list: {
      method: 'GET' as const,
      path: '/api/models/:modelId/precedents',
      responses: {
        200: z.array(z.custom<typeof precedentTransactions.$inferSelect>()),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/models/:modelId/precedents',
      input: insertPrecedentTransactionSchema.omit({ modelId: true }),
      responses: {
        201: z.custom<typeof precedentTransactions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/precedents/:id',
      input: insertPrecedentTransactionSchema.partial(),
      responses: {
        200: z.custom<typeof precedentTransactions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/precedents/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },

  lbo: {
    get: {
      method: 'GET' as const,
      path: '/api/models/:modelId/lbo',
      responses: {
        200: z.custom<typeof lboAssumptions.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/models/:modelId/lbo',
      input: insertLboAssumptionsSchema.omit({ modelId: true }),
      responses: {
        200: z.custom<typeof lboAssumptions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    }
  },

  notes: {
    list: {
      method: 'GET' as const,
      path: '/api/models/:modelId/notes',
      responses: {
        200: z.array(z.custom<typeof modelNotes.$inferSelect>()),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/models/:modelId/notes',
      input: insertModelNoteSchema.omit({ modelId: true }),
      responses: {
        201: z.custom<typeof modelNotes.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/notes/:id',
      input: insertModelNoteSchema.partial(),
      responses: {
        200: z.custom<typeof modelNotes.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/notes/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },

  stats: {
    portfolio: {
      method: 'GET' as const,
      path: '/api/stats/portfolio',
      responses: {
        200: z.object({
          modelCount: z.number(),
          avgGrowth: z.number(),
          avgMultiple: z.number(),
          totalRevenue: z.number(),
        }),
        401: errorSchemas.unauthorized
      },
    }
  }
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type ModelInput = z.infer<typeof api.models.create.input>;
export type ModelUpdateInput = z.infer<typeof api.models.update.input>;
export type PreferencesInput = z.infer<typeof api.preferences.update.input>;
export type PortfolioInput = z.infer<typeof api.portfolios.create.input>;
export type ScenarioInput = z.infer<typeof api.scenarios.create.input>;
export type PrecedentInput = z.infer<typeof api.precedents.create.input>;
export type LboInput = z.infer<typeof api.lbo.update.input>;
export type NoteInput = z.infer<typeof api.notes.create.input>;
export type SensitivityInput = z.infer<typeof api.sensitivity.calculate.input>;
