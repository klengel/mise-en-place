// Cloud database using Supabase
import { supabase } from './supabaseClient';

function createEntity(tableName) {
  return {
    async list(sortField, limit) {
      let query = supabase.from(tableName).select('*');
      if (sortField) {
        const desc = sortField.startsWith('-');
        const col = desc ? sortField.slice(1) : sortField;
        query = query.order(col, { ascending: !desc });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async filter(criteria) {
      let query = supabase.from(tableName).select('*');
      for (const [key, val] of Object.entries(criteria)) {
        query = query.eq(key, val);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },

    async create(payload) {
      const row = { ...payload, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
      const { data, error } = await supabase.from(tableName).insert(row).select().single();
      if (error) throw new Error(error.message);
      return data || row;
    },

    async update(id, payload) {
      const row = { ...payload, updated_date: new Date().toISOString() };
      const { data, error } = await supabase.from(tableName).update(row).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data || { ...row, id };
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    },
  };
}

export const db = {
  entities: {
    // Existing
    Recipe: createEntity('recipes'),
    DailyPlan: createEntity('daily_plans'),
    WeeklyPlan: createEntity('weekly_plans'),
    CleaningTask: createEntity('cleaning_tasks'),
    KitchenSettings: createEntity('kitchen_settings'),
    Label: createEntity('labels'),
    HaccpRecord: createEntity('haccp_records'),
    SavedFile: createEntity('saved_files'),
    // New inventory
    Supplier: createEntity('suppliers'),
    Ingredient: createEntity('ingredients'),
    Order: createEntity('orders'),
    SalesRecord: createEntity('sales_records'),
    StockAdjustment: createEntity('stock_adjustments'),
  },
};

export default db;
