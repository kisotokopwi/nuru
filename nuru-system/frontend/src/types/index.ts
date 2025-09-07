// User types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  SITE_ADMIN = "site_admin",
  SUPERVISOR = "supervisor"
}

// Client types
export interface Client {
  id: number;
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  invoice_template: string;
  invoice_logo_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Project types
export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  client_id: number;
  start_date?: string;
  end_date?: string;
  requires_production_tracking: boolean;
  production_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  client?: Client;
}

// Site types
export interface Site {
  id: number;
  name: string;
  code: string;
  location: string;
  description?: string;
  project_id: number;
  supervisor_id?: number;
  latitude?: number;
  longitude?: number;
  minimum_daily_production?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  project?: Project;
  supervisor?: User;
}

// Worker Type types
export interface WorkerType {
  id: number;
  name: string;
  description?: string;
  site_id: number;
  daily_rate: number;
  currency: string;
  minimum_tasks_per_day?: number;
  task_description?: string;
  production_weight?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Daily Record types
export interface DailyRecordItem {
  id: number;
  daily_record_id: number;
  worker_type_id: number;
  worker_count: number;
  total_payment: number;
  payment_per_worker: number;
  worker_names?: string[];
  productivity_score?: number;
  attendance_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface DailyRecord {
  id: number;
  record_date: string;
  site_id: number;
  supervisor_id: number;
  total_production?: number;
  production_unit: string;
  tasks_completed?: number;
  task_completion_notes?: string;
  weather_conditions?: string;
  site_conditions_notes?: string;
  supervisor_notes?: string;
  is_locked: boolean;
  correction_count: number;
  last_correction_reason?: string;
  created_at: string;
  updated_at?: string;
  locked_at?: string;
  record_items: DailyRecordItem[];
}

// Invoice types
export enum InvoiceType {
  CLIENT = "client",
  NURU = "nuru"
}

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled"
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  worker_names?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: InvoiceType;
  daily_record_id: number;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total_amount: number;
  status: InvoiceStatus;
  pdf_file_path?: string;
  pdf_generated_at?: string;
  client_name?: string;
  client_address?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  invoice_items: InvoiceItem[];
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Form types for creating/updating
export interface ClientCreateRequest {
  name: string;
  code: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  invoice_template?: string;
  invoice_logo_path?: string;
  is_active?: boolean;
}

export interface ProjectCreateRequest {
  name: string;
  code: string;
  description?: string;
  client_id: number;
  start_date?: string;
  end_date?: string;
  requires_production_tracking?: boolean;
  production_unit?: string;
  is_active?: boolean;
}

export interface SiteCreateRequest {
  name: string;
  code: string;
  location: string;
  description?: string;
  project_id: number;
  supervisor_id?: number;
  latitude?: number;
  longitude?: number;
  minimum_daily_production?: number;
  is_active?: boolean;
}

export interface WorkerTypeCreateRequest {
  name: string;
  description?: string;
  site_id: number;
  daily_rate: number;
  currency?: string;
  minimum_tasks_per_day?: number;
  task_description?: string;
  production_weight?: number;
  is_active?: boolean;
}