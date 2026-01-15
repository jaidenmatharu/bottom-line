import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profile for onboarding and personalization
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  
  // Onboarding preferences
  experienceLevel: varchar("experience_level", { length: 50 }).default("intermediate"), // beginner, intermediate, advanced
  primaryRole: varchar("primary_role", { length: 100 }), // analyst, associate, vp, director, md
  industry: varchar("industry", { length: 100 }), // tech, healthcare, finance, manufacturing, etc.
  firmType: varchar("firm_type", { length: 100 }), // investment_bank, pe, vc, corporate, advisory
  
  // Feature preferences
  preferredValuationMethod: varchar("preferred_valuation_method", { length: 50 }).default("dcf"), // dcf, comps, precedents, lbo
  showTutorials: boolean("show_tutorials").default(true),
  
  // Personalization data
  recentModelIds: jsonb("recent_model_ids").default([]),
  favoriteModelIds: jsonb("favorite_model_ids").default([]),
  
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
