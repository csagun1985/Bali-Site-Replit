import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
export const siteContent = sqliteTable("site_content", {
  id: integer("id").primaryKey(), content: text("content").notNull(), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});

export const tripTeamMessages = sqliteTable("trip_team_messages", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  deleteToken: text("delete_token").notNull(),
  createdAt: text("created_at").notNull(),
});
