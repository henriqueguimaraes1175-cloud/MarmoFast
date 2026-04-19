
-- Migration: Initial Schema for MarmoFast Pro
-- Date: 2026-04-19

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    cnpj TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo TEXT,
    pix_key TEXT,
    show_address BOOLEAN DEFAULT true,
    default_validity INTEGER DEFAULT 10,
    default_deadline TEXT,
    productive_hours_per_month INTEGER DEFAULT 176,
    man_hour_cost DECIMAL DEFAULT 45,
    target_profit_margin DECIMAL DEFAULT 25,
    tax_percent DECIMAL DEFAULT 0,
    fixed_cost_percent DECIMAL DEFAULT 15,
    tax_settings JSONB,
    fixed_costs JSONB,
    custom_categories TEXT[] DEFAULT '{Chapas, Serviços, Acessórios}',
    ai_assistant_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    technical_name TEXT,
    category TEXT NOT NULL,
    sub_category TEXT,
    unit TEXT CHECK (unit IN ('m²', 'ml', 'un')),
    cost DECIMAL DEFAULT 0,
    waste_percent DECIMAL DEFAULT 0,
    transport_cost DECIMAL DEFAULT 0,
    execution_time DECIMAL DEFAULT 0,
    man_hour_cost DECIMAL DEFAULT 0,
    complexity TEXT,
    markup_percent DECIMAL DEFAULT 25,
    sales_price DECIMAL DEFAULT 0,
    image TEXT,
    images JSONB,
    specs JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at BIGINT
);

-- 3. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    whatsapp TEXT,
    address TEXT,
    type TEXT,
    total_spent DECIMAL DEFAULT 0,
    quote_ids TEXT[] DEFAULT '{}',
    materials_history TEXT[] DEFAULT '{}',
    photos JSONB DEFAULT '[]',
    status TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

-- 4. Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    number TEXT NOT NULL,
    date TEXT NOT NULL,
    client_name TEXT NOT NULL,
    whatsapp TEXT,
    address TEXT,
    work_address TEXT,
    status TEXT,
    items JSONB NOT NULL,
    subtotal DECIMAL DEFAULT 0,
    discount_amount DECIMAL DEFAULT 0,
    total DECIMAL DEFAULT 0,
    financials JSONB,
    validity_days INTEGER,
    estimated_deadline TEXT,
    payment_terms TEXT,
    technical_observations TEXT,
    documents JSONB DEFAULT '[]',
    updated_at BIGINT
);

-- 5. Stock Table
CREATE TABLE IF NOT EXISTS public.stock (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    material_name TEXT NOT NULL,
    width DECIMAL NOT NULL,
    height DECIMAL NOT NULL,
    type TEXT,
    status TEXT,
    material_id TEXT,
    reserva_quote_id TEXT,
    reserva_client_id TEXT,
    updated_at BIGINT
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Simple Policies (assuming standard auth for now)
CREATE POLICY "Users can see their own data" ON profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own data" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own data" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own data" ON quotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own data" ON stock FOR ALL USING (auth.uid() = user_id);
