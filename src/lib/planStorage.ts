import { supabase } from './supabase';
import { PlanJSON } from '@/types/plan';

export interface SavedPlan {
  id: string;
  name: string | null;
  scale: number | null;
  metadata: PlanJSON['metadata'];
  rooms: PlanJSON['rooms'];
  created_at: string;
  updated_at: string;
}

export async function savePlan(plan: PlanJSON): Promise<string | null> {
  const payload = {
    name: plan.name ?? null,
    scale: plan.scale ?? null,
    metadata: plan.metadata,
    rooms: plan.rooms,
  };

  if (plan.id) {
    // Try update first
    const { data, error } = await supabase
      .from('plans')
      .update(payload)
      .eq('id', plan.id)
      .select('id')
      .single();

    if (!error && data) return data.id;
  }

  // Insert new
  const { data, error } = await supabase
    .from('plans')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save plan:', error.message);
    return null;
  }

  return data.id;
}

export async function loadPlan(id: string): Promise<PlanJSON | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    scale: data.scale,
    metadata: data.metadata,
    rooms: data.rooms,
  };
}

export async function listPlans(): Promise<SavedPlan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, metadata, scale, rooms, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to list plans:', error.message);
    return [];
  }

  return data ?? [];
}

export async function deletePlan(id: string): Promise<boolean> {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  return !error;
}
