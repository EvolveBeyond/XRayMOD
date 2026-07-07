export interface Env {
  DB: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ENABLE_TELEGRAM: string;
  ENABLE_TON_WALLET: string;
  EXTERNAL_SERVER_URL: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  uuid: string;
  email: string;
  traffic_limit: number;
  traffic_used: number;
  expiry_date: string;
  status: 'active' | 'expired' | 'disabled';
  created_at: number;
}

export interface Config {
  id: number;
  user_id: number;
  protocol_id: string;
  name: string;
  settings_json: string;
  port: number;
  path: string;
  link: string;
  node_ip: string;
  client_limit: number;
  created_at: number;
}

export interface Protocol {
  id: string;
  name: string;
  schema_json: string;
  template_json: string;
  price: number;
  client_limit: number;
  client_price: number;
}

export interface KVEntry {
  k: string;
  v: string;
  updated: number;
}

export interface ProtocolField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'select' | 'boolean';
  default?: any;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export interface ProtocolSchema {
  fields: ProtocolField[];
}

export interface ProtocolDefinition {
  id: string;
  name: string;
  price?: number;
  clientLimit?: number;
  clientPrice?: number;
  schema: ProtocolSchema;
  template: string;
}

export interface Node {
  id: number;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  cpu: number;
  ram: number;
  users: number;
  uptime: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface Session {
  userId: number;
  role: string;
  created: number;
}
