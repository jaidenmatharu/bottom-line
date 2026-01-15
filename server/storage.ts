import { db } from "./db";
import {
  financialModels,
  userProfiles,
  userPreferences,
  portfolios,
  portfolioModels,
  precedentTransactions,
  lboAssumptions,
  scenarios,
  modelNotes,
  type FinancialModel,
  type InsertFinancialModel,
  type UpdateModelRequest,
  type UserProfile,
  type InsertUserProfile,
  type UserPreferences,
  type InsertUserPreferences,
  type Portfolio,
  type InsertPortfolio,
  type PrecedentTransaction,
  type InsertPrecedentTransaction,
  type LboAssumptions,
  type InsertLboAssumptions,
  type Scenario,
  type InsertScenario,
  type ModelNote,
  type InsertModelNote,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

type CreateModelInput = InsertFinancialModel & { userId: string };

export interface IStorage {
  // Models
  getModels(userId: string): Promise<FinancialModel[]>;
  getModel(id: number): Promise<FinancialModel | undefined>;
  createModel(model: CreateModelInput): Promise<FinancialModel>;
  updateModel(id: number, updates: UpdateModelRequest): Promise<FinancialModel>;
  deleteModel(id: number): Promise<void>;
  
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;

  // User Preferences
  getPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertPreferences(preferences: InsertUserPreferences & { userId: string }): Promise<UserPreferences>;

  // Portfolios
  getPortfolios(userId: string): Promise<Portfolio[]>;
  getPortfolio(id: number): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio & { userId: string }): Promise<Portfolio>;
  updatePortfolio(id: number, updates: Partial<InsertPortfolio>): Promise<Portfolio>;
  deletePortfolio(id: number): Promise<void>;
  getPortfolioModels(portfolioId: number): Promise<FinancialModel[]>;
  addModelToPortfolio(portfolioId: number, modelId: number): Promise<void>;
  removeModelFromPortfolio(portfolioId: number, modelId: number): Promise<void>;

  // Precedent Transactions
  getPrecedentTransactions(modelId: number): Promise<PrecedentTransaction[]>;
  getPrecedentTransaction(id: number): Promise<PrecedentTransaction | undefined>;
  createPrecedentTransaction(transaction: InsertPrecedentTransaction): Promise<PrecedentTransaction>;
  updatePrecedentTransaction(id: number, updates: Partial<InsertPrecedentTransaction>): Promise<PrecedentTransaction>;
  deletePrecedentTransaction(id: number): Promise<void>;

  // LBO Assumptions
  getLboAssumptions(modelId: number): Promise<LboAssumptions | undefined>;
  upsertLboAssumptions(assumptions: InsertLboAssumptions): Promise<LboAssumptions>;

  // Scenarios
  getScenarios(modelId: number): Promise<Scenario[]>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: number, updates: Partial<InsertScenario>): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;

  // Model Notes
  getModelNotes(modelId: number): Promise<ModelNote[]>;
  getModelNote(id: number): Promise<ModelNote | undefined>;
  createModelNote(note: InsertModelNote): Promise<ModelNote>;
  updateModelNote(id: number, updates: Partial<InsertModelNote>): Promise<ModelNote>;
  deleteModelNote(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === Models ===
  async getModels(userId: string): Promise<FinancialModel[]> {
    return await db.select()
      .from(financialModels)
      .where(eq(financialModels.userId, userId))
      .orderBy(desc(financialModels.createdAt));
  }

  async getModel(id: number): Promise<FinancialModel | undefined> {
    const [model] = await db.select().from(financialModels).where(eq(financialModels.id, id));
    return model;
  }

  async createModel(insertModel: CreateModelInput): Promise<FinancialModel> {
    const [model] = await db.insert(financialModels).values(insertModel).returning();
    return model;
  }

  async updateModel(id: number, updates: UpdateModelRequest): Promise<FinancialModel> {
    const [model] = await db.update(financialModels)
      .set(updates)
      .where(eq(financialModels.id, id))
      .returning();
    return model;
  }

  async deleteModel(id: number): Promise<void> {
    await db.delete(financialModels).where(eq(financialModels.id, id));
  }

  // === User Profiles ===
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getUserProfile(profile.userId);
    if (existing) {
      const [updated] = await db.update(userProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(userProfiles.userId, profile.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  // === User Preferences ===
  async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertPreferences(preferences: InsertUserPreferences & { userId: string }): Promise<UserPreferences> {
    const existing = await this.getPreferences(preferences.userId);
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, preferences.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userPreferences).values(preferences).returning();
    return created;
  }

  // === Portfolios ===
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    return await db.select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .orderBy(desc(portfolios.createdAt));
  }

  async getPortfolio(id: number): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio;
  }

  async createPortfolio(portfolio: InsertPortfolio & { userId: string }): Promise<Portfolio> {
    const [created] = await db.insert(portfolios).values(portfolio).returning();
    return created;
  }

  async updatePortfolio(id: number, updates: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [updated] = await db.update(portfolios)
      .set(updates)
      .where(eq(portfolios.id, id))
      .returning();
    return updated;
  }

  async deletePortfolio(id: number): Promise<void> {
    await db.delete(portfolioModels).where(eq(portfolioModels.portfolioId, id));
    await db.delete(portfolios).where(eq(portfolios.id, id));
  }

  async getPortfolioModels(portfolioId: number): Promise<FinancialModel[]> {
    const links = await db.select()
      .from(portfolioModels)
      .where(eq(portfolioModels.portfolioId, portfolioId));
    
    if (links.length === 0) return [];
    
    const modelIds = links.map(link => link.modelId);
    const models: FinancialModel[] = [];
    
    for (const modelId of modelIds) {
      const model = await this.getModel(modelId);
      if (model) models.push(model);
    }
    
    return models;
  }

  async addModelToPortfolio(portfolioId: number, modelId: number): Promise<void> {
    await db.insert(portfolioModels).values({ portfolioId, modelId });
  }

  async removeModelFromPortfolio(portfolioId: number, modelId: number): Promise<void> {
    await db.delete(portfolioModels)
      .where(and(
        eq(portfolioModels.portfolioId, portfolioId),
        eq(portfolioModels.modelId, modelId)
      ));
  }

  // === Precedent Transactions ===
  async getPrecedentTransactions(modelId: number): Promise<PrecedentTransaction[]> {
    return await db.select()
      .from(precedentTransactions)
      .where(eq(precedentTransactions.modelId, modelId));
  }

  async getPrecedentTransaction(id: number): Promise<PrecedentTransaction | undefined> {
    const [transaction] = await db.select().from(precedentTransactions).where(eq(precedentTransactions.id, id));
    return transaction;
  }

  async createPrecedentTransaction(transaction: InsertPrecedentTransaction): Promise<PrecedentTransaction> {
    const [created] = await db.insert(precedentTransactions).values(transaction).returning();
    return created;
  }

  async updatePrecedentTransaction(id: number, updates: Partial<InsertPrecedentTransaction>): Promise<PrecedentTransaction> {
    const [updated] = await db.update(precedentTransactions)
      .set(updates)
      .where(eq(precedentTransactions.id, id))
      .returning();
    return updated;
  }

  async deletePrecedentTransaction(id: number): Promise<void> {
    await db.delete(precedentTransactions).where(eq(precedentTransactions.id, id));
  }

  // === LBO Assumptions ===
  async getLboAssumptions(modelId: number): Promise<LboAssumptions | undefined> {
    const [assumptions] = await db.select()
      .from(lboAssumptions)
      .where(eq(lboAssumptions.modelId, modelId));
    return assumptions;
  }

  async upsertLboAssumptions(assumptions: InsertLboAssumptions): Promise<LboAssumptions> {
    const existing = await this.getLboAssumptions(assumptions.modelId);
    if (existing) {
      const [updated] = await db.update(lboAssumptions)
        .set(assumptions)
        .where(eq(lboAssumptions.modelId, assumptions.modelId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(lboAssumptions).values(assumptions).returning();
    return created;
  }

  // === Scenarios ===
  async getScenarios(modelId: number): Promise<Scenario[]> {
    return await db.select()
      .from(scenarios)
      .where(eq(scenarios.modelId, modelId))
      .orderBy(desc(scenarios.createdAt));
  }

  async createScenario(scenario: InsertScenario): Promise<Scenario> {
    const [created] = await db.insert(scenarios).values(scenario).returning();
    return created;
  }

  async updateScenario(id: number, updates: Partial<InsertScenario>): Promise<Scenario> {
    const [updated] = await db.update(scenarios)
      .set(updates)
      .where(eq(scenarios.id, id))
      .returning();
    return updated;
  }

  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  // === Model Notes ===
  async getModelNotes(modelId: number): Promise<ModelNote[]> {
    return await db.select()
      .from(modelNotes)
      .where(eq(modelNotes.modelId, modelId))
      .orderBy(desc(modelNotes.createdAt));
  }

  async getModelNote(id: number): Promise<ModelNote | undefined> {
    const [note] = await db.select().from(modelNotes).where(eq(modelNotes.id, id));
    return note;
  }

  async createModelNote(note: InsertModelNote): Promise<ModelNote> {
    const [created] = await db.insert(modelNotes).values(note).returning();
    return created;
  }

  async updateModelNote(id: number, updates: Partial<InsertModelNote>): Promise<ModelNote> {
    const [updated] = await db.update(modelNotes)
      .set(updates)
      .where(eq(modelNotes.id, id))
      .returning();
    return updated;
  }

  async deleteModelNote(id: number): Promise<void> {
    await db.delete(modelNotes).where(eq(modelNotes.id, id));
  }
}

export const storage = new DatabaseStorage();
